export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** DRF ViewSet list endpoints are paginated; plain APIView endpoints return a bare array. Normalize both. */
export function unwrapList<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}
