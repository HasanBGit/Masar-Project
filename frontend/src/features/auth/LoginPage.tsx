import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Logo } from '../../components/Logo'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-l)] bg-paper p-8 shadow-[0_18px_50px_-25px_rgba(15,59,77,0.45)]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-sm text-navy/60">Sign in to your project workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-start">
            <span className="text-xs font-semibold uppercase tracking-wide text-navy/70">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[var(--radius-s)] border border-sand bg-white px-3.5 py-2.5 text-navy outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
              placeholder="owner@truepoint.sa"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-start">
            <span className="text-xs font-semibold uppercase tracking-wide text-navy/70">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[var(--radius-s)] border border-sand bg-white px-3.5 py-2.5 text-navy outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-[var(--radius-s)] bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-[var(--radius-s)] bg-navy px-4 py-2.5 font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-navy/50">
          Demo accounts: owner / investor / consultant / contractor @truepoint.sa · password{' '}
          <code className="rounded bg-sand/40 px-1 py-0.5">demo1234</code>
        </p>
      </div>
    </div>
  )
}
