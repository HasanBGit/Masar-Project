import { useState } from 'react'
import { Activity, BellOff, ShieldCheck } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
import { acknowledgeAlert, createAlert, getAlerts, getIntegrationHealth, getQuietProjects, getSecurityEvents, getSlaCompliance } from './api'
import type { AlertEvent, IntegrationHealthCheck, SecurityEvent } from '../../lib/types'

function HealthBadge({ status }: { status: IntegrationHealthCheck['status'] }) {
  if (status === 'healthy') return <Badge label="Healthy" tone="good" />
  if (status === 'degraded') return <Badge label="Degraded" tone="warn" />
  return <Badge label="Down" tone="danger" />
}

function AlertBadge({ severity }: { severity: AlertEvent['severity'] }) {
  if (severity === 'critical') return <Badge label="Critical" tone="danger" />
  if (severity === 'warning') return <Badge label="Warning" tone="warn" />
  return <Badge label="Info" tone="info" />
}

const SECURITY_COLUMNS: Column<SecurityEvent>[] = [
  {
    key: 'time',
    header: 'Time',
    sortValue: (e) => new Date(e.created_at).getTime(),
    render: (e) => <span className="text-navy/60">{new Date(e.created_at).toLocaleString()}</span>,
  },
  {
    key: 'actor',
    header: 'Actor',
    sortValue: (e) => (e.actor ?? '').toLowerCase(),
    render: (e) => e.actor ?? 'unknown',
  },
  {
    key: 'path',
    header: 'Path',
    render: (e) => <code className="rounded bg-sand/40 px-1 text-xs">{e.path}</code>,
  },
]

export function ObservabilityPage() {
  const toast = useToast()
  const [alertBusy, setAlertBusy] = useState(false)
  const [ackBusyId, setAckBusyId] = useState<number | null>(null)

  // Staff-wide view (not project-scoped) - the constant key keeps the
  // race-safe load/reload behaviour without a project id.
  const { data, loading, error, reload } = useProjectData('observability', async () => {
    const [health, alerts, sla, quiet, security] = await Promise.all([
      getIntegrationHealth(),
      getAlerts(),
      getSlaCompliance(),
      getQuietProjects(),
      getSecurityEvents(),
    ])
    return { health, alerts, sla, quiet, security }
  })

  async function handleTestAlert() {
    setAlertBusy(true)
    try {
      await createAlert({
        severity: 'warning',
        source: 'Ops Simulator',
        message: `Simulated alert triggered at ${new Date().toLocaleTimeString()}`,
      })
      toast.success('Test alert created.')
      await reload()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setAlertBusy(false)
    }
  }

  async function handleAcknowledge(id: number) {
    setAckBusyId(id)
    try {
      await acknowledgeAlert(id)
      toast.success('Alert acknowledged.')
      await reload()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setAckBusyId(null)
    }
  }

  if (loading) return <PageSkeleton />
  if (error || !data) {
    return <ErrorState message={error ?? 'Could not load observability data.'} onRetry={reload} />
  }

  const { health, alerts, sla, quiet, security } = data

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">Truepoint internal</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Monitoring &amp; Observability</h1>
        <p className="mt-1 text-sm text-navy/60">
          "We're watching so the owner doesn't have to" - only holds if Truepoint is watching its own pipes. Internal-only, distinct from the customer-facing dashboard.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Integration health</h2>
        <p className="mb-2 text-xs text-navy/50">
          No live WhatsApp/email integration exists yet in this build (field-capture / unified-timeline modules aren't built) - statuses below are labeled simulations of the real signal this registry is designed to carry.
        </p>
        {health.length === 0 ? (
          <EmptyState
            compact
            icon={Activity}
            title="No integration health checks registered"
            hint="When WhatsApp, email, or portal integrations register health checks, their status will appear here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {health.map((h) => (
              <div key={h.id} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 transition hover:border-sand">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy">{h.integration_type.replace('_', ' ')}</p>
                  <HealthBadge status={h.status} />
                </div>
                <p className="text-xs text-navy/50">{h.project_name ?? 'Platform-wide'}</p>
                {h.last_error && <p className="mt-1 text-xs text-status-escalated">{h.last_error}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">SLA compliance (all projects)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total decisions" value={sla.total_decisions} />
          <StatCard label="Escalated" value={sla.escalated_count} />
          <StatCard label="Escalation rate" value={`${(sla.escalation_rate * 100).toFixed(1)}%`} />
          <StatCard label="Breached, unescalated" value={sla.currently_breached_unescalated} />
          <StatCard label="Avg hours to close" value={sla.avg_hours_to_close ?? '-'} />
        </div>
        {sla.currently_breached_unescalated > 0 && (
          <p role="alert" className="mt-2 text-xs text-status-escalated">
            {sla.currently_breached_unescalated} decision(s) are overdue but haven't escalated yet - the escalation sweep may not be running.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Alerts</h2>
          <button
            onClick={handleTestAlert}
            disabled={alertBusy}
            className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
          >
            {alertBusy ? 'Triggering…' : '+ Trigger test alert'}
          </button>
        </div>
        {alerts.length === 0 ? (
          <EmptyState
            compact
            icon={BellOff}
            title="No alerts"
            hint="Platform alerts (integration failures, escalation sweeps, ops signals) will appear here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <AlertBadge severity={a.severity} />
                    <span className="text-xs text-navy/50">{a.source}</span>
                  </div>
                  <p className="text-sm text-navy">{a.message}</p>
                </div>
                {!a.acknowledged ? (
                  <button
                    onClick={() => handleAcknowledge(a.id)}
                    disabled={ackBusyId === a.id}
                    className="rounded-[var(--radius-s)] border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <Badge label={`Ack'd by ${a.acknowledged_by_name}`} tone="neutral" />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Quiet projects</h2>
        <p className="mb-2 text-xs text-navy/50">No activity in the audit log for 7+ days - a project or module that's gone quiet.</p>
        {quiet.length === 0 ? (
          <EmptyState
            compact
            title="Nothing quiet"
            hint="Every project has recent activity. Projects that go silent for 7+ days will be flagged here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {quiet.map((q) => (
              <li key={q.project_id} className="rounded-[var(--radius-s)] border border-status-hearing/30 bg-status-hearing/5 px-4 py-2.5 text-sm">
                <span className="font-semibold text-navy">{q.project_name}</span>{' '}
                <span className="text-navy/60">
                  - last activity {q.last_activity_at ? new Date(q.last_activity_at).toLocaleDateString() : 'never'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Security &amp; incident monitoring</h2>
        <p className="mb-2 text-xs text-navy/50">Permission-denied events - a distinct failure mode from integration health, tracked separately.</p>
        {security.length === 0 ? (
          <EmptyState
            compact
            icon={ShieldCheck}
            title="No permission-denied events recorded"
            hint="Denied access attempts across the platform will be logged here for incident review."
          />
        ) : (
          <DataTable
            columns={SECURITY_COLUMNS}
            rows={security}
            rowKey={(e) => e.id}
            minWidth={480}
            emptyTitle="No permission-denied events recorded"
          />
        )}
      </section>
    </div>
  )
}
