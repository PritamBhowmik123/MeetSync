import { forwardRef } from 'react'
import { classNames } from '../../utils/formatters'

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  className = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={classNames(
            'w-full bg-[#1c1c28] border rounded-lg text-slate-100',
            'placeholder:text-slate-600 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            error ? 'border-red-500/50' : 'border-[#2a2a3a]',
            Icon ? 'pl-9 pr-4 py-2.5' : 'px-4 py-2.5',
            'text-sm',
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
