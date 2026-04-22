import { delay } from './api'

export async function markAttendance(meetingId, userId) {
  await delay(300)
  return { marked: true, timestamp: new Date().toISOString(), confidence: Math.floor(Math.random() * 10 + 90) }
}

export async function getAttendanceReport(meetingId) {
  await delay(600)
  return [
    { id: 'usr_1', name: 'Alex Johnson', role: 'Host', joinCount: 1, leaveCount: 0, totalTime: '47:32', percentage: 100, status: 'present' },
    { id: 'usr_2', name: 'Sarah Chen', role: 'Participant', joinCount: 1, leaveCount: 0, totalTime: '45:10', percentage: 95, status: 'present' },
    { id: 'usr_3', name: 'Mark Williams', role: 'Participant', joinCount: 2, leaveCount: 1, totalTime: '38:22', percentage: 81, status: 'present' },
    { id: 'usr_4', name: 'Priya Patel', role: 'Participant', joinCount: 1, leaveCount: 0, totalTime: '47:32', percentage: 100, status: 'present' },
    { id: 'usr_5', name: 'James Kim', role: 'Participant', joinCount: 1, leaveCount: 1, totalTime: '22:14', percentage: 47, status: 'partial' },
    { id: 'usr_6', name: 'Laura Reyes', role: 'Participant', joinCount: 0, leaveCount: 0, totalTime: '0:00', percentage: 0, status: 'absent' },
  ]
}

export async function runFaceRecognition(meetingId, frame) {
  await delay(800)
  const names = ['Alex Johnson', 'Sarah Chen', 'Mark Williams', 'Priya Patel']
  const recognized = names.slice(0, Math.floor(Math.random() * 3 + 2))
  return { recognized, confidence: Math.floor(Math.random() * 10 + 88) }
}
