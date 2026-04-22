import { getInitials } from '../../utils/formatters'
import { AVATAR_COLORS } from '../../utils/mockData'

export default function Avatar({ name = '', size = 'md', src = null, className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }
  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length
  const color = AVATAR_COLORS[colorIndex]

  if (src) {
    return <img src={src} alt={name} className={`rounded-full object-cover ${sizes[size]} ${className}`} />
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${sizes[size]} ${className}`}
      style={{ background: `${color}33`, border: `1.5px solid ${color}55`, color }}
    >
      {getInitials(name)}
    </div>
  )
}
