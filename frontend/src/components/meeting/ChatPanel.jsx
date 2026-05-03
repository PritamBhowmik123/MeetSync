import { useState, useRef, useEffect } from 'react'
import { useMeetingStore } from '../../store/meetingStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'
import { relativeTime } from '../../utils/formatters'

export default function ChatPanel({ onSendMessage }) {
  const { messages, addMessage } = useMeetingStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    const userName = user?.name || 'You';
    addMessage({ text, sender: userName, senderId: 'local', timestamp: new Date().toISOString() })
    onSendMessage?.(text, userName)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#1e1e2a] flex items-center gap-2">
        <span className="text-indigo-400">📩</span>
        <span className="text-sm font-semibold text-slate-200">Chat</span>
        {messages.length > 0 && (
          <span className="ml-auto text-xs bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded-full">
            {messages.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-4xl">💬</div>
            <p className="text-sm text-slate-500">Send a message to the group...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} isOwn={msg.senderId === 'local'} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-[#1e1e2a]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={2}
            className="flex-1 bg-[#1c1c28] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-slate-200
              placeholder:text-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50
              focus:border-indigo-500/50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
              disabled:cursor-not-allowed transition-all text-white text-sm cursor-pointer"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ msg, isOwn }) {
  return (
    <div className={`flex gap-2 animate-fade-in ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar name={msg.sender} size="xs" className="flex-shrink-0 mt-0.5" />
      <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isOwn && <span className="text-[10px] text-slate-500 font-medium">{msg.sender}</span>}
        <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-indigo-600/30 text-indigo-100 rounded-tr-sm'
            : 'bg-[#1c1c28] text-slate-200 rounded-tl-sm border border-[#2a2a3a]'
        }`}>
          {msg.text}
        </div>
        <span className="text-[10px] text-slate-600">{relativeTime(msg.timestamp)}</span>
      </div>
    </div>
  )
}
