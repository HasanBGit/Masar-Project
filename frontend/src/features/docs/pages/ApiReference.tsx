import { DocsLayout } from '../DocsLayout'
import { Callout, CodeBlock, DocsExternalLink, DocsH1, DocsH2, DocsLead, DocsLink, DocsP, Endpoint, InlineCode } from '../DocsUI'
import { usePageMeta } from '../../../lib/pageMeta'

const TOC = [
  { id: 'auth', label: 'Authentication' },
  { id: 'issuing-keys', label: 'Issuing a key' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'scoping', label: 'Scoping' },
  { id: 'interactive', label: 'Interactive reference' },
]

const DESCRIPTION =
  'Authenticate with an API key and pull project data (approvals, evidence, activity) into your own BI or ERP tooling via the versioned public API.'

export function ApiReferencePage() {
  usePageMeta({
    title: 'Public API',
    description: DESCRIPTION,
    path: '/docs/api',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'Public API',
      description: DESCRIPTION,
      url: 'https://truepoint.sa/docs/api',
    },
  })
  return (
    <DocsLayout toc={TOC}>
      <DocsH1>Public API</DocsH1>
      <DocsLead>
        A versioned, access-scoped facade over your project's data - for pulling Truepoint data into your own BI or
        ERP tooling instead of Truepoint being a dead-end silo.
      </DocsLead>

      <DocsH2 id="auth">Authentication</DocsH2>
      <DocsP>
        The public API is authenticated by API key only - never by the session/JWT tokens the main app uses. Send it
        in the <InlineCode>Authorization</InlineCode> header:
      </DocsP>
      <CodeBlock label="request">{`GET /api/public/v1/projects/1/approvals/ HTTP/1.1
Host: your-truepoint-instance
Authorization: ApiKey tpk_9vCeZVjWg2MqDGMkmBkidQwDH83RWpE7dfwq84leJds`}</CodeBlock>

      <DocsH2 id="issuing-keys">Issuing a key</DocsH2>
      <DocsP>
        You can't fetch your first key with a key - issuance happens through the normal authenticated app. Go to{' '}
        <DocsLink to="/platform-api">Platform API</DocsLink> as a project owner/admin, choose a scope and rate tier,
        and copy the raw key - it's shown exactly once.
      </DocsP>
      <Callout type="warn">
        The raw key is never stored - only its SHA-256 hash. If you lose it, revoke it and issue a new one.
      </Callout>

      <DocsH2 id="endpoints">Endpoints</DocsH2>

      <Endpoint method="GET" path="/api/public/v1/projects/{'{'}project_id{'}'}/approvals/">
        Every decision on the project, for any key scoped to that project.
      </Endpoint>

      <Endpoint method="GET" path="/api/public/v1/projects/{'{'}project_id{'}'}/evidence/">
        The verified milestone ledger - every evidence record submitted for the project, verified or pending.
      </Endpoint>

      <Endpoint method="GET" path="/api/public/v1/projects/{'{'}project_id{'}'}/activity/">
        A chronological activity feed derived from the audit log. Not the full unified project timeline (a separate,
        unbuilt module) - just the event stream this API can honestly provide today.
      </Endpoint>

      <DocsH2 id="scoping">Scoping</DocsH2>
      <DocsP>Every key is scoped two ways, checked on every request:</DocsP>
      <CodeBlock label="response - wrong project">{`{
  "detail": "This key is not scoped to the requested project."
}`}</CodeBlock>
      <DocsP>
        <strong>Project</strong> - a key issued for project 1 gets a 403 on any other project's data.{' '}
        <strong>Role scope</strong> (owner / consultant / project_manager / designer) - labels which project role
        the key represents, for the caller's own bookkeeping.
      </DocsP>
      <DocsP>
        Rate limits are enforced per key, keyed off the key itself (not IP), at{' '}
        <InlineCode>standard</InlineCode> (100/hour) or <InlineCode>partner</InlineCode> (1000/hour) tier, set at
        issuance.
      </DocsP>

      <DocsH2 id="interactive">Interactive reference</DocsH2>
      <DocsP>
        This page covers the concepts; for a live, try-it-yourself request builder generated straight from the
        running schema, use <DocsExternalLink href="/api/docs/">Swagger UI</DocsExternalLink> or{' '}
        <DocsExternalLink href="/api/redoc/">Redoc</DocsExternalLink>.
      </DocsP>
    </DocsLayout>
  )
}
