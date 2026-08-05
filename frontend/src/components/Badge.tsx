const TONE_CLASSES = {
  neutral: 'text-navy/70 bg-navy/10',
  gold: 'text-gold-ink bg-gold/15',
  good: 'text-status-agreeing bg-status-agreeing/10',
  warn: 'text-status-hearing bg-status-hearing/10',
  danger: 'text-status-escalated bg-status-escalated/10',
  info: 'text-status-understanding bg-status-understanding/10',
} as const

export type BadgeTone = keyof typeof TONE_CLASSES

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  )
}
