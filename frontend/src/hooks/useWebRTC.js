import { useEffect, useRef, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { registerStream, unregisterStream } from '../utils/mediaRegistry';

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
  const cameraTrackRef = useRef(null);
  const micTrackRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const peersRef = useRef({});          // { socketId: RTCPeerConnection }
  const peerUsersRef = useRef({});      // { socketId: { userId, userName } }
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const speakingRef = useRef(false);

  // ── Local Media ────────────────────────────────────────────────────────────
  const startLocalStream = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        unregisterStream(localStreamRef.current);
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      registerStream(stream);
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMicOn;
        micTrackRef.current = track;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = isCameraOn;
        cameraTrackRef.current = track;
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setupAudioAnalyser(stream);
      // Attach or replace tracks on any existing peers.
      Object.values(peersRef.current).forEach(pc => {
        stream.getTracks().forEach(track => {
          const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });
      return stream;
    } catch (err) {
      console.warn('getUserMedia failed:', err.message);
      // Return empty MediaStream so the app still works (video tile shows placeholder)
      const emptyStream = new MediaStream();
      localStreamRef.current = emptyStream;
      setLocalStream(emptyStream);
      return emptyStream;
    }
  }, [isMicOn, isCameraOn, setLocalStream]);

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
      addRemoteStream(socketId, remoteStream, userInfo?.userName || socketId, userInfo?.userId);
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
    if (!localStreamRef.current || localStreamRef.current.getTracks().length === 0) {
      await startLocalStream();
    }
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
  }, [createPeerConnection, startLocalStream]);

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
  }, [setLocalStream]);

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
  const stopScreenShare = useCallback(() => {
    const screenTrack = screenTrackRef.current;
    const cameraTrack = cameraTrackRef.current;

    if (screenTrack) {
      screenTrack.stop();
      screenTrackRef.current = null;
    }
    if (screenStreamRef.current) {
      unregisterStream(screenStreamRef.current);
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    if (cameraTrack && isCameraOn) {
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(cameraTrack);
        else pc.addTrack(cameraTrack, localStreamRef.current || new MediaStream([cameraTrack]));
      });

      const audioTracks = localStreamRef.current?.getAudioTracks() || [];
      const previewStream = new MediaStream([...audioTracks, cameraTrack]);
      localStreamRef.current = previewStream;
      setLocalStream(previewStream);
    } else {
      const audioTracks = localStreamRef.current?.getAudioTracks() || [];
      const previewStream = new MediaStream([...audioTracks]);
      localStreamRef.current = previewStream;
      setLocalStream(previewStream);
    }
  }, [isCameraOn, setLocalStream, startLocalStream]);

  const startScreenShare = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const videoTrack = screenStream.getVideoTracks()[0];
    registerStream(screenStream);
    screenStreamRef.current = screenStream;
    screenTrackRef.current = videoTrack;

    Object.values(peersRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
      else pc.addTrack(videoTrack, localStreamRef.current || new MediaStream([videoTrack]));
    });

    // Update local preview to show the shared screen.
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    const previewStream = new MediaStream([...audioTracks, videoTrack]);
    localStreamRef.current = previewStream;
    setLocalStream(previewStream);

    videoTrack.onended = () => stopScreenShare();
    return screenStream;
  }, [setLocalStream, stopScreenShare]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    if (localStreamRef.current) unregisterStream(localStreamRef.current);
    Object.keys(peersRef.current).forEach(id => peersRef.current[id]?.close());
    audioContextRef.current?.close();
    peersRef.current = {};
    peerUsersRef.current = {};
    analyserRef.current = null;
    audioContextRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    if (screenStreamRef.current) unregisterStream(screenStreamRef.current);
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    if (cameraTrackRef.current) {
      cameraTrackRef.current.stop();
      cameraTrackRef.current = null;
    }
    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current = null;
    }
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  // ── Camera toggle (hardware) ───────────────────────────────────────────────
  useEffect(() => {
    if (!localStreamRef.current) {
      if (isCameraOn) startLocalStream();
      return;
    }
    const videoTracks = localStreamRef.current.getVideoTracks();

    if (!isCameraOn) {
      // Turn off camera hardware and stop sending video.
      videoTracks.forEach(t => {
        t.stop();
        localStreamRef.current.removeTrack(t);
      });
      cameraTrackRef.current = null;
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(null);
      });

      const audioTracks = localStreamRef.current.getAudioTracks();
      const newStream = new MediaStream([...audioTracks]);
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      return;
    }

    if (isCameraOn && videoTracks.length === 0) {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
        .then(stream => {
          const newTrack = stream.getVideoTracks()[0];
          newTrack.enabled = true;
          cameraTrackRef.current = newTrack;

          Object.values(peersRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(newTrack);
            else pc.addTrack(newTrack, localStreamRef.current);
          });

          const audioTracks = localStreamRef.current.getAudioTracks();
          const newStream = new MediaStream([...audioTracks, newTrack]);
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        })
        .catch(err => console.warn('Camera resume failed:', err));
    }
  }, [isCameraOn, setLocalStream]);

  // ── Mic toggle (hardware) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!localStreamRef.current) {
      if (isMicOn) startLocalStream();
      return;
    }
    const audioTracks = localStreamRef.current.getAudioTracks();

    if (!isMicOn) {
      // Turn off mic hardware and stop sending audio.
      audioTracks.forEach(t => {
        t.stop();
        localStreamRef.current.removeTrack(t);
      });
      micTrackRef.current = null;
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(null);
      });

      const videoTracks = localStreamRef.current.getVideoTracks();
      const newStream = new MediaStream([...videoTracks]);
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      return;
    }

    if (isMicOn && audioTracks.length === 0) {
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then(stream => {
          const newTrack = stream.getAudioTracks()[0];
          newTrack.enabled = true;
          micTrackRef.current = newTrack;

          Object.values(peersRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) sender.replaceTrack(newTrack);
            else pc.addTrack(newTrack, localStreamRef.current);
          });

          const videoTracks = localStreamRef.current.getVideoTracks();
          const newStream = new MediaStream([...videoTracks, newTrack]);
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        })
        .catch(err => console.warn('Mic resume failed:', err));
    }
  }, [isMicOn, setLocalStream, startLocalStream]);

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
