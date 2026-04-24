import { useEffect, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useMeetingStore } from '../store/meetingStore';

export default function LiveCaptions() {
  const {
    isListening,
    currentTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening
  } = useSpeechRecognition({ mockFallback: true });

  const { isMicOn } = useMeetingStore();

  const [visibleText, setVisibleText] = useState('');
  const [speaker, setSpeaker] = useState('');

  // Auto-start listening when CC is enabled and Mic is On.
  useEffect(() => {
    if (isMicOn) {
      startListening();
    } else {
      stopListening();
      setVisibleText('');
      setSpeaker('');
    }
  }, [startListening, stopListening, isMicOn]);

  // Determine what to show: prioritize current live stream, 
  // fallback to the last finalized sentence, fade out after silence.
  useEffect(() => {
    let timeoutId;

    if (currentTranscript) {
      setVisibleText(currentTranscript);
      setSpeaker(''); // Or show "Listening..." but standard CC hides this
    } else if (finalTranscript.length > 0) {
      const last = finalTranscript[finalTranscript.length - 1];
      setVisibleText(last.text);
      setSpeaker(last.speaker.name);

      // Subtitles fade out after 4 seconds of silence
      timeoutId = setTimeout(() => {
        setVisibleText('');
      }, 4000);
    } else {
      setVisibleText('');
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentTranscript, finalTranscript]);

  if (!visibleText && !error) return null;

  return (
    <div className="flex flex-col items-center animate-fade-in transition-all duration-300">
      {visibleText && (
        <div className="bg-black/60 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center">
          {speaker && (
            <span className="text-white/60 text-[11px] font-bold mb-1.5 uppercase tracking-widest">{speaker}</span>
          )}
          <p className="text-2xl md:text-3xl font-medium text-white drop-shadow-xl text-center max-w-4xl leading-relaxed">
            {visibleText}
          </p>
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-xs text-rose-300 bg-black/60 px-3 py-1.5 rounded-lg border border-rose-500/30">
          CC Error: {error}
        </div>
      )}
    </div>
  );
}
