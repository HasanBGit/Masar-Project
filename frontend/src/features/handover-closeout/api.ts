import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type { HandoverRecord, OMChecklistItem, PostHandoverDefect, PunchListItem } from '../../lib/types'

export { listRoster } from '../access-control-admin/api'
export type { RosterEntry } from '../../lib/types'

export async function getHandoverRecord(project: number): Promise<HandoverRecord | null> {
  const res = await api.get<HandoverRecord | null>('/handover/record/', { params: { project } })
  return res.data
}

export async function listPunchList(project: number, unitOrZone?: string): Promise<PunchListItem[]> {
  const res = await api.get<Paginated<PunchListItem>>('/handover/punch-list/', { params: { project, unit_or_zone: unitOrZone } })
  return unwrapList(res.data)
}

export async function createPunchListItem(payload: {
  project: number
  unit_or_zone: string
  title: string
  description?: string
}): Promise<PunchListItem> {
  const res = await api.post<PunchListItem>('/handover/punch-list/', payload)
  return res.data
}

export async function requestPunchListSignoff(id: number, accountableUserId: number): Promise<PunchListItem> {
  const res = await api.post<PunchListItem>(`/handover/punch-list/${id}/request-signoff/`, { accountable_user: accountableUserId })
  return res.data
}

export async function listOMChecklist(project: number): Promise<OMChecklistItem[]> {
  const res = await api.get<Paginated<OMChecklistItem>>('/handover/om-checklist/', { params: { project } })
  return unwrapList(res.data)
}

export async function verifyOMItem(id: number): Promise<OMChecklistItem> {
  const res = await api.post<OMChecklistItem>(`/handover/om-checklist/${id}/verify/`)
  return res.data
}

export async function listDefects(project: number): Promise<PostHandoverDefect[]> {
  const res = await api.get<Paginated<PostHandoverDefect>>('/handover/post-handover-defects/', { params: { project } })
  return unwrapList(res.data)
}

export async function reportDefect(payload: {
  project: number
  unit_or_zone: string
  title: string
  description?: string
}): Promise<PostHandoverDefect> {
  const res = await api.post<PostHandoverDefect>('/handover/post-handover-defects/', payload)
  return res.data
}

export async function acknowledgeDefect(id: number): Promise<PostHandoverDefect> {
  const res = await api.post<PostHandoverDefect>(`/handover/post-handover-defects/${id}/acknowledge/`)
  return res.data
}

export async function resolveDefect(id: number): Promise<PostHandoverDefect> {
  const res = await api.post<PostHandoverDefect>(`/handover/post-handover-defects/${id}/resolve/`)
  return res.data
}
