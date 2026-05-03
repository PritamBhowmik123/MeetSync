import { useEffect, useState } from 'react';
import { useMeetingStore } from '../store/meetingStore';

export default function LiveCaptions() {
  const { captions, isMicOn } = useMeetingStore();

  const [visibleText, setVisibleText] = useState('');
  const [speaker, setSpeaker] = useState('');

  // Determine what to show: prioritize the latest finalized sentence, fade out after silence.
  useEffect(() => {
    let timeoutId;

    if (captions.length > 0) {
      const last = captions[captions.length - 1];
      setVisibleText(last.text);
      setSpeaker(last.speaker?.name || 'You');

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
  }, [captions]);

  if (!visibleText) return null;

  return (
    <div className="flex flex-col items-center animate-fade-in transition-all duration-300">
      <div className="bg-black/60 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center">
        {speaker && (
          <span className="text-white/60 text-[11px] font-bold mb-1.5 uppercase tracking-widest">{speaker}</span>
        )}
        <p className="text-2xl md:text-3xl font-medium text-white drop-shadow-xl text-center max-w-4xl leading-relaxed">
          {visibleText}
        </p>
      </div>
    </div>
  );
}

