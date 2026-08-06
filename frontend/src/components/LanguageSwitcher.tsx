import { useEffect, useRef, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { useLang, LANGUAGE_NAMES, type Lang } from '../lib/i18n'

const LANGUAGE_OPTIONS: Lang[] = ['en', 'ar', 'ur', 'hi']

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('chrome.languageLabel')}
        className="flex items-center gap-1.5 rounded-[var(--radius-s)] border border-sand bg-white px-2.5 py-1.5 text-xs font-semibold text-navy transition hover:bg-cream"
      >
        <Globe size={14} className="text-navy/60" aria-hidden="true" />
        {LANGUAGE_NAMES[lang]}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('chrome.language')}
          className="absolute end-0 top-full z-50 mt-2 w-40 rounded-[var(--radius-m)] border border-sand bg-white p-1 shadow-2xl"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option}
              role="menuitemradio"
              aria-checked={lang === option}
              onClick={() => {
                setLang(option)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm font-medium text-navy transition hover:bg-cream"
            >
              {LANGUAGE_NAMES[option]}
              {lang === option && <Check size={14} className="text-gold-ink" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
