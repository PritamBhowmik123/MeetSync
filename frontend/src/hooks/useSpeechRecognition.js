import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Real Web Speech API hook — no mock fallback.
 * Uses browser's native SpeechRecognition with continuous mode + auto-restart.
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('browser-not-supported');
      console.warn('Web Speech API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      const newFinals = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinals.push({
            text: result[0].transcript.trim(),
            timestamp: new Date().toISOString(),
            speaker: { name: 'You', id: 'local' },
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          });
        } else {
          interim += result[0].transcript;
        }
      }

      setCurrentTranscript(interim);
      if (newFinals.length > 0) {
        setFinalTranscript(prev => [...prev, ...newFinals]);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // normal silence
      console.warn('Speech recognition error:', event.error);
      setError(event.error);
      if (event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (_) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return () => {
      shouldRestartRef.current = false;
      try { recognition.stop(); } catch (_) {}
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    shouldRestartRef.current = true;
    setError(null);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Could not start recognition:', err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch (_) {}
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setCurrentTranscript('');
    setFinalTranscript([]);
  }, []);

  return {
    isListening,
    isSupported,
    currentTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
