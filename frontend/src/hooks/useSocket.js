import { useEffect, useRef, useCallback } from 'react'

/**
 * Simulates Socket.io connection for demo purposes.
 * In production, replace with: import { io } from 'socket.io-client'
 */
export function useSocket(meetingId, { onCaption, onParticipantJoin, onParticipantLeave, onMessage } = {}) {
  const socketRef = useRef(null)
  const callbacksRef = useRef({ onCaption, onParticipantJoin, onParticipantLeave, onMessage })

  // Keep callbacks fresh
  useEffect(() => {
    callbacksRef.current = { onCaption, onParticipantJoin, onParticipantLeave, onMessage }
  })

  const connect = useCallback(() => {
    // Simulated socket object
    const mock = {
      id: `socket_${Date.now()}`,
      connected: true,
      emit: (event, data) => {
        console.log('[Socket EMIT]', event, data)
      },
      disconnect: () => {
        mock.connected = false
      },
    }
    socketRef.current = mock
    return mock
  }, [])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  useEffect(() => {
    if (!meetingId) return
    connect()
    return () => disconnect()
  }, [meetingId, connect, disconnect])

  return { emit, disconnect, socketRef }
}
