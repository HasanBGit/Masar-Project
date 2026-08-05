import React, { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options?: SelectOption[]
  icon?: React.ReactNode
  containerClassName?: string
  sizeVariant?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable Styled Native Select Component for Masar-Project (Truepoint)
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      icon,
      children,
      className = '',
      containerClassName = '',
      sizeVariant = 'md',
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const selectId = id || generatedId

    const sizeClasses = {
      sm: 'h-8 px-2.5 text-xs rounded-[var(--radius-s)]',
      md: 'h-10 px-3 text-sm rounded-[var(--radius-s)]',
      lg: 'h-12 px-4 text-base rounded-[var(--radius-m)]',
    }[sizeVariant]

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-navy select-none flex items-center justify-between"
          >
            <span>{label}</span>
            {hint && <span className="text-[11px] font-normal text-navy/50">{hint}</span>}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3 pointer-events-none text-navy/50 flex items-center justify-center">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full appearance-none transition-all duration-150 bg-white text-navy border border-sand hover:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 focus:border-navy shadow-xs pr-9 ${
              icon ? 'pl-9' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-cream/50' : 'cursor-pointer'} ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
            } ${sizeClasses} ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-white text-navy py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 pointer-events-none text-navy/50 flex items-center justify-center">
            <ChevronDown size={sizeVariant === 'sm' ? 14 : 16} strokeWidth={2} />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
