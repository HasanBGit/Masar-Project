import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { StatusBadge } from '../../components/StatusBadge'
import { SlaCountdown } from '../../components/SlaCountdown'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { useProjectData } from '../../lib/useProjectData'
import { getDashboardSummary } from './api'
import type { Decision, Project, Role } from '../../lib/types'

const ROLE_COPY: Record<Role, { greeting: string; hint: string }> = {
  owner: {
    greeting: 'Your project, one seat with full visibility.',
    hint: 'Every open decision across the project, prioritized by what needs you.',
  },
  consultant: {
    greeting: 'What needs your review and sign-off.',
    hint: 'Decisions where you are the accountable approver for the PM or Designer.',
  },
  project_manager: {
    greeting: 'Your site report and payment queue.',
    hint: 'Decisions awaiting your submission or response.',
  },
  designer: {
    greeting: 'Your design review queue.',
    hint: 'Drawings and submittals awaiting Consultant sign-off.',
  },
  admin: { greeting: 'Workspace administration.', hint: 'Roster and access overview.' },
}

const DECISION_COLUMNS: Column<Decision>[] = [
  {
    key: 'title',
    header: 'Decision',
    sortValue: (d) => d.title.toLowerCase(),
    render: (d) => (
      <Link to={`/decisions/${d.id}`} className="font-medium text-navy transition hover:underline">
        {d.title}
      </Link>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (d) => d.status,
    render: (d) => <StatusBadge status={d.status} />,
  },
  {
    key: 'sla',
    header: 'SLA',
    sortValue: (d) => new Date(d.sla_deadline).getTime(),
    render: (d) => <SlaCountdown deadline={d.sla_deadline} />,
  },
]

export function DashboardPage({ project }: { project: Project }) {
  const { me } = useAuth()
  const {
    data: summary,
    loading,
    error,
    reload,
  } = useProjectData(project.id, (id) => getDashboardSummary(Number(id)))

  if (loading) return <PageSkeleton />
  if (error || !summary) {
    return <ErrorState message={error ?? 'Could not load the dashboard.'} onRetry={reload} />
  }

  const copy = ROLE_COPY[summary.role] ?? {
    greeting: 'Welcome to your workspace.',
    hint: 'Decisions needing your input or review will appear below.',
  }

  const firstName = me?.full_name?.split(' ')[0]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">
          {firstName ? `${firstName}, ` : ''}{copy.greeting}
        </h1>
        <p className="mt-1 text-sm text-navy/60">{copy.hint}</p>
      </div>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">
          {summary.digest.length} thing{summary.digest.length === 1 ? '' : 's'} need{summary.digest.length === 1 ? 's' : ''} your decision
        </h2>
        {summary.digest.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle2}
            title="Nothing urgent - you're caught up"
            hint="Decisions that need your input will appear here the moment they are routed to you."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {summary.digest.map((d) => (
              <Link
                key={d.id}
                to={`/decisions/${d.id}`}
                className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 transition hover:border-navy/40 hover:shadow-[0_10px_30px_-18px_rgba(15,59,77,0.5)]"
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
          <StatCard label="Overdue" value={<span className="text-status-escalated">{summary.stats.overdue}</span>} />
          <StatCard
            label="High-stakes"
            value={<span className="text-status-hearing">{summary.stats.high_stakes_pending}</span>}
          />
          <StatCard label="Closed" value={summary.stats.closed} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">All decisions</h2>
        <DataTable
          columns={DECISION_COLUMNS}
          rows={summary.decisions}
          rowKey={(d) => d.id}
          minWidth={480}
          emptyTitle="No decisions in view for your role yet"
          emptyHint="When a decision is routed to your role on this project it will appear here."
        />
      </section>
    </div>
  )
}
