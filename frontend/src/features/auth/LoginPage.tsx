import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useLang, type MessageKey } from '../../lib/i18n'
import { Logo } from '../../components/Logo'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { TextField } from '../../components/ui/Field'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface GoogleCredentialResponse {
  credential: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const EDGES = [
  { key: 'hearing', tone: 'bg-status-hearing' },
  { key: 'understanding', tone: 'bg-status-understanding' },
  { key: 'agreeing', tone: 'bg-status-agreeing' },
] as const

const EDGE_KEYS: Record<(typeof EDGES)[number]['key'], { label: MessageKey; hint: MessageKey }> = {
  hearing: { label: 'auth.edgeHearingLabel', hint: 'auth.edgeHearingHint' },
  understanding: { label: 'auth.edgeUnderstandingLabel', hint: 'auth.edgeUnderstandingHint' },
  agreeing: { label: 'auth.edgeAgreeingLabel', hint: 'auth.edgeAgreeingHint' },
}

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const onGoogleCredentialRef = useRef<(response: GoogleCredentialResponse) => void>(() => {})

  onGoogleCredentialRef.current = async (response) => {
    setError(null)
    try {
      await loginWithGoogle(response.credential)
      navigate('/dashboard')
    } catch {
      setError(t('auth.googleError'))
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false
    const script = document.createElement('script')
    script.src = `https://accounts.google.com/gsi/client?hl=${lang}`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (cancelled || !window.google) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onGoogleCredentialRef.current(response),
      })
      if (googleButtonRef.current) {
        googleButtonRef.current.replaceChildren()
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 336,
          text: 'continue_with',
        })
      }
    }
    document.head.appendChild(script)
    return () => {
      cancelled = true
      document.head.removeChild(script)
    }
  }, [lang])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError(t('auth.invalidCredentials'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh bg-cream">
      {/* Brand panel: the platform's actual decision model, not stock imagery. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-deep p-12 text-cream lg:flex">
        <div className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <Logo light />

        <div className="relative z-10 max-w-md">
          <h1 className="font-[var(--font-display)] text-3xl font-bold leading-tight text-white">
            {t('auth.heroTitle')}
          </h1>
          <p className="mt-3 text-sm text-cream/70">{t('auth.heroSubtitle')}</p>

          <ol className="mt-8 flex flex-col gap-3">
            {EDGES.map((edge, i) => (
              <li key={edge.key} className="flex items-start gap-3 rounded-[var(--radius-s)] bg-white/5 p-3.5">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-navy-deep ${edge.tone}`}>
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{t(EDGE_KEYS[edge.key].label)}</p>
                  <p className="mt-0.5 text-xs text-cream/60">{t(EDGE_KEYS[edge.key].hint)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 text-xs text-cream/40">{t('auth.heroFooter')}</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
              <Logo />
            </div>

            <h2 className="font-[var(--font-display)] text-xl font-bold text-navy">{t('auth.signIn')}</h2>
            <p className="mt-1 text-sm text-navy/60">{t('auth.tagline')}</p>

            <div className="mt-6 flex justify-center">
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleButtonRef} className="w-full flex justify-center" />
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setError(null)
                    try {
                      // Demo mode fallback for local dev when VITE_GOOGLE_CLIENT_ID is unset
                      await login('owner@test.local', 'testpass123')
                      navigate('/dashboard')
                    } catch {
                      setError(t('auth.googleError'))
                    }
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-s)] border border-navy/15 bg-white px-4 py-2.5 font-semibold text-navy transition hover:bg-cream/50 active:scale-[0.99]"
                >
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('auth.googleSignIn')}
                </button>
              )}
            </div>

            <div className="my-6 flex items-center gap-3 text-xs font-medium text-navy/40">
              <div className="h-px flex-1 bg-sand" aria-hidden="true" />
              {t('auth.orDivider')}
              <div className="h-px flex-1 bg-sand" aria-hidden="true" />
            </div>


            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                label={t('auth.email')}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <TextField
                label={t('auth.password')}
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {error && (
                <p role="alert" className="rounded-[var(--radius-s)] bg-status-escalated/10 px-3 py-2 text-sm text-status-escalated">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 rounded-[var(--radius-s)] bg-navy px-4 py-2.5 font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
              >
                {submitting ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
