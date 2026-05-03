import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Real Socket.io hook — replaces the mock implementation.
 * Manages a single persistent socket connection per meetingId.
 */
export function useSocket(meetingId, callbacks = {}) {
  const socketRef = useRef(null);
  // Keep callbacks fresh without re-connecting
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Connect once on mount
  useEffect(() => {
    if (!meetingId) return;

    const token = localStorage.getItem('ms_token');

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // Expose all incoming events via callbacks
    socket.on('room-peers', (peers) => callbacksRef.current?.onRoomPeers?.(peers));
    socket.on('user-joined', (data) => callbacksRef.current?.onUserJoined?.(data));
    socket.on('user-left', (data) => callbacksRef.current?.onUserLeft?.(data));
    socket.on('offer', (data) => callbacksRef.current?.onOffer?.(data));
    socket.on('answer', (data) => callbacksRef.current?.onAnswer?.(data));
    socket.on('ice-candidate', (data) => callbacksRef.current?.onIceCandidate?.(data));
    socket.on('chat-message', (data) => callbacksRef.current?.onMessage?.(data));
    socket.on('media-state', (data) => callbacksRef.current?.onMediaState?.(data));
    socket.on('caption', (data) => callbacksRef.current?.onCaption?.(data));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [meetingId]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return { emit, disconnect, socketRef };
}
