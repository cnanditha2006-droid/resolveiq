import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// Where each role lands after logging in.
export function homePathFor(role) {
  if (role === 'admin') return '/admin'
  if (role === 'agent') return '/agent'
  return '/dashboard'
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}