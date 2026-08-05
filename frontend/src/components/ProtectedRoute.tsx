import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-cream text-navy/60">
        Loading…
      </div>
    )
  }

  if (!me) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
