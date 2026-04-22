import { useMeetingStore } from '../../store/meetingStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

export default function ParticipantList() {
  const { participants, speakingPeers, attendanceData } = useMeetingStore()
  const { user } = useAuthStore()

  const allParticipants = [
    { id: 'local', name: user?.name || 'You', isLocal: true, isMuted: false, isCameraOff: false },
    ...participants,
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#1e1e2a] flex items-center gap-2">
        <span className="text-indigo-400">👥</span>
        <span className="text-sm font-semibold text-slate-200">Participants</span>
        <span className="ml-auto text-xs bg-[#1c1c28] text-slate-400 px-2 py-0.5 rounded-full border border-[#2a2a3a]">
          {allParticipants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {allParticipants.map(p => {
          const isSpeaking = speakingPeers.has(p.id)
          const attended = Object.keys(attendanceData).some(
            k => k.toLowerCase().includes((p.name || '').split(' ')[0].toLowerCase())
          )

          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isSpeaking ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-[#1c1c28]'
              }`}
            >
              <div className="relative">
                <Avatar name={p.name} size="sm" />
                {isSpeaking && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f0f17] animate-pulse" />
                )}
                {attended && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-[#0f0f17] flex items-center justify-center text-[8px]">✓</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-200 truncate">{p.name}</span>
                  {p.isLocal && <Badge variant="primary" className="text-[10px] px-1.5 py-0">You</Badge>}
                </div>
                {isSpeaking && <p className="text-xs text-emerald-400">Speaking...</p>}
              </div>

              <div className="flex items-center gap-1">
                {p.isMuted && <span className="text-xs text-slate-500" title="Muted">🔇</span>}
                {p.isCameraOff && <span className="text-xs text-slate-500" title="Camera off">📷</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
