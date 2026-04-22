export const MOCK_MEETINGS = [
  {
    id: 'meet_001',
    title: 'Q3 Product Roadmap Review',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    participants: ['Alex Johnson', 'Sarah Chen', 'Mark Williams'],
    status: 'scheduled',
    code: 'ABC123',
  },
  {
    id: 'meet_002',
    title: 'Design System Kickoff',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 45,
    participants: ['Priya Patel', 'James Kim'],
    status: 'scheduled',
    code: 'DEF456',
  },
  {
    id: 'meet_003',
    title: 'Investor Relations Sync',
    scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    duration: 30,
    participants: ['Alex Johnson', 'Laura Reyes', 'Mark Williams'],
    status: 'scheduled',
    code: 'GHI789',
  },
]

export const MOCK_PAST_MEETINGS = [
  {
    id: 'meet_101',
    title: 'Sprint 14 Retrospective',
    scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 47,
    participants: ['Alex Johnson', 'Sarah Chen', 'Mark Williams', 'Priya Patel'],
    status: 'completed',
    attendance: 84,
    code: 'RET101',
  },
  {
    id: 'meet_102',
    title: 'AI Model Integration Planning',
    scheduledAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 90,
    participants: ['Alex Johnson', 'Priya Patel'],
    status: 'completed',
    attendance: 100,
    code: 'AIP102',
  },
  {
    id: 'meet_103',
    title: 'Weekly All-Hands',
    scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    participants: ['Alex Johnson', 'Sarah Chen', 'Mark Williams', 'Priya Patel', 'James Kim', 'Laura Reyes'],
    status: 'completed',
    attendance: 72,
    code: 'ALL103',
  },
  {
    id: 'meet_104',
    title: 'Client Demo Prep',
    scheduledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 35,
    participants: ['Alex Johnson', 'Mark Williams'],
    status: 'completed',
    attendance: 100,
    code: 'CDP104',
  },
]

export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
]

export const APP_NAME = 'MeetSync'
