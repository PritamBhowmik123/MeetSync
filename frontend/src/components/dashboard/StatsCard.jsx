export default function StatsCard({ label, value, icon, trend, color = 'indigo', loading = false }) {
  const colors = {
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', ring: 'ring-indigo-500/20' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', ring: 'ring-amber-500/20' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', ring: 'ring-violet-500/20' },
  }
  const c = colors[color]

  if (loading) {
    return (
      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-xl p-5">
        <div className="skeleton h-8 w-8 rounded-lg mb-4" />
        <div className="skeleton h-7 w-16 mb-2" />
        <div className="skeleton h-4 w-24" />
      </div>
    )
  }

  return (
    <div className={`bg-[#16161f] border ${c.border} rounded-xl p-5 hover:shadow-lg transition-all duration-200 group`}>
      <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${c.text}`}>{value}</span>
        {trend && (
          <span className={`text-xs mb-1 font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  )
}
