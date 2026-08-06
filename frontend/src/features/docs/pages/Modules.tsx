import { DocsLayout } from '../DocsLayout'
import { Callout, DocsH1, DocsH2, DocsLead, DocsLink, DocsP, InlineCode } from '../DocsUI'
import { usePageMeta } from '../../../lib/pageMeta'

const DESCRIPTION =
  'Reference for every Truepoint module: Owner Dashboard, Approvals, Trust & Evidence, RFI & Change Control, Contract & Payments, Drawings Studio, Handover, Access Control, Observability, and the Platform API.'

const TOC = [
  { id: 'dashboard', label: 'Owner Dashboard' },
  { id: 'approvals', label: 'Approvals (3 Edges)' },
  { id: 'trust-evidence', label: 'Trust & Evidence' },
  { id: 'rfi', label: 'RFI & Change Control' },
  { id: 'contract-payments', label: 'Contract & Payments' },
  { id: 'drawings-studio', label: 'Drawings Studio' },
  { id: 'handover', label: 'Handover' },
  { id: 'access-control', label: 'Access Control' },
  { id: 'observability', label: 'Observability' },
  { id: 'platform-api', label: 'Platform API' },
]

function Module({ id, name, prefix, children }: { id: string; name: string; prefix: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-[var(--radius-m)] border border-cream/10 bg-cream/5 p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 id={id} className="scroll-mt-32 font-[var(--font-display)] text-lg font-bold text-cream">
          {name}
        </h3>
        <code className="font-[var(--font-mono)] text-xs text-cream/40">{prefix}</code>
      </div>
      <div className="text-sm leading-relaxed text-text-navy-muted">{children}</div>
    </div>
  )
}

export function ModulesPage() {
  usePageMeta({
    title: 'Module reference',
    description: DESCRIPTION,
    path: '/docs/modules',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'Module reference',
      description: DESCRIPTION,
      url: 'https://truepoint.sa/docs/modules',
    },
  })
  return (
    <DocsLayout toc={TOC}>
      <DocsH1>Module reference</DocsH1>
      <DocsLead>
        A modular monolith - one Django project, one Postgres database, one app per module. No module imports
        another's models directly; every cross-module call goes through that module's own service layer.
      </DocsLead>

      <DocsH2 id="dashboard">Owner Dashboard</DocsH2>
      <Module id="dashboard-detail" name="Role-differentiated views" prefix="/api/v1/dashboard/">
        <DocsP>
          One data model, composed differently per role - never four parallel pipelines. Generates the "3 things
          need your decision" digest by reading Approvals' service layer, and tracks digest-open events for
          Observability's usage signal.
        </DocsP>
      </Module>

      <DocsH2 id="approvals">Approvals (3 Edges)</DocsH2>
      <Module id="approvals-detail" name="Decision workflow" prefix="/api/v1/approvals/">
        <DocsP>
          Owns <InlineCode>Decision</InlineCode>, <InlineCode>DecisionParticipant</InlineCode> (RACI), and the SLA
          escalation timer. Attaches to whatever it's deciding on - a change order, a punch-list item - via a generic
          reference, never a direct foreign key into that module.
        </DocsP>
      </Module>

      <DocsH2 id="trust-evidence">Trust & Evidence</DocsH2>
      <Module id="trust-evidence-detail" name="The verified record" prefix="/api/v1/trust-evidence/">
        <DocsP>
          Owns the audit log, the verified-milestone evidence ledger (a submission only counts once an
          owner/consultant explicitly verifies it), overdue-update silence detection, and the case-ready dispute
          export. Every other module writes here through <InlineCode>record_event()</InlineCode> - never to the
          table directly.
        </DocsP>
      </Module>

      <DocsH2 id="rfi">RFI, Change Order & Version Control</DocsH2>
      <Module id="rfi-detail" name="Tracked documents" prefix="/api/v1/rfi-change-control/">
        <DocsP>
          RFIs, submittals, change orders, permits, supplier deliveries, quality checkpoints - all on the shared
          document lifecycle. RFIs carry a schedule-impact-if-unanswered flag feeding a live at-risk view; change
          orders require structured scope/cost/schedule fields, rejecting free text alone.
        </DocsP>
      </Module>

      <DocsH2 id="contract-payments">Contract & Payments</DocsH2>
      <Module id="contract-payments-detail" name="Evidence-gated money" prefix="/api/v1/contract-payments/">
        <DocsP>
          One contract per project, payment milestones released only when their linked evidence is verified in
          Trust &amp; Evidence (the release is idempotent and emits a <InlineCode>payment.released</InlineCode>{' '}
          webhook), ZATCA-ready invoices, versioned amendments, a contract-vs-actual rollup fed by approved change
          orders, and a ceiling-breach check. Includes the RAG legal agent: contract documents are chunked and
          embedded (pgvector) so owners/consultants can ask compliance questions grounded in the actual contract
          text. Financial reads are restricted by role.
        </DocsP>
      </Module>

      <DocsH2 id="drawings-studio">Drawings Studio</DocsH2>
      <Module id="drawings-studio-detail" name="2D/3D model viewer" prefix="/api/v1/drawings-studio/">
        <DocsP>
          Upload and view 3D models (glTF, OBJ, STL and other mesh formats, size-capped and extension-validated)
          with measuring, sectioning and snapping tools, plus parametric primitives for quick massing studies.
          Deleting a model is restricted to its uploader or a project owner/admin.
        </DocsP>
      </Module>

      <DocsH2 id="handover">Handover & Post-Handover</DocsH2>
      <Module id="handover-detail" name="Closeout & the 10-year window" prefix="/api/v1/handover/">
        <DocsP>
          Punch-list items scoped to a unit/zone, closed only through Approvals' sign-off flow. Post-handover
          defects stay open and queryable for the full Saudi decennial liability window, computed from the recorded
          practical-completion date.
        </DocsP>
      </Module>

      <DocsH2 id="access-control">Security & Access Control</DocsH2>
      <Module id="access-control-detail" name="RBAC, roster, compliance" prefix="/api/v1/accounts/">
        <DocsP>
          The single RBAC source of truth every other module's permission check calls into. Owns roster
          add/reassign/remove (each written as an audit event), and the data-retention/residency policy per
          project.
        </DocsP>
      </Module>

      <DocsH2 id="observability">Monitoring & Observability</DocsH2>
      <Module id="observability-detail" name="Truepoint-internal only" prefix="/api/v1/observability/">
        <DocsP>
          Integration health, SLA-compliance aggregation across every project, usage/adoption signal, internal
          alerting, and security/incident events - gated on <InlineCode>is_staff</InlineCode>, not project role.
          Distinct from the customer-facing dashboard above.
        </DocsP>
      </Module>

      <DocsH2 id="platform-api">Platform API & Documentation</DocsH2>
      <Module id="platform-api-detail" name="The public facade" prefix="/api/public/v1/">
        <DocsP>
          API keys, webhook subscriptions/delivery, and this public facade are all owned here - a thin,
          access-scoped wrapper that calls each module's own service layer, never its models. See{' '}
          <DocsLink to="/docs/api">Public API</DocsLink>.
        </DocsP>
      </Module>

      <Callout type="warn" label="Not built yet">
        Two capabilities named in the source research are explicitly not built: AI/computer-vision progress
        estimation from site photos, and weather-data auto-tagging for delay claims. Both are flagged in the product
        research as "solved in research, unbuilt in product" - real gaps, not hidden behind a fake UI.
      </Callout>
    </DocsLayout>
  )
}
