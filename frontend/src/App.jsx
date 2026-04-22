import { useEffect } from 'react'
import AppRoutes from './routes/AppRoutes'
import { useAuthStore } from './store/authStore'

export default function App() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <AppRoutes />
    </div>
  )
}
