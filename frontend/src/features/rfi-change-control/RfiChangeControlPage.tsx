import { useEffect, useState } from 'react'
import { Badge } from '../../components/Badge'
import type {
  ChangeOrder,
  CoordinationThread,
  MasterScheduleItem,
  Permit,
  Project,
  QualityCheckpoint,
  RFI,
  Submittal,
  SupplierDelivery,
} from '../../lib/types'
import {
  createChangeOrder,
  createCoordinationThread,
  createPermit,
  createQualityCheckpoint,
  createRFI,
  createSubmittal,
  createSupplierDelivery,
  getMasterSchedule,
  listChangeOrders,
  listCoordinationThreads,
  listPermits,
  listQualityCheckpoints,
  listRFIs,
  listSubmittals,
  listSupplierDeliveries,
  postCoordinationMessage,
  respondToRFI,
} from './api'

function RFIStatusBadge({ rfi }: { rfi: RFI }) {
  if (rfi.status === 'approved') return <Badge label="Answered" tone="good" />
  if (rfi.is_overdue) return <Badge label="Overdue" tone="danger" />
  return <Badge label="Awaiting response" tone="warn" />
}

function RFIRow({ rfi, onRespond }: { rfi: RFI; onRespond: (id: number, response: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [response, setResponse] = useState('')
  const [busy, setBusy] = useState(false)
  const answered = rfi.status === 'approved'

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-navy/50">{rfi.number}</p>
          <p className="font-semibold text-navy">{rfi.title}</p>
          {rfi.location_tag && <p className="text-xs text-navy/50">{rfi.location_tag}</p>}
        </div>
        <div className="flex items-center gap-2">
          {rfi.schedule_impact_days > 0 && <Badge label={`+${rfi.schedule_impact_days}d if unanswered`} tone="gold" />}
          <RFIStatusBadge rfi={rfi} />
        </div>
      </div>
      <p className="mt-2 text-sm text-navy/70">{rfi.question}</p>
      {answered ? (
        <p className="mt-2 rounded-[var(--radius-s)] bg-status-agreeing/10 px-3 py-2 text-sm text-navy">
          <span className="font-semibold">Response:</span> {rfi.response}
        </p>
      ) : open ? (
        <div className="mt-3">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm text-navy outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
            placeholder="Write the response…"
          />
          <div className="mt-2 flex gap-2">
            <button
              disabled={busy || !response.trim()}
              onClick={async () => {
                setBusy(true)
                await onRespond(rfi.id, response)
                setBusy(false)
                setOpen(false)
                setResponse('')
              }}
              className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream hover:bg-navy-deep disabled:opacity-60"
            >
              Submit response
            </button>
            <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-2 text-xs font-semibold text-navy underline">
          Respond
        </button>
      )}
    </div>
  )
}

function NewRfiForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [days, setDays] = useState(2)
  const [scheduleImpact, setScheduleImpact] = useState(0)
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        + New RFI
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm"
      />
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Question"
        rows={2}
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm"
      />
      <div className="mb-2 flex gap-3">
        <label className="flex items-center gap-2 text-xs text-navy/70">
          Respond within (days)
          <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-16 rounded border border-sand px-2 py-1" />
        </label>
        <label className="flex items-center gap-2 text-xs text-navy/70">
          Schedule impact if unanswered (days)
          <input type="number" min={0} value={scheduleImpact} onChange={(e) => setScheduleImpact(Number(e.target.value))} className="w-16 rounded border border-sand px-2 py-1" />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy || !title.trim() || !question.trim()}
          onClick={async () => {
            setBusy(true)
            const respondBy = new Date(Date.now() + days * 86400000).toISOString()
            await createRFI({ project: project.id, title, question, sla_deadline: respondBy, schedule_impact_days: scheduleImpact })
            setBusy(false)
            setOpen(false)
            setTitle('')
            setQuestion('')
            onCreated()
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create RFI
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
          Cancel
        </button>
      </div>
    </div>
  )
}

function NewChangeOrderForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [baselineScope, setBaselineScope] = useState('')
  const [scopeDelta, setScopeDelta] = useState('')
  const [cost, setCost] = useState('0')
  const [days, setDays] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        + New change order
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <p className="mb-2 text-xs text-navy/50">Structured form - baseline scope, delta, and cost/schedule impact are all required; free text alone is rejected.</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <textarea value={baselineScope} onChange={(e) => setBaselineScope(e.target.value)} placeholder="Baseline scope" rows={2} className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <textarea value={scopeDelta} onChange={(e) => setScopeDelta(e.target.value)} placeholder="Scope delta (specific - not a placeholder)" rows={2} className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <div className="mb-2 flex gap-3">
        <label className="flex items-center gap-2 text-xs text-navy/70">
          Cost impact (SAR)
          <input value={cost} onChange={(e) => setCost(e.target.value)} className="w-28 rounded border border-sand px-2 py-1" />
        </label>
        <label className="flex items-center gap-2 text-xs text-navy/70">
          Schedule impact (days)
          <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-16 rounded border border-sand px-2 py-1" />
        </label>
      </div>
      {error && <p className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy || !title.trim() || !baselineScope.trim() || !scopeDelta.trim()}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await createChangeOrder({ project: project.id, title, baseline_scope: baselineScope, scope_delta: scopeDelta, cost_impact: cost, schedule_impact_days: days })
              setOpen(false)
              setTitle('')
              setBaselineScope('')
              setScopeDelta('')
              onCreated()
            } catch (e: any) {
              setError(e?.response?.data?.scope_delta?.[0] ?? 'Could not create the change order.')
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create change order
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
          Cancel
        </button>
      </div>
    </div>
  )
}

function NewCoordinationThreadForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [locationTag, setLocationTag] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        + New coordination thread
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Topic / Title"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm"
      />
      <input
        value={locationTag}
        onChange={(e) => setLocationTag(e.target.value)}
        placeholder="Location tag (optional, e.g. Zone B)"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          disabled={busy || !title.trim()}
          onClick={async () => {
            setBusy(true)
            await createCoordinationThread({ project: project.id, title: title.trim(), location_tag: locationTag.trim() || undefined })
            setBusy(false)
            setOpen(false)
            setTitle('')
            setLocationTag('')
            onCreated()
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create thread
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
          Cancel
        </button>
      </div>
    </div>
  )
}

