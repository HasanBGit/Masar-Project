import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Badge } from '../../components/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ErrorState } from '../../components/ui/ErrorState'
import { SelectField, TextField } from '../../components/ui/Field'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
import type { AuditLogEntry, Project, Role, RosterEntry } from '../../lib/types'
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

const ROLES: Role[] = ['owner', 'consultant', 'project_manager', 'designer', 'admin']
const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  consultant: 'Consultant',
  project_manager: 'Project Manager',
  designer: 'Designer',
  admin: 'Admin',
}
const ELEVATED_ROLES = new Set(['owner', 'admin'])

const AUDIT_COLUMNS: Column<AuditLogEntry>[] = [
  {
    key: 'time',
    header: 'Time',
    sortValue: (e) => new Date(e.created_at).getTime(),
    render: (e) => <span className="text-navy/60">{new Date(e.created_at).toLocaleString()}</span>,
  },
  {
    key: 'event',
    header: 'Event',
    sortValue: (e) => e.event_type,
    render: (e) => <span className="font-semibold">{e.event_type}</span>,
  },
  {
    key: 'actor',
    header: 'Actor',
    sortValue: (e) => (e.actor ?? 'system').toLowerCase(),
    render: (e) => (
      <span className="text-navy/60">
        {e.actor ?? 'system'} ({e.actor_role || 'system'})
      </span>
    ),
  },
]

