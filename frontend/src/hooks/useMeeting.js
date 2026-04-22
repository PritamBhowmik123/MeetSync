import { useEffect, useRef, useCallback } from 'react'
import { useMeetingStore } from '../store/meetingStore'
import { useWebRTC } from './useWebRTC'
import { useSocket } from './useSocket'
import { startCaptionStream } from '../services/transcriptionService'
import { runFaceRecognition, markAttendance } from '../services/attendanceService'

export function useMeeting(meetingId) {
  const {
    addCaption,
    setJoined,
    updateAttendance,
    leaveMeeting,
  } = useMeetingStore()

  const { startLocalStream, startScreenShare, stopScreenShare, addMockPeers, cleanup } = useWebRTC(meetingId)
  const { emit } = useSocket(meetingId)

  const captionTimerRef = useRef(null)
  const faceRecTimerRef = useRef(null)
  const currentCaptionRef = useRef(null)

  const startCaptions = useCallback(() => {
    const triggerCaption = () => {
      if (currentCaptionRef.current) return
      currentCaptionRef.current = startCaptionStream((caption) => {
        addCaption(caption)
        if (caption.final) currentCaptionRef.current = null
      })
    }

    triggerCaption()
    captionTimerRef.current = setInterval(() => {
      if (!currentCaptionRef.current) triggerCaption()
    }, 4000)
  }, [addCaption])

  const startFaceRecognition = useCallback((meetingId) => {
    faceRecTimerRef.current = setInterval(async () => {
      try {
        const result = await runFaceRecognition(meetingId, null)
        const attendance = {}
        result.recognized.forEach(name => {
          attendance[name] = { marked: true, confidence: result.confidence, at: new Date().toISOString() }
        })
        updateAttendance(attendance)
      } catch (e) {
        console.warn('Face recognition failed:', e)
      }
    }, 15000)
  }, [updateAttendance])

  const join = useCallback(async () => {
    await startLocalStream()
    setJoined()
    addMockPeers()
    startCaptions()
    startFaceRecognition(meetingId)
    emit('join-room', { meetingId })
    await markAttendance(meetingId, 'local')
  }, [startLocalStream, setJoined, addMockPeers, startCaptions, startFaceRecognition, meetingId, emit])

  const leave = useCallback(() => {
    clearInterval(captionTimerRef.current)
    clearInterval(faceRecTimerRef.current)
    currentCaptionRef.current?.()
    cleanup()
    leaveMeeting()
    emit('leave-room', { meetingId })
  }, [cleanup, leaveMeeting, emit, meetingId])

  useEffect(() => {
    return () => {
      clearInterval(captionTimerRef.current)
      clearInterval(faceRecTimerRef.current)
    }
  }, [])

  return { join, leave, startScreenShare, stopScreenShare }
}
