import { useEffect, useState } from 'react'
import { Badge } from '../../components/Badge'
import type { Project } from '../../lib/types'
import { getChangeOrderRollup, getDisputeExport, listEvidence, listSilenceFlags, submitEvidence, verifyEvidence } from './api'
import type { ChangeOrderRollup, DisputeExportEvent, EvidenceRecord, SilenceFlag } from '../../lib/types'

const VERIFIER_ROLES = new Set(['owner', 'admin', 'consultant'])

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p className="mt-1 font-[var(--font-display)] text-2xl font-bold text-navy">{value}</p>
    </div>
  )
}

function NewEvidenceForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [subjectType, setSubjectType] = useState('milestone')
  const [subjectId, setSubjectId] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream hover:bg-navy-deep"
      >
        + Submit evidence
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 text-navy">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Submit Evidence Record</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/40 hover:text-navy">
          ✕
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <select
          value={subjectType}
          onChange={(e) => setSubjectType(e.target.value)}
          className="rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-xs text-navy"
        >
          <option value="milestone">Milestone</option>
          <option value="rfi">RFI</option>
          <option value="punch_item">Punch Item</option>
          <option value="drawing">Drawing</option>
        </select>
        <input
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          placeholder="Subject ID (e.g. 1)"
          className="w-32 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
      </div>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption / description of verified state"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
      />
      {error && <p className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy || !subjectId.trim() || !caption.trim()}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await submitEvidence({
                project: project.id,
                subject_type: subjectType,
                subject_id: subjectId.trim(),
                caption: caption.trim(),
                captured_at: new Date().toISOString(),
              })
              setOpen(false)
              setSubjectId('')
              setCaption('')
              onCreated()
            } catch (e: any) {
              setError(e?.response?.data?.detail ?? 'Could not submit evidence.')
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Submit Evidence
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function TrustEvidencePage({ project }: { project: Project }) {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [flags, setFlags] = useState<SilenceFlag[]>([])
  const [rollup, setRollup] = useState<ChangeOrderRollup | null>(null)
  const [exportData, setExportData] = useState<DisputeExportEvent[] | null>(null)
  const [exporting, setExporting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const canVerify = VERIFIER_ROLES.has(project.role)

  async function load() {
    const [ev, fl, ro] = await Promise.all([
      listEvidence(project.id),
      listSilenceFlags(project.id),
      getChangeOrderRollup(project.id),
    ])
    setEvidence(ev)
    setFlags(fl.filter((f) => !f.resolved))
    setRollup(ro)
  }

  useEffect(() => {
    load()
  }, [project.id])

  async function handleVerify(id: number) {
    setBusyId(id)
    try {
      await verifyEvidence(id)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const data = await getDisputeExport(project.id)
      setExportData(data.events)
    } finally {
      setExporting(false)
    }
  }

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
          <StatCard label="Change orders" value={rollup?.count ?? '-'} />
          <StatCard label="Cumulative cost impact" value={rollup ? `SAR ${Number(rollup.cumulative_cost_impact).toLocaleString()}` : '-'} />
          <StatCard label="Cumulative schedule impact" value={rollup ? `${rollup.cumulative_schedule_impact_days}d` : '-'} />
        </div>
      </section>

      {flags.length > 0 && (
        <section>
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Silence flags - overdue-update detection</h2>
          <ul className="flex flex-col gap-2">
            {flags.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-status-escalated/30 bg-status-escalated/5 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
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
            <NewEvidenceForm project={project} onCreated={load} />
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5 disabled:opacity-60"
            >
              {exporting ? 'Preparing…' : 'Export dispute bundle'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper">
          {evidence.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-navy/50">No evidence submitted yet.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-sand/70 text-xs uppercase tracking-wide text-navy/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Caption</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Subject</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Submitted by</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Captured</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  {canVerify && <th scope="col" className="px-4 py-2.5 font-semibold" />}
                </tr>
              </thead>
              <tbody>
                {evidence.map((e) => (
                  <tr key={e.id} className="border-b border-sand/40 last:border-0">
                    <td className="px-4 py-2.5 text-navy">{e.caption}</td>
                    <td className="px-4 py-2.5 text-navy/60">
                      {e.subject_type} #{e.subject_id}
                    </td>
                    <td className="px-4 py-2.5 text-navy/60">{e.submitted_by_name}</td>
                    <td className="px-4 py-2.5 text-navy/60">{new Date(e.captured_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      {e.verified ? (
                        <Badge label={`Verified by ${e.verified_by_name}`} tone="good" />
                      ) : (
                        <Badge label="Pending claim" tone="warn" />
                      )}
                    </td>
                    {canVerify && (
                      <td className="px-4 py-2.5 text-right">
                        {!e.verified && (
                          <button
                            disabled={busyId === e.id}
                            onClick={() => handleVerify(e.id)}
                            className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream hover:bg-navy-deep disabled:opacity-60"
                          >
                            Verify
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {exportData && (
        <section>
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">
            Dispute export - {exportData.length} events, chronological
          </h2>
          <div className="max-h-96 overflow-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4">
            <ol className="flex flex-col gap-2 text-sm">
              {exportData.map((event) => (
                <li key={event.id} className="border-b border-sand/40 pb-2 last:border-0">
                  <span className="text-navy/50">{new Date(event.timestamp).toLocaleString()}</span> - {' '}
                  <span className="font-semibold text-navy">{event.event_type}</span>{' '}
                  <span className="text-navy/60">
                    by {event.actor ?? 'system'} ({event.actor_role || 'system'}) via {event.channel}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  )
}