function AddMemberForm({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('project_manager')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setEmailError('Enter the email of an existing user.')
      return
    }
    setEmailError(null)
    setBusy(true)
    try {
      const matches = await findUserByEmail(trimmed)
      if (matches.length === 0) {
        setEmailError('No user found with that email - they need an account first.')
        return
      }
      await addRosterMember(project.id, matches[0].id, role)
      toast.success(`${matches[0].full_name || trimmed} added to the roster.`)
      setEmail('')
      onChanged()
    } catch (err) {
      setEmailError(getApiError(err, 'Could not add that member (already on the roster?).'))
      toast.error(getApiError(err, 'Could not add that member (already on the roster?).'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-64 max-w-full">
          <TextField
            label="Member email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Existing user's email"
            error={emailError}
          />
        </div>
        <div className="w-40">
          <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
      >
        {busy ? 'Adding…' : '+ Add member'}
      </button>
    </form>
  )
}

function RetentionPolicyForm({
  project,
  currentYears,
  onUpdated,
}: {
  project: Project
  currentYears: number
  onUpdated: () => void
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [years, setYears] = useState(String(currentYears))
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => {
          setYears(String(currentYears))
          setFieldError(null)
          setOpen(true)
        }}
        className="mt-3 rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        Update retention policy
      </button>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = Number(years)
    if (!years.trim() || !Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      setFieldError('Enter a whole number of years between 1 and 50.')
      return
    }
    setFieldError(null)
    setBusy(true)
    try {
      await updateRetentionPolicy(project.id, { retention_years: parsed })
      toast.success(`Retention policy updated to ${parsed} year${parsed === 1 ? '' : 's'}.`)
      setOpen(false)
      onUpdated()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-3 max-w-xs rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-5">
      <TextField
        label="Retention years"
        type="number"
        min={1}
        max={50}
        step={1}
        required
        value={years}
        onChange={(e) => setYears(e.target.value)}
        error={fieldError}
        hint="Between 1 and 50 years."
      />
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-[var(--radius-s)] px-3 py-1.5 text-xs font-semibold text-navy/50 transition hover:text-navy"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function AccessControlPage({ project }: { project: Project }) {
  const toast = useToast()
  const canManage = ELEVATED_ROLES.has(project.role)
  const [memberToRemove, setMemberToRemove] = useState<RosterEntry | null>(null)
  const [reassignBusyId, setReassignBusyId] = useState<number | null>(null)

  const [auditLog, setAuditLog] = useState<AuditLogEntry[] | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
  const auditSeq = useRef(0)

  const { data, loading, error, reload } = useProjectData(project.id, async (id) => {
    const [roster, compliance] = await Promise.all([listRoster(Number(id)), getComplianceStatus(Number(id))])
    return { roster, compliance }
  })

  // The audit log is loaded on demand, so reset it (and invalidate any
  // in-flight request) when the active project changes.
  useEffect(() => {
    auditSeq.current++
    setAuditLog(null)
    setAuditLoading(false)
    setAuditError(null)
  }, [project.id])

  async function handleLoadAudit() {
    const seq = ++auditSeq.current
    setAuditLoading(true)
    setAuditError(null)
    try {
      const log = await getAuditLog(project.id)
      if (seq === auditSeq.current) setAuditLog(log)
    } catch (err) {
      if (seq === auditSeq.current) setAuditError(getApiError(err))
    } finally {
      if (seq === auditSeq.current) setAuditLoading(false)
    }
  }

  async function handleReassign(entry: RosterEntry, role: Role) {
    setReassignBusyId(entry.id)
    try {
      await reassignRosterMember(entry.id, role)
      toast.success(`${entry.user_name} is now ${role}.`)
      await reload()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setReassignBusyId(null)
    }
  }

  if (loading) return <PageSkeleton />
  if (error || !data) {
    return <ErrorState message={error ?? 'Could not load access-control data.'} onRetry={reload} />
  }

  const { roster, compliance } = data

  const rosterColumns: Column<RosterEntry>[] = [
    {
      key: 'member',
      header: 'Member',
      sortValue: (entry) => entry.user_name.toLowerCase(),
      render: (entry) => (
        <div>
          <p className="text-navy">{entry.user_name}</p>
          <p className="text-xs text-navy/50">{entry.user_email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (entry) => entry.role,
      render: (entry) =>
        canManage ? (
          <div className="max-w-36">
            <SelectField
              label={`Role for ${entry.user_name}`}
              hideLabel
              value={entry.role}
              disabled={reassignBusyId === entry.id}
              onChange={(e) => handleReassign(entry, e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </SelectField>
          </div>
        ) : (
          <Badge label={ROLE_LABEL[entry.role] ?? entry.role} tone="neutral" />
        ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            className: 'text-end',
            render: (entry: RosterEntry) => (
              <button
                onClick={() => setMemberToRemove(entry)}
                className="text-xs font-semibold text-status-escalated transition hover:underline"
              >
                Remove
              </button>
            ),
          } satisfies Column<RosterEntry>,
        ]
      : []),
  ]

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
          {canManage && <AddMemberForm project={project} onChanged={reload} />}
          <DataTable
            columns={rosterColumns}
            rows={roster}
            rowKey={(entry) => entry.id}
            minWidth={420}
            emptyTitle="No members on this roster yet"
            emptyHint={
              canManage
                ? 'Add an existing user by email with the form above to give them access to this project.'
                : 'Project members will appear here once an owner or admin adds them.'
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Data retention &amp; residency</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Platform region" value={compliance.platform_data_residency_region.toUpperCase()} />
          <StatCard label="Project region" value={compliance.project_data_residency_region.toUpperCase()} />
          <StatCard label="Retention" value={`${compliance.retention_years}y`} />
          <StatCard
            label="Status"
            value={
              compliance.residency_matches_platform ? (
                <Badge label="Compliant" tone="good" />
              ) : (
                <Badge label="Mismatch" tone="danger" />
              )
            }
          />
        </div>
        {canManage && (
          <RetentionPolicyForm project={project} currentYears={compliance.retention_years} onUpdated={reload} />
        )}
      </section>

      {canManage && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Access audit log</h2>
            {!auditLog && !auditLoading && !auditError && (
              <button
                onClick={handleLoadAudit}
                className="text-xs font-semibold text-navy underline transition hover:text-navy-deep"
              >
                Load
              </button>
            )}
          </div>
          {(auditLog || auditLoading || auditError) && (
            <DataTable
              columns={AUDIT_COLUMNS}
              rows={auditLog ?? []}
              rowKey={(e) => e.id}
              loading={auditLoading}
              error={auditError}
              onRetry={handleLoadAudit}
              minWidth={560}
              emptyTitle="No audit events recorded yet"
              emptyHint="Access and change events for this project will be listed here as they happen."
            />
          )}
        </section>
      )}

      <ConfirmDialog
        open={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        title="Remove member"
        message={`Remove ${memberToRemove?.user_name ?? 'this member'} from ${project.name}? They will immediately lose access to this project.`}
        confirmLabel="Remove member"
        onConfirm={async () => {
          if (!memberToRemove) return
          await removeRosterMember(memberToRemove.id)
          toast.success(`${memberToRemove.user_name} removed from the roster.`)
          await reload()
        }}
      />
    </div>
  )
}
