import { useEffect, useState } from 'react'
import { Badge } from '../../components/Badge'
import type { APIKey, ApiKeyScope, ApiKeyTier, Project, WebhookDelivery, WebhookSubscription } from '../../lib/types'
import { createApiKey, createWebhookSubscription, listApiKeys, listWebhookDeliveries, listWebhookSubscriptions, revokeApiKey } from './api'

const EVENT_TYPES = ['approval.requested', 'evidence.verified', 'contractor.overdue']

function DeliveryStatusBadge({ status }: { status: WebhookDelivery['status'] }) {
  if (status === 'success') return <Badge label="Success" tone="good" />
  if (status === 'dead_letter') return <Badge label="Dead letter" tone="danger" />
  return <Badge label="Retrying" tone="warn" />
}

function NewApiKeyForm({ project, onCreated }: { project: Project; onCreated: (key: APIKey) => void }) {
  const [label, setLabel] = useState('')
  const [scope, setScope] = useState<ApiKeyScope>('owner')
  const [tier, setTier] = useState<ApiKeyTier>('standard')
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label (e.g. ERP integration)" className="w-56 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
        <select value={scope} onChange={(e) => setScope(e.target.value as ApiKeyScope)} className="rounded-[var(--radius-s)] border border-sand bg-white px-2 py-2 text-sm">
          {(['owner', 'investor', 'consultant', 'contractor'] as ApiKeyScope[]).map((s) => (
            <option key={s} value={s}>
              {s} scope
            </option>
          ))}
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value as ApiKeyTier)} className="rounded-[var(--radius-s)] border border-sand bg-white px-2 py-2 text-sm">
          <option value="standard">Standard - 100/hr</option>
          <option value="partner">Partner - 1000/hr</option>
        </select>
        <button
          disabled={busy || !label.trim()}
          onClick={async () => {
            setBusy(true)
            const key = await createApiKey(project.id, label, scope, tier)
            setBusy(false)
            setLabel('')
            onCreated(key)
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60"
        >
          + Issue key
        </button>
      </div>
    </div>
  )
}

function NewWebhookForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  function toggle(event: string) {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]))
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-4">
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.example.com/webhooks" className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm" />
      <div className="mb-2 flex flex-wrap gap-3">
        {EVENT_TYPES.map((event) => (
          <label key={event} className="flex items-center gap-1.5 text-xs text-navy/70">
            <input type="checkbox" checked={events.includes(event)} onChange={() => toggle(event)} />
            {event}
          </label>
        ))}
      </div>
      <button
        disabled={busy || !url.trim() || events.length === 0}
        onClick={async () => {
          setBusy(true)
          await createWebhookSubscription(project.id, url, events)
          setBusy(false)
          setUrl('')
          setEvents([])
          onCreated()
        }}
        className="rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60"
      >
        + Add subscription
      </button>
    </div>
  )
}

export function PlatformApiPage({ project }: { project: Project }) {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [newRawKey, setNewRawKey] = useState<string | null>(null)

  async function load() {
    const [k, s, d] = await Promise.all([listApiKeys(project.id), listWebhookSubscriptions(project.id), listWebhookDeliveries(project.id)])
    setKeys(k)
    setSubscriptions(s)
    setDeliveries(d)
  }

  useEffect(() => {
    load()
  }, [project.id])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Platform API</h1>
        <p className="mt-1 text-sm text-navy/60">
          API keys, webhooks, and rate limits for partner integrations. Full reference:{' '}
          <a href="/api/docs/" target="_blank" rel="noreferrer" className="underline">
            Swagger UI
          </a>{' '}
          ·{' '}
          <a href="/api/redoc/" target="_blank" rel="noreferrer" className="underline">
            Redoc
          </a>
        </p>
      </div>

      {newRawKey && (
        <div className="rounded-[var(--radius-m)] border border-gold/40 bg-gold/10 p-4 text-sm">
          <p className="font-semibold text-navy">Your new API key (shown once - copy it now):</p>
          <code className="mt-1 block break-all rounded bg-white px-3 py-2 text-xs">{newRawKey}</code>
        </div>
      )}

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">API keys</h2>
        <div className="flex flex-col gap-3">
          <NewApiKeyForm project={project} onCreated={(key) => { setNewRawKey(key.raw_key ?? null); load() }} />
          <div className="overflow-x-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-sand/70 text-xs uppercase tracking-wide text-navy/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Label</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Scope</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Tier</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Key</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-sand/40 last:border-0">
                    <td className="px-4 py-2.5 text-navy">{k.label}</td>
                    <td className="px-4 py-2.5 text-navy/70">{k.scope}</td>
                    <td className="px-4 py-2.5 text-navy/70">{k.tier}</td>
                    <td className="px-4 py-2.5"><code className="text-xs">{k.key_prefix}…</code></td>
                    <td className="px-4 py-2.5">{k.is_active ? <Badge label="Active" tone="good" /> : <Badge label="Revoked" tone="neutral" />}</td>
                    <td className="px-4 py-2.5 text-right">
                      {k.is_active && (
                        <button onClick={async () => { await revokeApiKey(k.id); load() }} className="text-xs font-semibold text-status-escalated hover:underline">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Webhook subscriptions</h2>
        <div className="flex flex-col gap-3">
          <NewWebhookForm project={project} onCreated={load} />
          {subscriptions.map((s) => (
            <div key={s.id} className="rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 text-sm">
              <p className="text-navy">{s.target_url}</p>
              <p className="text-xs text-navy/50">{s.event_types.join(', ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Recent webhook deliveries</h2>
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-sand/70 bg-paper">
          {deliveries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-navy/50">No deliveries yet.</p>
          ) : (
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-sand/70 text-xs uppercase tracking-wide text-navy/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Event</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Attempts</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Response</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-sand/40 last:border-0">
                    <td className="px-4 py-2.5 text-navy">{d.event_type}</td>
                    <td className="px-4 py-2.5 text-navy/70">{d.attempt_count}</td>
                    <td className="px-4 py-2.5 text-navy/70">{d.last_response_code ?? d.last_error}</td>
                    <td className="px-4 py-2.5"><DeliveryStatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
