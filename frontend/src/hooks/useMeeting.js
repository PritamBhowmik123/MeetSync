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

  // ── Socket callbacks (defined as stable refs) ─────────────────────────────
  const socketCallbacks = useRef({});

  const { emit, socketRef } = useSocket(meetingId, {
    onRoomPeers: (peers) => socketCallbacks.current.onRoomPeers?.(peers),
    onUserJoined: (data) => socketCallbacks.current.onUserJoined?.(data),
    onUserLeft: (data) => socketCallbacks.current.onUserLeft?.(data),
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
          callPeer(peer.socketId, peer, emit);
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
      await saveTranscriptChunk(meetingId, user?.id, item.text);
    }
  }, [meetingId, user?.id]);

  // ── Start captions + transcript pipeline ─────────────────────────────────
  const startCaptions = useCallback(() => {
    // Stop any existing stream first
    captionStopRef.current?.();
    clearInterval(transcriptTimerRef.current);
    
    captionStopRef.current = startCaptionStream((caption) => {
      addCaption(caption);
      emit('caption', { meetingId, caption });
      
      if (caption.final && caption.text?.trim()) {
        transcriptBatchRef.current.push(caption);
      }
    }, user?.name || 'You');

    transcriptTimerRef.current = setInterval(flushTranscripts, 10000);
  }, [addCaption, flushTranscripts, user?.name, emit, meetingId]);

  // ── Join meeting ──────────────────────────────────────────────────────────
  const join = useCallback(async () => {
    await startLocalStream();
    setJoined();

    // Join Socket.io room
    emit('join-room', {
      meetingId,
      userId: user?.id,
      userName: user?.name || 'Guest',
      isMuted: !isMicOn,
      isCameraOff: !isCameraOn
    });

    if (user?.id) {
      await markAttendance(meetingId, user.id);
    }

    startCaptions();
  }, [startLocalStream, setJoined, emit, meetingId, user, startCaptions, isMicOn, isCameraOn]);

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
      cleanup();
      leaveMeeting();
    };
  }, [cleanup, leaveMeeting]);

  return { join, leave, startScreenShare, stopScreenShare, sendMessage };
}
