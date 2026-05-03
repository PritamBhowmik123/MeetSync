import { apiRequest } from './api';

export async function markAttendance(meetingId, userId) {
  if (!meetingId || !userId) return;
  try {
    return await apiRequest('/api/attendance', {
      method: 'POST',
      body: JSON.stringify({ meeting_id: meetingId, user_id: userId }),
    });
  } catch (e) {
    console.warn('Failed to mark attendance:', e.message);
  }
}

export async function markLeave(meetingId, userId) {
  if (!meetingId || !userId) return;
  try {
    return await apiRequest('/api/attendance/leave', {
      method: 'PATCH',
      body: JSON.stringify({ meeting_id: meetingId, user_id: userId }),
    });
  } catch (e) {
    console.warn('Failed to mark leave:', e.message);
  }
}

export async function getAttendanceReport(meetingId) {
  try {
    return await apiRequest(`/api/attendance/${meetingId}`);
  } catch (e) {
    console.warn('Failed to fetch attendance report:', e.message);
    return [];
  }
}

// Legacy compatibility — runFaceRecognition now just calls the face endpoint
export async function runFaceRecognition(meetingId, imageBase64) {
  if (!imageBase64) return { recognized: [], confidence: 0 };
  try {
    const result = await apiRequest('/api/face/recognize', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64 }),
    });
    return {
      recognized: result.matched ? [result.user_name || `User ${result.user_id}`] : [],
      confidence: Math.round((result.confidence || 0) * 100),
      user_id: result.user_id,
    };
  } catch (e) {
    console.warn('Face recognition failed:', e.message);
    return { recognized: [], confidence: 0 };
  }
}
