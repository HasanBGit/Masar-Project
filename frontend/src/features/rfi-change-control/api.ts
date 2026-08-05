import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type {
  ChangeOrder,
  CoordinationMessage,
  CoordinationThread,
  MasterScheduleItem,
  Permit,
  QualityCheckpoint,
  RFI,
  Submittal,
  SupplierDelivery,
} from '../../lib/types'

export async function listRFIs(project: number): Promise<RFI[]> {
  const res = await api.get<Paginated<RFI>>('/rfi-change-control/rfis/', { params: { project } })
  return unwrapList(res.data)
}

export async function getAtRiskRFIs(project: number): Promise<RFI[]> {
  const res = await api.get<RFI[]>('/rfi-change-control/rfis/at-risk/', { params: { project } })
  return res.data
}

export async function createRFI(payload: {
  project: number
  title: string
  question: string
  sla_deadline: string
  schedule_impact_days?: number
  location_tag?: string
}): Promise<RFI> {
  const res = await api.post<RFI>('/rfi-change-control/rfis/', payload)
  return res.data
}

export async function respondToRFI(id: number, response: string): Promise<RFI> {
  const res = await api.post<RFI>(`/rfi-change-control/rfis/${id}/respond/`, { response })
  return res.data
}

export async function listChangeOrders(project: number): Promise<ChangeOrder[]> {
  const res = await api.get<Paginated<ChangeOrder>>('/rfi-change-control/change-orders/', { params: { project } })
  return unwrapList(res.data)
}

export async function createChangeOrder(payload: {
  project: number
  title: string
  baseline_scope: string
  scope_delta: string
  cost_impact: string
  schedule_impact_days: number
  evidence_ref?: string
}): Promise<ChangeOrder> {
  const res = await api.post<ChangeOrder>('/rfi-change-control/change-orders/', payload)
  return res.data
}

export async function listCoordinationThreads(project: number): Promise<CoordinationThread[]> {
  const res = await api.get<Paginated<CoordinationThread>>('/rfi-change-control/coordination-threads/', { params: { project } })
  return unwrapList(res.data)
}

export async function createCoordinationThread(payload: {
  project: number
  title: string
  location_tag?: string
}): Promise<CoordinationThread> {
  const res = await api.post<CoordinationThread>('/rfi-change-control/coordination-threads/', payload)
  return res.data
}

export async function postCoordinationMessage(threadId: number, body: string): Promise<CoordinationMessage> {
  const res = await api.post<CoordinationMessage>(`/rfi-change-control/coordination-threads/${threadId}/messages/`, { body })
  return res.data
}

export async function getMasterSchedule(project: number): Promise<MasterScheduleItem[]> {
  const res = await api.get<MasterScheduleItem[]>('/rfi-change-control/master-schedule/', { params: { project } })
  return res.data
}

export async function listSubmittals(project: number): Promise<Submittal[]> {
  const res = await api.get<Paginated<Submittal>>('/rfi-change-control/submittals/', { params: { project } })
  return unwrapList(res.data)
}

export async function createSubmittal(payload: {
  project: number
  title: string
  spec_section: string
  description?: string
}): Promise<Submittal> {
  const res = await api.post<Submittal>('/rfi-change-control/submittals/', payload)
  return res.data
}

export async function listPermits(project: number): Promise<Permit[]> {
  const res = await api.get<Paginated<Permit>>('/rfi-change-control/permits/', { params: { project } })
  return unwrapList(res.data)
}

export async function createPermit(payload: {
  project: number
  title: string
  authority: string
  permit_number: string
}): Promise<Permit> {
  const res = await api.post<Permit>('/rfi-change-control/permits/', payload)
  return res.data
}

export async function listSupplierDeliveries(project: number): Promise<SupplierDelivery[]> {
  const res = await api.get<Paginated<SupplierDelivery>>('/rfi-change-control/supplier-deliveries/', { params: { project } })
  return unwrapList(res.data)
}

export async function createSupplierDelivery(payload: {
  project: number
  material: string
  supplier_name: string
  committed_date: string
}): Promise<SupplierDelivery> {
  const res = await api.post<SupplierDelivery>('/rfi-change-control/supplier-deliveries/', payload)
  return res.data
}

export async function listQualityCheckpoints(project: number): Promise<QualityCheckpoint[]> {
  const res = await api.get<Paginated<QualityCheckpoint>>('/rfi-change-control/quality-checkpoints/', { params: { project } })
  return unwrapList(res.data)
}

export async function createQualityCheckpoint(payload: {
  project: number
  title: string
  milestone_ref?: string
  location_tag?: string
}): Promise<QualityCheckpoint> {
  const res = await api.post<QualityCheckpoint>('/rfi-change-control/quality-checkpoints/', payload)
  return res.data
}
