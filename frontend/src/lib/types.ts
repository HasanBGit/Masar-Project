export type Role = 'owner' | 'consultant' | 'project_manager' | 'designer' | 'admin'

export type RaciRole = 'R' | 'A' | 'C' | 'I'

export type DecisionStatus = 'hearing' | 'understanding' | 'agreeing' | 'closed' | 'escalated'

export interface Me {
  id: number
  email: string
  full_name: string
  preferred_language: 'en' | 'ar'
  is_staff: boolean
}

export interface Project {
  id: number
  name: string
  slug: string
  role: Role
}

export interface DecisionParticipant {
  id: number
  user: number
  user_name: string
  raci_role: RaciRole
}

export interface Decision {
  id: number
  project: number
  title: string
  description: string
  subject_type: string
  high_stakes: boolean
  status: DecisionStatus
  sla_deadline: string
  is_overdue: boolean
  hearing_confirmed_at: string | null
  understanding_text: string
  understanding_confirmed_at: string | null
  agreement_confirmed_at: string | null
  fallback_approver_name: string | null
  participants: DecisionParticipant[]
  my_raci_role: RaciRole | null
  created_at: string
}

export interface DashboardStats {
  total: number
  pending: number
  overdue: number
  high_stakes_pending: number
  closed: number
}

export interface DashboardSummary {
  role: Role
  project: Project
  stats: DashboardStats
  digest: Decision[]
  decisions: Decision[]
}

// --- Trust & Evidence (Module 5) ---

export interface EvidenceRecord {
  id: number
  project: number
  subject_type: string
  subject_id: string
  submitted_by: number
  submitted_by_name: string
  caption: string
  media_url: string
  latitude: string | null
  longitude: string | null
  captured_at: string
  verified: boolean
  verified_by: number | null
  verified_by_name: string | null
  verified_at: string | null
  created_at: string
}

export interface SilenceFlag {
  id: number
  project: number
  subject_type: string
  subject_id: string
  expected_by: string
  flagged_at: string
  resolved: boolean
  resolved_at: string | null
}

export interface DisputeExportEvent {
  id: number
  timestamp: string
  actor: string | null
  actor_role: string
  event_type: string
  channel: string
  subject_type: string
  subject_id: string
  payload: Record<string, unknown>
  source_message_ref: string | null
}

export interface ChangeOrderRollup {
  count: number
  cumulative_cost_impact: number
  cumulative_schedule_impact_days: number
}

// --- RFI, Change Order & Version Control (Module 6) ---

export type DocumentStatus = 'draft' | 'under_review' | 'approved' | 'superseded' | 'archived'

export interface RFI {
  id: number
  project: number
  number: string
  title: string
  question: string
  response: string
  schedule_impact_days: number
  location_tag: string
  raised_by: number
  raised_by_name: string
  status: DocumentStatus
  sla_deadline: string
  is_overdue: boolean
  created_at: string
}

export interface ChangeOrder {
  id: number
  project: number
  title: string
  baseline_scope: string
  scope_delta: string
  cost_impact: string
  schedule_impact_days: number
  evidence_ref: string
  raised_by: number
  raised_by_name: string
  status: DocumentStatus
  created_at: string
}

export interface CoordinationMessage {
  id: number
  thread: number
  author: number
  author_name: string
  body: string
  created_at: string
}

export interface CoordinationThread {
  id: number
  project: number
  location_tag: string
  title: string
  created_by: number
  created_by_name: string
  messages: CoordinationMessage[]
  created_at: string
}

export interface Submittal {
  id: number
  project: number
  title: string
  spec_section: string
  description: string
  revision_number: number
  current_as_of: string
  submitted_by: number
  status: DocumentStatus
  created_at: string
}

export interface Permit {
  id: number
  project: number
  title: string
  authority: string
  permit_number: string
  current_as_of: string
  status: DocumentStatus
  created_at: string
}

export interface SupplierDelivery {
  id: number
  project: number
  material: string
  supplier_name: string
  committed_date: string
  status: DocumentStatus
  is_overdue: boolean
  created_at: string
}

export interface QualityCheckpoint {
  id: number
  project: number
  title: string
  milestone_ref: string
  location_tag: string
  inspector: number
  inspector_name: string
  status: DocumentStatus
  created_at: string
}

export interface MasterScheduleItem {
  type: string
  id: number
  title: string
  date: string
  status: string
}

// --- Handover & Post-Handover (Module 7) ---

export type PunchListStatus = 'open' | 'pending_signoff' | 'verified_closed'
export type DefectStatus = 'reported' | 'acknowledged' | 'resolved'

export interface HandoverRecord {
  id: number
  project: number
  practical_completion_date: string
  decennial_liability_expires_at: string
  recorded_by: number
  within_liability_window: boolean
}

export interface PunchListItem {
  id: number
  project: number
  unit_or_zone: string
  title: string
  description: string
  raised_by: number
  raised_by_name: string
  status: PunchListStatus
  assigned_approver: number | null
  assigned_approver_name: string | null
  created_at: string
}

