import { useEffect, useRef, useCallback } from 'react'
import { useMeetingStore } from '../store/meetingStore'

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

export function useWebRTC(meetingId) {
  const {
    setLocalStream,
    addRemoteStream,
    removeRemoteStream,
    setSpeaking,
    isMicOn,
    isCameraOn,
  } = useMeetingStore()

  const localStreamRef = useRef(null)
  const peersRef = useRef({})   // { peerId: RTCPeerConnection }
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const speakingRef = useRef(false)

  // Start local media capture
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      setupAudioAnalyser(stream)
      return stream
    } catch (err) {
      console.warn('getUserMedia failed, using mock stream:', err.message)
      const mockStream = createMockStream()
      localStreamRef.current = mockStream
      setLocalStream(mockStream)
      return mockStream
    }
  }, [setLocalStream])

  // Mock stream for environments without camera
  const createMockStream = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = 480
      const ctx = canvas.getContext('2d')
      const draw = () => {
        const hue = (Date.now() / 50) % 360
        ctx.fillStyle = `hsl(${hue}, 40%, 15%)`
        ctx.fillRect(0, 0, 640, 480)
        ctx.fillStyle = `hsl(${hue}, 60%, 60%)`
        ctx.font = 'bold 24px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('📷 Camera Unavailable', 320, 240)
        requestAnimationFrame(draw)
      }
      draw()
      const stream = canvas.captureStream(15)
      // Add silent audio track
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const dest = audioCtx.createMediaStreamDestination()
      stream.addTrack(dest.stream.getTracks()[0])
      return stream
    } catch {
      return new MediaStream([])
    }
  }

  // Audio analyser for speaking detection
  const setupAudioAnalyser = (stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      audioContextRef.current = ctx
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const detect = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const isSpeaking = avg > 15
        if (isSpeaking !== speakingRef.current) {
          speakingRef.current = isSpeaking
          setSpeaking('local', isSpeaking)
        }
        requestAnimationFrame(detect)
      }
      detect()
    } catch (e) {
      console.warn('Audio analyser setup failed:', e)
    }
  }

  // Screen share
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const videoTrack = screenStream.getVideoTracks()[0]
      // Replace video track in all peer connections
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        sender?.replaceTrack(videoTrack)
      })
      videoTrack.onended = () => stopScreenShare()
      return screenStream
    } catch (err) {
      throw new Error('Screen share cancelled or not supported')
    }
  }, [])

  const stopScreenShare = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        sender?.replaceTrack(videoTrack)
      })
    }
  }, [])

  // Add mock remote peers for demo
  const addMockPeers = useCallback(() => {
    const mockPeers = [
      { id: 'peer_1', name: 'Sarah Chen' },
      { id: 'peer_2', name: 'Mark Williams' },
      { id: 'peer_3', name: 'Priya Patel' },
    ]
    mockPeers.forEach(({ id, name }, i) => {
      setTimeout(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 640; canvas.height = 480
        const ctx = canvas.getContext('2d')
        const colors = ['#6366f1', '#10b981', '#f59e0b']
        const draw = () => {
          ctx.fillStyle = '#111118'
          ctx.fillRect(0, 0, 640, 480)
          ctx.fillStyle = colors[i % colors.length] + '33'
          ctx.fillRect(0, 0, 640, 480)
          ctx.fillStyle = colors[i % colors.length]
          ctx.font = 'bold 64px Inter'
          ctx.textAlign = 'center'
          ctx.fillText(name.charAt(0), 320, 260)
          ctx.fillStyle = '#94a3b8'
          ctx.font = '20px Inter'
          ctx.fillText(name, 320, 310)
          requestAnimationFrame(draw)
        }
        draw()
        const mockStream = canvas.captureStream(10)
        addRemoteStream(id, mockStream, name)

        // Simulate random speaking
        setInterval(() => {
          const speaking = Math.random() > 0.75
          setSpeaking(id, speaking)
        }, 2000 + i * 500)
      }, (i + 1) * 1500)
    })
  }, [addRemoteStream, setSpeaking])

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    Object.values(peersRef.current).forEach(pc => pc.close())
    audioContextRef.current?.close()
    peersRef.current = {}
  }, [])

  // True hardware toggling for Camera
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
              const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
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

  // True hardware toggling for Mic
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
              const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
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

  return { startLocalStream, startScreenShare, stopScreenShare, addMockPeers, cleanup }
}
