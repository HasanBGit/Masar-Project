import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlatformApiPage } from './PlatformApiPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { APIKey, Project, WebhookDelivery, WebhookSubscription } from '../../lib/types'

const { listApiKeysMock, listWebhookSubscriptionsMock, listWebhookDeliveriesMock, createApiKeyMock, createWebhookSubscriptionMock, revokeApiKeyMock } =
  vi.hoisted(() => ({
    listApiKeysMock: vi.fn(),
    listWebhookSubscriptionsMock: vi.fn(),
    listWebhookDeliveriesMock: vi.fn(),
    createApiKeyMock: vi.fn(),
    createWebhookSubscriptionMock: vi.fn(),
    revokeApiKeyMock: vi.fn(),
  }))

vi.mock('./api', () => ({
  listApiKeys: listApiKeysMock,
  listWebhookSubscriptions: listWebhookSubscriptionsMock,
  listWebhookDeliveries: listWebhookDeliveriesMock,
  createApiKey: createApiKeyMock,
  createWebhookSubscription: createWebhookSubscriptionMock,
  revokeApiKey: revokeApiKeyMock,
}))

const testProject: Project = { id: 10, name: 'Riyadh Tower Phase 1', slug: 'riyadh-tower-phase-1', role: 'owner' }

const testKey: APIKey = {
  id: 3,
  project: 10,
  label: 'ERP integration',
  scope: 'owner',
  tier: 'standard',
  key_prefix: 'mk_live_abc',
  is_active: true,
  created_at: new Date().toISOString(),
  revoked_at: null,
}

const testSubscription: WebhookSubscription = {
  id: 4,
  project: 10,
  target_url: 'https://erp.example.com/hooks',
  event_types: ['approval.requested'],
  is_active: true,
  created_at: new Date().toISOString(),
}

const testDelivery: WebhookDelivery = {
  id: 5,
  subscription: 4,
  event_type: 'approval.requested',
  status: 'success',
  attempt_count: 1,
  last_attempted_at: new Date().toISOString(),
  last_response_code: 200,
  last_error: '',
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <PlatformApiPage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

function mockLoad({ keys = [testKey], subscriptions = [testSubscription], deliveries = [testDelivery] } = {}) {
  listApiKeysMock.mockResolvedValue(keys)
  listWebhookSubscriptionsMock.mockResolvedValue(subscriptions)
  listWebhookDeliveriesMock.mockResolvedValue(deliveries)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PlatformApiPage', () => {
  it('shows a skeleton while data is loading', () => {
    listApiKeysMock.mockReturnValue(new Promise(() => {}))
    listWebhookSubscriptionsMock.mockReturnValue(new Promise(() => {}))
    listWebhookDeliveriesMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: /loading page/i })).toBeInTheDocument()
  })

  it('shows an error state with a working retry on failure', async () => {
    listApiKeysMock.mockRejectedValueOnce(new Error('API gateway timeout')).mockResolvedValue([testKey])
    listWebhookSubscriptionsMock.mockResolvedValue([testSubscription])
    listWebhookDeliveriesMock.mockResolvedValue([testDelivery])
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('API gateway timeout')

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('ERP integration')).toBeInTheDocument()
  })

  it('shows empty states for keys, subscriptions, and deliveries', async () => {
    mockLoad({ keys: [], subscriptions: [], deliveries: [] })
    renderPage()

    expect(await screen.findByText('No API keys yet')).toBeInTheDocument()
    expect(screen.getByText('No webhook subscriptions yet')).toBeInTheDocument()
    expect(screen.getByText('No deliveries yet')).toBeInTheDocument()
  })

  it('renders keys, subscriptions, and deliveries on the happy path', async () => {
    mockLoad()
    renderPage()

    expect(await screen.findByText('ERP integration')).toBeInTheDocument()
    expect(screen.getByText('https://erp.example.com/hooks')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('revokes a key only after confirmation in the dialog', async () => {
    mockLoad()
    revokeApiKeyMock.mockResolvedValue({ ...testKey, is_active: false })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(revokeApiKeyMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Revoke key' }))

    await waitFor(() => expect(revokeApiKeyMock).toHaveBeenCalledWith(3))
    expect(await screen.findByText('API key "ERP integration" revoked.')).toBeInTheDocument()
    expect(listApiKeysMock).toHaveBeenCalledTimes(2)
  })

  it('rejects an invalid webhook URL with an inline error', async () => {
    mockLoad()
    renderPage()

    await screen.findByText('ERP integration')
    await userEvent.type(screen.getByLabelText('Endpoint URL'), 'not-a-url')
    await userEvent.click(screen.getByRole('checkbox', { name: 'approval.requested' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Add subscription' }))

    expect(await screen.findByText(/Enter a valid endpoint URL/i)).toBeInTheDocument()
    expect(createWebhookSubscriptionMock).not.toHaveBeenCalled()
  })

  it('creates a webhook subscription with a valid URL and events', async () => {
    mockLoad()
    createWebhookSubscriptionMock.mockResolvedValue({ ...testSubscription, id: 9 })
    renderPage()

    await screen.findByText('ERP integration')
    await userEvent.type(screen.getByLabelText('Endpoint URL'), 'https://new.example.com/hooks')
    await userEvent.click(screen.getByRole('checkbox', { name: 'evidence.verified' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Add subscription' }))

    await waitFor(() =>
      expect(createWebhookSubscriptionMock).toHaveBeenCalledWith(10, 'https://new.example.com/hooks', ['evidence.verified']),
    )
    expect(listWebhookSubscriptionsMock).toHaveBeenCalledTimes(2)
  })
})
