import { apiRequest } from './api';

/**
 * Save a single transcript chunk to the backend.
 */
export async function saveTranscriptChunk(meetingId, userId, text) {
  if (!meetingId || !text?.trim()) return;
  try {
    return await apiRequest('/api/transcripts', {
      method: 'POST',
      body: JSON.stringify({
        meeting_id: meetingId,
        user_id: userId,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn('Failed to save transcript chunk:', e.message);
  }
}

/**
 * Fetch the full transcript for a meeting.
 */
export async function getFullTranscript(meetingId) {
  try {
    return await apiRequest(`/api/transcripts/${meetingId}`);
  } catch (e) {
    console.warn('Failed to fetch transcript:', e.message);
    return [];
  }
}

/**
 * Start a caption stream using the Web Speech API.
 * Final transcripts are emitted via onCaption({ speaker, text, final: true }).
 * Returns a cleanup function.
 */
export function startCaptionStream(onCaption, speakerName = 'You') {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('Web Speech API not supported in this browser.');
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let stopped = false;

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        onCaption({
          speaker: { id: 'local', name: speakerName },
          text: result[0].transcript.trim(),
          final: true,
        });
      } else {
        interim += result[0].transcript;
      }
    }
    if (interim) {
      onCaption({
        speaker: { id: 'local', name: speakerName },
        text: interim,
        final: false,
      });
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'no-speech') return; // ignore silence
    console.warn('Speech recognition error:', e.error);
  };

  recognition.onend = () => {
    if (!stopped) {
      try { recognition.start(); } catch (_) {}
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.warn('Could not start speech recognition:', e);
  }

  return () => {
    stopped = true;
    try { recognition.stop(); } catch (_) {}
  };
}
