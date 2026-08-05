import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
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

/** Detail + respond dialog for a single RFI. Mount only while an RFI is selected. */
function RfiDetailModal({ rfi, onClose, onResponded }: { rfi: RFI; onClose: () => void; onResponded: () => void }) {
  const toast = useToast()
  const [response, setResponse] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const answered = rfi.status === 'approved'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await respondToRFI(rfi.id, response.trim())
      toast.success('Response submitted.')
      onResponded()
      onClose()
    } catch (err) {
      const message = getApiError(err, 'Could not submit the response.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${rfi.number} · ${rfi.title}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {rfi.schedule_impact_days > 0 && <Badge label={`+${rfi.schedule_impact_days}d if unanswered`} tone="gold" />}
          <RFIStatusBadge rfi={rfi} />
          {rfi.location_tag && <span className="text-xs text-navy/50">{rfi.location_tag}</span>}
        </div>
        <p className="text-sm text-navy/70">{rfi.question}</p>
        {answered ? (
          <p className="rounded-[var(--radius-s)] bg-status-agreeing/10 px-3 py-2 text-sm text-navy">
            <span className="font-semibold">Response:</span> {rfi.response}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <TextAreaField
              label="Response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Write the response…"
              error={error}
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || !response.trim()}
                className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
              >
                {busy ? 'Submitting…' : 'Submit response'}
              </button>
              <button type="button" onClick={onClose} className="text-xs text-navy/50 transition hover:text-navy">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

function NewRfiForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [days, setDays] = useState('2')
  const [daysError, setDaysError] = useState<string | null>(null)
  const [scheduleImpact, setScheduleImpact] = useState('0')
  const [impactError, setImpactError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        + New RFI
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setDaysError(null)
    setImpactError(null)
    setError(null)
    const respondDays = Number(days)
    const impactDays = Number(scheduleImpact)
    let invalid = false
    if (!Number.isInteger(respondDays) || respondDays < 1) {
      setDaysError('Enter a whole number of days (1 or more).')
      invalid = true
    }
    if (!Number.isInteger(impactDays) || impactDays < 0) {
      setImpactError('Enter a whole number of days (0 or more).')
      invalid = true
    }
    if (invalid) return
    setBusy(true)
    try {
      const respondBy = new Date(Date.now() + respondDays * 86400000).toISOString()
      await createRFI({
        project: project.id,
        title: title.trim(),
        question: question.trim(),
        sla_deadline: respondBy,
        schedule_impact_days: impactDays,
      })
      toast.success('RFI created.')
      setOpen(false)
      setTitle('')
      setQuestion('')
      setDays('2')
      setScheduleImpact('0')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create the RFI.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <div className="mb-2">
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
      </div>
      <div className="mb-2">
        <TextAreaField
          label="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question"
          rows={2}
          required
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-3">
        <div className="w-44">
          <TextField
            label="Respond within (days)"
            type="number"
            min={1}
            step={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            error={daysError}
            required
          />
        </div>
        <div className="w-60">
          <TextField
            label="Schedule impact if unanswered (days)"
            type="number"
            min={0}
            step={1}
            value={scheduleImpact}
            onChange={(e) => setScheduleImpact(e.target.value)}
            error={impactError}
            required
          />
        </div>
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || !question.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create RFI'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

function NewChangeOrderForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [baselineScope, setBaselineScope] = useState('')
  const [scopeDelta, setScopeDelta] = useState('')
  const [cost, setCost] = useState('0')
  const [costError, setCostError] = useState<string | null>(null)
  const [days, setDays] = useState('0')
  const [daysError, setDaysError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        + New change order
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setCostError(null)
    setDaysError(null)
    setError(null)
    const costValue = Number(cost)
    const dayValue = Number(days)
    let invalid = false
    if (cost.trim() === '' || !Number.isFinite(costValue) || costValue < 0) {
      setCostError('Enter a cost impact of 0 or more.')
      invalid = true
    }
    if (!Number.isInteger(dayValue)) {
      setDaysError('Enter a whole number of days.')
      invalid = true
    }
    if (invalid) return
    setBusy(true)
    try {
      await createChangeOrder({
        project: project.id,
        title: title.trim(),
        baseline_scope: baselineScope.trim(),
        scope_delta: scopeDelta.trim(),
        cost_impact: cost.trim(),
        schedule_impact_days: dayValue,
      })
      toast.success('Change order created.')
      setOpen(false)
      setTitle('')
      setBaselineScope('')
      setScopeDelta('')
      setCost('0')
      setDays('0')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create the change order.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <p className="mb-2 text-xs text-navy/50">
        Structured form - baseline scope, delta, and cost/schedule impact are all required; free text alone is rejected.
      </p>
      <div className="mb-2">
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
      </div>
      <div className="mb-2">
        <TextAreaField
          label="Baseline scope"
          value={baselineScope}
          onChange={(e) => setBaselineScope(e.target.value)}
          placeholder="Baseline scope"
          rows={2}
          required
        />
      </div>
      <div className="mb-2">
        <TextAreaField
          label="Scope delta"
          value={scopeDelta}
          onChange={(e) => setScopeDelta(e.target.value)}
          placeholder="Scope delta (specific - not a placeholder)"
          rows={2}
          required
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-3">
        <div className="w-40">
          <TextField
            label="Cost impact (SAR)"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            error={costError}
            required
          />
        </div>
        <div className="w-44">
          <TextField
            label="Schedule impact (days)"
            type="number"
            step={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            error={daysError}
            required
          />
        </div>
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || !baselineScope.trim() || !scopeDelta.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create change order'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

function NewCoordinationThreadForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [locationTag, setLocationTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        + New coordination thread
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await createCoordinationThread({
        project: project.id,
        title: title.trim(),
        location_tag: locationTag.trim() || undefined,
      })
      toast.success('Coordination thread created.')
      setOpen(false)
      setTitle('')
      setLocationTag('')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create the thread.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <div className="mb-2">
        <TextField
          label="Topic / Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Topic / Title"
          required
        />
      </div>
      <div className="mb-2">
        <TextField
          label="Location tag (optional)"
          value={locationTag}
          onChange={(e) => setLocationTag(e.target.value)}
          placeholder="e.g. Zone B"
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create thread'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

function CoordinationThreadCard({ thread, onMessagePosted }: { thread: CoordinationThread; onMessagePosted: () => void }) {
  const toast = useToast()
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await postCoordinationMessage(thread.id, reply.trim())
      setReply('')
      onMessagePosted()
    } catch (err) {
      const message = getApiError(err, 'Could not post the message.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-navy">{thread.title}</h3>
          <p className="text-xs text-navy/50">
            Started by {thread.created_by_name} {thread.location_tag ? `· ${thread.location_tag}` : ''}
          </p>
        </div>
      </div>
      {thread.messages && thread.messages.length > 0 && (
        <div
          role="log"
          aria-label={`Messages in ${thread.title}`}
          className="mt-3 space-y-2 border-t border-sand/40 pt-2"
        >
          {thread.messages.map((m) => (
            <div key={m.id} className="rounded bg-cream/40 px-3 py-2 text-xs text-navy">
              <span className="font-semibold">{m.author_name}:</span> {m.body}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-3 flex items-start gap-2">
        <div className="flex-1">
          <TextField
            label={`Reply to ${thread.title}`}
            hideLabel
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a response…"
            error={error}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !reply.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}

function NewSubmittalForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [specSection, setSpecSection] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        + New submittal
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await createSubmittal({ project: project.id, title: title.trim(), spec_section: specSection.trim() })
      toast.success('Submittal created.')
      setOpen(false)
      setTitle('')
      setSpecSection('')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create the submittal.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <div className="mb-2">
        <TextField
          label="Submittal title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Submittal Title"
          required
        />
      </div>
      <div className="mb-2">
        <TextField
          label="Spec section"
          value={specSection}
          onChange={(e) => setSpecSection(e.target.value)}
          placeholder="e.g. 03 30 00"
          required
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || !specSection.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create submittal'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

function NewPermitForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [authority, setAuthority] = useState('')
  const [permitNumber, setPermitNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        + New permit
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await createPermit({
        project: project.id,
        title: title.trim(),
        authority: authority.trim(),
        permit_number: permitNumber.trim(),
      })
      toast.success('Permit created.')
      setOpen(false)
      setTitle('')
      setAuthority('')
      setPermitNumber('')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create the permit.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <div className="mb-2">
        <TextField
          label="Permit title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Permit Title"
          required
        />
      </div>
      <div className="mb-2">
        <TextField
          label="Authority"
          value={authority}
          onChange={(e) => setAuthority(e.target.value)}
          placeholder="e.g. Civil Defense"
          required
        />
      </div>
      <div className="mb-2">
        <TextField
          label="Permit number"
          value={permitNumber}
          onChange={(e) => setPermitNumber(e.target.value)}
          placeholder="Permit Number"
          required
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim() || !authority.trim() || !permitNumber.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create permit'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

function NewSupplierDeliveryForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [material, setMaterial] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [committedDate, setCommittedDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        + New delivery
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await createSupplierDelivery({
        project: project.id,
        material: material.trim(),
        supplier_name: supplierName.trim(),
        committed_date: new Date(committedDate).toISOString(),
      })
      toast.success('Delivery created.')
      setOpen(false)
      setMaterial('')
      setSupplierName('')
      setCommittedDate('')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create the delivery.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <div className="mb-2">
        <TextField
          label="Material"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="e.g. Structural Steel"
          required
        />
      </div>
      <div className="mb-2">
        <TextField
          label="Supplier name"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="Supplier Name"
          required
        />
      </div>
      <div className="mb-2">
        <TextField
          label="Committed date"
          type="date"
          value={committedDate}
          onChange={(e) => setCommittedDate(e.target.value)}
          required
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !material.trim() || !supplierName.trim() || !committedDate}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create delivery'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

function NewQualityCheckpointForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [locationTag, setLocationTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5"
      >
        + New checkpoint
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      // Inspector is intentionally not collected - the backend defaults it to the requester.
      await createQualityCheckpoint({ project: project.id, title: title.trim(), location_tag: locationTag.trim() || undefined })
      toast.success('Checkpoint created.')
      setOpen(false)
      setTitle('')
      setLocationTag('')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create the checkpoint.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
      <div className="mb-2">
        <TextField
          label="Checkpoint title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Checkpoint Title"
          required
        />
      </div>
      <div className="mb-2">
        <TextField
          label="Location tag (optional)"
          value={locationTag}
          onChange={(e) => setLocationTag(e.target.value)}
          placeholder="Location Tag"
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create checkpoint'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

interface RfiPageData {
  rfis: RFI[]
  changeOrders: ChangeOrder[]
  schedule: MasterScheduleItem[]
  threads: CoordinationThread[]
  submittals: Submittal[]
  permits: Permit[]
  deliveries: SupplierDelivery[]
  checkpoints: QualityCheckpoint[]
}

async function loadRfiPage(projectId: number): Promise<RfiPageData> {
  const [rfis, changeOrders, schedule, threads, submittals, permits, deliveries, checkpoints] = await Promise.all([
    listRFIs(projectId),
    listChangeOrders(projectId),
    getMasterSchedule(projectId),
    listCoordinationThreads(projectId),
    listSubmittals(projectId),
    listPermits(projectId),
    listSupplierDeliveries(projectId),
    listQualityCheckpoints(projectId),
  ])
  return { rfis, changeOrders, schedule, threads, submittals, permits, deliveries, checkpoints }
}

const changeOrderColumns: Column<ChangeOrder>[] = [
  {
    key: 'title',
    header: 'Title',
    render: (co) => <span className="text-navy">{co.title}</span>,
    sortValue: (co) => co.title,
  },
  {
    key: 'cost',
    header: 'Cost impact',
    render: (co) => <span className="text-navy/70">SAR {Number(co.cost_impact).toLocaleString()}</span>,
    sortValue: (co) => Number(co.cost_impact),
  },
  {
    key: 'schedule',
    header: 'Schedule impact',
    render: (co) => (
      <span className="text-navy/70">
        {co.schedule_impact_days > 0 ? '+' : ''}
        {co.schedule_impact_days}d
      </span>
    ),
    sortValue: (co) => co.schedule_impact_days,
  },
  {
    key: 'status',
    header: 'Status',
    render: (co) => <Badge label={co.status.replace('_', ' ')} tone="neutral" />,
    sortValue: (co) => co.status,
  },
]

const submittalColumns: Column<Submittal>[] = [
  {
    key: 'title',
    header: 'Submittal',
    render: (s) => (
      <span>
        <span className="font-semibold text-navy">{s.title}</span>
        <span className="ms-1 text-navy/50">({s.spec_section})</span>
      </span>
    ),
    sortValue: (s) => s.title,
  },
  {
    key: 'status',
    header: 'Status',
    render: (s) => <Badge label={s.status} tone="neutral" />,
    sortValue: (s) => s.status,
  },
]

const permitColumns: Column<Permit>[] = [
  {
    key: 'title',
    header: 'Permit',
    render: (p) => (
      <span>
        <span className="font-semibold text-navy">{p.title}</span>
        <span className="ms-1 text-navy/50">#{p.permit_number}</span>
      </span>
    ),
    sortValue: (p) => p.title,
  },
  {
    key: 'authority',
    header: 'Authority',
    render: (p) => <Badge label={p.authority} tone="gold" />,
    sortValue: (p) => p.authority,
  },
]

const deliveryColumns: Column<SupplierDelivery>[] = [
  {
    key: 'material',
    header: 'Material',
    render: (d) => (
      <span>
        <span className="font-semibold text-navy">{d.material}</span>
        <span className="ms-1 text-navy/50">({d.supplier_name})</span>
      </span>
    ),
    sortValue: (d) => d.material,
  },
  {
    key: 'status',
    header: 'Status',
    render: (d) => (d.is_overdue ? <Badge label="Overdue" tone="danger" /> : <Badge label="Committed" tone="good" />),
    sortValue: (d) => (d.is_overdue ? 1 : 0),
  },
]

const checkpointColumns: Column<QualityCheckpoint>[] = [
  {
    key: 'title',
    header: 'Checkpoint',
    render: (c) => (
      <span>
        <span className="font-semibold text-navy">{c.title}</span>
        {c.location_tag && <span className="ms-1 text-navy/50">({c.location_tag})</span>}
      </span>
    ),
    sortValue: (c) => c.title,
  },
  {
    key: 'status',
    header: 'Status',
    render: (c) => <Badge label={c.status} tone="info" />,
    sortValue: (c) => c.status,
  },
]

export function RfiChangeControlPage({ project }: { project: Project }) {
  const { data, loading, error, reload } = useProjectData(project.id, (pid) => loadRfiPage(Number(pid)))
  const [activeRfiId, setActiveRfiId] = useState<number | null>(null)

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <PageSkeleton />

  const { rfis, changeOrders, schedule, threads, submittals, permits, deliveries, checkpoints } = data
  const activeRfi = activeRfiId === null ? null : (rfis.find((r) => r.id === activeRfiId) ?? null)

  const rfiColumns: Column<RFI>[] = [
    {
      key: 'number',
      header: 'RFI',
      render: (rfi) => <span className="text-xs font-semibold text-navy/50">{rfi.number}</span>,
      sortValue: (rfi) => rfi.number,
    },
    {
      key: 'title',
      header: 'Title',
      render: (rfi) => (
        <span>
          <span className="font-semibold text-navy">{rfi.title}</span>
          {rfi.location_tag && <span className="ms-1 text-xs text-navy/50">{rfi.location_tag}</span>}
        </span>
      ),
      sortValue: (rfi) => rfi.title,
    },
    {
      key: 'question',
      header: 'Question',
      render: (rfi) => <span className="block max-w-md text-navy/70">{rfi.question}</span>,
    },
    {
      key: 'impact',
      header: 'Impact',
      render: (rfi) =>
        rfi.schedule_impact_days > 0 ? (
          <Badge label={`+${rfi.schedule_impact_days}d if unanswered`} tone="gold" />
        ) : (
          <span className="text-xs text-navy/40">-</span>
        ),
      sortValue: (rfi) => rfi.schedule_impact_days,
    },
    {
      key: 'status',
      header: 'Status',
      render: (rfi) => <RFIStatusBadge rfi={rfi} />,
      sortValue: (rfi) => rfi.status,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-end',
      render: (rfi) =>
        rfi.status === 'approved' ? (
          <button
            onClick={() => setActiveRfiId(rfi.id)}
            className="text-xs font-semibold text-navy underline transition hover:text-navy-deep"
          >
            View response
          </button>
        ) : (
          <button
            onClick={() => setActiveRfiId(rfi.id)}
            className="text-xs font-semibold text-navy underline transition hover:text-navy-deep"
          >
            Respond
          </button>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">RFIs &amp; Change Control</h1>
        <p className="mt-1 text-sm text-navy/60">Stop silent cascades - every RFI carries a schedule-impact-if-unanswered flag.</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-m)] border border-gold/30 bg-navy-deep px-4 py-3 text-cream">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-gold/20 px-2 py-0.5 font-bold text-gold-ink">
              <span aria-hidden="true">📧</span> Gmail Live Sync
            </span>
            <span>Automatically parsing incoming consultant &amp; contractor emails into RFIs.</span>
          </div>
          <Link to="/email-integrations" className="text-xs font-bold text-gold transition hover:underline">
            View Gmail Extraction Source &amp; Review Queue{' '}
            <span aria-hidden="true" className="inline-block rtl:rotate-180">
              →
            </span>
          </Link>
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">RFIs</h2>
          <NewRfiForm project={project} onCreated={reload} />
        </div>
        <DataTable
          columns={rfiColumns}
          rows={rfis}
          rowKey={(rfi) => rfi.id}
          minWidth={720}
          emptyTitle="No RFIs yet"
          emptyHint="Raise an RFI whenever an unanswered question could silently push the schedule."
        />
        {activeRfi && (
          <RfiDetailModal rfi={activeRfi} onClose={() => setActiveRfiId(null)} onResponded={reload} />
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Change orders</h2>
          <NewChangeOrderForm project={project} onCreated={reload} />
        </div>
        <DataTable
          columns={changeOrderColumns}
          rows={changeOrders}
          rowKey={(co) => co.id}
          emptyTitle="No change orders yet"
          emptyHint="Scope changes are only accepted as structured change orders with cost and schedule impact."
        />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Submittals &amp; Permits</h2>
          <div className="flex gap-2">
            <NewSubmittalForm project={project} onCreated={reload} />
            <NewPermitForm project={project} onCreated={reload} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-bold text-navy">Submittals ({submittals.length})</h3>
            <DataTable
              columns={submittalColumns}
              rows={submittals}
              rowKey={(s) => s.id}
              minWidth={280}
              emptyTitle="No submittals yet"
              emptyHint="Track spec-section submittals here as they move through review."
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-navy">Permits ({permits.length})</h3>
            <DataTable
              columns={permitColumns}
              rows={permits}
              rowKey={(p) => p.id}
              minWidth={280}
              emptyTitle="No permits yet"
              emptyHint="Log authority permits so expiry and status stay visible."
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Deliveries &amp; Quality Checkpoints</h2>
          <div className="flex gap-2">
            <NewSupplierDeliveryForm project={project} onCreated={reload} />
            <NewQualityCheckpointForm project={project} onCreated={reload} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-bold text-navy">Supplier Deliveries ({deliveries.length})</h3>
            <DataTable
              columns={deliveryColumns}
              rows={deliveries}
              rowKey={(d) => d.id}
              minWidth={280}
              emptyTitle="No supplier deliveries yet"
              emptyHint="Committed delivery dates feed the master schedule and overdue flags."
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-navy">Quality Checkpoints ({checkpoints.length})</h3>
            <DataTable
              columns={checkpointColumns}
              rows={checkpoints}
              rowKey={(c) => c.id}
              minWidth={280}
              emptyTitle="No checkpoints yet"
              emptyHint="Add quality checkpoints for the inspections that gate progress."
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Coordination threads</h2>
          <NewCoordinationThreadForm project={project} onCreated={reload} />
        </div>
        <div className="flex flex-col gap-3">
          {threads.length === 0 ? (
            <EmptyState
              compact
              title="No coordination threads active"
              hint="Start a thread to keep cross-trade coordination out of private chats."
            />
          ) : (
            threads.map((thread) => <CoordinationThreadCard key={thread.id} thread={thread} onMessagePosted={reload} />)
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Master schedule</h2>
        {schedule.length === 0 ? (
          <EmptyState
            compact
            title="Nothing scheduled yet"
            hint="RFIs, change orders, deliveries, and checkpoints roll up here once they carry dates."
          />
        ) : (
          <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
            <ol className="flex flex-col gap-2">
              {schedule.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="flex flex-col gap-1 border-b border-sand/40 pb-2 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="me-2 rounded bg-navy/10 px-1.5 py-0.5 text-xs font-semibold uppercase text-navy/60">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-navy">{item.title}</span>
                  </span>
                  <span className="text-navy/50">{new Date(item.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  )
}
