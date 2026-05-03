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
    onMessage: (data) => addMessage({ ...data, from: data.userName }),
    onMediaState: (data) => socketCallbacks.current.onMediaState?.(data),
    onCaption: (data) => socketCallbacks.current.onCaption?.(data),
  });

  // Wire real WebRTC callbacks to socket
  useEffect(() => {
    socketCallbacks.current = {
      onRoomPeers: (peers) => {
        // Call all existing peers in the room
        peers.forEach(peer => {
          updateParticipantMedia(peer.socketId, { isMuted: peer.isMuted, isCameraOff: peer.isCameraOff, name: peer.userName });
          callPeer(peer.socketId, peer, emit);
        });
      },
      onUserJoined: ({ socketId, userId, userName, isMuted, isCameraOff }) => {
        console.log('[Meeting] User joined:', userName, '- waiting for their offer');
        updateParticipantMedia(socketId, { isMuted, isCameraOff, name: userName });
        // Do not callPeer here, otherwise both sides emit offers and cause a glare/race condition!
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
    };
  }, [callPeer, handleOffer, handleAnswer, handleIceCandidate, closePeer, emit, updateParticipantMedia, addCaption]);

  // ── Emit media state when mic/camera toggles ──────────────────────────────
  useEffect(() => {
    emit('media-state', { meetingId, isMuted: !isMicOn, isCameraOff: !isCameraOn });
  }, [isMicOn, isCameraOn, emit, meetingId]);

  // ── Flush transcript batch to backend every 10s ───────────────────────────
  const flushTranscripts = useCallback(async () => {
    const batch = transcriptBatchRef.current.splice(0);
    for (const item of batch) {
      await saveTranscriptChunk(meetingId, user?.id, item.text);
    }
  }, [meetingId, user?.id]);

  // ── Start captions + transcript pipeline ─────────────────────────────────
  const startCaptions = useCallback(() => {
    captionStopRef.current = startCaptionStream((caption) => {
      addCaption(caption);
      // Broadcast local caption to room
      emit('caption', { meetingId, caption });
      
      if (caption.final && caption.text?.trim()) {
        transcriptBatchRef.current.push(caption);
      }
    }, user?.name || 'You');

    // Flush transcripts to DB every 10s
    transcriptTimerRef.current = setInterval(flushTranscripts, 10000);
  }, [addCaption, flushTranscripts, user?.name]);

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

    // Mark attendance in DB
    if (user?.id) {
      await markAttendance(meetingId, user.id);
    }

    startCaptions();
  }, [startLocalStream, setJoined, emit, meetingId, user, startCaptions]);

  // ── Leave meeting ─────────────────────────────────────────────────────────
  const leave = useCallback(async () => {
    // Stop captions
    captionStopRef.current?.();
    clearInterval(transcriptTimerRef.current);
    await flushTranscripts(); // flush remaining

    // Notify socket
    emit('leave-room', { meetingId });

    // Mark leave in DB
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
      // Only clean the store if we actually unmount the component
      leaveMeeting();
    };
  }, [cleanup, leaveMeeting]);

  return { join, leave, startScreenShare, stopScreenShare };
}
