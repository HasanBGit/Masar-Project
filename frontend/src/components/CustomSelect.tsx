import { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface CustomSelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface CustomSelectProps {
  value: string | number
  onChange: (value: string) => void
  options: CustomSelectOption[]
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  className?: string
  containerClassName?: string
  sizeVariant?: 'sm' | 'md' | 'lg'
  id?: string
}

/**
 * Custom Dropdown Component for Masar-Project (Truepoint)
 * Replaces native OS <select> dropdowns with a sleek in-app glassmorphic overlay menu.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option...',
  error,
  hint,
  disabled = false,
  className = '',
  containerClassName = '',
  sizeVariant = 'md',
  id,
}: CustomSelectProps) {
  const generatedId = useId()
  const selectId = id || generatedId
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const currentIndex = options.findIndex((opt) => String(opt.value) === String(value))
        const nextOpt = options[currentIndex + 1]
        if (nextOpt && !nextOpt.disabled) {
          onChange(String(nextOpt.value))
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        const currentIndex = options.findIndex((opt) => String(opt.value) === String(value))
        const prevOpt = options[currentIndex - 1]
        if (prevOpt && !prevOpt.disabled) {
          onChange(String(prevOpt.value))
        }
      }
    }
  }

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs rounded-[var(--radius-s)]',
    md: 'h-10 px-3 text-sm rounded-[var(--radius-s)]',
    lg: 'h-12 px-4 text-base rounded-[var(--radius-m)]',
  }[sizeVariant]

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-navy select-none flex items-center justify-between"
        >
          <span>{label}</span>
          {hint && <span className="text-[11px] font-normal text-navy/50">{hint}</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between transition-all duration-150 text-left select-none bg-white text-navy border border-sand hover:border-navy/40 shadow-xs ${
          isOpen ? 'border-navy ring-2 ring-navy/15' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-cream/50' : 'cursor-pointer'} ${
          error ? 'border-red-500 ring-2 ring-red-500/20' : ''
        } ${sizeClasses} ${className}`}
      >
        <span className={`truncate ${!selectedOption ? 'text-navy/40' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={sizeVariant === 'sm' ? 14 : 16}
          strokeWidth={2}
          className={`text-navy/50 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-gold-ink' : ''
          }`}
        />
      </button>

      {/* Floating Custom Overlay Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-[var(--radius-m)] border border-sand bg-white shadow-xl p-1 animate-fadeIn focus:outline-none"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-navy/50 text-center">No options available</div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(String(opt.value))
                      setIsOpen(false)
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-[var(--radius-s)] cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-navy/8 text-navy font-semibold'
                      : 'text-navy hover:bg-cream'
                  } ${opt.disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="text-gold-ink shrink-0 ml-2" />}
                </div>
              )
            })
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  )
}
