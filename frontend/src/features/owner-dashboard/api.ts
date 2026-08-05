import { api } from '../../lib/api'
import type { DashboardSummary } from '../../lib/types'

export async function getDashboardSummary(project: number): Promise<DashboardSummary> {
  const res = await api.get<DashboardSummary>('/dashboard/summary/', { params: { project } })
  return res.data
}
