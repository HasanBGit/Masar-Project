import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiError } from './api'

/**
 * Load per-project data with a stale-response guard: when the active project
 * changes (or reload is called) while an earlier request is in flight, the
 * earlier response is discarded instead of overwriting newer data.
 */
export function useProjectData<T>(projectId: number | string, loader: (projectId: number | string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const load = useCallback(async () => {
    const seq = ++requestSeq.current
    setLoading(true)
    setError(null)
    try {
      const result = await loaderRef.current(projectId)
      if (seq !== requestSeq.current) return
      setData(result)
    } catch (e) {
      if (seq !== requestSeq.current) return
      setError(getApiError(e))
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
