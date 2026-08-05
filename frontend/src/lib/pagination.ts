export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface PageResult<T> {
  items: T[]
  /** Total row count across all pages (equals items.length for unpaginated endpoints). */
  count: number
  hasMore: boolean
}

function isPaginated<T>(data: Paginated<T> | T[]): data is Paginated<T> {
  return !Array.isArray(data) && Array.isArray((data as Paginated<T>).results)
}

/**
 * Normalise a DRF list response (paginated object or bare array) while
 * preserving the total count so tables can surface "N of M" and paginate
 * instead of silently truncating to page 1.
 */
export function unwrapPage<T>(data: Paginated<T> | T[]): PageResult<T> {
  if (isPaginated(data)) {
    return { items: data.results, count: data.count, hasMore: data.next !== null }
  }
  return { items: data, count: data.length, hasMore: false }
}

/** Items-only variant for callers that don't render pagination. */
export function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return unwrapPage(data).items
}
