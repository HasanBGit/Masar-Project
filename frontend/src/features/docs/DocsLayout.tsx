import { type ReactNode, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, Folder, Menu, Search, X } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { DOCS_NAV, findDocsLocation } from './docsNav'

function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full w-72 flex-col overflow-y-auto border-r border-cream/10 bg-navy-deep px-4 py-6" onClick={onNavigate}>
      <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-cream/35">Docs</p>
      {DOCS_NAV.map((group) => (
        <div key={group.label} className="mb-1">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-s)] px-2.5 py-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold-soft">
              <Folder size={13} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-cream">{group.label}</p>
              <p className="text-[11px] text-cream/40">
                {group.items.length} {group.items.length === 1 ? 'page' : 'pages'}
              </p>
            </div>
          </div>
          <div className="ml-3 flex flex-col gap-0.5 border-l border-cream/10 pl-3">
            {group.items.map((item) => (
              <NavLink
                key={item.slug}
                to={`/docs${item.slug ? `/${item.slug}` : ''}`}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-[var(--radius-s)] px-2.5 py-1.5 text-[13.5px] transition ${
                    isActive ? 'bg-gold/15 font-semibold text-gold-soft' : 'text-cream/55 hover:bg-cream/5 hover:text-cream'
                  }`
                }
              >
                <FileText size={13} className="shrink-0 opacity-70" />
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
    <div className="flex items-center gap-1.5 text-[13px]">
      <span className="text-cream/45">{match?.group.label ?? 'Docs'}</span>
      {match && (
        <>
          <ChevronRight size={13} className="text-cream/25" />
          <span className="text-cream">{match.item.title}</span>
        </>
      )}
    </div>
  )
}

export function DocsLayout({ children, toc }: { children: ReactNode; toc?: { id: string; label: string }[] }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-svh bg-navy-deep">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cream/10 bg-navy-deep/95 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-[var(--radius-s)] p-1.5 text-cream hover:bg-cream/10 lg:hidden"
            aria-label="Open docs navigation"
          >
            <Menu size={20} />
          </button>
          <Link to="/docs">
            <Logo size={26} light />
          </Link>
          <span className="hidden rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-soft sm:inline">Docs</span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-[var(--radius-s)] border border-cream/15 px-3 py-1.5 text-sm font-medium text-cream hover:bg-cream/10"
        >
          Go to app →
        </button>
      </header>

      <div className="sticky top-16 z-20 flex h-12 items-center justify-between border-b border-cream/10 bg-navy-deep/95 px-4 backdrop-blur sm:px-6">
        <DocsBreadcrumb />
        <div className="hidden items-center gap-2 rounded-[var(--radius-s)] border border-cream/15 bg-cream/5 px-3 py-1.5 text-[13px] text-cream/40 sm:flex">
          <Search size={14} />
          <span>Search docs</span>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 pt-16">
            <DocsSidebar onNavigate={() => setMobileNavOpen(false)} />
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-[-44px] top-20 rounded-full bg-navy-deep p-2 text-cream shadow-md"
            >
              <X size={18} />
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
          <aside className="hidden w-56 shrink-0 py-10 pr-6 xl:block">
            <div className="sticky top-32">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cream/40">On this page</p>
              <ul className="flex flex-col gap-1.5 border-l border-cream/10 pl-3 text-[13px]">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="text-cream/50 hover:text-gold-soft">
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
