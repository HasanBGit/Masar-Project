import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { StatusBadge } from '../../components/StatusBadge'
import { SlaCountdown } from '../../components/SlaCountdown'
import { getDashboardSummary } from './api'
import type { DashboardSummary, Project, Role } from '../../lib/types'

const ROLE_COPY: Record<Role, { greeting: string; hint: string }> = {
  owner: {
    greeting: 'Your project, one seat with full visibility.',
    hint: 'Every open decision across the project, prioritized by what needs you.',
  },
  investor: {
    greeting: 'Portfolio-level signal for oversight.',
    hint: 'Aggregated status - high-stakes items only, operational detail kept out of the way.',
  },
  consultant: {
    greeting: 'Items needing your technical input.',
    hint: 'Decisions where you are Responsible or Consulted.',
  },
  contractor: {
    greeting: 'Your action queue.',
    hint: 'Decisions awaiting your submission or response.',
  },
  admin: { greeting: 'Workspace administration.', hint: 'Roster and access overview.' },
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'danger' }) {
  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p
        className={`mt-1 font-[var(--font-display)] text-2xl font-bold ${
          tone === 'danger' ? 'text-status-escalated' : tone === 'warn' ? 'text-status-hearing' : 'text-navy'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export function DashboardPage({ project }: { project: Project }) {
  const { me } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getDashboardSummary(project.id)
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [project.id])

  if (loading || !summary) {
    return <p className="text-navy/60">Loading dashboard…</p>
  }

  const copy = ROLE_COPY[summary.role]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">
          {me?.full_name?.split(' ')[0]}, {copy.greeting}
        </h1>
        <p className="mt-1 text-sm text-navy/60">{copy.hint}</p>
      </div>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">
          {summary.digest.length} thing{summary.digest.length === 1 ? '' : 's'} need{summary.digest.length === 1 ? 's' : ''} your decision
        </h2>
        {summary.digest.length === 0 ? (
          <p className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 px-4 py-6 text-center text-sm text-navy/50">
            Nothing urgent - you're caught up.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {summary.digest.map((d) => (
              <Link
                key={d.id}
                to={`/decisions/${d.id}`}
                className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 transition hover:border-navy/40 hover:shadow-[0_10px_30px_-18px_rgba(15,59,77,0.5)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <StatusBadge status={d.status} />
                  {d.high_stakes && <span className="text-xs font-semibold text-gold-ink">High-stakes</span>}
                </div>
                <p className="text-sm font-semibold text-navy">{d.title}</p>
                <div className="mt-2">
                  <SlaCountdown deadline={d.sla_deadline} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Project pulse</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total" value={summary.stats.total} />
          <StatCard label="Pending" value={summary.stats.pending} />
          <StatCard label="Overdue" value={summary.stats.overdue} tone="danger" />
          <StatCard label="High-stakes" value={summary.stats.high_stakes_pending} tone="warn" />
          <StatCard label="Closed" value={summary.stats.closed} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">All decisions</h2>
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper">
          {summary.decisions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-navy/50">No decisions in view for your role yet.</p>
          ) : (
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-sand/70 text-xs uppercase tracking-wide text-navy/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Decision</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">SLA</th>
                </tr>
              </thead>
              <tbody>
                {summary.decisions.map((d) => (
                  <tr key={d.id} className="border-b border-sand/40 last:border-0 hover:bg-cream/60">
                    <td className="px-4 py-2.5">
                      <Link to={`/decisions/${d.id}`} className="font-medium text-navy hover:underline">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <SlaCountdown deadline={d.sla_deadline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
