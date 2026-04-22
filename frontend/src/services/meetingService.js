import { delay } from './api'
import { MOCK_MEETINGS, MOCK_PAST_MEETINGS } from '../utils/mockData'

export async function getUpcomingMeetings() {
  await delay(600)
  return MOCK_MEETINGS
}

export async function getPastMeetings() {
  await delay(700)
  return MOCK_PAST_MEETINGS
}

export async function getMeetingById(id) {
  await delay(400)
  const all = [...MOCK_MEETINGS, ...MOCK_PAST_MEETINGS]
  const m = all.find(m => m.id === id)
  if (!m) throw new Error('Meeting not found')
  return m
}

export async function createMeeting(title, scheduledAt) {
  await delay(600)
  return {
    id: `meet_${Date.now()}`,
    title,
    scheduledAt,
    status: 'scheduled',
    participants: [],
    code: Math.random().toString(36).substring(2, 8).toUpperCase(),
  }
}

export async function joinMeetingByCode(code) {
  await delay(500)
  return {
    id: `meet_${Date.now()}`,
    title: `Meeting #${code}`,
    code,
    status: 'live',
    isHost: false,
  }
}

export async function getDashboardStats() {
  await delay(500)
  return {
    totalMeetings: 47,
    avgAttendance: 84,
    totalHours: 132,
    upcomingCount: 3,
  }
}
