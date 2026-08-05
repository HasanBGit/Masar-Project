import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const ACCESS_KEY = 'truepoint_access'
const REFRESH_KEY = 'truepoint_refresh'

/** Fired on window when the session can no longer be recovered (refresh failed). */
export const AUTH_EXPIRED_EVENT = 'truepoint:auth-expired'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// In dev this stays relative and goes through the Vite proxy (vite.config.ts);
// in production (Vercel) the frontend and API are on different origins, so
// VITE_API_URL must point at the deployed backend, e.g. https://api.example.com/api/v1
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const access = tokenStore.getAccess()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return null
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
    const access = res.data.access as string
    tokenStore.setAccess(access)
    return access
  } catch {
    tokenStore.clear()
    // The session is unrecoverable; let AuthContext log the user out instead
    // of leaving a zombie UI where every request 401s.
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableRequestConfig
    if (error.response?.status === 401 && !original._retry && tokenStore.getRefresh()) {
      original._retry = true
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }
      const newAccess = await refreshPromise
      if (newAccess) {
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Extract a human-readable message from any thrown value, understanding DRF
 * error bodies ({detail}, {field: [msgs]}, [msgs]). Replaces ad-hoc
 * `catch (e: any) { e.response.data... }` blocks.
 */
export function getApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    if (typeof data === 'string' && data) return data
    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') return data.detail
      const first = Array.isArray(data) ? data[0] : Object.values(data)[0]
      if (typeof first === 'string') return first
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    }
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.'
    return fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
