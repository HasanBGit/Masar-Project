import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { DOCS_LINK, NAV_GROUPS, type NavItem } from './nav'
import { useLang } from '../lib/i18n'

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useLang()
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 rounded-[var(--radius-s)] px-3 py-2 text-sm transition ${
          isActive ? 'bg-navy/8 font-semibold text-navy' : 'text-navy/60 hover:bg-navy/5 hover:text-navy'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className="absolute -start-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold" />}
          <Icon size={17} strokeWidth={isActive ? 2.25 : 1.75} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{t(item.labelKey)}</span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ isStaff, onNavigate }: { isStaff: boolean; onNavigate?: () => void }) {
  const { t } = useLang()
  return (
    <div className="flex h-full w-64 flex-col border-e border-sand/70 bg-paper">
      <div className="flex h-16 shrink-0 items-center border-b border-sand/70 px-5">
        <Logo size={28} />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.staffOnly || isStaff)
          if (items.length === 0) return null
          return (
            <div key={group.id} className="mb-5">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy/35">
                {t(group.labelKey)}
              </p>
              <div className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <NavRow key={item.to} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-sand/70 p-3">
        <NavRow item={DOCS_LINK} onNavigate={onNavigate} />
        <p className="mt-2 px-3 text-[11px] text-navy/30">Truepoint · Saudi/GCC construction platform</p>
      </div>
    </div>
  )
}
