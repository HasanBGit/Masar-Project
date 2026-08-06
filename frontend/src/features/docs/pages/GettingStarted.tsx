import { DocsLayout } from '../DocsLayout'
import { Callout, CodeBlock, DocsH1, DocsH2, DocsLead, DocsLink, DocsP, DocsTable, DocsUl, InlineCode } from '../DocsUI'
import { usePageMeta } from '../../../lib/pageMeta'

const TOC = [
  { id: 'what-is-truepoint', label: 'What is Truepoint' },
  { id: 'demo-accounts', label: 'Demo accounts' },
  { id: 'auth-first-call', label: 'Authenticate & first API call' },
  { id: 'roles', label: 'Roles' },
  { id: 'next-steps', label: 'Next steps' },
]

const DESCRIPTION =
  'How to use Truepoint: demo accounts, authenticating against the versioned REST API, and the role model every module enforces.'

export function GettingStartedPage() {
  usePageMeta({
    title: 'Introduction',
    description: DESCRIPTION,
    path: '/docs',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'Introduction to Truepoint',
      description: DESCRIPTION,
      url: 'https://truepoint.sa/docs',
    },
  })
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
        every claim of "done" is backed by verified, timestamped evidence, and every role - Owner, Consultant,
        Project Manager, Designer - sees a view of the project shaped for what they actually need to act on.
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
          ['consultant@truepoint.sa', 'Consultant', 'Reviews and approves PM/Designer work; can verify evidence.'],
          ['pm@truepoint.sa', 'Project Manager', "Their own action queue - site reports, payment tasks, RFIs."],
          ['designer@truepoint.sa', 'Designer', "Their own action queue - drawings and design-review decisions."],
          ['ops@truepoint.sa', 'Truepoint internal (staff)', 'The Observability dashboard - nobody else can see this.'],
        ]}
      />
      <CodeBlock label="password">demo1234</CodeBlock>

      <DocsH2 id="auth-first-call">Authenticate &amp; first API call</DocsH2>
      <DocsP>
        The app API is versioned under <InlineCode>/api/v1/</InlineCode> and authenticated with short-lived JWTs.
        Obtain a token pair with your email + password, then send the access token as a Bearer header. Token
        endpoints are rate-limited against brute force.
      </DocsP>
      <CodeBlock label="1 - obtain tokens">{`POST /api/v1/auth/token/
Content-Type: application/json

{ "email": "owner@truepoint.sa", "password": "demo1234" }

-> { "access": "<jwt>", "refresh": "<jwt>" }`}</CodeBlock>
      <CodeBlock label="2 - call the API">{`GET /api/v1/accounts/me/
Authorization: Bearer <access>

GET /api/v1/accounts/projects/          # your project memberships
GET /api/v1/dashboard/summary/?project=1  # role-shaped dashboard`}</CodeBlock>
      <CodeBlock label="3 - refresh when the access token expires">{`POST /api/v1/auth/token/refresh/
{ "refresh": "<refresh>" }

-> { "access": "<new jwt>" }`}</CodeBlock>
      <DocsP>
        List endpoints are DRF-paginated (<InlineCode>{'{ count, next, previous, results }'}</InlineCode>);
        validation errors return per-field messages with status 400, missing objects 404, and permission failures
        403 - the same shapes this app's UI consumes. The full machine-readable schema lives at{' '}
        <InlineCode>/api/schema/</InlineCode> with interactive browsers at <InlineCode>/api/docs/</InlineCode>{' '}
        (Swagger) and <InlineCode>/api/redoc/</InlineCode>.
      </DocsP>

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
          <strong>Consultant</strong> - reviews and approves Project Manager/Designer work; typically the
          independent verifier (PMC role) on evidence.
        </li>
        <li>
          <strong>Project Manager</strong> - the party usually Responsible on site-report/payment decisions and
          raising RFIs/evidence.
        </li>
        <li>
          <strong>Designer</strong> - the party usually Responsible on design-review decisions and drawing
          submittals.
        </li>
        <li>
          <strong>Admin</strong> - Truepoint-internal, same elevated rights as Owner plus the Observability dashboard
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
          <DocsLink to="/docs/modules">Module reference</DocsLink> - what each of the 10 modules owns and how they
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
