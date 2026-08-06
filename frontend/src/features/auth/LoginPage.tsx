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

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="mt-6 flex justify-center" ref={googleButtonRef} />
                <div className="my-6 flex items-center gap-3 text-xs font-medium text-navy/40">
                  <div className="h-px flex-1 bg-sand" aria-hidden="true" />
                  {t('auth.orDivider')}
                  <div className="h-px flex-1 bg-sand" aria-hidden="true" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${GOOGLE_CLIENT_ID ? '' : 'mt-6'}`}>
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
