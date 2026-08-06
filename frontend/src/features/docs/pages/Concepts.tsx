import { DocsLayout } from '../DocsLayout'
import { Callout, DocsH1, DocsH2, DocsLead, DocsP, DocsTable, DocsUl, InlineCode } from '../DocsUI'
import { usePageMeta } from '../../../lib/pageMeta'

const TOC = [
  { id: 'three-edges', label: 'The 3 Edges' },
  { id: 'raci', label: 'RACI' },
  { id: 'document-lifecycle', label: 'Document lifecycle' },
  { id: 'audit-log', label: 'The audit log' },
  { id: 'residency', label: 'Data residency & retention' },
]

const DESCRIPTION =
  'The 3 Edges decision model (Hearing, Understanding, Agreeing), RACI roles, the shared document lifecycle, the audit log, and data residency in Truepoint.'

export function ConceptsPage() {
  usePageMeta({
    title: 'Core concepts',
    description: DESCRIPTION,
    path: '/docs/concepts',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'Core concepts',
      description: DESCRIPTION,
      url: 'https://truepoint.sa/docs/concepts',
    },
  })
  return (
    <DocsLayout toc={TOC}>
      <DocsH1>Core concepts</DocsH1>
      <DocsLead>The handful of ideas every module in Truepoint is built on top of.</DocsLead>

      <DocsH2 id="three-edges">The 3 Edges</DocsH2>
      <DocsP>
        Every approval-eligible item - a change order, a payment milestone, a punch-list closure - moves through
        three distinct states, borrowed in part from healthcare informed-consent practice:
      </DocsP>
      <DocsTable
        head={['Edge', 'What happens']}
        rows={[
          ['1. Hearing', 'The item enters a dedicated pending-decision queue - a clear signal distinct from another message scrolling past.'],
          ['2. Understanding', "The Accountable approver restates what they understood, in their own words - not a checkbox. A generic \"I agree\" is rejected server-side."],
          ['3. Agreeing', 'The Accountable approver signs off. This is the one signature that closes the loop - Consulted/Informed participants can\'t.'],
        ]}
      />
      <DocsP>
        Low-stakes items collapse Hearing + Agreeing into one step; Understanding is never silently skipped for
        anything high-stakes. An SLA countdown starts at Hearing and, on breach, automatically escalates to a
        fallback approver.
      </DocsP>
      <Callout type="info">
        Status values: <InlineCode>hearing</InlineCode> → <InlineCode>understanding</InlineCode> →{' '}
        <InlineCode>agreeing</InlineCode> → <InlineCode>closed</InlineCode>, or → <InlineCode>escalated</InlineCode> on
        SLA breach.
      </Callout>

      <DocsH2 id="raci">RACI</DocsH2>
      <DocsP>Every decision has a participant list, each tagged with exactly one role:</DocsP>
      <DocsUl>
        <li>
          <strong>Responsible (R)</strong> - does the work the decision is about.
        </li>
        <li>
          <strong>Accountable (A)</strong> - exactly one per decision, enforced at the database level (a partial
          unique constraint, not just an application check). Only this person's Understanding/Agreeing counts.
        </li>
        <li>
          <strong>Consulted (C)</strong> and <strong>Informed (I)</strong> - can see and comment, never block.
        </li>
      </DocsUl>

      <DocsH2 id="document-lifecycle">Document lifecycle</DocsH2>
      <DocsP>
        RFIs, submittals, change orders, permits, supplier deliveries, and quality checkpoints all share one status
        enum rather than each reinventing it:
      </DocsP>
      <DocsTable
        head={['Status', 'Meaning']}
        rows={[
          ['draft', 'Not yet live.'],
          ['under_review', 'Active - this is where an RFI sits while awaiting a response.'],
          ['approved', 'Resolved - an answered RFI, an accepted change order.'],
          ['superseded', 'Replaced by a newer revision.'],
          ['archived', 'Closed out.'],
        ]}
      />

      <DocsH2 id="audit-log">The audit log</DocsH2>
      <DocsP>
        Every instruction, approval, and evidence submission is recorded as an append-only <InlineCode>AuditEvent</InlineCode> - 
        actor, actor's role at the time (snapshotted, not a live reference), channel, timestamp, and a generic
        pointer to whatever it's about. Nothing edits history; corrections are new events. This is what makes the{' '}
        <strong>dispute export</strong> in Trust &amp; Evidence usable for arbitration, and what backs the access
        audit log in Access Control.
      </DocsP>

      <DocsH2 id="residency">Data residency &amp; retention</DocsH2>
      <DocsP>
        The platform declares an enforced hosting region (Saudi Arabia by default) as a real configuration value, not
        just a policy statement, and each project carries its own retention-period and residency-region policy,
        readable and - for owners/admins - editable from Access Control.
      </DocsP>
    </DocsLayout>
  )
}
