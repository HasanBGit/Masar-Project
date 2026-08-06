import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { useLang } from '../lib/i18n'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Sidebar } from './Sidebar'
import { NewProjectForm } from './NewProjectForm'
import type { Project } from '../lib/types'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  consultant: 'Consultant',
  project_manager: 'Project Manager',
  designer: 'Designer',
  admin: 'Admin',
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
  const { t } = useLang()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userMenuButtonRef = useRef<HTMLButtonElement>(null)
  const navToggleButtonRef = useRef<HTMLButtonElement>(null)
  const mobileDrawerRef = useRef<HTMLDivElement>(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

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

            <LanguageSwitcher />

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
