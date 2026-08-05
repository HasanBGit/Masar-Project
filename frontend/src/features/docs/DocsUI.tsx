import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function DocsH1({ children }: { children: ReactNode }) {
  return <h1 className="font-[var(--font-display)] text-3xl font-bold text-cream">{children}</h1>
}

export function DocsLead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-base text-text-navy-muted">{children}</p>
}

export function DocsH2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-32 font-[var(--font-display)] text-2xl font-bold text-cream first:mt-0">
      {children}
    </h2>
  )
}

export function DocsH3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-6 scroll-mt-32 text-lg font-bold text-cream">
      {children}
    </h3>
  )
}

export function DocsP({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-text-navy-muted">{children}</p>
}

export function DocsUl({ children }: { children: ReactNode }) {
  return <ul className="mt-3 flex list-disc flex-col gap-1.5 ps-5 text-sm leading-relaxed text-text-navy-muted">{children}</ul>
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-cream/10 px-1.5 py-0.5 font-[var(--font-mono)] text-xs text-cream">{children}</code>
}

/** Internal doc-to-doc link. */
export function DocsLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-gold-soft underline decoration-gold-soft/40 underline-offset-2 transition hover:text-gold-soft/80"
    >
      {children}
    </Link>
  )
}

/** External or non-router link, styled the same as DocsLink. */
export function DocsExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-gold-soft underline decoration-gold-soft/40 underline-offset-2 transition hover:text-gold-soft/80"
    >
      {children}
    </a>
  )
}

const CALLOUT_STYLES = {
  info: { bg: 'bg-status-understanding/10', border: 'border-status-understanding/40', label: 'Note', labelColor: 'text-sky-300' },
  tip: { bg: 'bg-status-agreeing/10', border: 'border-status-agreeing/40', label: 'Tip', labelColor: 'text-emerald-300' },
  warn: { bg: 'bg-status-hearing/10', border: 'border-status-hearing/40', label: 'Warning', labelColor: 'text-amber-300' },
}

export function Callout({
  type = 'info',
  label,
  children,
}: {
  type?: keyof typeof CALLOUT_STYLES
  /** Overrides the type's default label (e.g. "Not built yet" for a scope-gap callout). */
  label?: string
  children: ReactNode
}) {
  const style = CALLOUT_STYLES[type]
  return (
    <div className={`mt-4 rounded-[var(--radius-m)] border ${style.border} ${style.bg} px-4 py-3`}>
      <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${style.labelColor}`}>{label ?? style.label}</p>
      <div className="text-sm leading-relaxed text-cream/80">{children}</div>
    </div>
  )
}

export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius-m)] border border-cream/10 bg-black/30">
      {label && <div className="border-b border-cream/10 px-4 py-1.5 font-[var(--font-mono)] text-xs text-cream/50">{label}</div>}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code className="font-[var(--font-mono)] text-cream/90">{children}</code>
      </pre>
    </div>
  )
}

/** Stable row key: the first string cell (column values are unique in docs tables), index as last resort. */
function rowKey(row: (string | ReactNode)[], index: number): string {
  const firstString = row.find((cell): cell is string => typeof cell === 'string' && cell.length > 0)
  return firstString ?? `row-${index}`
}

export function DocsTable({ head, rows }: { head: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-[var(--radius-m)] border border-cream/10">
      <table className="w-full text-start text-sm">
        <thead className="bg-cream/5 text-xs uppercase tracking-wide text-cream/45">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-cream/10 px-4 py-2.5 text-start font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="border-b border-cream/10 last:border-0">
              {row.map((cell, j) => (
                <td key={head[j] ?? j} className="px-4 py-2.5 text-start align-top text-text-navy-muted">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' }) {
  const colors: Record<string, string> = {
    GET: 'bg-status-understanding/20 text-sky-300',
    POST: 'bg-status-agreeing/20 text-emerald-300',
    PATCH: 'bg-status-hearing/20 text-amber-300',
    DELETE: 'bg-status-escalated/20 text-rose-300',
  }
  return <span className={`rounded px-1.5 py-0.5 font-[var(--font-mono)] text-xs font-bold ${colors[method]}`}>{method}</span>
}

export function Endpoint({ method, path, children }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[var(--radius-m)] border border-cream/10 bg-cream/5 p-4">
      <div className="flex items-center gap-2.5">
        <MethodBadge method={method} />
        <code className="font-[var(--font-mono)] text-xs text-cream">{path}</code>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-text-navy-muted">{children}</div>
    </div>
  )
}
