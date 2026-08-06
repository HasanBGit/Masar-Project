import { useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { ErrorState } from '../../components/ui/ErrorState'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
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

function money(value: string | undefined, currency: string) {
  if (value === undefined) return '-'
  return `${currency} ${Number(value).toLocaleString()}`
}

/** Positive-amount check for money inputs (type="number" allows e.g. "-3"). */
function validAmount(value: string): boolean {
  const parsed = Number(value)
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0
}

function NewContractForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [valueError, setValueError] = useState<string | null>(null)
  const [scopeBaseline, setScopeBaseline] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setValueError(null)
    setError(null)
    if (!validAmount(value)) {
      setValueError('Enter a contract value greater than zero.')
      return
    }
    setBusy(true)
    try {
      await createContract({
        project: project.id,
        title: title.trim(),
        contract_value: value.trim(),
        scope_baseline: scopeBaseline.trim(),
      })
      toast.success('Contract created.')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create contract.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 text-navy">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy">No contract on this project yet</h3>
      <p className="mb-3 text-sm text-navy/60">
        Create the structured contract record - payment schedule, milestones, and scope live here as queryable data,
        not locked inside a PDF.
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        <div className="min-w-48 flex-1">
          <TextField
            label="Contract title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contract title"
            required
          />
        </div>
        <div className="w-44">
          <TextField
            label="Contract value (SAR)"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            error={valueError}
            required
          />
        </div>
      </div>
      <div className="mb-2">
        <TextAreaField
          label="Baseline scope of work"
          value={scopeBaseline}
          onChange={(e) => setScopeBaseline(e.target.value)}
          rows={2}
          placeholder="Baseline scope of work"
          required
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <button
        type="submit"
        disabled={busy || !title.trim() || !value.trim() || !scopeBaseline.trim()}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
      >
        {busy ? 'Creating…' : 'Create contract'}
      </button>
    </form>
  )
}

