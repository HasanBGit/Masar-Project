import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type { ChangeOrderRollup, DisputeExportEvent, EvidenceRecord, SilenceFlag } from '../../lib/types'

export async function listEvidence(project: number, subjectType?: string, subjectId?: string): Promise<EvidenceRecord[]> {
  const res = await api.get<Paginated<EvidenceRecord>>('/trust-evidence/evidence/', {
    params: { project, subject_type: subjectType, subject_id: subjectId },
  })
  return unwrapList(res.data)
}

export async function submitEvidence(payload: {
  project: number
  subject_type: string
  subject_id: string
  caption: string
  captured_at: string
  media_url?: string
  latitude?: number
  longitude?: number
}): Promise<EvidenceRecord> {
  const res = await api.post<EvidenceRecord>('/trust-evidence/evidence/', payload)
  return res.data
}

export async function verifyEvidence(id: number): Promise<EvidenceRecord> {
  const res = await api.post<EvidenceRecord>(`/trust-evidence/evidence/${id}/verify/`)
  return res.data
}

export async function listSilenceFlags(project: number): Promise<SilenceFlag[]> {
  const res = await api.get<Paginated<SilenceFlag>>('/trust-evidence/silence-flags/', { params: { project } })
  return unwrapList(res.data)
}

export async function getDisputeExport(project: number): Promise<{ project: string; events: DisputeExportEvent[] }> {
  const res = await api.get('/trust-evidence/dispute-export/', { params: { project } })
  return res.data
}

export async function getChangeOrderRollup(project: number): Promise<ChangeOrderRollup> {
  const res = await api.get<ChangeOrderRollup>('/trust-evidence/change-order-rollup/', { params: { project } })
  return res.data
}
