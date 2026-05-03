import { useNavigate } from 'react-router-dom'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import { formatDate, formatTime } from '../../utils/formatters'

export default function MeetingCard({ meeting, type = 'upcoming' }) {
  const navigate = useNavigate()
  const isPast = type === 'past'

  // Normalize DB snake_case → camelCase
  const scheduledAt = meeting.scheduledAt || meeting.scheduled_at
  const participants = meeting.participants || []
  const attendancePct = meeting.attendance ?? null
  const code = meeting.code || ''
  const duration = meeting.duration || 0

  const handleClick = () => {
    if (isPast) {
      navigate(`/summary/${meeting.id}`, { state: { title: meeting.title } })
    } else {
      navigate(`/meeting/${meeting.id}`, { state: { title: meeting.title, isHost: false } })
    }
  }

  return (
    <div
      onClick={handleClick}
      className="group bg-[#16161f] hover:bg-[#1c1c28] border border-[#2a2a3a] hover:border-indigo-500/30
        rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5
        hover:-translate-y-0.5 animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 text-sm group-hover:text-white transition-colors truncate">
            {meeting.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(scheduledAt)} · {formatTime(scheduledAt)}
          </p>
        </div>
        <div className="flex-shrink-0">
          {isPast ? (
            attendancePct !== null ? (
              <Badge variant={attendancePct >= 80 ? 'success' : attendancePct >= 50 ? 'warning' : 'danger'}>
                {attendancePct}% attended
              </Badge>
            ) : (
              <Badge variant="default">Completed</Badge>
            )
          ) : (
            <Badge variant="primary" dot>Upcoming</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Participant avatars */}
        <div className="flex items-center">
          {participants.length > 0 ? (
            <div className="flex -space-x-1.5">
              {participants.slice(0, 4).map((name, i) => (
                <Avatar key={i} name={typeof name === 'string' ? name : String(name)} size="xs" className="ring-2 ring-[#16161f]" />
              ))}
              {participants.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-[#2a2a3a] border-2 border-[#16161f] flex items-center justify-center text-[9px] text-slate-400">
                  +{participants.length - 4}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-600 italic">No participants yet</span>
          )}
          {participants.length > 0 && (
            <span className="ml-2 text-xs text-slate-500">{participants.length} people</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          {duration > 0 && <span>🕒 {duration}m</span>}
          {code && (
            <span className="text-[10px] bg-[#1c1c28] group-hover:bg-indigo-600/20 group-hover:text-indigo-300
              text-slate-500 px-2 py-0.5 rounded-full border border-[#2a2a3a] group-hover:border-indigo-500/30
              transition-all font-mono">
              #{code}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
