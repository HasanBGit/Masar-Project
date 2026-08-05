import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { StatusBadge } from '../../components/StatusBadge'
import { SlaCountdown } from '../../components/SlaCountdown'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { EdgesTracker } from './EdgesTracker'
import { agree, confirmHearing, getDecision, recordUnderstanding } from './api'
import { getApiError } from '../../lib/api'
import type { Decision, RaciRole } from '../../lib/types'

const RACI_LABEL: Record<RaciRole, string> = {
  R: 'Responsible',
  A: 'Accountable',
  C: 'Consulted',
  I: 'Informed',
}

const GENERIC_PHRASES = new Set(['i agree', 'ok', 'okay', 'agreed', 'yes', 'approved', 'sounds good'])

export function DecisionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { me } = useAuth()
  const toast = useToast()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [paraphrase, setParaphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoadFailed(false)
    try {
      const d = await getDecision(Number(id))
      setDecision(d)
    } catch {
      setLoadFailed(true)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-md">
        <ErrorState
          title="Decision unavailable"
          message="This decision doesn't exist, or you don't have access to it."
          onRetry={load}
        />
        <p className="mt-3 text-center">
          <Link to="/dashboard" className="text-sm font-semibold text-navy underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    )
  }

  if (!decision) {
    return (
      <div role="status" aria-label="Loading decision" className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const isAccountable = decision.my_raci_role === 'A'
  const isParticipant = decision.my_raci_role !== null
  const paraphraseTooGeneric =
    paraphrase.trim().length < 12 || GENERIC_PHRASES.has(paraphrase.trim().toLowerCase())

  async function run(action: () => Promise<Decision>, successMessage: string) {
    setBusy(true)
    setError(null)
    try {
      const updated = await action()
      setDecision(updated)
      setParaphrase('')
      toast.success(successMessage)
    } catch (e) {
      const message = getApiError(e, 'That action is not available right now.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy/60 transition hover:text-navy"
      >
        <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
        Back
      </button>

      <div className="rounded-[var(--radius-l)] border border-sand/70 bg-paper p-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <StatusBadge status={decision.status} />
          <SlaCountdown deadline={decision.sla_deadline} />
        </div>

        <h1 className="font-[var(--font-display)] text-2xl font-bold text-navy">{decision.title}</h1>
        <p className="mt-1 text-sm text-navy/70">{decision.description}</p>
        {decision.high_stakes && (
          <span className="mt-2 inline-block rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold-ink">
            High-stakes - full 3 Edges required
          </span>
        )}

        <div className="mt-6">
          <EdgesTracker decision={decision} />
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-navy/60">RACI</h2>
          <ul className="flex flex-wrap gap-2">
            {decision.participants.map((p) => (
              <li
                key={p.id}
                className={`rounded-full border px-3 py-1 text-xs ${
                  p.raci_role === 'A' ? 'border-gold bg-gold/10 font-semibold text-gold-ink' : 'border-sand text-navy/70'
                }`}
              >
                {p.user_name} · {RACI_LABEL[p.raci_role]}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorState compact title="Action failed" message={error} />
          </div>
        )}

        <div className="mt-6 border-t border-sand/70 pt-5">
          {decision.status === 'hearing' && isParticipant && (
            <div>
              <p className="mb-2 text-sm text-navy/70">
                This item is in your Hearing queue. Acknowledge it to move the decision forward.
              </p>
              <button
                disabled={busy}
                onClick={() => run(() => confirmHearing(decision.id), 'Acknowledged.')}
                className="rounded-[var(--radius-s)] bg-navy px-4 py-2 text-sm font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
              >
                I've seen this - acknowledge
              </button>
            </div>
          )}

          {decision.status === 'understanding' && (
            <div>
              {isAccountable ? (
                <>
                  <label htmlFor="teach-back" className="mb-2 block text-sm text-navy/70">
                    Restate what you understood from this decision in your own words (teach-back - not a checkbox).
                  </label>
                  <textarea
                    id="teach-back"
                    value={paraphrase}
                    onChange={(e) => setParaphrase(e.target.value)}
                    rows={3}
                    className="w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm text-navy outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
                    placeholder="e.g. This change order adds 12 days to the MEP schedule and SAR 40,000 to cost, because…"
                  />
                  {paraphrase && paraphraseTooGeneric && (
                    <p role="alert" className="mt-1 text-xs text-status-escalated">
                      Too generic - restate the specific decision content, not just "I agree".
                    </p>
                  )}
                  <button
                    disabled={busy || paraphraseTooGeneric}
                    onClick={() => run(() => recordUnderstanding(decision.id, paraphrase), 'Understanding recorded.')}
                    className="mt-3 rounded-[var(--radius-s)] bg-navy px-4 py-2 text-sm font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
                  >
                    Confirm understanding
                  </button>
                </>
              ) : (
                <p className="text-sm text-navy/60">
                  Waiting on the Accountable approver ({decision.participants.find((p) => p.raci_role === 'A')?.user_name})
                  to confirm they understand this decision.
                </p>
              )}
            </div>
          )}

          {decision.status === 'agreeing' && (
            <div>
              {decision.understanding_text && (
                <blockquote className="mb-3 rounded-[var(--radius-s)] bg-navy/5 px-3 py-2 text-sm italic text-navy/80">
                  “{decision.understanding_text}”
                </blockquote>
              )}
              {isAccountable ? (
                <>
                  <p className="mb-2 text-sm text-navy/70">
                    You are the Accountable approver. Signing off here closes the decision - this is the one signature
                    that counts.
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => run(() => agree(decision.id), 'Decision signed and approved.')}
                    className="rounded-[var(--radius-s)] bg-status-agreeing px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    Sign &amp; approve
                  </button>
                </>
              ) : (
                <p className="text-sm text-navy/60">
                  Waiting on the Accountable approver to sign off. You can follow along but only they can close this
                  decision.
                </p>
              )}
            </div>
          )}

          {decision.status === 'closed' && (
            <p className="text-sm font-medium text-status-agreeing">
              Closed - agreed by {decision.participants.find((p) => p.raci_role === 'A')?.user_name} on{' '}
              {decision.agreement_confirmed_at && new Date(decision.agreement_confirmed_at).toLocaleString()}.
            </p>
          )}

          {decision.status === 'escalated' && !isParticipant && (
            <p className="text-sm text-status-escalated">
              This decision breached its SLA and was escalated to a fallback approver.
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-navy/40">
        Signed in as {me?.full_name} · <Link to="/dashboard" className="underline">back to dashboard</Link>
      </p>
    </div>
  )
}
