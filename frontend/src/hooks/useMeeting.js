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
  const captionsRunningRef = useRef(false);
  const localReadyRef = useRef(false);
  const pendingPeersRef = useRef([]);
  const joinRequestedRef = useRef(false);
  const joinedRoomRef = useRef(false);

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
            name: peer.userName,
            userId: peer.userId,
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
        updateParticipantMedia(socketId, { isMuted, isCameraOff, name: userName, userId });
      },
      onUserLeft: ({ socketId, userName }) => {
        console.log('[Meeting] User left:', userName);
        closePeer(socketId);
      },
      onUserUpdated: ({ socketId, userId, userName, isMuted, isCameraOff }) => {
        updateParticipantMedia(socketId, { isMuted, isCameraOff, name: userName, userId });
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
    if (captionsRunningRef.current) return;
    // Stop any existing stream first
    captionStopRef.current?.();
    clearInterval(transcriptTimerRef.current);
    captionsRunningRef.current = false;

    if (!isMicOn) return;
    
    captionStopRef.current = startCaptionStream((caption) => {
      if (!isMicOn) return;
      addCaption(caption);
      emit('caption', { meetingId, caption });

      if (caption.final && caption.text?.trim()) {
        transcriptBatchRef.current.push(caption);
      }
    }, user?.name || 'You');

    transcriptTimerRef.current = setInterval(flushTranscripts, 10000);
    captionsRunningRef.current = true;
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

    await localPromise;
    if (isMicOn) {
      startCaptions();
    }
  }, [startLocalStream, setJoined, emit, meetingId, user, startCaptions, isMicOn, isCameraOn, callPeer, socketRef]);

  // Pause/resume captions when mic is toggled
  useEffect(() => {
    if (!isJoined) return;
    if (isMicOn) {
      startCaptions();
    } else {
      captionStopRef.current?.();
      clearInterval(transcriptTimerRef.current);
      captionsRunningRef.current = false;
    }
  }, [isMicOn, isJoined, startCaptions]);

  // ── Leave meeting ─────────────────────────────────────────────────────────
  const leave = useCallback(async () => {
    try {
      captionStopRef.current?.();
      clearInterval(transcriptTimerRef.current);
      await flushTranscripts();

      emit('leave-room', { meetingId });

      if (user?.id) {
        await markLeave(meetingId, user.id);
      }
    } catch (e) {
      console.warn('Leave meeting cleanup issue:', e?.message || e);
    } finally {
      cleanup();
      leaveMeeting();
    }
  }, [cleanup, leaveMeeting, emit, meetingId, user, flushTranscripts]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      captionStopRef.current?.();
      clearInterval(transcriptTimerRef.current);
      captionsRunningRef.current = false;
      cleanup();
      leaveMeeting();
    };
  }, [cleanup, leaveMeeting]);

  useEffect(() => {
    const handlePageHide = () => {
      captionStopRef.current?.();
      clearInterval(transcriptTimerRef.current);
      captionsRunningRef.current = false;
      cleanup();
      leaveMeeting();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [cleanup, leaveMeeting]);

  return { join, leave, startScreenShare, stopScreenShare, sendMessage };
}
