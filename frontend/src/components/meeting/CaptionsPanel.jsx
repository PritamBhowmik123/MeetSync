import { useEffect, useRef } from 'react'
import { useMeetingStore } from '../../store/meetingStore'
import Avatar from '../ui/Avatar'

export default function CaptionsPanel() {
  const { captions } = useMeetingStore()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [captions])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#1e1e2a] flex items-center gap-2">
        <span className="text-indigo-400">💬</span>
        <span className="text-sm font-semibold text-slate-200">Live Captions</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {captions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-4xl animate-pulse">🎙️</div>
            <p className="text-sm text-slate-500">Captions will appear here as people speak...</p>
          </div>
        ) : (
          captions.map((caption, i) => (
            <CaptionEntry key={i} caption={caption} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function CaptionEntry({ caption }) {
  const { speaker, text, final } = caption
  return (
    <div className="flex gap-2.5 animate-fade-in">
      <Avatar name={speaker?.name || 'Unknown'} size="xs" className="mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold text-slate-300">{speaker?.name || 'Unknown'}</span>
          {!final && (
            <span className="flex gap-0.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-slate-500 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          )}
        </div>
        <p className={`text-sm leading-relaxed ${final ? 'text-slate-300' : 'text-slate-400 italic'}`}>
          {text}
          {!final && <span className="animate-blink ml-0.5 text-indigo-400">|</span>}
        </p>
      </div>
    </div>
  )
}
