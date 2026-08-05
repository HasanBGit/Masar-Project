import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type { AuditLogEntry, ComplianceStatus, Role, RosterEntry } from '../../lib/types'

export async function listRoster(project: number): Promise<RosterEntry[]> {
  const res = await api.get<Paginated<RosterEntry>>('/accounts/roster/', { params: { project } })
  return unwrapList(res.data)
}

export async function addRosterMember(project: number, userId: number, role: Role): Promise<RosterEntry> {
  const res = await api.post<RosterEntry>('/accounts/roster/', { project, user: userId, role })
  return res.data
}

export async function reassignRosterMember(id: number, role: Role): Promise<RosterEntry> {
  const res = await api.patch<RosterEntry>(`/accounts/roster/${id}/`, { role })
  return res.data
}

export async function removeRosterMember(id: number): Promise<void> {
  await api.delete(`/accounts/roster/${id}/`)
}

export async function getComplianceStatus(project: number): Promise<ComplianceStatus> {
  const res = await api.get<ComplianceStatus>('/accounts/compliance/', { params: { project } })
  return res.data
}

export async function updateRetentionPolicy(project: number, payload: Partial<{ retention_years: number; data_residency_region: string }>): Promise<ComplianceStatus> {
  const res = await api.patch<ComplianceStatus>('/accounts/compliance/', { project, ...payload })
  return res.data
}

export async function getAuditLog(project: number): Promise<AuditLogEntry[]> {
  const res = await api.get<AuditLogEntry[]>('/accounts/audit-log/', { params: { project } })
  return res.data
}

export async function findUserByEmail(email: string): Promise<{ id: number; email: string; full_name: string }[]> {
  const res = await api.get('/accounts/users/', { params: { email } })
  return res.data
}
