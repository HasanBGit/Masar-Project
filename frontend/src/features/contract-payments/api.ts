import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type {
  CeilingCheck,
  Contract,
  ContractAmendment,
  ContractVsActual,
  Invoice,
  LegalAgentAnswer,
  PaymentMilestone,
} from '../../lib/types'

export async function listContracts(project: number): Promise<Contract[]> {
  const res = await api.get<Paginated<Contract>>('/contract-payments/contracts/', { params: { project } })
  return unwrapList(res.data)
}

export async function createContract(payload: {
  project: number
  title: string
  contract_value: string
  scope_baseline: string
  currency?: string
  plain_arabic_summary?: string
  retention_percentage?: string
  ceiling_threshold_percentage?: string
}): Promise<Contract> {
  const res = await api.post<Contract>('/contract-payments/contracts/', payload)
  return res.data
}

export async function getContractVsActual(contractId: number): Promise<ContractVsActual> {
  const res = await api.get<ContractVsActual>(`/contract-payments/contracts/${contractId}/contract_vs_actual/`)
  return res.data
}

export async function getCeilingCheck(contractId: number, additionalAmount: string): Promise<CeilingCheck> {
  const res = await api.get<CeilingCheck>(`/contract-payments/contracts/${contractId}/ceiling_check/`, {
    params: { additional_amount: additionalAmount },
  })
  return res.data
}

export async function ingestLegalAgent(contractId: number): Promise<{ chunks_indexed: number }> {
  const res = await api.post(`/contract-payments/contracts/${contractId}/legal-agent/ingest/`)
  return res.data
}

export async function askLegalAgent(contractId: number, question: string, language: 'en' | 'ar'): Promise<LegalAgentAnswer> {
  const res = await api.post<LegalAgentAnswer>(`/contract-payments/contracts/${contractId}/legal-agent/ask/`, {
    question,
    language,
  })
  return res.data
}

export async function listPaymentMilestones(project: number): Promise<PaymentMilestone[]> {
  const res = await api.get<Paginated<PaymentMilestone>>('/contract-payments/payment-milestones/', { params: { project } })
  return unwrapList(res.data)
}

export async function createPaymentMilestone(payload: {
  project: number
  contract: number
  name: string
  due_condition: string
  amount: string
}): Promise<PaymentMilestone> {
  const res = await api.post<PaymentMilestone>('/contract-payments/payment-milestones/', payload)
  return res.data
}

export async function releasePaymentMilestone(id: number): Promise<PaymentMilestone> {
  const res = await api.post<PaymentMilestone>(`/contract-payments/payment-milestones/${id}/release/`)
  return res.data
}

export async function listInvoices(project: number): Promise<Invoice[]> {
  const res = await api.get<Paginated<Invoice>>('/contract-payments/invoices/', { params: { project } })
  return unwrapList(res.data)
}

export async function listAmendments(project: number): Promise<ContractAmendment[]> {
  const res = await api.get<Paginated<ContractAmendment>>('/contract-payments/amendments/', { params: { project } })
  return unwrapList(res.data)
}

export async function requestContractAmendment(payload: {
  contract: number
  version_number: number
  summary: string
}): Promise<ContractAmendment> {
  const res = await api.post<ContractAmendment>('/contract-payments/amendments/', payload)
  return res.data
}
