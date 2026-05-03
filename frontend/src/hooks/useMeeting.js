import { useEffect, useRef, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { useWebRTC } from './useWebRTC';
import { useSocket } from './useSocket';
import { startCaptionStream, saveTranscriptChunk } from '../services/transcriptionService';
import { markAttendance, markLeave } from '../services/attendanceService';
import { useAuthStore } from '../store/authStore';

export function useMeeting(meetingId) {
  const {
    addCaption,
    setJoined,
    updateAttendance,
    leaveMeeting,
    addMessage,
    updateParticipantMedia,
    isMicOn,
    isCameraOn,
    isJoined,
  } = useMeetingStore();

  const { user } = useAuthStore();

  const {
    startLocalStream,
    startScreenShare,
    stopScreenShare,
    callPeer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closePeer,
    cleanup,
  } = useWebRTC(meetingId);

  const captionStopRef = useRef(null);
  const transcriptBatchRef = useRef([]);
  const transcriptTimerRef = useRef(null);
  const captionLockTimerRef = useRef(null);
  const localReadyRef = useRef(false);
  const pendingPeersRef = useRef([]);
  const joinRequestedRef = useRef(false);
  const joinedRoomRef = useRef(false);
  const tabIdRef = useRef(
    (globalThis.crypto && globalThis.crypto.randomUUID)
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const CAPTION_LOCK_KEY = 'ms_caption_owner';
  const CAPTION_LOCK_TTL = 8000;

  const readCaptionLock = () => {
    try {
      const raw = localStorage.getItem(CAPTION_LOCK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeCaptionLock = (micOn = true) => {
    const payload = { id: tabIdRef.current, ts: Date.now(), micOn };
    localStorage.setItem(CAPTION_LOCK_KEY, JSON.stringify(payload));
  };

  const releaseCaptionLock = () => {
    const lock = readCaptionLock();
    if (lock?.id === tabIdRef.current) {
      localStorage.removeItem(CAPTION_LOCK_KEY);
    }
  };

  const tryAcquireCaptionLock = () => {
    const lock = readCaptionLock();
    const isStale = !lock || (Date.now() - lock.ts > CAPTION_LOCK_TTL);
    const canSteal = lock && lock.micOn === false;
    if (isStale || canSteal || lock.id === tabIdRef.current) {
      writeCaptionLock(true);
      return true;
    }
    return false;
  };

  // ── Socket callbacks (defined as stable refs) ─────────────────────────────
  const socketCallbacks = useRef({});

  const { emit, socketRef } = useSocket(meetingId, {
    onConnect: () => {
      setJoined();
      if (joinRequestedRef.current && !joinedRoomRef.current) {
        emit('join-room', {
          meetingId,
          userId: user?.id,
          userName: user?.name || 'Guest',
          isMuted: !isMicOn,
          isCameraOff: !isCameraOn
        });
        joinedRoomRef.current = true;
      }
    },
    onDisconnect: () => {
      joinedRoomRef.current = false;
    },
    onRoomPeers: (peers) => socketCallbacks.current.onRoomPeers?.(peers),
    onUserJoined: (data) => socketCallbacks.current.onUserJoined?.(data),
    onUserLeft: (data) => socketCallbacks.current.onUserLeft?.(data),
    onUserUpdated: (data) => socketCallbacks.current.onUserUpdated?.(data),
    onOffer: (data) => socketCallbacks.current.onOffer?.(data),
    onAnswer: (data) => socketCallbacks.current.onAnswer?.(data),
    onIceCandidate: (data) => socketCallbacks.current.onIceCandidate?.(data),
    onMessage: (data) => socketCallbacks.current.onMessage?.(data),
    onMediaState: (data) => socketCallbacks.current.onMediaState?.(data),
    onCaption: (data) => socketCallbacks.current.onCaption?.(data),
  });

  // Wire real WebRTC callbacks to socket
  useEffect(() => {
    socketCallbacks.current = {
      onRoomPeers: (peers) => {
        peers.forEach(peer => {
          updateParticipantMedia(peer.socketId, { 
            isMuted: peer.isMuted, 
            isCameraOff: peer.isCameraOff, 
            name: peer.userName 
          });
          if (localReadyRef.current) {
            callPeer(peer.socketId, peer, emit);
          } else {
            pendingPeersRef.current.push({ socketId: peer.socketId, user: peer });
          }
        });
      },
      onUserJoined: ({ socketId, userId, userName, isMuted, isCameraOff }) => {
        console.log('[Meeting] User joined:', userName);
        updateParticipantMedia(socketId, { isMuted, isCameraOff, name: userName });
      },
      onUserLeft: ({ socketId, userName }) => {
        console.log('[Meeting] User left:', userName);
        closePeer(socketId);
      },
      onUserUpdated: ({ socketId, userName, isMuted, isCameraOff }) => {
        updateParticipantMedia(socketId, { isMuted, isCameraOff, name: userName });
      },
      onOffer: (data) => handleOffer(data, emit),
      onAnswer: (data) => handleAnswer(data),
      onIceCandidate: (data) => handleIceCandidate(data),
      onMediaState: ({ from, isMuted, isCameraOff }) => {
        updateParticipantMedia(from, { isMuted, isCameraOff });
      },
      onCaption: (caption) => {
        addCaption(caption);
      },
      onMessage: (msg) => {
        addMessage({
          id: msg.id,
          text: msg.message,
          sender: msg.userName,
          senderId: msg.from,
          timestamp: msg.timestamp,
        });
      },
    };
  }, [callPeer, handleOffer, handleAnswer, handleIceCandidate, closePeer, emit, updateParticipantMedia, addCaption, addMessage]);

  // Update identity once user is available
  useEffect(() => {
    if (!meetingId || !socketRef.current?.connected) return;
    if (!user?.name && !user?.id) return;
    emit('update-user', {
      meetingId,
      userId: user?.id,
      userName: user?.name || 'Guest',
      isMuted: !isMicOn,
      isCameraOff: !isCameraOn,
    });
  }, [meetingId, user?.id, user?.name, emit, socketRef, isMicOn, isCameraOn]);

  const sendMessage = useCallback((text, userName) => {
    emit('chat-message', { meetingId, message: text, userName });
  }, [emit, meetingId]);

  // ── Emit media state when mic/camera toggles ──────────────────────────────
  useEffect(() => {
    if (isJoined) {
      emit('media-state', { meetingId, isMuted: !isMicOn, isCameraOff: !isCameraOn });
    }
  }, [isMicOn, isCameraOn, emit, meetingId, isJoined]);

  // ── Flush transcript batch to backend every 10s ───────────────────────────
  const flushTranscripts = useCallback(async () => {
    const batch = transcriptBatchRef.current.splice(0);
    for (const item of batch) {
      await saveTranscriptChunk(meetingId, user?.id, item.text, item.timestamp);
    }
  }, [meetingId, user?.id]);

  // ── Start captions + transcript pipeline ─────────────────────────────────
  const startCaptions = useCallback(() => {
    // Stop any existing stream first
    captionStopRef.current?.();
    clearInterval(transcriptTimerRef.current);
    clearInterval(captionLockTimerRef.current);

    if (!isMicOn) return;
    if (!tryAcquireCaptionLock()) return;

    captionLockTimerRef.current = setInterval(() => {
      writeCaptionLock(true);
    }, 3000);
    
    captionStopRef.current = startCaptionStream((caption) => {
      if (!isMicOn) return;
      addCaption(caption);
      emit('caption', { meetingId, caption });

      if (caption.final && caption.text?.trim()) {
        transcriptBatchRef.current.push(caption);
      }
    }, user?.name || 'You');

    transcriptTimerRef.current = setInterval(flushTranscripts, 10000);
  }, [addCaption, flushTranscripts, user?.name, emit, meetingId, isMicOn]);

  // ── Join meeting ──────────────────────────────────────────────────────────
  const join = useCallback(async () => {
    joinRequestedRef.current = true;
    const localPromise = startLocalStream().then(() => {
      localReadyRef.current = true;
      const pending = pendingPeersRef.current.splice(0);
      pending.forEach(({ socketId, user }) => callPeer(socketId, user, emit));
    });

    setJoined();

    // Join Socket.io room
    if (socketRef.current?.connected && !joinedRoomRef.current) {
      emit('join-room', {
        meetingId,
        userId: user?.id,
        userName: user?.name || 'Guest',
        isMuted: !isMicOn,
        isCameraOff: !isCameraOn
      });
      joinedRoomRef.current = true;
    }

    if (user?.id) {
      await markAttendance(meetingId, user.id);
    }

    if (isMicOn) {
      startCaptions();
    }
    await localPromise;
  }, [startLocalStream, setJoined, emit, meetingId, user, startCaptions, isMicOn, isCameraOn, callPeer, socketRef]);

  // Pause/resume captions when mic is toggled
  useEffect(() => {
    if (!isJoined) return;
    if (isMicOn) {
      startCaptions();
    } else {
      captionStopRef.current?.();
      clearInterval(transcriptTimerRef.current);
      clearInterval(captionLockTimerRef.current);
      writeCaptionLock(false);
      releaseCaptionLock();
    }
  }, [isMicOn, isJoined, startCaptions]);

  // ── Leave meeting ─────────────────────────────────────────────────────────
  const leave = useCallback(async () => {
    captionStopRef.current?.();
    clearInterval(transcriptTimerRef.current);
    await flushTranscripts();

    emit('leave-room', { meetingId });

    if (user?.id) {
      await markLeave(meetingId, user.id);
    }

    cleanup();
    leaveMeeting();
  }, [cleanup, leaveMeeting, emit, meetingId, user, flushTranscripts]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      captionStopRef.current?.();
      clearInterval(transcriptTimerRef.current);
      clearInterval(captionLockTimerRef.current);
      releaseCaptionLock();
      cleanup();
      leaveMeeting();
    };
  }, [cleanup, leaveMeeting]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== CAPTION_LOCK_KEY) return;
      const lock = readCaptionLock();
      if (lock?.id && lock.id !== tabIdRef.current) {
        captionStopRef.current?.();
        clearInterval(transcriptTimerRef.current);
        clearInterval(captionLockTimerRef.current);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { join, leave, startScreenShare, stopScreenShare, sendMessage };
}
