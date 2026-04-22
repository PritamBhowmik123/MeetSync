import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import StatsCard from '../components/dashboard/StatsCard'
import MeetingCard from '../components/dashboard/MeetingCard'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Skeleton from '../components/ui/Skeleton'
import { useAuthStore } from '../store/authStore'
import { getUpcomingMeetings, getPastMeetings, getDashboardStats, createMeeting, joinMeetingByCode } from '../services/meetingService'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [past, setPast] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showStartModal, setShowStartModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u, p] = await Promise.all([
          getDashboardStats(),
          getUpcomingMeetings(),
          getPastMeetings(),
        ])
        setStats(s)
        setUpcoming(u)
        setPast(p)
      } catch (e) {
        setError('Failed to load dashboard data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleStartMeeting = async () => {
    if (!newTitle.trim()) { setModalError('Please enter a meeting title'); return }
    setCreating(true); setModalError('')
    try {
      const meeting = await createMeeting(newTitle.trim(), new Date().toISOString())
      navigate(`/meeting/${meeting.id}`, { state: { title: meeting.title, isHost: true } })
    } catch (e) { setModalError(e.message) } finally { setCreating(false) }
  }

  const handleJoinMeeting = async () => {
    if (!joinCode.trim()) { setModalError('Please enter a meeting code'); return }
    setJoining(true); setModalError('')
    try {
      const meeting = await joinMeetingByCode(joinCode.trim().toUpperCase())
      navigate(`/meeting/${meeting.id}`, { state: { title: meeting.title, isHost: false } })
    } catch (e) { setModalError(e.message) } finally { setJoining(false) }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">Here's what's happening with your meetings</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => { setShowJoinModal(true); setModalError('') }}>
              <span>🔗</span> Join Meeting
            </Button>
            <Button onClick={() => { setShowStartModal(true); setModalError('') }}>
              <span>✨</span> Start Meeting
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array(4).fill(0).map((_, i) => <StatsCard key={i} loading />)
          ) : (
            <>
              <StatsCard label="Total Meetings" value={stats?.totalMeetings} icon="📅" color="indigo" trend={12} />
              <StatsCard label="Avg Attendance" value={`${stats?.avgAttendance}%`} icon="👥" color="emerald" trend={5} />
              <StatsCard label="Hours Recorded" value={stats?.totalHours} icon="🕒" color="amber" trend={8} />
              <StatsCard label="Upcoming" value={stats?.upcomingCount} icon="⚡" color="violet" />
            </>
          )}
        </div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Upcoming meetings */}
          <div className="lg:col-span-3">
            <SectionHeader title="Upcoming Meetings" count={upcoming.length} icon="📅" />
            {loading ? (
              <div className="space-y-3 mt-3">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} variant="card" />)}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState icon="📅" message="No upcoming meetings scheduled" action={() => setShowStartModal(true)} actionLabel="Start one now" />
            ) : (
              <div className="space-y-3 mt-3">
                {upcoming.map(m => <MeetingCard key={m.id} meeting={m} type="upcoming" />)}
              </div>
            )}
          </div>

          {/* Past meetings */}
          <div className="lg:col-span-2">
            <SectionHeader title="Recent Meetings" count={past.length} icon="🕒" />
            {loading ? (
              <div className="space-y-3 mt-3">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} variant="card" />)}
              </div>
            ) : past.length === 0 ? (
              <EmptyState icon="🕒" message="No past meetings yet" />
            ) : (
              <div className="space-y-3 mt-3">
                {past.map(m => <MeetingCard key={m.id} meeting={m} type="past" />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Meeting Modal */}
      {showStartModal && (
        <Modal title="Start a New Meeting" onClose={() => setShowStartModal(false)}>
          <div className="space-y-4">
            <Input
              label="Meeting title"
              placeholder="e.g. Sprint Planning Q2"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStartMeeting()}
              autoFocus
            />
            {modalError && <p className="text-sm text-red-400">⚠ {modalError}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowStartModal(false)}>Cancel</Button>
              <Button className="flex-1" loading={creating} onClick={handleStartMeeting}>
                🚀 Start Now
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <Modal title="Join a Meeting" onClose={() => setShowJoinModal(false)}>
          <div className="space-y-4">
            <Input
              label="Meeting code"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinMeeting()}
              className="font-mono tracking-widest uppercase"
              autoFocus
            />
            {modalError && <p className="text-sm text-red-400">⚠ {modalError}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowJoinModal(false)}>Cancel</Button>
              <Button className="flex-1" loading={joining} onClick={handleJoinMeeting}>
                🔗 Join
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  )
}

function SectionHeader({ title, count, icon }) {
  return (
    <div className="flex items-center gap-2">
      <span>{icon}</span>
      <h2 className="text-base font-semibold text-slate-200">{title}</h2>
      {count > 0 && (
        <span className="ml-auto text-xs bg-[#1c1c28] text-slate-500 border border-[#2a2a3a] px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  )
}

function EmptyState({ icon, message, action, actionLabel }) {
  return (
    <div className="mt-3 bg-[#16161f] border border-[#2a2a3a] rounded-xl p-8 flex flex-col items-center gap-3">
      <span className="text-4xl opacity-30">{icon}</span>
      <p className="text-sm text-slate-500">{message}</p>
      {action && (
        <button onClick={action} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl cursor-pointer transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
