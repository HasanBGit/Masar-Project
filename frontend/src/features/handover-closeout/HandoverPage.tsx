import { useMemo, useState, type FormEvent } from 'react'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { TextField } from '../../components/ui/Field'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
import type { HandoverRecord, OMChecklistItem, PostHandoverDefect, Project, PunchListItem } from '../../lib/types'
import {
  acknowledgeDefect,
  createPunchListItem,
  getHandoverRecord,
  listDefects,
  listOMChecklist,
  listPunchList,
  listRoster,
  reportDefect,
  requestPunchListSignoff,
  resolveDefect,
  type RosterEntry,
  verifyOMItem,
} from './api'

function PunchListStatusBadge({ status }: { status: PunchListItem['status'] }) {
  if (status === 'verified_closed') return <Badge label="Verified closed" tone="good" />
  if (status === 'pending_signoff') return <Badge label="Pending owner sign-off" tone="info" />
  return <Badge label="Open" tone="warn" />
}

function DefectStatusBadge({ status }: { status: PostHandoverDefect['status'] }) {
  if (status === 'resolved') return <Badge label="Resolved" tone="good" />
  if (status === 'acknowledged') return <Badge label="Acknowledged" tone="info" />
  return <Badge label="Reported" tone="danger" />
}

function PunchListBoard({
  project,
  items,
  roster,
  onChanged,
}: {
  project: Project
  items: PunchListItem[]
  roster: RosterEntry[]
  onChanged: () => void
}) {
  const toast = useToast()
  const owners = roster.filter((r) => r.role === 'owner' || r.role === 'admin')
  const byZone = useMemo(() => {
    const map = new Map<string, PunchListItem[]>()
    for (const item of items) {
      map.set(item.unit_or_zone, [...(map.get(item.unit_or_zone) ?? []), item])
    }
    return map
  }, [items])

  const [newZone, setNewZone] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [signoffBusyId, setSignoffBusyId] = useState<number | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await createPunchListItem({ project: project.id, unit_or_zone: newZone.trim(), title: newTitle.trim() })
      toast.success('Punch list item added.')
      setNewZone('')
      setNewTitle('')
      onChanged()
    } catch (err) {
      toast.error(getApiError(err, 'Could not add the punch list item.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleRequestSignoff(item: PunchListItem) {
    setSignoffBusyId(item.id)
    try {
      await requestPunchListSignoff(item.id, owners[0].user)
      toast.success('Owner sign-off requested.')
      onChanged()
    } catch (err) {
      toast.error(getApiError(err, 'Could not request sign-off.'))
    } finally {
      setSignoffBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-5">
        <div className="flex flex-wrap items-start gap-2">
          <div className="w-40">
            <TextField
              label="Unit / zone"
              hideLabel
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="Unit / zone"
              required
            />
          </div>
          <div className="min-w-48 flex-1">
            <TextField
              label="Snag description"
              hideLabel
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Snag description"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy || !newZone.trim() || !newTitle.trim()}
            className="rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
          >
            {busy ? 'Adding…' : '+ Add item'}
          </button>
        </div>
      </form>

      {items.length === 0 && (
        <EmptyState
          compact
          title="No punch list items yet"
          hint="Walk the site and log each snag with its unit or zone - closure needs owner sign-off."
        />
      )}

      {[...byZone.entries()].map(([zone, zoneItems]) => (
        <div key={zone}>
          <h3 className="mb-2 text-sm font-semibold text-navy/70">{zone}</h3>
          <div className="flex flex-col gap-2">
            {zoneItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm text-navy">{item.title}</p>
                  <p className="text-xs text-navy/50">Raised by {item.raised_by_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PunchListStatusBadge status={item.status} />
                  {item.status === 'open' && owners.length > 0 && (
                    <button
                      disabled={signoffBusyId === item.id}
                      onClick={() => handleRequestSignoff(item)}
                      className="rounded-[var(--radius-s)] border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
                    >
                      {signoffBusyId === item.id ? 'Requesting…' : 'Request sign-off'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function OMChecklist({ items, canVerify, onChanged }: { items: OMChecklistItem[]; canVerify: boolean; onChanged: () => void }) {
  const toast = useToast()
  const [verifyBusyId, setVerifyBusyId] = useState<number | null>(null)
  const byCategory = useMemo(() => {
    const map = new Map<string, OMChecklistItem[]>()
    for (const item of items) {
      map.set(item.category, [...(map.get(item.category) ?? []), item])
    }
    return map
  }, [items])

  async function handleVerify(item: OMChecklistItem) {
    setVerifyBusyId(item.id)
    try {
      await verifyOMItem(item.id)
      toast.success('Item verified.')
      onChanged()
    } catch (err) {
      toast.error(getApiError(err, 'Could not verify the item.'))
    } finally {
      setVerifyBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title="No O&M checklist items yet"
        hint="Operation and maintenance documentation appears here for installed-and-verified sign-off."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byCategory.entries()].map(([category, catItems]) => (
        <div key={category}>
          <h3 className="mb-2 text-sm font-semibold text-navy/70">{category}</h3>
          <div className="flex flex-col gap-2">
            {catItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm text-navy">{item.description_en}</p>
                  {item.description_ar && <p dir="rtl" className="text-sm text-navy/60">{item.description_ar}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {item.installed_verified ? (
                    <Badge label={`Verified by ${item.verified_by_name}`} tone="good" />
                  ) : (
                    <>
                      <Badge label="Not yet verified" tone="warn" />
                      {canVerify && (
                        <button
                          disabled={verifyBusyId === item.id}
                          onClick={() => handleVerify(item)}
                          className="rounded-[var(--radius-s)] bg-navy px-2.5 py-1 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
                        >
                          {verifyBusyId === item.id ? 'Verifying…' : 'Verify'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Mirrors the backend's exact role gates (handover/views.py): acknowledge
// is project_manager/owner/admin, resolve reuses the verify_evidence bar
// (owner/admin/consultant) - the two sets deliberately don't match.
const ACKNOWLEDGE_ROLES = new Set(['project_manager', 'owner', 'admin'])
const RESOLVE_ROLES = new Set(['owner', 'admin', 'consultant'])

function DefectsList({ project, defects, onChanged }: { project: Project; defects: PostHandoverDefect[]; onChanged: () => void }) {
  const toast = useToast()
  const [zone, setZone] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionBusyId, setActionBusyId] = useState<number | null>(null)
  const canAcknowledge = ACKNOWLEDGE_ROLES.has(project.role)
  const canResolve = RESOLVE_ROLES.has(project.role)

  async function handleReport(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await reportDefect({ project: project.id, unit_or_zone: zone.trim(), title: title.trim() })
      toast.success('Defect reported.')
      setZone('')
      setTitle('')
      onChanged()
    } catch (err) {
      toast.error(getApiError(err, 'Could not report the defect.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleAction(id: number, action: (id: number) => Promise<unknown>, successMessage: string, failMessage: string) {
    setActionBusyId(id)
    try {
      await action(id)
      toast.success(successMessage)
      onChanged()
    } catch (err) {
      toast.error(getApiError(err, failMessage))
    } finally {
      setActionBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleReport} className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-5">
        <div className="flex flex-wrap items-start gap-2">
          <div className="w-40">
            <TextField
              label="Defect unit / zone"
              hideLabel
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Unit / zone"
              required
            />
          </div>
          <div className="min-w-48 flex-1">
            <TextField
              label="Defect description"
              hideLabel
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the defect"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy || !zone.trim() || !title.trim()}
            className="rounded-[var(--radius-s)] bg-status-escalated px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Reporting…' : 'Report defect'}
          </button>
        </div>
      </form>

      {defects.length === 0 && (
        <EmptyState
          compact
          title="No post-handover defects reported"
          hint="Anything that surfaces during the liability window gets logged here with an audit trail."
        />
      )}

      {defects.map((d) => (
        <div
          key={d.id}
          className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm text-navy">
              [{d.unit_or_zone}] {d.title}
            </p>
            <p className="text-xs text-navy/50">Reported by {d.reported_by_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <DefectStatusBadge status={d.status} />
            {d.status === 'reported' && canAcknowledge && (
              <button
                disabled={actionBusyId === d.id}
                onClick={() => handleAction(d.id, acknowledgeDefect, 'Defect acknowledged.', 'Could not acknowledge the defect.')}
                className="rounded-[var(--radius-s)] border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
              >
                Acknowledge
              </button>
            )}
            {d.status === 'acknowledged' && canResolve && (
              <button
                disabled={actionBusyId === d.id}
                onClick={() => handleAction(d.id, resolveDefect, 'Defect resolved.', 'Could not resolve the defect.')}
                className="rounded-[var(--radius-s)] bg-navy px-2.5 py-1 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
              >
                Mark resolved
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const VERIFIER_ROLES = new Set(['owner', 'admin', 'consultant'])

interface HandoverPageData {
  record: HandoverRecord | null
  punchList: PunchListItem[]
  omItems: OMChecklistItem[]
  defects: PostHandoverDefect[]
  roster: RosterEntry[]
}

async function loadHandoverPage(projectId: number): Promise<HandoverPageData> {
  const [record, punchList, omItems, defects, roster] = await Promise.all([
    getHandoverRecord(projectId),
    listPunchList(projectId),
    listOMChecklist(projectId),
    listDefects(projectId),
    listRoster(projectId),
  ])
  return { record, punchList, omItems, defects, roster }
}

export function HandoverPage({ project }: { project: Project }) {
  const { data, loading, error, reload } = useProjectData(project.id, (pid) => loadHandoverPage(Number(pid)))

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <PageSkeleton />

  const { record, punchList, omItems, defects, roster } = data

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Handover &amp; Post-Handover</h1>
        {record ? (
          <p className="mt-1 text-sm text-navy/60">
            Practical completion {new Date(record.practical_completion_date).toLocaleDateString()} - decennial liability
            window {record.within_liability_window ? <Badge label="active" tone="good" /> : <Badge label="expired" tone="neutral" />} through{' '}
            {new Date(record.decennial_liability_expires_at).toLocaleDateString()}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-navy/60">Practical completion not yet recorded for this project.</p>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Punch list</h2>
        <PunchListBoard project={project} items={punchList} roster={roster} onChanged={reload} />
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">O&amp;M documentation checklist</h2>
        <OMChecklist items={omItems} canVerify={VERIFIER_ROLES.has(project.role)} onChanged={reload} />
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Post-handover defects</h2>
        <DefectsList project={project} defects={defects} onChanged={reload} />
      </section>
    </div>
  )
}
