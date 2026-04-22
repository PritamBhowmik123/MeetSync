import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { to: '/reports', label: 'Reports', icon: '📊' },
]

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 glass border-b border-[#2a2a3a] flex items-center px-6 gap-4">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 mr-6 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/30">
          M
        </div>
        <span className="font-semibold text-slate-100 text-sm">MeetSync</span>
        <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">AI</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              pathname === link.to
                ? 'bg-indigo-600/20 text-indigo-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c1c28]'
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-500 hidden sm:block">
          <span className="text-emerald-400">●</span> Connected
        </div>
        <div className="flex items-center gap-2 group cursor-pointer" onClick={handleLogout}>
          <Avatar name={user?.name} size="sm" />
          <span className="text-sm text-slate-300 hidden sm:block group-hover:text-slate-100 transition-colors">
            {user?.name?.split(' ')[0]}
          </span>
          <span className="text-slate-500 text-xs group-hover:text-red-400 transition-colors ml-1">↩</span>
        </div>
      </div>
    </nav>
  )
}
