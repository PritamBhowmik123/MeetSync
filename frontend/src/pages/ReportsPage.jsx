import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import { getPastMeetings } from '../services/meetingService'
import { getAttendanceReport } from '../services/attendanceService'
import { formatDate, formatTime, formatDuration } from '../utils/formatters'

export default function ReportsPage() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getPastMeetings()
      .then(setMeetings)
      .finally(() => setLoading(false))
  }, [])

  const handleSelectMeeting = async (meeting) => {
    setSelected(meeting)
    setDetail(null)
    setDetailLoading(true)
    try {
      const a = await getAttendanceReport(meeting.id)
      setDetail({ attendance: a })
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = meetings.filter(m => {
    if (filter === 'high')   return (m.attendance ?? 0) >= 80
    if (filter === 'medium') return (m.attendance ?? 0) >= 50 && (m.attendance ?? 0) < 80
    if (filter === 'low')    return (m.attendance ?? 0) < 50
    return true
  })

  const avgAtt = meetings.length
    ? Math.round(meetings.reduce((s, m) => s + (m.attendance ?? 0), 0) / meetings.length)
    : 0

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm">Deep dive into your meeting history and participation data</p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Meetings', value: meetings.length, icon: '📅', color: 'text-indigo-400' },
            { label: 'Avg Attendance', value: `${avgAtt}%`, icon: '👥', color: 'text-emerald-400' },
            { label: 'Total Duration', value: `${meetings.reduce((s, m) => s + (m.duration || 0), 0)}m`, icon: '🕒', color: 'text-amber-400' },
            { label: 'Participants', value: [...new Set(meetings.flatMap(m => m.participants))].length, icon: '🧑‍💼', color: 'text-violet-400' },
          ].map((s, i) => (
            <div key={i} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Attendance Chart */}
        {!loading && meetings.length > 0 && (
          <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">📊 Attendance Timeline</h2>
            <div className="flex items-end gap-2 h-32">
              {meetings.map((m, i) => {
                const pct = m.attendance ?? 0
                const barH = Math.max((pct / 100) * 100, 4)
                const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                    onClick={() => handleSelectMeeting(m)}
                    title={m.title}
                  >
                    <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {pct}%
                    </span>
                    <div
                      className={`w-full rounded-t-sm ${color} transition-all duration-300 group-hover:opacity-80 ${
                        selected?.id === m.id ? 'ring-2 ring-white/30' : ''
                      }`}
                      style={{ height: `${barH}%` }}
                    />
                    <span className="text-[9px] text-slate-600 truncate w-full text-center">
                      {m.title.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />≥80%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />50–79%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />&lt;50%</span>
            </div>
          </div>
        )}

        {/* Content: list + detail */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Meeting list */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-200">Past Meetings</h2>
              <div className="ml-auto flex items-center gap-1">
                {['all', 'high', 'medium', 'low'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[10px] px-2 py-1 rounded-lg transition-all cursor-pointer capitalize ${
                      filter === f
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} variant="card" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(m => {
                  const pct = m.attendance ?? 0
                  const isSelected = selected?.id === m.id
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMeeting(m)}
                      className={`bg-[#16161f] border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-500/40 bg-indigo-500/5'
                          : 'border-[#2a2a3a] hover:border-indigo-500/20 hover:bg-[#1c1c28]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-medium text-slate-200 leading-tight">{m.title}</h3>
                        <Badge variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'} className="flex-shrink-0">
                          {pct}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDate(m.scheduledAt)}</span>
                        <span>{m.duration}m · {m.participants.length} people</span>
                      </div>
                      <div className="mt-2 h-1 bg-[#2a2a3a] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-12 flex flex-col items-center gap-3 text-center h-full justify-center">
                <div className="text-5xl opacity-20">📊</div>
                <p className="text-slate-500 text-sm">Select a meeting to view detailed analytics</p>
              </div>
            ) : (
              <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl overflow-hidden animate-fade-in">
                <div className="px-5 py-4 border-b border-[#2a2a3a]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-100">{selected.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(selected.scheduledAt)} · {formatTime(selected.scheduledAt)} · {selected.duration}min
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/summary/${selected.id}`, { state: { title: selected.title } })}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex-shrink-0"
                    >
                      View full summary →
                    </button>
                  </div>
                </div>

                {/* Participation bar chart */}
                {detailLoading ? (
                  <div className="p-5 space-y-3">
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} variant="text" />)}
                  </div>
                ) : detail ? (
                  <div className="p-5 space-y-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Participation Stats</h4>
                    <div className="space-y-3">
                      {detail.attendance.map(p => (
                        <div key={p.id} className="flex items-center gap-3">
                          <Avatar name={p.name} size="xs" className="flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-300 truncate">{p.name}</span>
                              <span className="text-xs font-mono text-slate-400 ml-2">{p.totalTime}</span>
                            </div>
                            <div className="h-2 bg-[#2a2a3a] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  p.percentage >= 80 ? 'bg-emerald-500' : p.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${p.percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-xs font-medium w-10 text-right flex-shrink-0 ${
                            p.percentage >= 80 ? 'text-emerald-400' : p.percentage >= 40 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {p.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Join/leave chart */}
                    <div className="mt-4 pt-4 border-t border-[#2a2a3a]">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Join / Leave Events</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {detail.attendance.filter(p => p.joinCount > 0).map(p => (
                          <div key={p.id} className="bg-[#1c1c28] rounded-lg p-2.5 border border-[#2a2a3a]">
                            <div className="text-[10px] text-slate-500 mb-1 truncate">{p.name.split(' ')[0]}</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-emerald-400">↓{p.joinCount}</span>
                              <span className="text-red-400">↑{p.leaveCount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
