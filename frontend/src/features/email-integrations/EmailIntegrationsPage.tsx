import { useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import type { Project } from '../../lib/types'
import { Badge, type BadgeTone } from '../../components/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import { useToast } from '../../components/ui/Toast'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
import {
  acknowledgeMessage,
  disconnectAccount,
  getConnectUrl,
  getEmailAccount,
  listMessages,
  syncInbox,
  type EmailCategory,
  type EmailMessage,
} from './api'

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  rfi: 'RFI',
  submittal: 'Submittal',
  payment: 'Payment',
  safety: 'Safety',
  general: 'General',
}

const CATEGORY_TONE: Record<EmailCategory, BadgeTone> = {
  rfi: 'info',
  submittal: 'gold',
  payment: 'good',
  safety: 'danger',
  general: 'neutral',
}

export function EmailIntegrationsPage({ project }: { project: Project }) {
  const toast = useToast()
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const { data, loading, error, reload } = useProjectData(project.id, async (id) => {
    const account = await getEmailAccount(Number(id))
    const messages = account ? await listMessages(Number(id)) : []
    return { account, messages }
  })

  async function handleConnect() {
    setConnecting(true)
    try {
      const url = await getConnectUrl(project.id)
      window.location.href = url
    } catch (err) {
      toast.error(getApiError(err, 'Could not start the Gmail connection.'))
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncInbox(project.id)
      toast.success(result.new_messages > 0 ? `${result.new_messages} new message(s) synced.` : 'Inbox is already up to date.')
      await reload()
    } catch (err) {
      toast.error(getApiError(err, 'Gmail sync failed.'))
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await disconnectAccount(project.id)
      toast.success('Gmail account disconnected.')
      await reload()
    } catch (err) {
      toast.error(getApiError(err, 'Could not disconnect the Gmail account.'))
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleAcknowledge(message: EmailMessage) {
    setBusyId(message.id)
    try {
      await acknowledgeMessage(message.id)
      await reload()
    } catch (err) {
      toast.error(getApiError(err, 'Could not acknowledge this message.'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const account = data?.account ?? null
  const messages = data?.messages ?? []

  const columns: Column<EmailMessage>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (m) => m.subject.toLowerCase(),
      render: (m) => (
        <div>
          <div className="font-semibold text-navy">{m.subject || '(no subject)'}</div>
          <div className="text-xs text-navy/60">{m.from_address}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortValue: (m) => m.category,
      render: (m) => <Badge label={CATEGORY_LABEL[m.category]} tone={CATEGORY_TONE[m.category]} />,
    },
    {
      key: 'received',
      header: 'Received',
      sortValue: (m) => new Date(m.received_at).getTime(),
      render: (m) => <span className="text-navy/60">{new Date(m.received_at).toLocaleString()}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) =>
        !m.requires_action ? (
          <span className="text-xs text-navy/40">No action needed</span>
        ) : m.read_at ? (
          <Badge label="Acknowledged" tone="good" />
        ) : (
          <Badge label="Needs acknowledgement" tone="warn" />
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-end',
      render: (m) =>
        m.requires_action && !m.read_at ? (
          <button
            disabled={busyId === m.id}
            onClick={() => handleAcknowledge(m)}
            className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
          >
            Acknowledge
          </button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold text-gold-ink">{project.name}</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Gmail & Email Integrations</h1>
        <p className="mt-1 max-w-2xl text-sm text-navy/60">
          Connect the project Gmail account so incoming RFIs, submittals, pay applications, and safety notices reach
          this workspace automatically.
        </p>
      </div>

      {!account ? (
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-m)] border border-dashed border-sand bg-white p-10 text-center">
          <Mail size={28} className="text-navy/25" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-navy/70">No Gmail account connected</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-navy/50">
              Connecting grants read-only access to incoming project mail so it can be sorted into RFIs, submittals,
              payment applications, and safety alerts. Nothing is imported until you connect an account.
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-[var(--radius-s)] bg-navy px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
          >
            {connecting ? 'Redirecting to Google…' : 'Connect Gmail'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-sand bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-navy/50" aria-hidden="true" />
                <span className="font-mono text-sm font-semibold text-navy">{account.email_address}</span>
              </div>
              <p className="mt-1 text-xs text-navy/60">
                Connected by {account.connected_by_name} ·{' '}
                {account.last_synced_at
                  ? `Last synced ${new Date(account.last_synced_at).toLocaleString()}`
                  : 'Not synced yet'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 rounded-[var(--radius-s)] bg-gold px-4 py-2 text-sm font-bold text-navy transition hover:bg-gold-ink hover:text-white disabled:opacity-50"
              >
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-[var(--radius-s)] border border-sand px-3 py-2 text-sm font-semibold text-navy/70 transition hover:bg-cream disabled:opacity-60"
              >
                Disconnect
              </button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={messages}
            rowKey={(m) => m.id}
            minWidth={720}
            emptyTitle="No messages synced yet"
            emptyHint="Run a sync to pull in recent project mail from the connected Gmail account."
          />
        </>
      )}
    </div>
  )
}
