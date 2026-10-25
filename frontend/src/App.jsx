import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import AgentDashboard from './pages/AgentDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import { ProtectedRoute, PublicRoute } from './components/RouteGuards.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>}
      />
      <Route
        path="/agent"
        element={<ProtectedRoute roles={['agent']}><AgentDashboard /></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}