import { useEffect, useState } from 'react'
import { Badge } from '../../components/Badge'
import type {
  CeilingCheck,
  Contract,
  ContractAmendment,
  ContractVsActual,
  LegalAgentSource,
  PaymentMilestone,
  Project,
} from '../../lib/types'
import {
  askLegalAgent,
  createContract,
  createPaymentMilestone,
  getCeilingCheck,
  getContractVsActual,
  ingestLegalAgent,
  listAmendments,
  listContracts,
  listPaymentMilestones,
  releasePaymentMilestone,
  requestContractAmendment,
} from './api'

const FINANCIAL_ROLES = new Set(['owner', 'admin'])

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p className="mt-1 font-[var(--font-display)] text-2xl font-bold text-navy">{value}</p>
    </div>
  )
}

function money(value: string | undefined, currency: string) {
  if (value === undefined) return '-'
  return `${currency} ${Number(value).toLocaleString()}`
}

function NewContractForm({ project, onCreated }: { project: Project; onCreated: (c: Contract) => void }) {
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [scopeBaseline, setScopeBaseline] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 text-navy">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy">No contract on this project yet</h3>
      <p className="mb-3 text-sm text-navy/60">
        Create the structured contract record - payment schedule, milestones, and scope live here as queryable data,
        not locked inside a PDF.
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contract title"
          className="min-w-48 flex-1 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Contract value (SAR)"
          inputMode="decimal"
          className="w-40 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
      </div>
      <textarea
        value={scopeBaseline}
        onChange={(e) => setScopeBaseline(e.target.value)}
        rows={2}
        placeholder="Baseline scope of work"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-xs text-navy"
      />
      {error && <p className="mb-2 text-xs text-status-escalated">{error}</p>}
      <button
        disabled={busy || !title.trim() || !value.trim() || !scopeBaseline.trim()}
        onClick={async () => {
          setBusy(true)
          setError(null)
          try {
            const contract = await createContract({
              project: project.id,
              title: title.trim(),
              contract_value: value.trim(),
              scope_baseline: scopeBaseline.trim(),
            })
            onCreated(contract)
          } catch (e: any) {
            setError(e?.response?.data?.detail ?? 'Could not create contract.')
          } finally {
            setBusy(false)
          }
        }}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
      >
        Create contract
      </button>
    </div>
  )
}

function NewMilestoneForm({ contract, onCreated }: { contract: Contract; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [dueCondition, setDueCondition] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream hover:bg-navy-deep"
      >
        + Add milestone
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 text-navy">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-navy">New Payment Milestone</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/40 hover:text-navy">
          ✕
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Milestone name"
          className="min-w-40 flex-1 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          inputMode="decimal"
          className="w-32 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
      </div>
      <input
        value={dueCondition}
        onChange={(e) => setDueCondition(e.target.value)}
        placeholder='Due condition (e.g. "40% structural complete")'
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
      />
      {error && <p className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy || !name.trim() || !dueCondition.trim() || !amount.trim()}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await createPaymentMilestone({
                project: contract.project, contract: contract.id, name: name.trim(),
                due_condition: dueCondition.trim(), amount: amount.trim(),
              })
              setOpen(false)
              setName('')
              setDueCondition('')
              setAmount('')
              onCreated()
            } catch (e: any) {
              setError(e?.response?.data?.detail ?? 'Could not create milestone.')
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Add milestone
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
          Cancel
        </button>
      </div>
    </div>
  )
}

function CeilingCheckWidget({ contract }: { contract: Contract }) {
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<CeilingCheck | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 text-navy">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy">
        Ceiling check - before you approve, not after
      </h3>
      <p className="mb-3 text-sm text-navy/60">
        Enter a pending change order or payment amount to see whether it would push cumulative spend past this
        contract's {contract.ceiling_threshold_percentage}% ceiling threshold.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Pending amount"
          inputMode="decimal"
          className="w-40 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
        <button
          disabled={busy || !amount.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              setResult(await getCeilingCheck(contract.id, amount.trim()))
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5 disabled:opacity-60"
        >
          Check
        </button>
      </div>
      {result && (
        <div className="mt-3 flex items-center gap-2">
          {result.would_breach ? (
            <Badge label={`Would breach ceiling of ${money(result.ceiling, contract.currency)}`} tone="danger" />
          ) : (
            <Badge label={`Within ceiling of ${money(result.ceiling, contract.currency)}`} tone="good" />
          )}
          <span className="text-xs text-navy/50">
            projected total {money(result.projected_total, contract.currency)}
          </span>
        </div>
      )}
    </div>
  )
}

