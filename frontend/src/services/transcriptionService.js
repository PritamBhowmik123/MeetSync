import { delay } from './api'

const CAPTIONS_POOL = [
  "Alright, let's start with the quarterly review. Everyone ready?",
  "Q3 numbers are looking strong. Revenue up 23% year-over-year.",
  "We need to finalize the roadmap before the end of this sprint.",
  "The design team has submitted the new mockups. Action item for everyone.",
  "Can we schedule a follow-up call with the stakeholders by Friday?",
  "The AI integration is ahead of schedule. Great work from the backend team.",
  "I'll take ownership of the client report. Should be done by Thursday.",
  "Let's make sure the documentation is updated with these new decisions.",
  "Attendance is tracked automatically. No manual check-in needed.",
  "The meeting summary will be sent to everyone within 30 minutes.",
]

let captionIndex = 0

const SPEAKERS = [
  { id: 'local', name: 'You' },
  { id: 'peer_1', name: 'Sarah Chen' },
  { id: 'peer_2', name: 'Mark Williams' },
  { id: 'peer_3', name: 'Priya Patel' },
]

export async function sendAudioChunk(chunk) {
  await delay(100)
  return { received: true }
}

export function startCaptionStream(onCaption) {
  const speaker = SPEAKERS[captionIndex % SPEAKERS.length]
  const text = CAPTIONS_POOL[captionIndex % CAPTIONS_POOL.length]
  captionIndex++

  let charIdx = 0
  const words = text.split(' ')
  let wordIdx = 0
  let current = ''

  const interval = setInterval(() => {
    if (wordIdx >= words.length) {
      clearInterval(interval)
      onCaption({ speaker, text: current, final: true })
      return
    }
    current += (wordIdx > 0 ? ' ' : '') + words[wordIdx]
    wordIdx++
    onCaption({ speaker, text: current, final: false })
  }, 120)

  return () => clearInterval(interval)
}
