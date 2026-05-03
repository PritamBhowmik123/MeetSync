import { apiRequest } from './api';

export async function getUpcomingMeetings() {
  const all = await apiRequest('/api/meetings');
  return all.filter(m => m.status === 'scheduled' || m.status === 'live');
}

export async function getPastMeetings() {
  const all = await apiRequest('/api/meetings');
  return all.filter(m => m.status === 'completed').map(m => ({
    ...m,
    // normalize participant count from attendance (or default)
    participants: m.participants || [],
    attendance: m.attendance || 0,
    duration: m.duration || 0,
  }));
}

export async function getMeetingById(id) {
  return apiRequest(`/api/meetings/${id}`);
}

export async function createMeeting(title, scheduledAt) {
  return apiRequest('/api/meetings', {
    method: 'POST',
    body: JSON.stringify({ title, scheduled_at: scheduledAt }),
  });
}

export async function joinMeetingByCode(code) {
  return apiRequest('/api/meetings/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getDashboardStats() {
  return apiRequest('/api/meetings/stats');
}

export async function updateMeetingStatus(id, status) {
  return apiRequest(`/api/meetings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
