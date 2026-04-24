import { useState, useEffect, useRef, useCallback } from 'react';

class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onresult = null;
    this._isListening = false;
    this._interval = null;
    
    this.mockSentences = [
      "Hello and welcome to the meeting.",
      "Today we're going to discuss the new Live Caption System.",
      "As you can see, the speech to text is appearing in real-time.",
      "This is useful for accessibility and keeping track of the conversation.",
      "Let's review the upcoming features in the next sprint."
    ];
    this.sentenceIndex = 0;
  }

  start() {
    if (this._isListening) return;
    this._isListening = true;
    if (this.onstart) this.onstart();

    this._simulateSpeech();
  }

  stop() {
    if (!this._isListening) return;
    this._isListening = false;
    if (this._interval) clearInterval(this._interval);
    if (this.onend) this.onend();
  }

  _simulateSpeech() {
    if (!this._isListening) return;

    let currentSentence = this.mockSentences[this.sentenceIndex % this.mockSentences.length];
    this.sentenceIndex++;
    
    let words = currentSentence.split(' ');
    let wordIndex = 0;
    let spokenSoFar = "";

    this._interval = setInterval(() => {
      if (!this._isListening) {
        clearInterval(this._interval);
        return;
      }

      spokenSoFar += (wordIndex === 0 ? "" : " ") + words[wordIndex];
      const isFinal = wordIndex === words.length - 1;
      
      const event = {
        results: [
          {
            0: { transcript: spokenSoFar },
            isFinal: isFinal
          }
        ],
        resultIndex: 0
      };

      if (this.onresult) this.onresult(event);

      wordIndex++;

      if (isFinal) {
        clearInterval(this._interval);
        if (this._isListening) {
           setTimeout(() => this._simulateSpeech(), 1500);
        }
      }
    }, 400); // simulate 400ms per word
  }
}

export function useSpeechRecognition({ mockFallback = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState([]);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
    } else if (mockFallback) {
      console.info("Web Speech API not found. Using MockSpeechRecognition fallback.");
      recognitionRef.current = new MockSpeechRecognition();
    } else {
      console.error("Web Speech API not supported in this browser.");
      setError('browser-not-supported');
      return;
    }

    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let newFinalTexts = [];

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newFinalTexts.push(event.results[i][0].transcript);
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setCurrentTranscript(interim);
      
      if (newFinalTexts.length > 0) {
        setFinalTranscript(prev => [...prev, ...newFinalTexts.map(text => ({
          text: text.trim(),
          timestamp: new Date().toISOString(),
          speaker: { name: 'Current Speaker' }, // Mock label
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random()
        }))]);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setError(event.error);
      
      // Attempt to restart silently if it's a no-speech error
      if (event.error === 'no-speech') {
        try {
          recognition.start();
        } catch(e) {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we are supposed to be continuous and listening wasn't explicitly stopped.
      // This helps with endpoints that time out after a few seconds of silence.
      if (recognitionRef.current && isListening) {
         try {
           recognitionRef.current.start();
         } catch(e) {}
      } else {
         setIsListening(false);
      }
    };

    // Cleanup
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [mockFallback]);

  const startListening = useCallback(() => {
    setError(null);
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Could not start recognition", err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
       // Temporarily disable auto-restart logic
       recognitionRef.current.onend = () => setIsListening(false);
       recognitionRef.current.stop();
       setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setCurrentTranscript('');
    setFinalTranscript([]);
  }, []);

  return {
    isListening,
    currentTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}
