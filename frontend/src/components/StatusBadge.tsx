import type { DecisionStatus } from '../lib/types'

const STATUS_META: Record<DecisionStatus, { label: string; dot: string; text: string; bg: string }> = {
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

export function StatusBadge({ status }: { status: DecisionStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.text} ${meta.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
