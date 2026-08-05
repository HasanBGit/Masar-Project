export function Logo({ size = 40, light = false }: { size?: number; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="13" r="7" fill="var(--color-gold)" />
        <path
          d="M6 30c0-7.732 6.268-14 14-14s14 6.268 14 14"
          stroke="var(--color-gold)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className={`font-[var(--font-display)] text-xl font-bold ${light ? 'text-cream' : 'text-navy'}`}>Truepoint</span>
    </div>
  )
}
