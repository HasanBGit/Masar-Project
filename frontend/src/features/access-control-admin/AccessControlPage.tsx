import { useEffect, useState } from 'react'
import { Badge } from '../../components/Badge'
import type { AuditLogEntry, ComplianceStatus, Project, Role, RosterEntry } from '../../lib/types'
import {
  addRosterMember,
  findUserByEmail,
  getAuditLog,
  getComplianceStatus,
  listRoster,
  reassignRosterMember,
  removeRosterMember,
  updateRetentionPolicy,
} from './api'

const ROLES: Role[] = ['owner', 'investor', 'consultant', 'contractor', 'admin']
const ELEVATED_ROLES = new Set(['owner', 'admin'])

function RosterTable({ entries, canManage, onChanged }: { entries: RosterEntry[]; canManage: boolean; onChanged: () => void }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="border-b border-sand/70 text-xs uppercase tracking-wide text-navy/50">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">Member</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Role</th>
            {canManage && <th scope="col" className="px-4 py-2.5 font-semibold" />}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-sand/40 last:border-0">
              <td className="px-4 py-2.5">
                <p className="text-navy">{entry.user_name}</p>
                <p className="text-xs text-navy/50">{entry.user_email}</p>
              </td>
              <td className="px-4 py-2.5">
                {canManage ? (
                  <select
                    value={entry.role}
                    onChange={async (e) => {
                      await reassignRosterMember(entry.id, e.target.value as Role)
                      onChanged()
                    }}
                    className="rounded-[var(--radius-s)] border border-sand bg-white px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge label={entry.role} tone="neutral" />
                )}
              </td>
              {canManage && (
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={async () => {
                      await removeRosterMember(entry.id)
                      onChanged()
                    }}
                    className="text-xs font-semibold text-status-escalated hover:underline"
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AddMemberForm({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('contractor')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Existing user's email" className="w-64 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-[var(--radius-s)] border border-sand bg-white px-2 py-2 text-sm">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          disabled={busy || !email.trim()}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              const matches = await findUserByEmail(email.trim())
              if (matches.length === 0) {
                setError('No user found with that email - they need an account first.')
                return
              }
              await addRosterMember(project.id, matches[0].id, role)
              setEmail('')
              onChanged()
            } catch {
              setError('Could not add that member (already on the roster?).')
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60"
        >
          + Add member
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-status-escalated">{error}</p>}
    </div>
  )
}

export function AccessControlPage({ project }: { project: Project }) {
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[] | null>(null)
  const canManage = ELEVATED_ROLES.has(project.role)

  async function load() {
    const [r, c] = await Promise.all([listRoster(project.id), getComplianceStatus(project.id)])
    setRoster(r)
    setCompliance(c)
  }

  useEffect(() => {
    load()
  }, [project.id])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Security &amp; Access Control</h1>
        <p className="mt-1 text-sm text-navy/60">Who's on this project, what they can see, and proof of who accessed what.</p>
      </div>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Roster</h2>
        <div className="flex flex-col gap-3">
          {canManage && <AddMemberForm project={project} onChanged={load} />}
          <RosterTable entries={roster} canManage={canManage} onChanged={load} />
        </div>
      </section>

      {compliance && (
        <section>
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Data retention &amp; residency</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Platform region</p>
              <p className="mt-1 font-[var(--font-display)] text-xl font-bold text-navy">{compliance.platform_data_residency_region.toUpperCase()}</p>
            </div>
            <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Project region</p>
              <p className="mt-1 font-[var(--font-display)] text-xl font-bold text-navy">{compliance.project_data_residency_region.toUpperCase()}</p>
            </div>
            <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Retention</p>
              <p className="mt-1 font-[var(--font-display)] text-xl font-bold text-navy">{compliance.retention_years}y</p>
            </div>
            <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Status</p>
              {compliance.residency_matches_platform ? <Badge label="Compliant" tone="good" /> : <Badge label="Mismatch" tone="danger" />}
            </div>
          </div>
          {canManage && (
            <button
              onClick={async () => {
                const years = prompt('Retention years:', String(compliance.retention_years))
                if (years) {
                  const updated = await updateRetentionPolicy(project.id, { retention_years: Number(years) })
                  setCompliance(updated)
                }
              }}
              className="mt-3 rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5"
            >
              Update retention policy
            </button>
          )}
        </section>
      )}

      {canManage && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Access audit log</h2>
            {!auditLog && (
              <button onClick={async () => setAuditLog(await getAuditLog(project.id))} className="text-xs font-semibold text-navy underline">
                Load
              </button>
            )}
          </div>
          {auditLog && (
            <div className="max-h-96 overflow-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
              <ol className="flex flex-col gap-2 text-sm">
                {auditLog.map((e) => (
                  <li key={e.id} className="border-b border-sand/40 pb-2 last:border-0">
                    <span className="text-navy/50">{new Date(e.created_at).toLocaleString()}</span> - {' '}
                    <span className="font-semibold text-navy">{e.event_type}</span>{' '}
                    <span className="text-navy/60">
                      by {e.actor ?? 'system'} ({e.actor_role || 'system'})
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