function NewAmendmentForm({ contract, onCreated }: { contract: Contract; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [versionNumber, setVersionNumber] = useState('')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream hover:bg-navy-deep"
      >
        + Request amendment signing
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 text-navy">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Request Contract Amendment</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/40 hover:text-navy">
          ✕
        </button>
      </div>
      <p className="mb-2 text-xs text-navy/50">
        Routes through the same 3-Edges approval/e-signature workflow as every other high-stakes decision - you'll be
        the sole accountable signer.
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        <input
          value={versionNumber}
          onChange={(e) => setVersionNumber(e.target.value)}
          placeholder="Version #"
          inputMode="numeric"
          className="w-24 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
      </div>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={2}
        placeholder="What's changing and why"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-xs text-navy"
      />
      {error && <p className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy || !versionNumber.trim() || !summary.trim()}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await requestContractAmendment({
                contract: contract.id, version_number: Number(versionNumber), summary: summary.trim(),
              })
              setOpen(false)
              setVersionNumber('')
              setSummary('')
              onCreated()
            } catch (e: any) {
              setError(e?.response?.data?.detail ?? 'Could not request amendment.')
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Request signing
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
          Cancel
        </button>
      </div>
    </div>
  )
}

interface ChatTurn {
  question: string
  answer?: string
  sources?: LegalAgentSource[]
  error?: string
}

