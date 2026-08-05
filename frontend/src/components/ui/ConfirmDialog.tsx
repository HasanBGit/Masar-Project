import { useState } from 'react'
import { Modal } from './Modal'
import { useLang } from '../../lib/i18n'
import { getApiError } from '../../lib/api'

/**
 * Confirmation gate for destructive actions (remove member, revoke key,
 * delete model). Runs the action inline, surfacing failure without closing.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  destructive = true,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<void> | void
}) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-navy/70">{message}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-status-escalated">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-[var(--radius-s)] border border-sand bg-paper px-4 py-1.5 text-sm font-semibold text-navy transition hover:bg-navy/5"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className={`rounded-[var(--radius-s)] px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
            destructive
              ? 'bg-status-escalated text-cream hover:opacity-90'
              : 'bg-navy text-cream hover:bg-navy-deep'
          }`}
        >
          {busy ? '…' : (confirmLabel ?? t('common.confirm'))}
        </button>
      </div>
    </Modal>
  )
}
