import type { ReactNode } from 'react'

/**
 * Single shared stat card (was independently re-declared on four pages).
 */
export function StatCard({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 transition hover:border-sand hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</p>
        {accent}
      </div>
      <p className="mt-2 font-[var(--font-display)] text-2xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy/50">{hint}</p>}
    </div>
  )
}