function CoordinationThreadCard({ thread, onMessagePosted }: { thread: CoordinationThread; onMessagePosted: () => void }) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-navy">{thread.title}</h3>
          <p className="text-xs text-navy/50">Started by {thread.created_by_name} {thread.location_tag ? `· ${thread.location_tag}` : ''}</p>
        </div>
      </div>
      {thread.messages && thread.messages.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-sand/40 pt-2">
          {thread.messages.map((m) => (
            <div key={m.id} className="rounded bg-cream/40 px-3 py-2 text-xs text-navy">
              <span className="font-semibold">{m.author_name}:</span> {m.body}
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a response…"
          className="flex-1 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
        <button
          disabled={busy || !reply.trim()}
          onClick={async () => {
            setBusy(true)
            await postCoordinationMessage(thread.id, reply.trim())
            setReply('')
            setBusy(false)
            onMessagePosted()
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function NewSubmittalForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [specSection, setSpecSection] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5">
        + New submittal
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Submittal Title" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <input value={specSection} onChange={(e) => setSpecSection(e.target.value)} placeholder="Spec Section (e.g. 03 30 00)" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button
          disabled={busy || !title.trim() || !specSection.trim()}
          onClick={async () => {
            setBusy(true)
            await createSubmittal({ project: project.id, title, spec_section: specSection })
            setBusy(false)
            setOpen(false)
            setTitle('')
            setSpecSection('')
            onCreated()
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create submittal
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">Cancel</button>
      </div>
    </div>
  )
}

function NewPermitForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [authority, setAuthority] = useState('')
  const [permitNumber, setPermitNumber] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5">
        + New permit
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Permit Title" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="Authority (e.g. Civil Defense)" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <input value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} placeholder="Permit Number" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button
          disabled={busy || !title.trim() || !authority.trim() || !permitNumber.trim()}
          onClick={async () => {
            setBusy(true)
            await createPermit({ project: project.id, title, authority, permit_number: permitNumber })
            setBusy(false)
            setOpen(false)
            setTitle('')
            setAuthority('')
            setPermitNumber('')
            onCreated()
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create permit
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">Cancel</button>
      </div>
    </div>
  )
}
function NewSupplierDeliveryForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [material, setMaterial] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [committedDate, setCommittedDate] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5">
        + New delivery
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Material (e.g. Structural Steel)" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier Name" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <input type="date" value={committedDate} onChange={(e) => setCommittedDate(e.target.value)} className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button
          disabled={busy || !material.trim() || !supplierName.trim() || !committedDate}
          onClick={async () => {
            setBusy(true)
            await createSupplierDelivery({ project: project.id, material, supplier_name: supplierName, committed_date: new Date(committedDate).toISOString() })
            setBusy(false)
            setOpen(false)
            setMaterial('')
            setSupplierName('')
            setCommittedDate('')
            onCreated()
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create delivery
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">Cancel</button>
      </div>
    </div>
  )
}

function NewQualityCheckpointForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [locationTag, setLocationTag] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5">
        + New checkpoint
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Checkpoint Title" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <input value={locationTag} onChange={(e) => setLocationTag(e.target.value)} placeholder="Location Tag (optional)" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button
          disabled={busy || !title.trim()}
          onClick={async () => {
            setBusy(true)
            await createQualityCheckpoint({ project: project.id, title, location_tag: locationTag.trim() || undefined })
            setBusy(false)
            setOpen(false)
            setTitle('')
            setLocationTag('')
            onCreated()
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create checkpoint
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">Cancel</button>
      </div>
    </div>
  )
}

export function RfiChangeControlPage({ project }: { project: Project }) {
  const [rfis, setRfis] = useState<RFI[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [schedule, setSchedule] = useState<MasterScheduleItem[]>([])
  const [threads, setThreads] = useState<CoordinationThread[]>([])
  const [submittals, setSubmittals] = useState<Submittal[]>([])
  const [permits, setPermits] = useState<Permit[]>([])
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([])
  const [checkpoints, setCheckpoints] = useState<QualityCheckpoint[]>([])

  async function load() {
    const [r, c, s, t, sub, per, del, chk] = await Promise.all([
      listRFIs(project.id),
      listChangeOrders(project.id),
      getMasterSchedule(project.id),
      listCoordinationThreads(project.id),
      listSubmittals(project.id),
      listPermits(project.id),
      listSupplierDeliveries(project.id),
      listQualityCheckpoints(project.id),
    ])
    setRfis(r)
    setChangeOrders(c)
    setSchedule(s)
    setThreads(t)
    setSubmittals(sub)
    setPermits(per)
    setDeliveries(del)
    setCheckpoints(chk)
  }

  useEffect(() => {
    load()
  }, [project.id])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">RFIs &amp; Change Control</h1>
        <p className="mt-1 text-sm text-navy/60">Stop silent cascades - every RFI carries a schedule-impact-if-unanswered flag.</p>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">RFIs</h2>
          <NewRfiForm project={project} onCreated={load} />
        </div>
        <div className="flex flex-col gap-3">
          {rfis.length === 0 && <p className="text-sm text-navy/50">No RFIs yet.</p>}
          {rfis.map((rfi) => (
            <RFIRow key={rfi.id} rfi={rfi} onRespond={async (id, response) => { await respondToRFI(id, response); await load() }} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Change orders</h2>
          <NewChangeOrderForm project={project} onCreated={load} />
        </div>
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper">
          {changeOrders.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-navy/50">No change orders yet.</p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-sand/70 text-xs uppercase tracking-wide text-navy/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Title</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Cost impact</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Schedule impact</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co) => (
                  <tr key={co.id} className="border-b border-sand/40 last:border-0">
                    <td className="px-4 py-2.5 text-navy">{co.title}</td>
                    <td className="px-4 py-2.5 text-navy/70">SAR {Number(co.cost_impact).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-navy/70">{co.schedule_impact_days > 0 ? '+' : ''}{co.schedule_impact_days}d</td>
                    <td className="px-4 py-2.5">
                      <Badge label={co.status.replace('_', ' ')} tone="neutral" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Submittals &amp; Permits</h2>
          <div className="flex gap-2">
            <NewSubmittalForm project={project} onCreated={load} />
            <NewPermitForm project={project} onCreated={load} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
            <h3 className="mb-2 text-sm font-bold text-navy">Submittals ({submittals.length})</h3>
            {submittals.length === 0 ? (
              <p className="text-xs text-navy/50">No submittals.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {submittals.map((s) => (
                  <li key={s.id} className="border-b border-sand/40 pb-1.5 last:border-0 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-navy">{s.title}</span>
                      <span className="ml-1 text-navy/50">({s.spec_section})</span>
                    </div>
                    <Badge label={s.status} tone="neutral" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
            <h3 className="mb-2 text-sm font-bold text-navy">Permits ({permits.length})</h3>
            {permits.length === 0 ? (
              <p className="text-xs text-navy/50">No permits.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {permits.map((p) => (
                  <li key={p.id} className="border-b border-sand/40 pb-1.5 last:border-0 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-navy">{p.title}</span>
                      <span className="ml-1 text-navy/50">#{p.permit_number}</span>
                    </div>
                    <Badge label={p.authority} tone="gold" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Deliveries &amp; Quality Checkpoints</h2>
          <div className="flex gap-2">
            <NewSupplierDeliveryForm project={project} onCreated={load} />
            <NewQualityCheckpointForm project={project} onCreated={load} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
            <h3 className="mb-2 text-sm font-bold text-navy">Supplier Deliveries ({deliveries.length})</h3>
            {deliveries.length === 0 ? (
              <p className="text-xs text-navy/50">No supplier deliveries.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {deliveries.map((d) => (
                  <li key={d.id} className="border-b border-sand/40 pb-1.5 last:border-0 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-navy">{d.material}</span>
                      <span className="ml-1 text-navy/50">({d.supplier_name})</span>
                    </div>
                    {d.is_overdue ? <Badge label="Overdue" tone="danger" /> : <Badge label="Committed" tone="good" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
            <h3 className="mb-2 text-sm font-bold text-navy">Quality Checkpoints ({checkpoints.length})</h3>
            {checkpoints.length === 0 ? (
              <p className="text-xs text-navy/50">No checkpoints.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {checkpoints.map((c) => (
                  <li key={c.id} className="border-b border-sand/40 pb-1.5 last:border-0 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-navy">{c.title}</span>
                      {c.location_tag && <span className="ml-1 text-navy/50">({c.location_tag})</span>}
                    </div>
                    <Badge label={c.status} tone="info" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Coordination threads</h2>
          <NewCoordinationThreadForm project={project} onCreated={load} />
        </div>
        <div className="flex flex-col gap-3">
          {threads.length === 0 && <p className="text-sm text-navy/50">No coordination threads active.</p>}
          {threads.map((thread) => (
            <CoordinationThreadCard key={thread.id} thread={thread} onMessagePosted={load} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Master schedule</h2>
        <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
          {schedule.length === 0 ? (
            <p className="text-sm text-navy/50">Nothing scheduled yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {schedule.map((item) => (
                <li key={`${item.type}-${item.id}`} className="flex flex-col gap-1 border-b border-sand/40 pb-2 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="mr-2 rounded bg-navy/10 px-1.5 py-0.5 text-xs font-semibold uppercase text-navy/60">{item.type.replace('_', ' ')}</span>
                    <span className="text-navy">{item.title}</span>
                  </span>
                  <span className="text-navy/50">{new Date(item.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
