import type { DecisionStatus } from '../lib/types'

interface StatusMeta {
  label: string
  dot: string
  text: string
  bg: string
}

const STATUS_META: Record<DecisionStatus, StatusMeta> = {
  hearing: { label: 'Hearing', dot: 'bg-status-hearing', text: 'text-status-hearing', bg: 'bg-status-hearing/10' },
  understanding: {
    label: 'Understanding',
    dot: 'bg-status-understanding',
    text: 'text-status-understanding',
    bg: 'bg-status-understanding/10',
  },
  agreeing: { label: 'Agreeing', dot: 'bg-status-agreeing', text: 'text-status-agreeing', bg: 'bg-status-agreeing/10' },
  closed: { label: 'Closed', dot: 'bg-navy', text: 'text-navy', bg: 'bg-navy/10' },
  escalated: {
    label: 'Escalated',
    dot: 'bg-status-escalated',
    text: 'text-status-escalated',
    bg: 'bg-status-escalated/10',
  },
}

// Unknown statuses (new backend states, bad data) must render, not crash.
const FALLBACK_META: StatusMeta = { label: '', dot: 'bg-navy/40', text: 'text-navy/60', bg: 'bg-navy/5' }

export function StatusBadge({ status }: { status: DecisionStatus | string }) {
  const meta = STATUS_META[status as DecisionStatus] ?? { ...FALLBACK_META, label: String(status) }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.text} ${meta.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
