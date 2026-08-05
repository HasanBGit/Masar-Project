import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { SelectField, TextField } from '../../components/ui/Field'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
import { getChangeOrderRollup, getDisputeExport, listEvidence, listSilenceFlags, submitEvidence, verifyEvidence } from './api'
import type { DisputeExportEvent, EvidenceRecord, Project } from '../../lib/types'

const VERIFIER_ROLES = new Set(['owner', 'admin', 'consultant'])

function NewEvidenceForm({
  project,
  onClose,
  onCreated,
}: {
  project: Project
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [subjectType, setSubjectType] = useState('milestone')
  const [subjectId, setSubjectId] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ subjectId?: string; caption?: string }>({})

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errors: { subjectId?: string; caption?: string } = {}
    if (!subjectId.trim()) errors.subjectId = 'Subject ID is required.'
    if (!caption.trim()) errors.caption = 'Caption is required.'
    setFieldErrors(errors)
    if (errors.subjectId || errors.caption) return

    setBusy(true)
    try {
      await submitEvidence({
        project: project.id,
        subject_type: subjectType,
        subject_id: subjectId.trim(),
        caption: caption.trim(),
        captured_at: new Date().toISOString(),
      })
      toast.success('Evidence submitted.')
      setSubjectId('')
      setCaption('')
      onClose()
      onCreated()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 text-navy"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Submit Evidence Record</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close evidence form"
          className="rounded p-1 text-navy/40 transition hover:text-navy"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <SelectField label="Subject type" value={subjectType} onChange={(e) => setSubjectType(e.target.value)}>
          <option value="milestone">Milestone</option>
          <option value="rfi">RFI</option>
          <option value="punch_item">Punch Item</option>
          <option value="drawing">Drawing</option>
        </SelectField>
        <TextField
          label="Subject ID"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          placeholder="e.g. 1"
          required
          error={fieldErrors.subjectId}
        />
      </div>
      <TextField
        label="Caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Description of the verified state"
        required
        error={fieldErrors.caption}
      />
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Submitting…' : 'Submit evidence'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-s)] px-3 py-1.5 text-xs font-semibold text-navy/50 transition hover:text-navy"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function TrustEvidencePage({ project }: { project: Project }) {
  const toast = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [exportData, setExportData] = useState<DisputeExportEvent[] | null>(null)
  const [exporting, setExporting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const canVerify = VERIFIER_ROLES.has(project.role)

  const { data, loading, error, reload } = useProjectData(project.id, async (id) => {
    const [evidence, flags, rollup] = await Promise.all([
      listEvidence(Number(id)),
      listSilenceFlags(Number(id)),
      getChangeOrderRollup(Number(id)),
    ])
    return { evidence, flags: flags.filter((f) => !f.resolved), rollup }
  })

  async function handleVerify(id: number) {
    setBusyId(id)
    try {
      await verifyEvidence(id)
      toast.success('Evidence verified.')
      await reload()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const result = await getDisputeExport(project.id)
      setExportData(result.events)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error || !data) {
    return <ErrorState message={error ?? 'Could not load trust and evidence data.'} onRetry={reload} />
  }

  const { evidence, flags, rollup } = data

  const evidenceColumns: Column<EvidenceRecord>[] = [
    {
      key: 'caption',
      header: 'Caption',
      sortValue: (e) => e.caption.toLowerCase(),
      render: (e) => e.caption,
    },
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (e) => `${e.subject_type} ${e.subject_id}`,
      render: (e) => (
        <span className="text-navy/60">
          {e.subject_type} #{e.subject_id}
        </span>
      ),
    },
    {
      key: 'submitted_by',
      header: 'Submitted by',
      sortValue: (e) => (e.submitted_by_name ?? '').toLowerCase(),
      render: (e) => <span className="text-navy/60">{e.submitted_by_name}</span>,
    },
    {
      key: 'captured',
      header: 'Captured',
      sortValue: (e) => new Date(e.captured_at).getTime(),
      render: (e) => <span className="text-navy/60">{new Date(e.captured_at).toLocaleDateString()}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (e) => (e.verified ? 1 : 0),
      render: (e) =>
        e.verified ? (
          <Badge label={`Verified by ${e.verified_by_name}`} tone="good" />
        ) : (
          <Badge label="Pending claim" tone="warn" />
        ),
    },
    ...(canVerify
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            className: 'text-end',
            render: (e: EvidenceRecord) =>
              e.verified ? null : (
                <button
                  disabled={busyId === e.id}
                  onClick={() => handleVerify(e.id)}
                  className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
                >
                  Verify
                </button>
              ),
          } satisfies Column<EvidenceRecord>,
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Trust &amp; Evidence</h1>
        <p className="mt-1 text-sm text-navy/60">
          The shared, contemporaneous, attributable record - every claim on this page is either verified evidence or
          a pending one, never presented as the same thing.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Change-order impact vs. baseline</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Change orders" value={rollup.count} />
          <StatCard
            label="Cumulative cost impact"
            value={`SAR ${Number(rollup.cumulative_cost_impact).toLocaleString()}`}
          />
          <StatCard label="Cumulative schedule impact" value={`${rollup.cumulative_schedule_impact_days}d`} />
        </div>
      </section>

      {flags.length > 0 && (
        <section>
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Silence flags - overdue-update detection</h2>
          <ul className="flex flex-col gap-2">
            {flags.map((f) => (
              <li
                key={f.id}
                className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-status-escalated/30 bg-status-escalated/5 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-navy">
                  <span className="font-semibold">{f.subject_type}</span> #{f.subject_id} - expected by{' '}
                  {new Date(f.expected_by).toLocaleString()}
                </span>
                <Badge label="Silent" tone="danger" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Verified milestone ledger</h2>
          <div className="flex items-center gap-2">
            {!formOpen && (
              <button
                onClick={() => setFormOpen(true)}
                className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep"
              >
                + Submit evidence
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
            >
              {exporting ? 'Preparing…' : 'Export dispute bundle'}
            </button>
          </div>
        </div>
        {formOpen && (
          <div className="mb-3">
            <NewEvidenceForm project={project} onClose={() => setFormOpen(false)} onCreated={reload} />
          </div>
        )}
        <DataTable
          columns={evidenceColumns}
          rows={evidence}
          rowKey={(e) => e.id}
          minWidth={720}
          emptyTitle="No evidence submitted yet"
          emptyHint="Site photos and verification records build the dispute-proof ledger for this project."
          emptyAction={
            !formOpen && (
              <button
                onClick={() => setFormOpen(true)}
                className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep"
              >
                Submit your first evidence
              </button>
            )
          }
        />
      </section>

      {exportData && (
        <section>
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">
            Dispute export - {exportData.length} events, chronological
          </h2>
          {exportData.length === 0 ? (
            <EmptyState
              compact
              title="No events in the export yet"
              hint="Every attributable project event will appear here in chronological order once activity is recorded."
            />
          ) : (
            <div className="max-h-96 overflow-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5">
              <ol className="flex flex-col gap-2 text-sm">
                {exportData.map((event) => (
                  <li key={event.id} className="border-b border-sand/40 pb-2 last:border-0">
                    <span className="text-navy/50">{new Date(event.timestamp).toLocaleString()}</span> -{' '}
                    <span className="font-semibold text-navy">{event.event_type}</span>{' '}
                    <span className="text-navy/60">
                      by {event.actor ?? 'system'} ({event.actor_role || 'system'}) via {event.channel}
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
