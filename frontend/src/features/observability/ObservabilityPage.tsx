import { useEffect, useState } from 'react'
import { Badge } from '../../components/Badge'
import type { AlertEvent, IntegrationHealthCheck, QuietProject, SecurityEvent, SlaComplianceSummary } from '../../lib/types'
import { acknowledgeAlert, createAlert, getAlerts, getIntegrationHealth, getQuietProjects, getSecurityEvents, getSlaCompliance } from './api'

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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p className="mt-1 font-[var(--font-display)] text-2xl font-bold text-navy">{value}</p>
    </div>
  )
}

export function ObservabilityPage() {
  const [health, setHealth] = useState<IntegrationHealthCheck[]>([])
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [sla, setSla] = useState<SlaComplianceSummary | null>(null)
  const [quiet, setQuiet] = useState<QuietProject[]>([])
  const [security, setSecurity] = useState<SecurityEvent[]>([])

  async function load() {
    const [h, a, s, q, sec] = await Promise.all([
      getIntegrationHealth(), getAlerts(), getSlaCompliance(), getQuietProjects(), getSecurityEvents(),
    ])
    setHealth(h)
    setAlerts(a)
    setSla(s)
    setQuiet(q)
    setSecurity(sec)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">San3 internal</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Monitoring &amp; Observability</h1>
        <p className="mt-1 text-sm text-navy/60">
          "We're watching so the owner doesn't have to" - only holds if San3 is watching its own pipes. Internal-only, distinct from the customer-facing dashboard.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Integration health</h2>
        <p className="mb-2 text-xs text-navy/50">
          No live WhatsApp/email integration exists yet in this build (field-capture / unified-timeline modules aren't built) - statuses below are labeled simulations of the real signal this registry is designed to carry.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {health.map((h) => (
            <div key={h.id} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-navy">{h.integration_type.replace('_', ' ')}</p>
                <HealthBadge status={h.status} />
              </div>
              <p className="text-xs text-navy/50">{h.project_name ?? 'Platform-wide'}</p>
              {h.last_error && <p className="mt-1 text-xs text-status-escalated">{h.last_error}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">SLA compliance (all projects)</h2>
        {sla && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Total decisions" value={sla.total_decisions} />
            <StatCard label="Escalated" value={sla.escalated_count} />
            <StatCard label="Escalation rate" value={`${(sla.escalation_rate * 100).toFixed(1)}%`} />
            <StatCard label="Breached, unescalated" value={sla.currently_breached_unescalated} />
            <StatCard label="Avg hours to close" value={sla.avg_hours_to_close ?? '-'} />
          </div>
        )}
        {sla && sla.currently_breached_unescalated > 0 && (
          <p className="mt-2 text-xs text-status-escalated">
            {sla.currently_breached_unescalated} decision(s) are overdue but haven't escalated yet - the escalation sweep may not be running.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Alerts</h2>
          <button
            onClick={async () => {
              await createAlert({
                severity: 'warning',
                source: 'Ops Simulator',
                message: `Simulated alert triggered at ${new Date().toLocaleTimeString()}`,
              })
              load()
            }}
            className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5"
          >
            + Trigger test alert
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {alerts.length === 0 && <p className="text-sm text-navy/50">No alerts.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <AlertBadge severity={a.severity} />
                  <span className="text-xs text-navy/50">{a.source}</span>
                </div>
                <p className="text-sm text-navy">{a.message}</p>
              </div>
              {!a.acknowledged ? (
                <button
                  onClick={async () => {
                    await acknowledgeAlert(a.id)
                    load()
                  }}
                  className="rounded-[var(--radius-s)] border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
                >
                  Acknowledge
                </button>
              ) : (
                <Badge label={`Ack'd by ${a.acknowledged_by_name}`} tone="neutral" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Quiet projects</h2>
        <p className="mb-2 text-xs text-navy/50">No activity in the audit log for 7+ days - a project or module that's gone quiet.</p>
        {quiet.length === 0 ? (
          <p className="text-sm text-navy/50">Nothing quiet - every project has recent activity.</p>
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
          <p className="text-sm text-navy/50">No permission-denied events recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {security.map((e) => (
              <li key={e.id} className="border-b border-sand/40 pb-2">
                <span className="text-navy/50">{new Date(e.created_at).toLocaleString()}</span> - {e.actor ?? 'unknown'} on{' '}
                <code className="rounded bg-sand/40 px-1">{e.path}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
