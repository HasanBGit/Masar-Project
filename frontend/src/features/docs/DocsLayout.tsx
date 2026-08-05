import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, Folder, Menu, Search, X } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { DOCS_NAV, findDocsLocation, type DocsNavGroup, type DocsNavItem } from './docsNav'

function docPath(item: DocsNavItem) {
  return `/docs${item.slug ? `/${item.slug}` : ''}`
}

function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full w-72 flex-col overflow-y-auto border-e border-cream/10 bg-navy-deep px-4 py-6" onClick={onNavigate}>
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-cream/35">Docs</p>
      {DOCS_NAV.map((group) => (
        <div key={group.label} className="mb-1">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-s)] px-2.5 py-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold-soft">
              <Folder size={13} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cream">{group.label}</p>
              <p className="text-xs text-cream/40">
                {group.items.length} {group.items.length === 1 ? 'page' : 'pages'}
              </p>
            </div>
          </div>
          <div className="ms-3 flex flex-col gap-0.5 border-s border-cream/10 ps-3">
            {group.items.map((item) => (
              <NavLink
                key={item.slug}
                to={docPath(item)}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-[var(--radius-s)] px-2.5 py-1.5 text-sm transition ${
                    isActive ? 'bg-gold/15 font-semibold text-gold-soft' : 'text-cream/55 hover:bg-cream/5 hover:text-cream'
                  }`
                }
              >
                <FileText size={13} className="shrink-0 opacity-70" aria-hidden="true" />
                <span className="truncate">{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function DocsBreadcrumb() {
  const location = useLocation()
  const slug = location.pathname.replace(/^\/docs\/?/, '')
  const match = findDocsLocation(slug)

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-cream/45">{match?.group.label ?? 'Docs'}</span>
      {match && (
        <>
          <ChevronRight size={13} className="text-cream/25 rtl:rotate-180" aria-hidden="true" />
          <span className="text-cream">{match.item.title}</span>
        </>
      )}
    </div>
  )
}

/** Client-side docs search: filters the nav items by title/group label. */
function DocsSearch() {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const trimmed = query.trim().toLowerCase()
  const results: { group: DocsNavGroup; item: DocsNavItem }[] = trimmed
    ? DOCS_NAV.flatMap((group) =>
        group.items
          .filter((item) => `${group.label} ${item.title}`.toLowerCase().includes(trimmed))
          .map((item) => ({ group, item })),
      )
    : []

  return (
    <div className="relative hidden sm:block">
      <label htmlFor={inputId} className="sr-only">
        Search docs
      </label>
      <div className="flex items-center gap-2 rounded-[var(--radius-s)] border border-cream/15 bg-cream/5 px-3 py-1.5 text-cream/40 transition focus-within:border-cream/40">
        <Search size={14} aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs"
          className="w-36 bg-transparent text-sm text-cream outline-none placeholder:text-cream/40"
        />
      </div>
      {trimmed && (
        <ul className="absolute end-0 top-full z-30 mt-2 max-h-80 w-72 overflow-y-auto rounded-[var(--radius-m)] border border-cream/15 bg-navy-deep p-1.5 shadow-2xl">
          {results.length === 0 && <li className="px-2.5 py-2 text-sm text-cream/50">No matching pages</li>}
          {results.map(({ group, item }) => (
            <li key={item.slug || 'index'}>
              <Link
                to={docPath(item)}
                onClick={() => setQuery('')}
                className="block rounded-[var(--radius-s)] px-2.5 py-2 text-sm text-cream/80 transition hover:bg-cream/10 hover:text-cream"
              >
                <span className="block text-xs text-cream/45">{group.label}</span>
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DocsLayout({ children, toc }: { children: ReactNode; toc?: { id: string; label: string }[] }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const drawerRef = useRef<HTMLDivElement>(null)
  const navToggleButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the drawer on open, close on Escape, lock body scroll, and return
  // focus to the trigger (mirrors AppLayout's drawer behaviour).
  useEffect(() => {
    if (!mobileNavOpen) return
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>('a, button')
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
    <div className="min-h-svh bg-navy-deep">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cream/10 bg-navy-deep/95 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <button
            ref={navToggleButtonRef}
            onClick={() => setMobileNavOpen(true)}
            className="rounded-[var(--radius-s)] p-1.5 text-cream transition hover:bg-cream/10 lg:hidden"
            aria-label="Open docs navigation"
            aria-haspopup="dialog"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <Link to="/docs">
            <Logo size={26} light />
          </Link>
          <span className="hidden rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-soft sm:inline">Docs</span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-[var(--radius-s)] border border-cream/15 px-3 py-1.5 text-sm font-medium text-cream transition hover:bg-cream/10"
        >
          Go to app →
        </button>
      </header>

      <div className="sticky top-16 z-20 flex h-12 items-center justify-between border-b border-cream/10 bg-navy-deep/95 px-4 backdrop-blur sm:px-6">
        <DocsBreadcrumb />
        <DocsSearch />
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Docs navigation"
            className="absolute inset-y-0 start-0 pt-16"
          >
            <DocsSidebar onNavigate={() => setMobileNavOpen(false)} />
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute end-2 top-20 rounded-full border border-cream/20 bg-navy-deep p-2 text-cream shadow-md transition hover:bg-cream/10"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden shrink-0 lg:block">
          <div className="sticky top-[7rem] h-[calc(100svh-7rem)]">
            <DocsSidebar />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>

        {toc && toc.length > 0 && (
          <aside className="hidden w-56 shrink-0 py-10 pe-6 xl:block">
            <div className="sticky top-32">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cream/40">On this page</p>
              <ul className="flex flex-col gap-1.5 border-s border-cream/10 ps-3 text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="text-cream/50 transition hover:text-gold-soft">
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
