export default function Skeleton({ className = '', variant = 'block' }) {
  const base = 'skeleton rounded-lg animate-pulse'

  if (variant === 'text') return <div className={`${base} h-4 w-full ${className}`} />
  if (variant === 'circle') return <div className={`${base} rounded-full ${className}`} />
  if (variant === 'card') {
    return (
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`${base} rounded-full w-10 h-10`} />
          <div className="flex-1 space-y-2">
            <div className={`${base} h-4 w-3/4`} />
            <div className={`${base} h-3 w-1/2`} />
          </div>
        </div>
        <div className="space-y-2">
          <div className={`${base} h-3 w-full`} />
          <div className={`${base} h-3 w-5/6`} />
          <div className={`${base} h-3 w-4/6`} />
        </div>
      </div>
    )
  }
  return <div className={`${base} ${className}`} />
}
