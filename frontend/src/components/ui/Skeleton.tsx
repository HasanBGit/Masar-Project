export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[var(--radius-s)] bg-sand/50 ${className}`} />
}

/** Loading placeholder for a stat-card row. */
export function StatGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

/** Loading placeholder for a table. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-[var(--radius-m)] border border-sand/70 bg-paper">
      <Skeleton className="h-10 rounded-none bg-sand/60" />
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </div>
  )
}

/** Full-page loading placeholder: heading + stats + table. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <StatGridSkeleton />
      <TableSkeleton />
    </div>
  )
}
