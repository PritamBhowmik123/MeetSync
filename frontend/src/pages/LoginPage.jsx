import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const validate = () => {
    const e = {}
    if (!form.email.includes('@')) e.email = 'Enter a valid email address'
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    const res = await login(form.email, form.password)
    if (res.success) navigate('/dashboard')
    else setApiError(res.error)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-[#0f0f1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #6366f133 0%, transparent 60%), radial-gradient(circle at 80% 70%, #8b5cf633 0%, transparent 50%)' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold shadow-xl shadow-indigo-500/30">M</div>
            <span className="text-xl font-bold text-white">MeetSync</span>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">AI</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Your meetings,<br />
            <span className="gradient-text">intelligently managed.</span>
          </h1>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            AI-powered transcription, real-time captions, face-recognition attendance, and smart summaries — all in one platform.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🧠', label: 'AI-generated meeting summaries & action items' },
              { icon: '🎙️', label: 'Real-time transcription with speaker labels' },
              { icon: '👤', label: 'Automatic face-recognition attendance tracking' },
              { icon: '📊', label: 'Participation analytics & insights' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm flex-shrink-0">
                  {f.icon}
                </div>
                <span className="text-sm text-slate-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold">M</div>
              <span className="font-bold text-white">MeetSync AI</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your MeetSync account</p>
          </div>

          {apiError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <span className="text-red-400 text-sm">⚠</span>
              <p className="text-sm text-red-300">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              error={errors.password}
              autoComplete="current-password"
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign in
            </Button>
          </form>

          <div className="mt-4 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
            <p className="text-xs text-slate-500 text-center">
              <span className="text-indigo-400">Demo:</span> Use any valid email + password (min 6 chars)
            </p>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
