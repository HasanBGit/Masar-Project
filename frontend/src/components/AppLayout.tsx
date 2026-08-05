import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Mail, ChevronDown, Sparkles, Zap, Radio, ShieldCheck } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { useLang, type MessageKey } from '../lib/i18n'
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

const PAGE_TITLE_KEYS: Record<string, MessageKey> = {
  '/dashboard': 'title.dashboard',
  '/email-integrations': 'title.email',
  '/trust-evidence': 'title.trustEvidence',
  '/contract-payments': 'title.contractPayments',
  '/rfi-change-control': 'title.rfis',
  '/handover': 'title.handover',
  '/drawings-studio': 'title.drawingsStudio',
  '/access-control': 'title.accessControl',
  '/platform-api': 'title.platformApi',
  '/observability': 'title.observability',
}

const INTEGRATION_MENU_ITEMS = [
  { icon: Mail, iconClass: 'text-status-escalated', title: 'OAuth Connection Status', hint: 'Manage accounts & background sync' },
  { icon: Zap, iconClass: 'text-status-hearing', title: 'Live Extraction Queue', hint: 'Review extracted approvals & RFIs' },
  { icon: Sparkles, iconClass: 'text-gold', title: 'AI Intelligence & Rules', hint: 'Bilingual LLM extraction schema' },
  { icon: Radio, iconClass: 'text-status-agreeing', title: 'Multi-Channel Stream', hint: 'Gmail, WhatsApp & Site Logs' },
  { icon: ShieldCheck, iconClass: 'text-status-understanding', title: 'Sync Health & Webhooks', hint: 'Pub/Sub push metrics & latency' },
]

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
  const { t, lang, toggle } = useLang()
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

  const titleKey = PAGE_TITLE_KEYS[location.pathname]
  const pageTitle = titleKey ? t(titleKey) : location.pathname.startsWith('/decisions/') ? t('title.decision') : 'Truepoint'

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
      <a
        href="#main-content"
        className="sr-only z-50 rounded-[var(--radius-s)] bg-navy px-4 py-2 text-sm font-semibold text-cream focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('chrome.skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="fixed inset-y-0 start-0">
          <Sidebar isStaff={showObservability} />
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('chrome.openNav')}
            className="absolute inset-y-0 start-0"
          >
            <Sidebar isStaff={showObservability} onNavigate={() => setMobileNavOpen(false)} />
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label={t('chrome.closeNav')}
              className="absolute end-2 top-3.5 rounded-full bg-paper p-2 text-navy shadow-md"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ps-64">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sand/70 bg-paper/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={navToggleButtonRef}
              onClick={() => setMobileNavOpen(true)}
              className="rounded-[var(--radius-s)] p-1.5 text-navy transition hover:bg-navy/5 lg:hidden"
              aria-label={t('chrome.openNav')}
              aria-haspopup="dialog"
              aria-expanded={mobileNavOpen}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              {activeProject && <p className="truncate text-xs font-semibold text-gold-ink">{activeProject.name}</p>}
              {/* Pages own the single <h1>; this is chrome. */}
              <p className="truncate font-[var(--font-display)] text-base font-bold text-navy">{pageTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {projects.length > 1 && activeProject && (
              <label>
                <span className="sr-only">{t('chrome.switchProject')}</span>
                <select
                  value={activeProject.id}
                  onChange={(e) => {
                    const p = projects.find((pr) => pr.id === Number(e.target.value))
                    if (p) onProjectChange(p)
                  }}
                  className="max-w-28 rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-sm text-navy sm:max-w-48"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Email Integrations quick menu (feature preview) */}
            <div className="relative hidden md:block" ref={integrationsMenuRef}>
              <button
                onClick={() => setIntegrationsMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={integrationsMenuOpen}
                className="flex items-center gap-1.5 rounded-[var(--radius-s)] border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-bold text-navy transition hover:bg-gold/20"
              >
                <Mail size={15} className="text-gold-ink" aria-hidden="true" />
                <span>Gmail Integration</span>
                <ChevronDown size={14} className="text-navy/60" aria-hidden="true" />
              </button>

              {integrationsMenuOpen && (
                <div
                  role="menu"
                  aria-label="Email integrations"
                  className="absolute end-0 top-full z-50 mt-2 w-72 rounded-[var(--radius-m)] border border-sand bg-white p-2 shadow-2xl"
                >
                  <div className="border-b border-sand/60 px-3 py-2">
                    <p className="text-xs font-bold text-navy">Gmail & Email Integrations</p>
                    <p className="text-[11px] text-navy/60">Feature preview — explore the integration workspace</p>
                  </div>
                  <div className="py-1">
                    {INTEGRATION_MENU_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.title}
                          role="menuitem"
                          onClick={() => {
                            setIntegrationsMenuOpen(false)
                            navigate('/email-integrations')
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-start text-xs font-medium text-navy transition hover:bg-cream"
                        >
                          <Icon size={15} className={item.iconClass} aria-hidden="true" />
                          <div>
                            <div className="font-semibold">{item.title}</div>
                            <div className="text-[10px] text-navy/50">{item.hint}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggle}
              aria-label={t('chrome.languageLabel')}
              className="rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-xs font-semibold text-navy transition hover:bg-cream"
            >
              <span aria-hidden="true">🌐 </span>
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>

            <div className="relative">
              <NewProjectForm
                compact
                onCreated={onProjectChange}
                panelClassName="absolute end-0 top-full z-10 mt-2 w-72 shadow-lg"
              />
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                ref={userMenuButtonRef}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t('chrome.userMenu')}
                className="flex items-center gap-2 rounded-full border border-sand bg-white px-3 py-1.5 text-sm text-navy"
              >
                <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-semibold text-cream">
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
                <div
                  role="menu"
                  aria-label={t('chrome.userMenu')}
                  className="absolute end-0 top-full mt-2 w-40 rounded-[var(--radius-s)] border border-sand bg-white py-1 shadow-lg"
                >
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-start text-sm text-navy transition hover:bg-cream"
                  >
                    {t('chrome.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
