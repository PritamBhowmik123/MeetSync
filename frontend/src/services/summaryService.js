import { delay } from './api'

export async function getMeetingSummary(meetingId) {
  await delay(1200)
  return {
    keyPoints: [
      'Q3 revenue is up 23% year-over-year, exceeding targets',
      'AI integration is ahead of schedule — backend milestone achieved',
      'New product roadmap to be finalized before end of current sprint',
      'Client report ownership assigned to Mark Williams, due Thursday',
      'Design team mockups approved — moving to implementation phase',
    ],
    decisions: [
      'Adopt the new CI/CD pipeline proposed by DevOps team',
      'Postpone mobile launch to Q1 next year for better preparation',
      'Allocate 20% of sprint capacity to documentation updates',
    ],
    actionItems: [
      { task: 'Send updated roadmap to stakeholders', owner: 'Alex Johnson', due: '2026-04-25' },
      { task: 'Complete client report draft', owner: 'Mark Williams', due: '2026-04-24' },
      { task: 'Update API documentation', owner: 'Priya Patel', due: '2026-04-26' },
      { task: 'Schedule follow-up call with investors', owner: 'Sarah Chen', due: '2026-04-28' },
      { task: 'Review and merge design PRs', owner: 'Design Team', due: '2026-04-25' },
    ],
    sentiment: 'positive',
    duration: '47 minutes',
    aiConfidence: 94,
  }
}

export async function getFullTranscript(meetingId) {
  await delay(800)
  const SPEAKERS = ['Alex Johnson', 'Sarah Chen', 'Mark Williams', 'Priya Patel']
  const lines = [
    "Alright, let's start with the quarterly review. Everyone ready?",
    "Yes, let's go! I have the slides ready to share.",
    "Q3 numbers are looking strong. Revenue up 23% year-over-year.",
    "That's amazing. The product team worked really hard this quarter.",
    "We need to finalize the roadmap before the end of this sprint.",
    "I'll have the updated version ready by tomorrow morning.",
    "The design team has submitted the new mockups — they look great.",
    "Can we schedule a follow-up with the stakeholders by Friday?",
    "I'll take ownership of the client report. Done by Thursday.",
    "The AI integration is ahead of schedule. Great work everyone.",
    "Let's make sure documentation is updated with these new decisions.",
    "Agreed. Priya, can you take point on that?",
    "Absolutely. I'll have it done before the next sprint kickoff.",
    "Perfect. Let's wrap up — meeting summary will be auto-generated.",
    "Thanks everyone. See you at the standup tomorrow!",
  ]
  return lines.map((text, i) => ({
    id: i,
    speaker: SPEAKERS[i % SPEAKERS.length],
    text,
    timestamp: new Date(Date.now() - (lines.length - i) * 3 * 60000).toISOString(),
  }))
}
