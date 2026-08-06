import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { SelectField, TextField } from '../../components/ui/Field'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
import type { APIKey, ApiKeyScope, ApiKeyTier, Project, WebhookDelivery } from '../../lib/types'
import { createApiKey, createWebhookSubscription, listApiKeys, listWebhookDeliveries, listWebhookSubscriptions, revokeApiKey } from './api'

const EVENT_TYPES = ['approval.requested', 'evidence.verified', 'project_manager.overdue', 'payment.released']
// Matches the backend's `manage_roster` gate: API-key listing/issuance/revoke
// and webhook-delivery listing are all owner/admin-only server-side (same
// bar as roster management). Subscription listing itself is open to every
// project member - only creating one is gated the same way.
const ELEVATED_ROLES = new Set(['owner', 'admin'])

function DeliveryStatusBadge({ status }: { status: WebhookDelivery['status'] }) {
  if (status === 'success') return <Badge label="Success" tone="good" />
  if (status === 'dead_letter') return <Badge label="Dead letter" tone="danger" />
  return <Badge label="Retrying" tone="warn" />
}

const DELIVERY_COLUMNS: Column<WebhookDelivery>[] = [
  { key: 'event', header: 'Event', sortValue: (d) => d.event_type, render: (d) => d.event_type },
  {
    key: 'attempts',
    header: 'Attempts',
    sortValue: (d) => d.attempt_count,
    render: (d) => <span className="text-navy/70">{d.attempt_count}</span>,
  },
  {
    key: 'response',
    header: 'Response',
    render: (d) => <span className="text-navy/70">{d.last_response_code ?? d.last_error}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    sortValue: (d) => d.status,
    render: (d) => <DeliveryStatusBadge status={d.status} />,
  },
]