export interface OMChecklistItem {
  id: number
  project: number
  category: string
  description_en: string
  description_ar: string
  document_ref: string
  installed_verified: boolean
  verified_by: number | null
  verified_by_name: string | null
  verified_at: string | null
  created_at: string
}

export interface PostHandoverDefect {
  id: number
  project: number
  unit_or_zone: string
  title: string
  description: string
  reported_by: number
  reported_by_name: string
  status: DefectStatus
  created_at: string
}

// --- Security, Access Control & Team Administration (Module 17) ---

export interface RosterEntry {
  id: number
  user: number
  user_name: string
  user_email: string
  project: number
  role: Role
  created_at: string
}

export interface ComplianceStatus {
  platform_data_residency_region: string
  project_data_residency_region: string
  residency_matches_platform: boolean
  retention_years: number
  pdpl_compliant: boolean
}

export interface AuditLogEntry {
  id: number
  created_at: string
  actor: string | null
  actor_role: string
  event_type: string
  channel: string
  subject_type: string
  subject_id: string
}

// --- Monitoring & Observability (Module 15) ---

export type IntegrationType = 'whatsapp_session' | 'email_oauth' | 'government_portal'
export type HealthStatus = 'healthy' | 'degraded' | 'down'

export interface IntegrationHealthCheck {
  id: number
  project: number | null
  project_name: string | null
  integration_type: IntegrationType
  status: HealthStatus
  last_checked_at: string
  last_error: string
  details: Record<string, unknown>
}

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface AlertEvent {
  id: number
  severity: AlertSeverity
  source: string
  message: string
  project: number | null
  project_name: string | null
  acknowledged: boolean
  acknowledged_by_name: string | null
  acknowledged_at: string | null
  created_at: string
}

export interface SlaComplianceSummary {
  total_decisions: number
  escalated_count: number
  escalation_rate: number
  currently_breached_unescalated: number
  closed_count: number
  avg_hours_to_close: number | null
}

export interface QuietProject {
  project_id: number
  project_name: string
  last_activity_at: string | null
}

export interface SecurityEvent {
  id: number
  created_at: string
  actor: string | null
  path: string | null
  detail: string | null
}

// --- Platform API & Documentation (Module 14) ---

export type ApiKeyScope = 'owner' | 'consultant' | 'project_manager' | 'designer'
export type ApiKeyTier = 'standard' | 'partner'

export interface APIKey {
  id: number
  project: number
  label: string
  scope: ApiKeyScope
  tier: ApiKeyTier
  key_prefix: string
  is_active: boolean
  created_at: string
  revoked_at: string | null
  raw_key?: string
}

export interface WebhookSubscription {
  id: number
  project: number
  target_url: string
  event_types: string[]
  is_active: boolean
  created_at: string
}

export type WebhookDeliveryStatus = 'success' | 'failed' | 'dead_letter'

export interface WebhookDelivery {
  id: number
  subscription: number
  event_type: string
  status: WebhookDeliveryStatus
  attempt_count: number
  last_attempted_at: string | null
  last_response_code: number | null
  last_error: string
}

// --- Contract & Payment Verification (Module 12) ---

export interface Contract {
  id: number
  project: number
  title: string
  contract_value: string
  currency: string
  scope_baseline: string
  source_file: string | null
  status: DocumentStatus
  plain_arabic_summary: string
  retention_percentage: string
  ceiling_threshold_percentage: string
  created_at: string
}

export type PaymentMilestoneStatus = 'pending' | 'released'

export interface PaymentMilestone {
  id: number
  contract: number
  project: number
  name: string
  due_condition: string
  amount: string
  retention_held: string
  status: PaymentMilestoneStatus
  released_at: string | null
  released_by: number | null
  created_at: string
}

export type ZatcaInvoiceStatus = 'not_configured' | 'pending_submission' | 'cleared' | 'rejected'

export interface Invoice {
  id: number
  milestone: number
  zatca_status: ZatcaInvoiceStatus
  xml_payload: string
  qr_code_data: string
  submitted_to_zatca_at: string | null
  created_at: string
}

export interface ContractAmendment {
  id: number
  contract: number
  version_number: number
  summary: string
  decision_id: number | null
  document_file: string | null
  created_at: string
}

export interface ContractVsActual {
  has_contract: boolean
  original_contract_value?: string
  approved_change_order_total?: string
  adjusted_contract_value?: string
  paid_to_date?: string
  remaining_balance?: string
}

export interface CeilingCheck {
  has_contract: boolean
  would_breach: boolean
  ceiling?: string
  projected_total?: string
}

export interface LegalAgentSource {
  source_ref: string
  excerpt: string
}

export interface LegalAgentAnswer {
  answer: string
  sources: LegalAgentSource[]
  language: 'en' | 'ar'
}

// --- Drawings Studio ---

export type DrawingModelFormat = 'obj' | '3ds' | 'dae' | 'fbx' | 'lwo' | 'stl' | 'ply' | 'gltf' | 'glb' | 'usd' | 'usdz'

export interface DrawingModel {
  id: number
  project: number
  name: string
  file: string
  format: DrawingModelFormat
  uploaded_by: number
  uploaded_by_name: string
  created_at: string
}
