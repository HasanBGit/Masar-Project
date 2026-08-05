import type { Decision } from '../../lib/types'

const EDGE_ORDER = ['hearing', 'understanding', 'agreeing', 'closed'] as const

function edgeIndex(status: Decision['status']) {
  if (status === 'escalated') return -1
  return EDGE_ORDER.indexOf(status as (typeof EDGE_ORDER)[number])
}

export function EdgesTracker({ decision }: { decision: Decision }) {
  const current = edgeIndex(decision.status)
  const steps = [
    { key: 'hearing', label: 'Hearing', hint: 'Entered the decision queue' },
    { key: 'understanding', label: 'Understanding', hint: decision.high_stakes ? 'Teach-back required' : 'Skipped - low-stakes item' },
    { key: 'agreeing', label: 'Agreeing', hint: 'Accountable signs off' },
  ]

  if (decision.status === 'escalated') {
    return (
      <div className="rounded-[var(--radius-s)] border border-status-escalated/40 bg-status-escalated/10 px-4 py-3 text-sm text-status-escalated">
        <strong>SLA breached - escalated.</strong>{' '}
        {decision.fallback_approver_name
          ? `Routed to fallback approver ${decision.fallback_approver_name}.`
          : 'Awaiting fallback approver assignment.'}
      </div>
    )
  }

  return (
    <ol className="flex items-stretch gap-2">
      {steps.map((step, i) => {
        const done = current > i || decision.status === 'closed'
        const active = current === i
        const skipped = step.key === 'understanding' && !decision.high_stakes
        return (
          <li key={step.key} className="flex-1">
            <div
              className={`rounded-[var(--radius-s)] border px-3 py-2.5 text-left transition ${
                done
                  ? 'border-status-agreeing/50 bg-status-agreeing/10'
                  : active
                    ? 'border-navy bg-navy/5'
                    : 'border-sand bg-white/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy">
                <span>
                  {done ? '●' : active ? '◐' : '○'} {i + 1}. {step.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-navy/60">{skipped ? step.hint : step.hint}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