function NewApiKeyForm({ project, onCreated }: { project: Project; onCreated: (key: APIKey) => void }) {
  const toast = useToast()
  const [label, setLabel] = useState('')
  const [scope, setScope] = useState<ApiKeyScope>('owner')
  const [tier, setTier] = useState<ApiKeyTier>('standard')
  const [labelError, setLabelError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!label.trim()) {
      setLabelError('Give this key a label so you can recognise it later.')
      return
    }
    setLabelError(null)
    setBusy(true)
    try {
      const key = await createApiKey(project.id, label.trim(), scope, tier)
      toast.success('API key issued - copy it now, it is shown once.')
      setLabel('')
      onCreated(key)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-56 max-w-full">
          <TextField
            label="Key label"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. ERP integration"
            error={labelError}
          />
        </div>
        <div className="w-40">
          <SelectField label="Scope" value={scope} onChange={(e) => setScope(e.target.value as ApiKeyScope)}>
            {(['owner', 'consultant', 'project_manager', 'designer'] as ApiKeyScope[]).map((s) => (
              <option key={s} value={s}>
                {s} scope
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-44">
          <SelectField label="Rate-limit tier" value={tier} onChange={(e) => setTier(e.target.value as ApiKeyTier)}>
            <option value="standard">Standard - 100/hr</option>
            <option value="partner">Partner - 1000/hr</option>
          </SelectField>
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
      >
        {busy ? 'Issuing…' : '+ Issue key'}
      </button>
    </form>
  )
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function NewWebhookForm({ project, onCreated }: { project: Project; onCreated: () => void }) {
  const toast = useToast()
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [urlError, setUrlError] = useState<string | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function toggle(event: string) {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    let valid = true
    if (!url.trim() || !isValidHttpUrl(url.trim())) {
      setUrlError('Enter a valid endpoint URL, e.g. https://your-app.example.com/webhooks')
      valid = false
    } else {
      setUrlError(null)
    }
    if (events.length === 0) {
      setEventsError('Choose at least one event type.')
      valid = false
    } else {
      setEventsError(null)
    }
    if (!valid) return

    setBusy(true)
    try {
      await createWebhookSubscription(project.id, url.trim(), events)
      toast.success('Webhook subscription added.')
      setUrl('')
      setEvents([])
      onCreated()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper/60 p-5">
      <TextField
        label="Endpoint URL"
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://your-app.example.com/webhooks"
        error={urlError}
      />
      <fieldset className="mt-3">
        <legend className="text-xs font-semibold text-navy/70">Event types</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {EVENT_TYPES.map((event) => (
            <label key={event} className="flex items-center gap-1.5 text-xs text-navy/70">
              <input type="checkbox" checked={events.includes(event)} onChange={() => toggle(event)} />
              {event}
            </label>
          ))}
        </div>
        {eventsError && (
          <p role="alert" className="mt-1 text-xs font-medium text-status-escalated">
            {eventsError}
          </p>
        )}
      </fieldset>
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
      >
        {busy ? 'Adding…' : '+ Add subscription'}
      </button>
    </form>
  )
}

export function PlatformApiPage({ project }: { project: Project }) {
  const toast = useToast()
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null)
  const canManage = ELEVATED_ROLES.has(project.role)

  const { data, loading, error, reload } = useProjectData(project.id, async (id) => {
    // listApiKeys and listWebhookDeliveries 403 for non-owner/admin roles -
    // fetching them unconditionally would fail the whole page via Promise.all.
    const [keys, subscriptions, deliveries] = await Promise.all([
      canManage ? listApiKeys(Number(id)) : Promise.resolve([]),
      listWebhookSubscriptions(Number(id)),
      canManage ? listWebhookDeliveries(Number(id)) : Promise.resolve([]),
    ])
    return { keys, subscriptions, deliveries }
  })

  // A raw key is only meaningful for the project it was issued on.
  useEffect(() => {
    setNewRawKey(null)
  }, [project.id])

  if (loading) return <PageSkeleton />
  if (error || !data) {
    return <ErrorState message={error ?? 'Could not load platform API data.'} onRetry={reload} />
  }

  const { keys, subscriptions, deliveries } = data

  const keyColumns: Column<APIKey>[] = [
    { key: 'label', header: 'Label', sortValue: (k) => k.label.toLowerCase(), render: (k) => k.label },
    { key: 'scope', header: 'Scope', sortValue: (k) => k.scope, render: (k) => <span className="text-navy/70">{k.scope}</span> },
    { key: 'tier', header: 'Tier', sortValue: (k) => k.tier, render: (k) => <span className="text-navy/70">{k.tier}</span> },
    { key: 'prefix', header: 'Key', render: (k) => <code className="text-xs">{k.key_prefix}…</code> },
    {
      key: 'status',
      header: 'Status',
      sortValue: (k) => (k.is_active ? 0 : 1),
      render: (k) => (k.is_active ? <Badge label="Active" tone="good" /> : <Badge label="Revoked" tone="neutral" />),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-end',
      render: (k) =>
        k.is_active ? (
          <button
            onClick={() => setKeyToRevoke(k)}
            className="text-xs font-semibold text-status-escalated transition hover:underline"
          >
            Revoke
          </button>
        ) : null,
    },
  ]

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
        <div className="flex items-start justify-between gap-3 rounded-[var(--radius-m)] border border-gold/40 bg-gold/10 p-5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy">Your new API key (shown once - copy it now):</p>
            <code className="mt-1 block break-all rounded bg-white px-3 py-2 text-xs">{newRawKey}</code>
          </div>
          <button
            onClick={() => setNewRawKey(null)}
            aria-label="Dismiss new API key notice"
            className="rounded p-1 text-navy/40 transition hover:text-navy"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {canManage && (
        <section>
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">API keys</h2>
          <div className="flex flex-col gap-3">
            <NewApiKeyForm
              project={project}
              onCreated={(key) => {
                setNewRawKey(key.raw_key ?? null)
                reload()
              }}
            />
            <DataTable
              columns={keyColumns}
              rows={keys}
              rowKey={(k) => k.id}
              minWidth={640}
              emptyTitle="No API keys yet"
              emptyHint="Issue a key with the form above to let a partner system call the platform API on this project."
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Webhook subscriptions</h2>
        <div className="flex flex-col gap-3">
          {canManage && <NewWebhookForm project={project} onCreated={reload} />}
          {subscriptions.length === 0 ? (
            <EmptyState
              compact
              title="No webhook subscriptions yet"
              hint="Subscribe an endpoint with the form above to push project events to your systems as they happen."
            />
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} className="rounded-[var(--radius-s)] border border-sand/70 bg-paper px-4 py-2.5 text-sm">
                <p className="break-all text-navy">{s.target_url}</p>
                <p className="text-xs text-navy/50">{s.event_types.join(', ')}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {canManage && (
        <section>
          <h2 className="mb-3 font-[var(--font-display)] text-lg font-bold text-navy">Recent webhook deliveries</h2>
          <DataTable
            columns={DELIVERY_COLUMNS}
            rows={deliveries}
            rowKey={(d) => d.id}
            minWidth={480}
            emptyTitle="No deliveries yet"
            emptyHint="Once a subscribed event fires, each delivery attempt and its retry status will be listed here."
          />
        </section>
      )}

      <ConfirmDialog
        open={keyToRevoke !== null}
        onClose={() => setKeyToRevoke(null)}
        title="Revoke API key"
        message={`Revoke "${keyToRevoke?.label ?? ''}"? Integrations using this key will immediately stop working. This cannot be undone.`}
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (!keyToRevoke) return
          await revokeApiKey(keyToRevoke.id)
          toast.success(`API key "${keyToRevoke.label}" revoked.`)
          await reload()
        }}
      />
    </div>
  )
}
