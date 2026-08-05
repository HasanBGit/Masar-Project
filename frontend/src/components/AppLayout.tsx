import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Mail, ChevronDown, Sparkles, Zap, Radio, ShieldCheck } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { Sidebar } from './Sidebar'
import { NewProjectForm } from './NewProjectForm'
import type { Project } from '../lib/types'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  investor: 'Investor',
  consultant: 'Consultant',
  contractor: 'Contractor',
  admin: 'Admin',
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/email-integrations': 'Gmail & Email Integrations',
  '/trust-evidence': 'Trust & Evidence',
  '/contract-payments': 'Contract & Payment Verification',
  '/rfi-change-control': 'RFIs & Change Orders',
  '/handover': 'Handover & Post-Handover',
  '/drawings-studio': 'Drawings Studio',
  '/access-control': 'Security & Access Control',
  '/platform-api': 'Platform API',
  '/observability': 'Monitoring & Observability',
  '/docs': 'Documentation',
}

function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/decisions/')) return 'Decision'
  return 'Truepoint'
}

export function AppLayout({
  children,
  activeProject,
  onProjectChange,
  showObservability = false,
}: {
  children: ReactNode
  activeProject: Project | null
  onProjectChange: (project: Project) => void
  showObservability?: boolean
}) {
  const { me, projects, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [integrationsMenuOpen, setIntegrationsMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const integrationsMenuRef = useRef<HTMLDivElement>(null)
  const userMenuButtonRef = useRef<HTMLButtonElement>(null)
  const navToggleButtonRef = useRef<HTMLButtonElement>(null)
  const mobileDrawerRef = useRef<HTMLDivElement>(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Close the integrations menu on outside click or Escape
  useEffect(() => {
    if (!integrationsMenuOpen) return
    function onPointerDown(e: MouseEvent) {
      if (!integrationsMenuRef.current?.contains(e.target as Node)) setIntegrationsMenuOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIntegrationsMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [integrationsMenuOpen])

  // Close the user menu on outside click or Escape, returning focus to its trigger.
  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: MouseEvent) {
      if (!userMenuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        userMenuButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Focus the drawer on open, close on Escape, return focus to its trigger.
  useEffect(() => {
    if (!mobileNavOpen) return
    const firstFocusable = mobileDrawerRef.current?.querySelector<HTMLElement>('a, button')
    firstFocusable?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileNavOpen(false)
        navToggleButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [mobileNavOpen])

  return (
    <div className="flex min-h-svh bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="fixed inset-y-0 left-0">
          <Sidebar isStaff={showObservability} />
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div ref={mobileDrawerRef} role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0">
            <Sidebar isStaff={showObservability} onNavigate={() => setMobileNavOpen(false)} />
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-[-44px] top-4 rounded-full bg-paper p-2 text-navy shadow-md"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-sand/70 bg-paper/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              ref={navToggleButtonRef}
              onClick={() => setMobileNavOpen(true)}
              className="rounded-[var(--radius-s)] p-1.5 text-navy hover:bg-navy/5 lg:hidden"
              aria-label="Open navigation"
              aria-haspopup="dialog"
              aria-expanded={mobileNavOpen}
            >
              <Menu size={20} />
            </button>
            <div>
              {activeProject && <p className="text-xs font-semibold text-gold-ink">{activeProject.name}</p>}
              <h1 className="font-[var(--font-display)] text-base font-bold text-navy">{pageTitle(location.pathname)}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {projects.length > 1 && activeProject && (
              <label className="hidden sm:block">
                <span className="sr-only">Switch project</span>
                <select
                  value={activeProject.id}
                  onChange={(e) => {
                    const p = projects.find((pr) => pr.id === Number(e.target.value))
                    if (p) onProjectChange(p)
                  }}
                  className="rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-sm text-navy"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Main Feature Navbar Button: Email Integrations */}
            <div className="relative" ref={integrationsMenuRef}>
              <button
                onClick={() => setIntegrationsMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-[var(--radius-s)] border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-bold text-navy hover:bg-gold/20 transition"
              >
                <Mail size={15} className="text-gold-ink" />
                <span className="hidden md:inline">Gmail Integration</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-navy">
                  3
                </span>
                <ChevronDown size={14} className="text-navy/60" />
              </button>

              {integrationsMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[var(--radius-m)] border border-sand bg-white p-2 shadow-2xl">
                  <div className="border-b border-sand/60 px-3 py-2">
                    <p className="text-xs font-bold text-navy">Gmail & Email Integrations</p>
                    <p className="text-[11px] text-navy/60">Connected: pm@masar-construction.sa</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIntegrationsMenuOpen(false)
                        navigate('/email-integrations')
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
                    >
                      <Mail size={15} className="text-red-500" />
                      <div>
                        <div className="font-semibold">1. OAuth Connection Status</div>
                        <div className="text-[10px] text-navy/50">Manage accounts & background sync</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIntegrationsMenuOpen(false)
                        navigate('/email-integrations')
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
                    >
                      <Zap size={15} className="text-amber-500" />
                      <div>
                        <div className="font-semibold">2. Live Extraction Queue</div>
                        <div className="text-[10px] text-amber-600 font-bold">3 items pending review</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIntegrationsMenuOpen(false)
                        navigate('/email-integrations')
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
                    >
                      <Sparkles size={15} className="text-gold" />
                      <div>
                        <div className="font-semibold">3. AI Intelligence & Rules</div>
                        <div className="text-[10px] text-navy/50">Bilingual LLM extraction schema</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIntegrationsMenuOpen(false)
                        navigate('/email-integrations')
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
                    >
                      <Radio size={15} className="text-emerald-600" />
                      <div>
                        <div className="font-semibold">4. Multi-Channel Stream</div>
                        <div className="text-[10px] text-navy/50">Gmail, WhatsApp & Site Logs</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIntegrationsMenuOpen(false)
                        navigate('/email-integrations')
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-navy hover:bg-cream"
                    >
                      <ShieldCheck size={15} className="text-blue-600" />
                      <div>
                        <div className="font-semibold">5. Sync Health & Webhooks</div>
                        <div className="text-[10px] text-navy/50">Pub/Sub push metrics & latency</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const current = document.documentElement.dir === 'rtl' ? 'ltr' : 'rtl'
                document.documentElement.dir = current
                document.documentElement.lang = current === 'rtl' ? 'ar' : 'en'
              }}
              title="Toggle Language / Direction"
              className="rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-cream"
            >
              🌐 {document.documentElement.dir === 'rtl' ? 'EN' : 'العربية'}
            </button>

            <div className="relative hidden sm:block">
              <NewProjectForm
                compact
                onCreated={onProjectChange}
                panelClassName="absolute right-0 top-full z-10 mt-2 w-72 shadow-lg"
              />
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                ref={userMenuButtonRef}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full border border-sand bg-white px-3 py-1.5 text-sm text-navy"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-semibold text-cream">
                  {me?.full_name?.[0]?.toUpperCase() ?? '?'}
                </span>
                <span className="hidden sm:inline">{me?.full_name}</span>
                {activeProject && (
                  <span className="hidden rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold-ink sm:inline">
                    {ROLE_LABEL[activeProject.role] ?? activeProject.role}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div role="menu" aria-label="User menu" className="absolute right-0 top-full mt-2 w-40 rounded-[var(--radius-s)] border border-sand bg-white py-1 shadow-lg">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-navy hover:bg-cream"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
