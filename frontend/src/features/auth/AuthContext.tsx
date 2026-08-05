import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '../../lib/api'
import type { Me, Project } from '../../lib/types'

interface AuthState {
  me: Me | null
  projects: Project[]
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  createProject: (name: string, description?: string) => Promise<Project>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  async function loadProfile() {
    try {
      const [meRes, projectsRes] = await Promise.all([
        api.get<Me>('/accounts/me/'),
        api.get<Project[]>('/accounts/projects/'),
      ])
      setMe(meRes.data)
      setProjects(projectsRes.data)
    } catch {
      setMe(null)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenStore.getAccess()) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post('/auth/token/', { email, password })
    tokenStore.setTokens(res.data.access, res.data.refresh)
    await loadProfile()
  }

  function logout() {
    tokenStore.clear()
    setMe(null)
    setProjects([])
  }

  async function createProject(name: string, description = ''): Promise<Project> {
    const res = await api.post<Project>('/accounts/projects/', { name, description })
    setProjects((prev) => [...prev, res.data])
    return res.data
  }

  return (
    <AuthContext.Provider value={{ me, projects, loading, login, logout, createProject }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