function LegalAgentChat({ contract, canReindex }: { contract: Contract; canReindex: boolean }) {
  const [question, setQuestion] = useState('')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [reindexMessage, setReindexMessage] = useState<string | null>(null)

  async function handleAsk() {
    const q = question.trim()
    if (!q) return
    setBusy(true)
    setQuestion('')
    setTurns((prev) => [...prev, { question: q }])
    try {
      const result = await askLegalAgent(contract.id, q, language)
      setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? { ...t, answer: result.answer, sources: result.sources } : t)))
    } catch (e: any) {
      const detail =
        e?.response?.status === 503
          ? 'Legal agent isn’t configured yet - an admin needs to set VOYAGE_API_KEY and ANTHROPIC_API_KEY on the backend.'
          : (e?.response?.data?.detail ?? 'Could not reach the legal agent.')
      setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? { ...t, error: detail } : t)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 text-navy">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Contract legal agent</h3>
          <p className="mt-1 text-xs text-navy/50">
            Answers are grounded only in this contract's own data - every answer cites its source, never presented as
            the platform's own unsourced opinion.
          </p>
        </div>
        {canReindex && (
          <button
            disabled={reindexing}
            onClick={async () => {
              setReindexing(true)
              setReindexMessage(null)
              try {
                const res = await ingestLegalAgent(contract.id)
                setReindexMessage(`Indexed ${res.chunks_indexed} chunks.`)
              } catch (e: any) {
                setReindexMessage(e?.response?.data?.detail ?? 'Could not reindex.')
              } finally {
                setReindexing(false)
              }
            }}
            className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5 disabled:opacity-60"
          >
            {reindexing ? 'Indexing…' : 'Re-index contract'}
          </button>
        )}
      </div>
      {reindexMessage && <p className="mb-2 text-xs text-navy/60">{reindexMessage}</p>}

      <div className="mb-3 max-h-80 overflow-y-auto rounded-[var(--radius-s)] border border-sand/50 bg-white p-3">
        {turns.length === 0 ? (
          <p className="text-sm text-navy/40">
            Ask something like "what is the retention percentage?" or "when does ZATCA invoicing apply?"
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {turns.map((turn, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="self-end rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-sm text-cream">{turn.question}</p>
                {turn.answer && (
                  <div className="rounded-[var(--radius-s)] bg-navy/5 px-3 py-2 text-sm text-navy">
                    <p>{turn.answer}</p>
                    {turn.sources && turn.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {turn.sources.map((s, j) => (
                          <span key={j} title={s.excerpt} className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] text-navy/60">
                            {s.source_ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {turn.error && <p className="text-xs text-status-escalated">{turn.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
          className="rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-xs text-navy"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) handleAsk()
          }}
          placeholder="Ask a question about this contract…"
          className="min-w-48 flex-1 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy"
        />
        <button
          disabled={busy || !question.trim()}
          onClick={handleAsk}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </div>
    </div>
  )
}

export function ContractPaymentsPage({ project }: { project: Project }) {
  const [contract, setContract] = useState<Contract | null>(null)
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([])
  const [vsActual, setVsActual] = useState<ContractVsActual | null>(null)
  const [amendments, setAmendments] = useState<ContractAmendment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyMilestoneId, setBusyMilestoneId] = useState<number | null>(null)
  const [releaseError, setReleaseError] = useState<string | null>(null)
  const canManage = FINANCIAL_ROLES.has(project.role)

  async function load() {
    const contracts = await listContracts(project.id)
    const current = contracts[0] ?? null
    setContract(current)
    if (current) {
      const [ms, va, am] = await Promise.all([
        listPaymentMilestones(project.id),
        getContractVsActual(current.id),
        listAmendments(project.id),
      ])
      setMilestones(ms)
      setVsActual(va)
      setAmendments(am)
    }
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [project.id])

  async function handleRelease(id: number) {
    setBusyMilestoneId(id)
    setReleaseError(null)
    try {
      await releasePaymentMilestone(id)
      await load()
    } catch (e: any) {
      setReleaseError(e?.response?.data?.detail ?? 'Could not release payment - milestone has no verified evidence yet.')
    } finally {
      setBusyMilestoneId(null)
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-navy/50">Loading…</p>
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Contract &amp; Payment Verification</h1>
        <p className="mt-1 text-sm text-navy/60">
          The contract as an active reference the platform enforces against - payment only unlocks on verified
          evidence, never on self-assertion.
        </p>
      </div>

      {!contract ? (
        <NewContractForm project={project} onCreated={setContract} />
      ) : (
        <>
          <section>
            <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 text-navy">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">{contract.title}</h2>
                <Badge label={contract.status.replace('_', ' ')} tone="neutral" />
              </div>
              <p className="mt-2 text-sm text-navy/70">{contract.scope_baseline}</p>
              {contract.plain_arabic_summary && (
                <p dir="rtl" className="mt-2 rounded-[var(--radius-s)] bg-navy/5 px-3 py-2 text-sm text-navy">
                  {contract.plain_arabic_summary}
                </p>
              )}
            </div>
          </section>

          {vsActual?.has_contract && (
            <section>
              <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Contract vs. actual</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Original value" value={money(vsActual.original_contract_value, contract.currency)} />
                <StatCard label="Approved change orders" value={money(vsActual.approved_change_order_total, contract.currency)} />
                <StatCard label="Adjusted value" value={money(vsActual.adjusted_contract_value, contract.currency)} />
                <StatCard label="Paid to date" value={money(vsActual.paid_to_date, contract.currency)} />
                <StatCard label="Remaining balance" value={money(vsActual.remaining_balance, contract.currency)} />
              </div>
            </section>
          )}

          {canManage && (
            <section>
              <CeilingCheckWidget contract={contract} />
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Payment milestones</h2>
              {canManage && <NewMilestoneForm contract={contract} onCreated={load} />}
            </div>
            {releaseError && <p className="mb-2 text-xs text-status-escalated">{releaseError}</p>}
            <div className="overflow-x-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper">
              {milestones.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-navy/50">No payment milestones yet.</p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-sand/70 text-xs uppercase tracking-wide text-navy/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Milestone</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Due condition</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Amount</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                      {canManage && <th scope="col" className="px-4 py-2.5 font-semibold" />}
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m) => (
                      <tr key={m.id} className="border-b border-sand/40 last:border-0">
                        <td className="px-4 py-2.5 text-navy">{m.name}</td>
                        <td className="px-4 py-2.5 text-navy/60">{m.due_condition}</td>
                        <td className="px-4 py-2.5 text-navy/60">{money(m.amount, contract.currency)}</td>
                        <td className="px-4 py-2.5">
                          {m.status === 'released' ? (
                            <Badge label="Released" tone="good" />
                          ) : (
                            <Badge label="Pending" tone="warn" />
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 py-2.5 text-right">
                            {m.status !== 'released' && (
                              <button
                                disabled={busyMilestoneId === m.id}
                                onClick={() => handleRelease(m.id)}
                                className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream hover:bg-navy-deep disabled:opacity-60"
                              >
                                Release payment
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

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Amendments</h2>
              {canManage && <NewAmendmentForm contract={contract} onCreated={load} />}
            </div>
            {amendments.length === 0 ? (
              <p className="rounded-[var(--radius-m)] border border-sand/70 bg-paper px-4 py-6 text-center text-sm text-navy/50">
                No amendments yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {amendments.map((a) => (
                  <li key={a.id} className="rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 text-sm">
                    <span className="font-semibold text-navy">v{a.version_number}</span>{' '}
                    <span className="text-navy/70">{a.summary}</span>
                    {a.decision_id && <span className="ml-2 text-xs text-navy/40">routed via decision #{a.decision_id}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Ask the legal agent</h2>
            <LegalAgentChat contract={contract} canReindex={canManage} />
          </section>
        </>
      )}
    </div>
  )
}
