import { classNames } from '../../utils/formatters'

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
  secondary: 'bg-[#1c1c28] hover:bg-[#252535] text-slate-200 border border-[#2a2a3a]',
  danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20',
  ghost: 'hover:bg-[#1c1c28] text-slate-400 hover:text-slate-200',
  success: 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
  icon: 'p-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={classNames(
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-200 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  )
}
