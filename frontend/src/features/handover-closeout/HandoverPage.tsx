import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/Badge'
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

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-4">
        <div className="flex flex-wrap gap-2">
          <input value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="Unit / zone" className="w-40 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Snag description" className="flex-1 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
          <button
            disabled={busy || !newZone.trim() || !newTitle.trim()}
            onClick={async () => {
              setBusy(true)
              await createPunchListItem({ project: project.id, unit_or_zone: newZone, title: newTitle })
              setBusy(false)
              setNewZone('')
              setNewTitle('')
              onChanged()
            }}
            className="rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60"
          >
            + Add item
          </button>
        </div>
      </div>

      {[...byZone.entries()].map(([zone, zoneItems]) => (
        <div key={zone}>
          <h3 className="mb-2 text-sm font-semibold text-navy/70">{zone}</h3>
          <div className="flex flex-col gap-2">
            {zoneItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-navy">{item.title}</p>
                  <p className="text-xs text-navy/50">Raised by {item.raised_by_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PunchListStatusBadge status={item.status} />
                  {item.status === 'open' && owners.length > 0 && (
                    <button
                      onClick={async () => {
                        await requestPunchListSignoff(item.id, owners[0].user)
                        onChanged()
                      }}
                      className="rounded-[var(--radius-s)] border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
                    >
                      Request sign-off
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
  const byCategory = useMemo(() => {
    const map = new Map<string, OMChecklistItem[]>()
    for (const item of items) {
      map.set(item.category, [...(map.get(item.category) ?? []), item])
    }
    return map
  }, [items])

  return (
    <div className="flex flex-col gap-4">
      {[...byCategory.entries()].map(([category, catItems]) => (
        <div key={category}>
          <h3 className="mb-2 text-sm font-semibold text-navy/70">{category}</h3>
          <div className="flex flex-col gap-2">
            {catItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
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
                          onClick={async () => {
                            await verifyOMItem(item.id)
                            onChanged()
                          }}
                          className="rounded-[var(--radius-s)] bg-navy px-2.5 py-1 text-xs font-semibold text-cream"
                        >
                          Verify
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

function DefectsList({ project, defects, onChanged }: { project: Project; defects: PostHandoverDefect[]; onChanged: () => void }) {
  const [zone, setZone] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-4">
        <div className="flex flex-wrap gap-2">
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Unit / zone" className="w-40 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the defect" className="flex-1 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
          <button
            disabled={busy || !zone.trim() || !title.trim()}
            onClick={async () => {
              setBusy(true)
              await reportDefect({ project: project.id, unit_or_zone: zone, title })
              setBusy(false)
              setZone('')
              setTitle('')
              onChanged()
            }}
            className="rounded-[var(--radius-s)] bg-status-escalated px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Report defect
          </button>
        </div>
      </div>
      {defects.map((d) => (
        <div key={d.id} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-navy">
              [{d.unit_or_zone}] {d.title}
            </p>
            <p className="text-xs text-navy/50">Reported by {d.reported_by_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <DefectStatusBadge status={d.status} />
            {d.status === 'reported' && (
              <button onClick={async () => { await acknowledgeDefect(d.id); onChanged() }} className="rounded-[var(--radius-s)] border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:bg-navy/5">
                Acknowledge
              </button>
            )}
            {d.status === 'acknowledged' && (
              <button onClick={async () => { await resolveDefect(d.id); onChanged() }} className="rounded-[var(--radius-s)] bg-navy px-2.5 py-1 text-xs font-semibold text-cream">
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

export function HandoverPage({ project }: { project: Project }) {
  const [record, setRecord] = useState<HandoverRecord | null>(null)
  const [punchList, setPunchList] = useState<PunchListItem[]>([])
  const [omItems, setOmItems] = useState<OMChecklistItem[]>([])
  const [defects, setDefects] = useState<PostHandoverDefect[]>([])
  const [roster, setRoster] = useState<RosterEntry[]>([])

  async function load() {
    const [rec, pl, om, df, ro] = await Promise.all([
      getHandoverRecord(project.id),
      listPunchList(project.id),
      listOMChecklist(project.id),
      listDefects(project.id),
      listRoster(project.id),
    ])
    setRecord(rec)
    setPunchList(pl)
    setOmItems(om)
    setDefects(df)
    setRoster(ro)
  }

  useEffect(() => {
    load()
  }, [project.id])

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
        <PunchListBoard project={project} items={punchList} roster={roster} onChanged={load} />
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">O&amp;M documentation checklist</h2>
        <OMChecklist items={omItems} canVerify={VERIFIER_ROLES.has(project.role)} onChanged={load} />
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Post-handover defects</h2>
        <DefectsList project={project} defects={defects} onChanged={load} />
      </section>
    </div>
  )
}
