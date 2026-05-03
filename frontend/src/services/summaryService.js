import { apiRequest } from './api';

/**
 * Trigger Ollama summary generation for a meeting.
 * Will return the summary once generated.
 */
export async function generateMeetingSummary(meetingId) {
  return apiRequest(`/api/summary/${meetingId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Fetch a previously generated summary.
 */
export async function getMeetingSummary(meetingId) {
  return apiRequest(`/api/summary/${meetingId}`);
}

/**
 * Fetch full transcript from DB.
 */
export async function getFullTranscript(meetingId) {
  return apiRequest(`/api/transcripts/${meetingId}`);
}
