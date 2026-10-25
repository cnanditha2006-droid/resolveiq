import { Navigate } from 'react-router-dom'
import { homePathFor, useAuth } from '../context/auth.js'

function Loading() {
  return <p className="muted" style={{ padding: '2rem' }}>Loading...</p>
}

// Only lets logged-in users through. If roles are given, the user's role must match one.
export function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return children
}

// For login and register: if you are already logged in, go to your own dashboard.
export function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to={homePathFor(user.role)} replace />
  return children
}