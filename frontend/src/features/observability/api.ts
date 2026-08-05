import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type { AlertEvent, IntegrationHealthCheck, QuietProject, SecurityEvent, SlaComplianceSummary } from '../../lib/types'

export async function getIntegrationHealth(): Promise<IntegrationHealthCheck[]> {
  const res = await api.get<IntegrationHealthCheck[]>('/observability/integration-health/')
  return res.data
}

export async function getAlerts(unacknowledgedOnly = false): Promise<AlertEvent[]> {
  const res = await api.get<Paginated<AlertEvent>>('/observability/alerts/', { params: { unacknowledged: unacknowledgedOnly ? 'true' : undefined } })
  return unwrapList(res.data)
}

export async function acknowledgeAlert(id: number): Promise<AlertEvent> {
  const res = await api.post<AlertEvent>(`/observability/alerts/${id}/acknowledge/`)
  return res.data
}

export async function createAlert(payload: { severity: string; source: string; message: string }): Promise<AlertEvent> {
  const res = await api.post<AlertEvent>('/observability/alerts/', payload)
  return res.data
}

export async function getSlaCompliance(): Promise<SlaComplianceSummary> {
  const res = await api.get<SlaComplianceSummary>('/observability/sla-compliance/')
  return res.data
}

export async function getQuietProjects(): Promise<QuietProject[]> {
  const res = await api.get<QuietProject[]>('/observability/quiet-projects/')
  return res.data
}

export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  const res = await api.get<SecurityEvent[]>('/observability/security-events/')
  return res.data
}