function NewMilestoneForm({ contract, onCreated }: { contract: Contract; onCreated: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [dueCondition, setDueCondition] = useState('')
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep"
      >
        + Add milestone
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setAmountError(null)
    setError(null)
    if (!validAmount(amount)) {
      setAmountError('Enter an amount greater than zero.')
      return
    }
    setBusy(true)
    try {
      await createPaymentMilestone({
        project: contract.project,
        contract: contract.id,
        name: name.trim(),
        due_condition: dueCondition.trim(),
        amount: amount.trim(),
      })
      toast.success('Milestone added.')
      setOpen(false)
      setName('')
      setDueCondition('')
      setAmount('')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not create milestone.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 text-navy">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-navy">New Payment Milestone</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close milestone form"
          className="rounded p-1 text-navy/40 transition hover:text-navy"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <div className="min-w-40 flex-1">
          <TextField
            label="Milestone name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Milestone name"
            required
          />
        </div>
        <div className="w-36">
          <TextField
            label="Amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            error={amountError}
            required
          />
        </div>
      </div>
      <div className="mb-2">
        <TextField
          label="Due condition"
          value={dueCondition}
          onChange={(e) => setDueCondition(e.target.value)}
          placeholder='Due condition (e.g. "40% structural complete")'
          required
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim() || !dueCondition.trim() || !amount.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Adding…' : 'Add milestone'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

function CeilingCheckWidget({ contract }: { contract: Contract }) {
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [result, setResult] = useState<CeilingCheck | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setAmountError(null)
    setError(null)
    if (!validAmount(amount)) {
      setAmountError('Enter an amount greater than zero.')
      return
    }
    setBusy(true)
    try {
      setResult(await getCeilingCheck(contract.id, amount.trim()))
    } catch (err) {
      setResult(null)
      setError(getApiError(err, 'Could not run the ceiling check.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 text-navy">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy">
        Ceiling check - before you approve, not after
      </h3>
      <p className="mb-3 text-sm text-navy/60">
        Enter a pending change order or payment amount to see whether it would push cumulative spend past this
        contract's {contract.ceiling_threshold_percentage}% ceiling threshold.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-2">
        <div className="w-44">
          <TextField
            label="Pending amount"
            hideLabel
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Pending amount"
            error={amountError}
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy || !amount.trim()}
          className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-2 text-xs font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Check'}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-status-escalated">{error}</p>}
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
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [versionNumber, setVersionNumber] = useState('')
  const [versionError, setVersionError] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep"
      >
        + Request amendment signing
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setVersionError(null)
    setError(null)
    const version = Number(versionNumber)
    if (!Number.isInteger(version) || version < 1) {
      setVersionError('Enter a whole version number of 1 or more.')
      return
    }
    setBusy(true)
    try {
      await requestContractAmendment({ contract: contract.id, version_number: version, summary: summary.trim() })
      toast.success('Amendment signing requested.')
      setOpen(false)
      setVersionNumber('')
      setSummary('')
      onCreated()
    } catch (err) {
      const message = getApiError(err, 'Could not request amendment.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 text-navy">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Request Contract Amendment</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close amendment form"
          className="rounded p-1 text-navy/40 transition hover:text-navy"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="mb-2 text-xs text-navy/50">
        Routes through the same 3-Edges approval/e-signature workflow as every other high-stakes decision - you'll be
        the sole accountable signer.
      </p>
      <div className="mb-2 w-28">
        <TextField
          label="Version #"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={versionNumber}
          onChange={(e) => setVersionNumber(e.target.value)}
          placeholder="1"
          error={versionError}
          required
        />
      </div>
      <div className="mb-2">
        <TextAreaField
          label="What's changing and why"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          placeholder="What's changing and why"
          required
        />
      </div>
      {error && <p role="alert" className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !versionNumber.trim() || !summary.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Requesting…' : 'Request signing'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

interface ChatTurn {
  id: number
  question: string
  answer?: string
  sources?: LegalAgentSource[]
  error?: string
}

function LegalAgentChat({ contract, canReindex }: { contract: Contract; canReindex: boolean }) {
  const toast = useToast()
  const [question, setQuestion] = useState('')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const nextTurnId = useRef(1)

  async function handleAsk(e: FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || busy) return
    const turnId = nextTurnId.current++
    setBusy(true)
    setQuestion('')
    setTurns((prev) => [...prev, { id: turnId, question: q }])
    try {
      const result = await askLegalAgent(contract.id, q, language)
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, answer: result.answer, sources: result.sources } : t)))
    } catch (err) {
      const detail =
        (err as { response?: { status?: number } })?.response?.status === 503
          ? 'Legal agent isn’t configured yet - an admin needs to set VOYAGE_API_KEY and ANTHROPIC_API_KEY on the backend.'
          : getApiError(err, 'Could not reach the legal agent.')
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, error: detail } : t)))
    } finally {
      setBusy(false)
    }
  }

  async function handleReindex() {
    setReindexing(true)
    try {
      const res = await ingestLegalAgent(contract.id)
      toast.success(`Indexed ${res.chunks_indexed} chunks.`)
    } catch (err) {
      toast.error(getApiError(err, 'Could not reindex.'))
    } finally {
      setReindexing(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 text-navy">
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
            onClick={handleReindex}
            className="rounded-[var(--radius-s)] border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
          >
            {reindexing ? 'Indexing…' : 'Re-index contract'}
          </button>
        )}
      </div>

      <div
        role="log"
        aria-label="Legal agent conversation"
        aria-live="polite"
        className="mb-3 max-h-80 overflow-y-auto rounded-[var(--radius-s)] border border-sand/50 bg-white p-3"
      >
        {turns.length === 0 ? (
          <p className="text-sm text-navy/40">
            Ask something like "what is the retention percentage?" or "when does ZATCA invoicing apply?"
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {turns.map((turn) => (
              <div key={turn.id} className="flex flex-col gap-1">
                <p className="self-end rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-sm text-cream">{turn.question}</p>
                {turn.answer && (
                  <div className="rounded-[var(--radius-s)] bg-navy/5 px-3 py-2 text-sm text-navy">
                    <p>{turn.answer}</p>
                    {turn.sources && turn.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {turn.sources.map((s) => (
                          <span key={s.source_ref} title={s.excerpt} className="rounded-full bg-navy/10 px-2 py-0.5 text-xs text-navy/60">
                            {s.source_ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {turn.error && <p role="alert" className="text-xs text-status-escalated">{turn.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="flex flex-wrap items-start gap-2">
        <div className="w-32">
          <SelectField
            label="Answer language"
            hideLabel
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </SelectField>
        </div>
        <div className="min-w-48 flex-1">
          <TextField
            label="Question for the legal agent"
            hideLabel
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this contract…"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </form>
    </div>
  )
}

interface ContractPageData {
  contract: Contract | null
  milestones: PaymentMilestone[]
  vsActual: ContractVsActual | null
  amendments: ContractAmendment[]
}

async function loadContractPage(projectId: number, role: string): Promise<ContractPageData> {
  const contracts = await listContracts(projectId)
  const contract = contracts[0] ?? null
  if (!contract) {
    return { contract: null, milestones: [], vsActual: null, amendments: [] }
  }
  // contract_vs_actual is forbidden server-side for project_manager/designer
  // ("Project Managers and Designers cannot access contract financial data")
  // - fetching it unconditionally would 403 and fail the whole page load for
  // those two roles via Promise.all.
  const canViewFinancials = role !== 'project_manager' && role !== 'designer'
  const [milestones, vsActual, amendments] = await Promise.all([
    listPaymentMilestones(projectId),
    canViewFinancials ? getContractVsActual(contract.id) : Promise.resolve(null),
    listAmendments(projectId),
  ])
  return { contract, milestones, vsActual, amendments }
}

export function ContractPaymentsPage({ project }: { project: Project }) {
  const toast = useToast()
  const { data, loading, error, reload } = useProjectData(project.id, (pid) => loadContractPage(Number(pid), project.role))
  const [busyMilestoneId, setBusyMilestoneId] = useState<number | null>(null)
  const canManage = FINANCIAL_ROLES.has(project.role)
  // contract_vs_actual, ceiling_check, and legal-agent/ask are all forbidden
  // server-side for these two roles (see loadContractPage).
  const canViewFinancials = project.role !== 'project_manager' && project.role !== 'designer'

  async function handleRelease(id: number) {
    setBusyMilestoneId(id)
    try {
      await releasePaymentMilestone(id)
      toast.success('Payment released.')
      await reload()
    } catch (err) {
      toast.error(getApiError(err, 'Could not release payment - milestone has no verified evidence yet.'))
    } finally {
      setBusyMilestoneId(null)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <PageSkeleton />

  const { contract, milestones, vsActual, amendments } = data

  const milestoneColumns: Column<PaymentMilestone>[] = contract
    ? [
        {
          key: 'name',
          header: 'Milestone',
          render: (m) => <span className="text-navy">{m.name}</span>,
          sortValue: (m) => m.name,
        },
        {
          key: 'due_condition',
          header: 'Due condition',
          render: (m) => <span className="text-navy/60">{m.due_condition}</span>,
        },
        {
          key: 'amount',
          header: 'Amount',
          render: (m) => <span className="text-navy/60">{money(m.amount, contract.currency)}</span>,
          sortValue: (m) => Number(m.amount),
        },
        {
          key: 'status',
          header: 'Status',
          render: (m) =>
            m.status === 'released' ? <Badge label="Released" tone="good" /> : <Badge label="Pending" tone="warn" />,
          sortValue: (m) => m.status,
        },
        ...(canManage
          ? [
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                className: 'text-end',
                render: (m: PaymentMilestone) =>
                  m.status !== 'released' ? (
                    <button
                      disabled={busyMilestoneId === m.id}
                      onClick={() => handleRelease(m.id)}
                      className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
                    >
                      {busyMilestoneId === m.id ? 'Releasing…' : 'Release payment'}
                    </button>
                  ) : null,
              },
            ]
          : []),
      ]
    : []

  const amendmentColumns: Column<ContractAmendment>[] = [
    {
      key: 'version',
      header: 'Version',
      render: (a) => <span className="font-semibold text-navy">v{a.version_number}</span>,
      sortValue: (a) => a.version_number,
    },
    {
      key: 'summary',
      header: 'Summary',
      render: (a) => <span className="text-navy/70">{a.summary}</span>,
    },
    {
      key: 'decision',
      header: 'Approval',
      render: (a) =>
        a.decision_id ? (
          <span className="text-xs text-navy/40">routed via decision #{a.decision_id}</span>
        ) : (
          <span className="text-xs text-navy/40">-</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Site Payments</h1>
        <p className="mt-1 text-sm text-navy/60">
          The contract as an active reference the platform enforces against - payment only unlocks on verified
          evidence, never on self-assertion.
        </p>
      </div>

      {!contract ? (
        canManage ? (
          <NewContractForm project={project} onCreated={reload} />
        ) : (
          <p className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-5 text-sm text-navy/60">
            No contract on this project yet. An owner or admin needs to create the contract record before payment
            milestones can be tracked here.
          </p>
        )
      ) : (
        <>
          <section>
            <div className="rounded-[var(--radius-m)] border border-sand/70 bg-paper p-5 text-navy">
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
              {canManage && <NewMilestoneForm contract={contract} onCreated={reload} />}
            </div>
            <DataTable
              columns={milestoneColumns}
              rows={milestones}
              rowKey={(m) => m.id}
              minWidth={720}
              emptyTitle="No payment milestones yet"
              emptyHint="Add milestones so payment can only unlock against verified evidence."
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">Amendments</h2>
              {canManage && <NewAmendmentForm contract={contract} onCreated={reload} />}
            </div>
            <DataTable
              columns={amendmentColumns}
              rows={amendments}
              rowKey={(a) => a.id}
              emptyTitle="No amendments yet"
              emptyHint="Amendments route through the 3-Edges approval and e-signature workflow."
            />
          </section>

          {canViewFinancials && (
            <section>
              <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Ask the legal agent</h2>
              <LegalAgentChat contract={contract} canReindex={canManage} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
