import { DocsLayout } from '../DocsLayout'
import { Callout, CodeBlock, DocsH1, DocsH2, DocsLead, DocsLink, DocsP, DocsTable, InlineCode } from '../DocsUI'

const TOC = [
  { id: 'events', label: 'Event types' },
  { id: 'subscribing', label: 'Subscribing' },
  { id: 'payload', label: 'Payload & signature' },
  { id: 'delivery', label: 'Delivery & retries' },
  { id: 'security', label: 'Security' },
]

export function WebhooksPage() {
  return (
    <DocsLayout toc={TOC}>
      <DocsH1>Webhooks &amp; rate limits</DocsH1>
      <DocsLead>Get pushed state-change events instead of polling.</DocsLead>

      <DocsH2 id="events">Event types</DocsH2>
      <DocsTable
        head={['Event', 'Fires when']}
        rows={[
          ['approval.requested', 'A new decision enters the Hearing edge (Approvals).'],
          ['evidence.verified', 'An owner/consultant verifies a submitted evidence record (Trust & Evidence).'],
          ['contractor.overdue', 'An RFI (or other tracked item) breaches its expected-response deadline and gets silence-flagged.'],
          ['payment.released', 'A payment milestone is released after its evidence gate passes (Contract & Payments).'],
        ]}
      />

      <DocsH2 id="subscribing">Subscribing</DocsH2>
      <DocsP>
        Add a subscription from <DocsLink to="/platform-api">Platform API</DocsLink> as a project owner/admin - a
        target URL and the event types you want (validated against the table above). One project can have multiple
        subscriptions.
      </DocsP>
      <Callout type="warn">
        The subscription's signing secret is returned <strong>once</strong>, in the create response - it is stored
        hashed-equivalent server-side and never shown again. If you lose it, delete the subscription and create a
        new one.
      </Callout>

      <DocsH2 id="payload">Payload &amp; signature</DocsH2>
      <CodeBlock label="POST to your target_url">{`{
  "event_type": "approval.requested",
  "payload": {
    "decision_id": 22,
    "title": "Change order: MEP shaft rerouting",
    "high_stakes": true
  }
}`}</CodeBlock>
      <DocsP>
        Every request carries an <InlineCode>X-Truepoint-Signature</InlineCode> header - an HMAC-SHA256 of the raw
        request body, signed with the subscription's own secret (the one shown at creation). Verify it before
        trusting the payload:
      </DocsP>
      <CodeBlock label="verify (python)">{`import hmac, hashlib

def is_valid(raw_body: bytes, header_sig: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_sig)`}</CodeBlock>

      <DocsH2 id="delivery">Delivery &amp; retries</DocsH2>
      <DocsP>
        Delivery is attempted immediately, tracked as <InlineCode>success</InlineCode>,{' '}
        <InlineCode>failed</InlineCode> (will retry), or <InlineCode>dead_letter</InlineCode> (retries exhausted at 5
        attempts). Redirects are never followed automatically - a redirect response is treated as a failed attempt.
        Delivery history is visible on the Platform API page.
      </DocsP>

      <DocsH2 id="security">Security</DocsH2>
      <Callout type="info">
        Every webhook target is validated before the first request and re-validated on every delivery attempt: only
        <InlineCode> http</InlineCode>/<InlineCode>https</InlineCode> URLs are accepted, and the resolved address is
        rejected if it's private, loopback, link-local (including cloud metadata endpoints), or multicast - a
        webhook target can't be pointed at your own internal network.
      </Callout>
    </DocsLayout>
  )
}
