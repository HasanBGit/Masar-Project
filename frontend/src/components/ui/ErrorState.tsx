import { AlertTriangle } from 'lucide-react'
import { useLang } from '../../lib/i18n'

/**
 * Page/section-level failure notice with a retry affordance. Uses the existing
 * escalated-status token for the accent so no new colors enter the palette.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  compact = false,
}: {
  title?: string
  message: string
  onRetry?: () => void
  compact?: boolean
}) {
  const { t } = useLang()
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-m)] border border-status-escalated/30 bg-status-escalated/5 text-center ${
        compact ? 'p-4' : 'p-10'
      }`}
    >
      <AlertTriangle size={compact ? 20 : 28} className="text-status-escalated" aria-hidden="true" />
      <div>
        <p className="font-semibold text-navy">{title ?? t('common.error')}</p>
        <p className="mt-1 text-sm text-navy/60">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-[var(--radius-s)] border border-navy/20 bg-paper px-4 py-1.5 text-sm font-semibold text-navy transition hover:bg-navy/5"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
