import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'
import DashboardPage from '../pages/DashboardPage'
import MeetingRoomPage from '../pages/MeetingRoomPage'
import PostMeetingSummaryPage from '../pages/PostMeetingSummaryPage'
import ReportsPage from '../pages/ReportsPage'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuthStore()
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user } = useAuthStore()
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/meeting/:id" element={<ProtectedRoute><MeetingRoomPage /></ProtectedRoute>} />
      <Route path="/summary/:id" element={<ProtectedRoute><PostMeetingSummaryPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
