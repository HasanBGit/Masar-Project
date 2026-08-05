import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useLang } from '../../lib/i18n'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: role=dialog, focus trap, Escape + backdrop close, focus
 * restore to the trigger, body scroll lock. `variant="slideover"` docks the
 * panel to the inline-end edge for detail panes.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  variant = 'center',
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  variant?: 'center' | 'slideover'
  wide?: boolean
}) {
  const { t } = useLang()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) return
      const firstEl = focusables[0]
      const lastEl = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const panelClasses =
    variant === 'slideover'
      ? `fixed inset-y-0 end-0 h-full w-full overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-s-[var(--radius-m)]`
      : `relative max-h-[85vh] w-full overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-[var(--radius-m)]`

  return (
    <div
      className={`fixed inset-0 z-50 bg-navy-deep/40 backdrop-blur-sm ${
        variant === 'center' ? 'flex items-center justify-center p-4' : ''
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${panelClasses} border border-sand bg-paper shadow-2xl`}
      >
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-sand/70 bg-paper px-5 py-3.5">
          <h2 id={titleId} className="font-[var(--font-display)] text-base font-bold text-navy">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-[var(--radius-s)] p-1.5 text-navy/60 transition hover:bg-navy/5 hover:text-navy"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
