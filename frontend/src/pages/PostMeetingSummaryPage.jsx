import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import { getMeetingSummary, getFullTranscript } from '../services/summaryService'
import { getAttendanceReport } from '../services/attendanceService'
import { formatDate, formatTime } from '../utils/formatters'

export default function PostMeetingSummaryPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [summary, setSummary] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')

  const title = state?.title || 'Meeting Summary'

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, a] = await Promise.all([
          getMeetingSummary(id),
          getFullTranscript(id),
          getAttendanceReport(id),
        ])
        setSummary(s)
        setTranscript(t)
        setAttendance(a)
      } catch (e) {
        setError('Failed to load meeting summary.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDownloadTxt = () => {
    if (!summary || !transcript) return
    const lines = [
      `MEETING SUMMARY — ${title}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Duration: ${summary.duration}`,
      '',
      '=== KEY POINTS ===',
      ...summary.keyPoints.map(p => `• ${p}`),
      '',
      '=== DECISIONS ===',
      ...summary.decisions.map(d => `• ${d}`),
      '',
      '=== ACTION ITEMS ===',
      ...summary.actionItems.map(a => `• [${a.owner}] ${a.task} (Due: ${a.due})`),
      '',
      '=== FULL TRANSCRIPT ===',
      ...transcript.map(t => `[${formatTime(t.timestamp)}] ${t.speaker}: ${t.text}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `meeting-summary-${id}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPdf = () => {
    // In production: use a PDF library like jsPDF or call backend
    alert('PDF download would use jsPDF or a backend endpoint in production.')
  }

  const TABS = ['summary', 'transcript', 'attendance']

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link to="/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← Dashboard</Link>
              <span className="text-slate-700">/</span>
              <span className="text-slate-500 text-sm">Summary</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {!loading && summary && (
                <>
                  <span>🕒 {summary.duration}</span>
                  <span>·</span>
                  <span>🤖 AI confidence: <span className="text-emerald-400">{summary.aiConfidence}%</span></span>
                  <span>·</span>
                  <Badge variant="success" dot>Completed</Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownloadTxt} disabled={loading}>
              ⬇ TXT
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadPdf} disabled={loading}>
              📄 PDF
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a3a] mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-all cursor-pointer border-b-2 ${
                activeTab === tab
                  ? 'text-indigo-300 border-indigo-500'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {{ summary: '🧠 AI Summary', transcript: '📝 Full Transcript', attendance: '👥 Attendance' }[tab]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <SummaryTab summary={summary} loading={loading} />
        )}
        {activeTab === 'transcript' && (
          <TranscriptTab transcript={transcript} loading={loading} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab attendance={attendance} loading={loading} />
        )}
      </div>
    </PageLayout>
  )
}

function SummaryTab({ summary, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 space-y-3">
            <Skeleton variant="text" className="w-1/3 h-5" />
            {Array(4).fill(0).map((_, j) => <Skeleton key={j} variant="text" />)}
          </div>
        ))}
      </div>
    )
  }
  if (!summary) return null

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Key Points */}
      <SummarySection
        icon="💡" title="Key Points" color="indigo"
        items={summary.keyPoints}
        renderItem={(item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
            {item}
          </li>
        )}
      />

      {/* Decisions */}
      <SummarySection
        icon="✅" title="Decisions Made" color="emerald"
        items={summary.decisions}
        renderItem={(item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
            <span className="text-emerald-400 flex-shrink-0">✓</span>
            {item}
          </li>
        )}
      />

      {/* Action Items */}
      <div className="bg-[#16161f] border border-amber-500/20 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-4">
          <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-sm">📋</span>
          Action Items
          <span className="ml-auto text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
            {summary.actionItems.length} tasks
          </span>
        </h3>
        <div className="space-y-2">
          {summary.actionItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#1c1c28] rounded-lg border border-[#2a2a3a] hover:border-amber-500/20 transition-all">
              <div className="w-5 h-5 rounded border-2 border-amber-500/40 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">{item.task}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Avatar name={item.owner} size="xs" />
                  <span className="text-xs text-slate-500">{item.owner}</span>
                </div>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">Due {item.due}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummarySection({ icon, title, color, items, renderItem }) {
  const borderColors = { indigo: 'border-indigo-500/20', emerald: 'border-emerald-500/20' }
  const iconColors = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
  }
  return (
    <div className={`bg-[#16161f] border ${borderColors[color]} rounded-xl p-5`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-4">
        <span className={`w-7 h-7 rounded-lg ${iconColors[color]} border flex items-center justify-center text-sm`}>{icon}</span>
        {title}
        <span className="ml-auto text-xs text-slate-600">{items.length} items</span>
      </h3>
      <ul className="space-y-2.5">{items.map(renderItem)}</ul>
    </div>
  )
}

function TranscriptTab({ transcript, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array(8).fill(0).map((_, i) => <Skeleton key={i} variant="card" />)}
      </div>
    )
  }

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl overflow-hidden animate-fade-in">
      <div className="px-5 py-3 border-b border-[#2a2a3a] flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-200">Full Transcript</span>
        <span className="ml-auto text-xs text-slate-500">{transcript.length} utterances</span>
      </div>
      <div className="divide-y divide-[#1e1e2a] max-h-[600px] overflow-y-auto">
        {transcript.map((line) => (
          <div key={line.id} className="flex gap-4 px-5 py-3.5 hover:bg-[#1c1c28] transition-colors">
            <span className="text-xs text-slate-600 font-mono w-14 flex-shrink-0 pt-0.5">
              {formatTime(line.timestamp)}
            </span>
            <div className="flex gap-2.5 flex-1 min-w-0">
              <Avatar name={line.speaker} size="xs" className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-0.5">{line.speaker}</span>
                <p className="text-sm text-slate-300 leading-relaxed">{line.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AttendanceTab({ attendance, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} variant="card" />)}
      </div>
    )
  }

  const present = attendance.filter(a => a.status === 'present').length
  const partial = attendance.filter(a => a.status === 'partial').length
  const absent  = attendance.filter(a => a.status === 'absent').length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', value: present, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Partial', value: partial, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Absent', value: absent, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4 text-center`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance table */}
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2a3a]">
          <span className="text-sm font-semibold text-slate-200">Participant Details</span>
        </div>
        <div className="divide-y divide-[#1e1e2a]">
          {attendance.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1c1c28] transition-colors">
              <Avatar name={p.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{p.name}</span>
                  <Badge variant="default" className="text-[10px]">{p.role}</Badge>
                </div>
                <span className="text-xs text-slate-500">Joined {p.joinCount}×  ·  Left {p.leaveCount}×</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-slate-300">{p.totalTime}</div>
                <div className="text-xs text-slate-500">{p.percentage}%</div>
              </div>
              <div className="w-20">
                <div className="h-1.5 bg-[#2a2a3a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      p.percentage >= 80 ? 'bg-emerald-500' : p.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${p.percentage}%` }}
                  />
                </div>
              </div>
              <Badge variant={p.status === 'present' ? 'success' : p.status === 'partial' ? 'warning' : 'danger'}>
                {p.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
