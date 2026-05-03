import { useRef, useEffect } from 'react'
import { useMeetingStore } from '../../store/meetingStore'
import Avatar from '../ui/Avatar'
import { getInitials } from '../../utils/formatters'

export default function VideoTile({ stream, name, peerId, isLocal = false, isMuted = false, isCameraOff = false }) {
  const videoRef = useRef(null)
  const { speakingPeers, isMicOn } = useMeetingStore()

  const id = isLocal ? 'local' : peerId
  const isSpeaking = speakingPeers.has(id)
  const micMuted = isLocal ? !isMicOn : isMuted

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.muted = isLocal
    }
  }, [stream, isLocal])

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#111118] flex-shrink-0 transition-all duration-300 ${
        isSpeaking ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/10 speaking' : 'ring-1 ring-[#2a2a3a]'
      }`}
    >
      {/* Video */}
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#111118] to-[#1c1c28] min-h-[120px]">
          <div className="flex flex-col items-center gap-2">
            <Avatar name={name} size="xl" />
            <span className="text-xs text-slate-500 font-medium">{isLocal ? 'You' : name}</span>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between">
        <div className="flex items-center gap-1.5">
          {isSpeaking && (
            <span className="flex gap-0.5 items-end h-4">
              {[3,5,7,5,3].map((h,i) => (
                <span key={i} className="w-0.5 bg-emerald-400 rounded-full animate-pulse" style={{ height: h * 2 + 'px', animationDelay: i * 80 + 'ms' }} />
              ))}
            </span>
          )}
          <span className="text-xs text-white font-medium drop-shadow">{isLocal ? 'You' : name}</span>
        </div>
        <div className="flex items-center gap-1">
          {micMuted && (
            <span className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center text-[10px]">🔇</span>
          )}
          {isCameraOff && (
            <span className="w-5 h-5 rounded-full bg-slate-700/80 flex items-center justify-center text-[10px]">📷</span>
          )}
          {isLocal && (
            <span className="text-[10px] bg-indigo-600/80 text-white px-1.5 py-0.5 rounded-full font-medium">You</span>
          )}
        </div>
      </div>
    </div>
  )
}
