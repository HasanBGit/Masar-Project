import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Meaningful empty state: icon + explanation + optional call to action,
 * replacing bare "No X yet." text lines.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
  compact = false,
}: {
  icon?: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-[var(--radius-m)] border border-dashed border-sand text-center ${
        compact ? 'p-5' : 'p-10'
      }`}
    >
      <Icon size={compact ? 20 : 28} className="text-navy/25" aria-hidden="true" />
      <p className="text-sm font-semibold text-navy/70">{title}</p>
      {hint && <p className="max-w-sm text-xs text-navy/50">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
