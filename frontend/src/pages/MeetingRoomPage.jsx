import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useMeetingStore } from '../store/meetingStore'
import { useMeeting } from '../hooks/useMeeting'
import { useAuthStore } from '../store/authStore'
import VideoTile from '../components/meeting/VideoTile'
import ControlBar from '../components/meeting/ControlBar'
import LiveCaptions from '../components/LiveCaptions'
import ChatPanel from '../components/meeting/ChatPanel'
import ParticipantList from '../components/meeting/ParticipantList'
import { formatDuration } from '../utils/formatters'
import { updateMeetingStatus, getMeetingById } from '../services/meetingService'

export default function MeetingRoomPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const {
    localStream,
    remoteStreams,
    participants,
    isSidebarOpen,
    sidebarTab,
    isJoined,
    isConnecting,
    meetingTitle,
    attendanceData,
    captionsEnabled,
    joinMeeting,
    setSidebarTab,
    setScreenSharing,
    isScreenSharing,
    reset,
  } = useMeetingStore()

  const { join, leave, startScreenShare, stopScreenShare, sendMessage } = useMeeting(id)

  const [elapsed, setElapsed] = useState(0)
  const [attendanceFlash, setAttendanceFlash] = useState(false)
  const timerRef = useRef(null)
  const joinedRef = useRef(false)
  const faceCanvasRef = useRef(null)

  const [faceResult, setFaceResult] = useState(null)
  const [isFaceProcessing, setIsFaceProcessing] = useState(false)
  const [meetingDetails, setMeetingDetails] = useState(null)

  const title = meetingDetails?.title || state?.title || meetingTitle || 'Team Meeting'
  const meetingCode = meetingDetails?.code || state?.code

  // Boot meeting
  useEffect(() => {
    // Fetch real meeting details from DB
    getMeetingById(id)
      .then(data => setMeetingDetails(data))
      .catch(err => console.warn('Failed to load meeting details:', err))
      
    joinMeeting(id, title, state?.isHost ?? true)
    return () => { reset() }
  }, [id])

  // Join after store is ready
  useEffect(() => {
    if (!joinedRef.current && join) {
      joinedRef.current = true
      join()
    }
  }, [join])

  // Timer
  useEffect(() => {
    if (isJoined) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [isJoined])

  // Flash attendance indicator
  useEffect(() => {
    const keys = Object.keys(attendanceData)
    if (keys.length > 0) {
      setAttendanceFlash(true)
      const t = setTimeout(() => setAttendanceFlash(false), 3000)
      return () => clearTimeout(t)
    }
  }, [Object.keys(attendanceData).length])

  // Face Recognition logic
  useEffect(() => {
    let interval;
    if (isJoined && localStream) {
      interval = setInterval(async () => {
        if (isFaceProcessing) return;

        // Create a temporary video element to capture the frame
        const tempVideo = document.createElement('video');
        tempVideo.srcObject = localStream;
        
        tempVideo.onloadedmetadata = () => {
          tempVideo.play();
          
          // Use a timeout to ensure the video is actually playing and has frames
          setTimeout(async () => {
            const canvas = faceCanvasRef.current || document.createElement('canvas');
            canvas.width = tempVideo.videoWidth;
            canvas.height = tempVideo.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempVideo, 0, 0);
            const base64Image = canvas.toDataURL('image/jpeg');

            setIsFaceProcessing(true);
            try {
              const token = localStorage.getItem('ms_token');
              const res = await fetch('http://localhost:5000/api/face/recognize', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ image: base64Image })
              });
              const data = await res.json();
              setFaceResult(data);
            } catch (e) {
              console.error('Face recognition error:', e);
            } finally {
              setIsFaceProcessing(false);
              // Cleanup
              tempVideo.pause();
              tempVideo.srcObject = null;
            }
          }, 100);
        };
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isJoined, localStream, isFaceProcessing]);

  const handleLeave = async () => {
    await leave()
    // Mark meeting as completed if user is host
    try { await updateMeetingStatus(id, 'completed') } catch (_) {}
    navigate(`/summary/${id}`, { state: { title } })
  }

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare()
      setScreenSharing(false)
    } else {
      try {
        await startScreenShare()
        setScreenSharing(true)
      } catch (e) {
        alert(e.message)
      }
    }
  }

  // Build participant list for grid
  const remoteParticipants = participants.filter(p => p.id !== 'local')
  const totalCount = 1 + remoteParticipants.length
  const gridCount = Math.min(totalCount, 6)

  const sidebarContent = {
    chat: <ChatPanel onSendMessage={sendMessage} />,
    participants: <ParticipantList />,
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 glass border-b border-[#1e1e2a] flex items-center px-5 gap-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">M</div>
          <h1 className="font-semibold text-slate-200 text-sm truncate">{title}</h1>
          <span className="flex-shrink-0 flex items-center gap-1 text-xs bg-red-500/15 text-red-300 border border-red-500/25 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            LIVE
          </span>
          {meetingCode && (
            <div className="ml-2 px-2.5 py-0.5 rounded-md bg-[#1c1c28] border border-[#2a2a3a] text-xs font-mono text-slate-400 flex items-center gap-2">
              Code: <span className="text-indigo-400 font-bold select-all">{meetingCode}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Attendance flash */}
          {attendanceFlash && (
            <div className="flex items-center gap-1.5 text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-3 py-1 rounded-full animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Attendance marked
            </div>
          )}

          {/* Participant count */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>👥</span>
            <span>{totalCount} participant{totalCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Face Recognition Badge */}
          {faceResult && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${
              faceResult.matched 
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
            }`}>
              <span>{faceResult.matched ? '👤 Verified' : '❓ Unknown User'}</span>
              {faceResult.matched && <span className="opacity-60">ID: {faceResult.user_id}</span>}
            </div>
          )}

          {/* Timer */}
          <div className="font-mono text-sm text-slate-300 bg-[#1c1c28] px-3 py-1 rounded-lg border border-[#2a2a3a]">
            {isJoined ? formatDuration(elapsed) : '--:--'}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative p-3 overflow-hidden">
          {isConnecting && !isJoined ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Connecting to meeting...</p>
            </div>
          ) : (
            <div
              className="video-grid h-full"
              data-count={String(gridCount)}
            >
              {/* Local video */}
              <VideoTile
                stream={localStream}
                name={user?.name || 'You'}
                peerId="local"
                isLocal
              />

              {/* Remote videos */}
              {remoteParticipants.map(participant => (
                <VideoTile
                  key={participant.id}
                  stream={participant.stream || remoteStreams[participant.id]}
                  name={participant.name}
                  peerId={participant.id}
                  isMuted={participant.isMuted}
                  isCameraOff={participant.isCameraOff}
                />
              ))}
            </div>
          )}
          
          {/* Subtitle overlay */}
          {captionsEnabled && (
            <div className="absolute inset-x-0 bottom-4 pointer-events-none flex justify-center z-50">
              <LiveCaptions />
            </div>
          )}
        </div>

        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="w-80 flex-shrink-0 bg-[#111118] border-l border-[#1e1e2a] flex flex-col animate-slide-in">
            {/* Sidebar content */}
            <div className="flex-1 overflow-hidden">
              {sidebarContent[sidebarTab]}
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <ControlBar onLeave={handleLeave} onScreenShare={handleScreenShare} />
    </div>
  )
}
