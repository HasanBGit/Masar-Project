import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const inputClasses =
  'w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm text-navy placeholder:text-navy/35 disabled:opacity-60'
const invalidClasses = 'border-status-escalated'

function FieldShell({
  id,
  label,
  error,
  hint,
  children,
  hideLabel = false,
}: {
  id: string
  label: string
  error?: string | null
  hint?: string
  children: ReactNode
  hideLabel?: boolean
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-xs font-semibold text-navy/70'}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-navy/45">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-status-escalated">
          {error}
        </p>
      )}
    </div>
  )
}

/** Labelled input with error wiring (aria-invalid + aria-describedby). */
export function TextField({
  label,
  error,
  hint,
  hideLabel,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: string; hideLabel?: boolean }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClasses} ${error ? invalidClasses : ''} ${className}`}
        {...rest}
      />
    </FieldShell>
  )
}

/** Labelled select with error wiring. */
export function SelectField({
  label,
  error,
  hint,
  hideLabel,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string | null
  hint?: string
  hideLabel?: boolean
  children: ReactNode
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClasses} ${error ? invalidClasses : ''} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}

/** Labelled textarea with error wiring. */
export function TextAreaField({
  label,
  error,
  hint,
  hideLabel,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string | null
  hint?: string
  hideLabel?: boolean
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClasses} ${error ? invalidClasses : ''} ${className}`}
        {...rest}
      />
    </FieldShell>
  )
}
