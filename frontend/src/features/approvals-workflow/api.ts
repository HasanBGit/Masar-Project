import { api } from '../../lib/api'
import type { Decision } from '../../lib/types'

export async function listDecisions(project: number): Promise<Decision[]> {
  const res = await api.get<Decision[]>('/approvals/decisions/', { params: { project } })
  return res.data
}

export async function getDecision(id: number): Promise<Decision> {
  const res = await api.get<Decision>(`/approvals/decisions/${id}/`)
  return res.data
}

export async function confirmHearing(id: number): Promise<Decision> {
  const res = await api.post<Decision>(`/approvals/decisions/${id}/confirm-hearing/`)
  return res.data
}

export async function recordUnderstanding(id: number, paraphrase: string): Promise<Decision> {
  const res = await api.post<Decision>(`/approvals/decisions/${id}/record-understanding/`, { paraphrase })
  return res.data
}

export async function agree(id: number): Promise<Decision> {
  const res = await api.post<Decision>(`/approvals/decisions/${id}/agree/`)
  return res.data
}
