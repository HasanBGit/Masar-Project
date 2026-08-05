import { useMemo, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { TableSkeleton } from './Skeleton'
import { ErrorState } from './ErrorState'
import { EmptyState } from './EmptyState'
import { useLang } from '../../lib/i18n'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  /** Provide to make the column sortable (client-side). */
  sortValue?: (row: T) => string | number
  className?: string
}

const DEFAULT_PAGE_SIZE = 10

/**
 * Shared table shell: sticky header, zebra rows, hover state, client-side
 * sorting + pagination, and built-in loading / error / empty rendering so
 * pages stop hand-rolling divergent `<table>` markup.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyTitle,
  emptyHint,
  emptyAction,
  pageSize = DEFAULT_PAGE_SIZE,
  minWidth = 560,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle: string
  emptyHint?: string
  emptyAction?: ReactNode
  pageSize?: number
  minWidth?: number
}) {
  const { lang } = useLang()
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const sortValue = col.sortValue
    return [...rows].sort((a, b) => {
      const av = sortValue(a)
      const bv = sortValue(b)
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.asc ? cmp : -cmp
    })
  }, [rows, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)

  if (loading) return <TableSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRetry} compact />
  if (rows.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} compact />

  function toggleSort(key: string) {
    setPage(0)
    setSort((prev) => (prev?.key === key ? { key, asc: !prev.asc } : { key, asc: true }))
  }

  const rangeStart = clampedPage * pageSize + 1
  const rangeEnd = Math.min(sorted.length, (clampedPage + 1) * pageSize)
  const rangeLabel =
    lang === 'ar' ? `${rangeStart}–${rangeEnd} من ${sorted.length}` : `${rangeStart}–${rangeEnd} of ${sorted.length}`

  return (
    <div className="overflow-hidden rounded-[var(--radius-m)] border border-sand/70 bg-paper">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 bg-cream">
            <tr className="text-start text-xs uppercase tracking-wide text-navy/50">
              {columns.map((col) => (
                <th key={col.key} scope="col" className={`px-4 py-2.5 text-start font-semibold ${col.className ?? ''}`}>
                  {col.sortValue ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 rounded transition hover:text-navy"
                      aria-label={typeof col.header === 'string' ? `Sort by ${col.header}` : 'Sort'}
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.asc ? (
                          <ChevronUp size={13} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={13} aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={rowKey(row)}
                className={`border-t border-sand/40 transition hover:bg-gold/5 ${i % 2 === 1 ? 'bg-cream/40' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-navy ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-sand/60 px-4 py-2 text-xs text-navy/60">
          <span>{rangeLabel}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
              aria-label="Previous page"
              className="rounded p-1 transition hover:bg-navy/5 disabled:opacity-30"
            >
              <ChevronLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
            </button>
            <span aria-live="polite">
              {clampedPage + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={clampedPage >= pageCount - 1}
              aria-label="Next page"
              className="rounded p-1 transition hover:bg-navy/5 disabled:opacity-30"
            >
              <ChevronRight size={15} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
