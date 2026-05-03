import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import pool from './db.js';
import authRoutes from './routes/auth.js';
import faceRoutes from './routes/face.js';
import meetingRoutes from './routes/meetings.js';
import transcriptRoutes from './routes/transcripts.js';
import attendanceRoutes from './routes/attendance.js';
import summaryRoutes from './routes/summary.js';

const app = express();
const server = http.createServer(app);

// ─── CORS ────────────────────────────────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/summary', summaryRoutes);

app.get('/', (req, res) => res.send('MeetSync API running ✓'));

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

// ─── Socket.io Signaling Server ──────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Track connected users per room: roomId → Set<socketId>
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  // ── Join Room ──────────────────────────────────────────────────────────────
  socket.on('join-room', ({ meetingId, userId, userName, isMuted, isCameraOff }) => {
    if (!meetingId) return;

    currentRoom = String(meetingId);
    currentUser = { socketId: socket.id, userId, userName, isMuted, isCameraOff };

    socket.join(currentRoom);

    // Track participants
    if (!rooms.has(currentRoom)) {
      rooms.set(currentRoom, new Map());
    }
    rooms.get(currentRoom).set(socket.id, currentUser);

    // Notify this socket of all existing participants
    const existingPeers = [...rooms.get(currentRoom).entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([sid, user]) => ({ socketId: sid, ...user }));

    socket.emit('room-peers', existingPeers);

    // Notify others that someone joined
    socket.to(currentRoom).emit('user-joined', {
      socketId: socket.id,
      userId,
      userName,
      isMuted,
      isCameraOff
    });

    console.log(`[Socket] ${userName || userId} joined room ${currentRoom}. Peers: ${existingPeers.length}`);
  });

  // ── WebRTC Signaling ───────────────────────────────────────────────────────
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', {
      from: socket.id,
      fromUser: currentUser,
      offer,
    });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', {
      from: socket.id,
      answer,
    });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', {
      from: socket.id,
      candidate,
    });
  });

  // ── Chat Messages ──────────────────────────────────────────────────────────
  socket.on('chat-message', ({ meetingId, message, userName }) => {
    socket.to(String(meetingId)).emit('chat-message', {
      id: Date.now(),
      from: socket.id,
      userName,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Media State ────────────────────────────────────────────────────────────
  socket.on('media-state', ({ meetingId, isMuted, isCameraOff }) => {
    // Update local store so new joiners get the right state
    const room = String(meetingId);
    if (rooms.has(room) && rooms.get(room).has(socket.id)) {
      const userState = rooms.get(room).get(socket.id);
      userState.isMuted = isMuted;
      userState.isCameraOff = isCameraOff;
    }

    socket.to(room).emit('media-state', {
      from: socket.id,
      isMuted,
      isCameraOff
    });
  });

  // ── User Identity Update ───────────────────────────────────────────────
  socket.on('update-user', ({ meetingId, userId, userName, isMuted, isCameraOff }) => {
    const room = String(meetingId);
    if (!rooms.has(room) || !rooms.get(room).has(socket.id)) return;

    const userState = rooms.get(room).get(socket.id);
    userState.userId = userId ?? userState.userId;
    userState.userName = userName || userState.userName;
    if (typeof isMuted === 'boolean') userState.isMuted = isMuted;
    if (typeof isCameraOff === 'boolean') userState.isCameraOff = isCameraOff;

    socket.to(room).emit('user-updated', {
      socketId: socket.id,
      userId: userState.userId,
      userName: userState.userName,
      isMuted: userState.isMuted,
      isCameraOff: userState.isCameraOff,
    });
  });

  // ── Captions ───────────────────────────────────────────────────────────────
  socket.on('caption', ({ meetingId, caption }) => {
    const room = String(meetingId);
    const userState = rooms.get(room)?.get(socket.id);
    socket.to(room).emit('caption', {
      ...caption,
      speaker: userState
        ? { id: userState.userId || socket.id, name: userState.userName || 'Guest' }
        : caption.speaker,
      fromSocket: socket.id
    });
  });

  // ── Leave / Disconnect ────────────────────────────────────────────────────
  const handleLeave = () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(socket.id);
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
    if (currentRoom) {
      socket.to(currentRoom).emit('user-left', {
        socketId: socket.id,
        userId: currentUser?.userId,
        userName: currentUser?.userName,
      });
      console.log(`[Socket] ${currentUser?.userName || socket.id} left room ${currentRoom}`);
    }
  };

  socket.on('leave-room', handleLeave);
  socket.on('disconnect', () => {
    handleLeave();
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MeetSync API server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for WebRTC signaling`);
});