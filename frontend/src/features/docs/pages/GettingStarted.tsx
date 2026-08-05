import { DocsLayout } from '../DocsLayout'
import { Callout, CodeBlock, DocsH1, DocsH2, DocsLead, DocsLink, DocsP, DocsTable, DocsUl, InlineCode } from '../DocsUI'

const TOC = [
  { id: 'what-is-truepoint', label: 'What is Truepoint' },
  { id: 'demo-accounts', label: 'Demo accounts' },
  { id: 'roles', label: 'Roles' },
  { id: 'next-steps', label: 'Next steps' },
]

export function GettingStartedPage() {
  return (
    <DocsLayout toc={TOC}>
      <DocsH1>Introduction</DocsH1>
      <DocsLead>
        Truepoint unifies fragmented construction-project communication into a single, owner-facing, trust-verified
        project record. This is the internal engineering + integration reference for the app you're logged into.
      </DocsLead>

      <DocsH2 id="what-is-truepoint">What is Truepoint</DocsH2>
      <DocsP>
        Every project decision goes through a structured 3-step approval flow (Hearing → Understanding → Agreeing),
        every claim of "done" is backed by verified, timestamped evidence, and every role - Owner, Investor,
        Consultant, Contractor - sees a view of the project shaped for what they actually need to act on.
      </DocsP>
      <DocsP>
        The backend is a Django + DRF modular monolith on PostgreSQL; the app you're using now is a React/TypeScript
        SPA talking to it over a versioned REST API. A separate, API-key-authenticated public API lets partner
        integrations (ERP, BI tools) pull the same data without a login session - see{' '}
        <DocsLink to="/docs/api">Public API</DocsLink>.
      </DocsP>

      <DocsH2 id="demo-accounts">Demo accounts</DocsH2>
      <DocsP>Every demo account uses the password below. Each one lands on a differently-shaped dashboard.</DocsP>
      <DocsTable
        head={['Email', 'Role', 'What they see']}
        rows={[
          ['owner@truepoint.sa', 'Owner', 'Full project visibility - every decision, every module.'],
          ['investor@truepoint.sa', 'Investor', 'Aggregate signal only - high-stakes decisions, no operational detail.'],
          ['consultant@truepoint.sa', 'Consultant', 'Decisions where they hold a RACI role; can verify evidence.'],
          ['contractor@truepoint.sa', 'Contractor', "Their own action queue - what's assigned to them."],
          ['ops@truepoint.sa', 'San3 internal (staff)', 'The Observability dashboard - nobody else can see this.'],
        ]}
      />
      <CodeBlock label="password">demo1234</CodeBlock>

      <DocsH2 id="roles">Roles</DocsH2>
      <DocsP>
        Roles are assigned per project via <InlineCode>ProjectMembership</InlineCode> (see{' '}
        <DocsLink to="/docs/modules">Access Control</DocsLink>) and are the single source of truth every module's
        permission check defers to - no module reimplements its own role logic.
      </DocsP>
      <DocsUl>
        <li>
          <strong>Owner</strong> - full visibility, can manage the roster, verify evidence, record practical
          completion.
        </li>
        <li>
          <strong>Investor</strong> - read-only, redacted to aggregate/high-stakes signal.
        </li>
        <li>
          <strong>Consultant</strong> - typically the independent verifier (PMC role) on evidence.
        </li>
        <li>
          <strong>Contractor</strong> - the party usually Responsible on decisions and raising RFIs/evidence.
        </li>
        <li>
          <strong>Admin</strong> - San3-internal, same elevated rights as Owner plus the Observability dashboard
          (gated on a separate <InlineCode>is_staff</InlineCode> flag, not project role).
        </li>
      </DocsUl>

      <Callout type="tip">
        Role differentiation isn't four parallel data pipelines - every view is generated from the same underlying
        data, filtered and composed per role. See <DocsLink to="/docs/concepts">Core concepts</DocsLink> for how
        that's enforced.
      </Callout>

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <DocsUl>
        <li>
          <DocsLink to="/docs/concepts">Core concepts</DocsLink> - the 3 Edges decision model, RACI, and the document
          lifecycle every tracked object shares.
        </li>
        <li>
          <DocsLink to="/docs/modules">Module reference</DocsLink> - what each of the 8 modules owns and how they
          call into each other.
        </li>
        <li>
          <DocsLink to="/docs/api">Public API</DocsLink> - authenticate with an API key and pull project data into
          your own tools.
        </li>
      </DocsUl>
    </DocsLayout>
  )
}
