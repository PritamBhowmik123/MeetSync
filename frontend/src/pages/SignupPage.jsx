import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function SignupPage() {
  const { signup, loading } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.includes('@')) e.email = 'Enter a valid email address'
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setApiError('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    const res = await signup(form.name, form.email, form.password)
    if (res.success) navigate('/dashboard')
    else setApiError(res.error)
  }

  const strength = (() => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength]

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold shadow-xl shadow-indigo-500/30">M</div>
            <span className="text-xl font-bold text-white">MeetSync AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-500 text-sm">Start with smarter meetings today</p>
        </div>

        <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-6 shadow-xl">
          {apiError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Work email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
              autoComplete="email"
            />
            <div>
              <Input
                label="Password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                error={errors.password}
                autoComplete="new-password"
              />
              {form.password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-[#2a2a3a]'}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${['','text-red-400','text-amber-400','text-blue-400','text-emerald-400'][strength]}`}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>
            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              error={errors.confirm}
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
