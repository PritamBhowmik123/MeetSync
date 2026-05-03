import { useEffect, useRef, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Real WebRTC hook — manages peer connections via Socket.io signaling.
 * All mock peers and canvas streams removed.
 */
export function useWebRTC(meetingId) {
  const {
    setLocalStream,
    addRemoteStream,
    removeRemoteStream,
    setSpeaking,
    isMicOn,
    isCameraOn,
  } = useMeetingStore();

  const localStreamRef = useRef(null);
  const peersRef = useRef({});          // { socketId: RTCPeerConnection }
  const peerUsersRef = useRef({});      // { socketId: { userId, userName } }
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const speakingRef = useRef(false);

  // ── Local Media ────────────────────────────────────────────────────────────
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setupAudioAnalyser(stream);
      return stream;
    } catch (err) {
      console.warn('getUserMedia failed:', err.message);
      // Return empty MediaStream so the app still works (video tile shows placeholder)
      const emptyStream = new MediaStream();
      localStreamRef.current = emptyStream;
      setLocalStream(emptyStream);
      return emptyStream;
    }
  }, [setLocalStream]);

  // ── Audio Analyser (speaking detection) ───────────────────────────────────
  const setupAudioAnalyser = (stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const detect = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const isSpeaking = avg > 15;
        if (isSpeaking !== speakingRef.current) {
          speakingRef.current = isSpeaking;
          setSpeaking('local', isSpeaking);
        }
        requestAnimationFrame(detect);
      };
      detect();
    } catch (e) {
      console.warn('Audio analyser setup failed:', e);
    }
  };

  // ── Create Peer Connection ─────────────────────────────────────────────────
  const createPeerConnection = useCallback((socketId, userInfo, emit) => {
    if (peersRef.current[socketId]) return peersRef.current[socketId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[socketId] = pc;
    peerUsersRef.current[socketId] = userInfo;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Remote stream handler
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!remoteStream.getTracks().includes(track)) remoteStream.addTrack(track);
        });
      } else {
        if (!remoteStream.getTracks().includes(event.track)) remoteStream.addTrack(event.track);
      }
      addRemoteStream(socketId, remoteStream, userInfo?.userName || socketId);
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emit('ice-candidate', { to: socketId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${socketId} state: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(socketId);
      }
    };

    return pc;
  }, [addRemoteStream]);

  // ── Initiate Call (caller side) ───────────────────────────────────────────
  const callPeer = useCallback(async (socketId, userInfo, emit) => {
    const pc = createPeerConnection(socketId, userInfo, emit);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emit('offer', { to: socketId, offer });
      console.log('[WebRTC] Sent offer to', socketId);
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
    }
  }, [createPeerConnection]);

  // ── Handle Incoming Offer (callee side) ───────────────────────────────────
  const handleOffer = useCallback(async ({ from, fromUser, offer }, emit) => {
    const pc = createPeerConnection(from, fromUser, emit);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emit('answer', { to: from, answer });
      console.log('[WebRTC] Sent answer to', from);
    } catch (err) {
      console.error('[WebRTC] Failed to handle offer:', err);
    }
  }, [createPeerConnection]);

  // ── Handle Incoming Answer ─────────────────────────────────────────────────
  const handleAnswer = useCallback(async ({ from, answer }) => {
    const pc = peersRef.current[from];
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Set remote answer from', from);
    } catch (err) {
      console.error('[WebRTC] Failed to set remote answer:', err);
    }
  }, []);

  // ── Handle ICE Candidate ───────────────────────────────────────────────────
  const handleIceCandidate = useCallback(async ({ from, candidate }) => {
    const pc = peersRef.current[from];
    if (!pc || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WebRTC] Failed to add ICE candidate:', err);
    }
  }, []);

  // ── Close a single peer ───────────────────────────────────────────────────
  const closePeer = useCallback((socketId) => {
    peersRef.current[socketId]?.close();
    delete peersRef.current[socketId];
    delete peerUsersRef.current[socketId];
    removeRemoteStream(socketId);
  }, [removeRemoteStream]);

  // ── Screen Share ──────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const videoTrack = screenStream.getVideoTracks()[0];
    Object.values(peersRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      sender?.replaceTrack(videoTrack);
    });
    videoTrack.onended = () => stopScreenShare();
    return screenStream;
  }, []);

  const stopScreenShare = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        Object.values(peersRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          sender?.replaceTrack(videoTrack);
        });
      }
    }
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.keys(peersRef.current).forEach(id => peersRef.current[id]?.close());
    audioContextRef.current?.close();
    peersRef.current = {};
    peerUsersRef.current = {};
    analyserRef.current = null;
    audioContextRef.current = null;
  }, []);

  // ── Camera toggle (hardware) ───────────────────────────────────────────────
  useEffect(() => {
    if (!localStreamRef.current) return;
    if (!isCameraOn) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.stop();
        localStreamRef.current.removeTrack(t);
      });
    } else {
      if (localStreamRef.current.getVideoTracks().length === 0) {
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
          .then(stream => {
            const newTrack = stream.getVideoTracks()[0];
            localStreamRef.current.addTrack(newTrack);
            Object.values(peersRef.current).forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(newTrack);
            });
            const newStream = new MediaStream(localStreamRef.current.getTracks());
            localStreamRef.current = newStream;
            setLocalStream(newStream);
          })
          .catch(err => console.warn('Camera resume failed:', err));
      }
    }
  }, [isCameraOn, setLocalStream]);

  // ── Mic toggle (hardware) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!localStreamRef.current) return;
    if (!isMicOn) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.stop();
        localStreamRef.current.removeTrack(t);
      });
    } else {
      if (localStreamRef.current.getAudioTracks().length === 0) {
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
          .then(stream => {
            const newTrack = stream.getAudioTracks()[0];
            localStreamRef.current.addTrack(newTrack);
            Object.values(peersRef.current).forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
              if (sender) sender.replaceTrack(newTrack);
            });
            const newStream = new MediaStream(localStreamRef.current.getTracks());
            localStreamRef.current = newStream;
            setLocalStream(newStream);
          })
          .catch(err => console.warn('Mic resume failed:', err));
      }
    }
  }, [isMicOn, setLocalStream]);

  return {
    startLocalStream,
    startScreenShare,
    stopScreenShare,
    callPeer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closePeer,
    cleanup,
    peersRef,
  };
}
