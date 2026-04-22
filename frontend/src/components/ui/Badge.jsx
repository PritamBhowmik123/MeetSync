const variants = {
  default: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
  primary: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  danger:  'bg-red-500/15 text-red-300 border-red-500/25',
  live:    'bg-red-500/15 text-red-300 border-red-500/30',
}

export default function Badge({ children, variant = 'default', dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${variant === 'live' ? 'bg-red-400 animate-pulse' : 'bg-current'}`} />
      )}
      {children}
    </span>
  )
}
