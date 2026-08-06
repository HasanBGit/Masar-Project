import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmailIntegrationsPage } from './EmailIntegrationsPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { Project } from '../../lib/types'
import type { EmailAccount, EmailMessage } from './api'

const {
  getEmailAccountMock,
  listMessagesMock,
  getConnectUrlMock,
  syncInboxMock,
  disconnectAccountMock,
  acknowledgeMessageMock,
} = vi.hoisted(() => ({
  getEmailAccountMock: vi.fn(),
  listMessagesMock: vi.fn(),
  getConnectUrlMock: vi.fn(),
  syncInboxMock: vi.fn(),
  disconnectAccountMock: vi.fn(),
  acknowledgeMessageMock: vi.fn(),
}))

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api')
  return {
    ...actual,
    getEmailAccount: getEmailAccountMock,
    listMessages: listMessagesMock,
    getConnectUrl: getConnectUrlMock,
    syncInbox: syncInboxMock,
    disconnectAccount: disconnectAccountMock,
    acknowledgeMessage: acknowledgeMessageMock,
  }
})

const testProject: Project = { id: 7, name: 'Horizon Tower', slug: 'horizon-tower', role: 'owner' }

const testAccount: EmailAccount = {
  id: 1,
  project: 7,
  email_address: 'pm@horizon-tower.sa',
  connected_by: 2,
  connected_by_name: 'Sara Al-Fahad',
  last_synced_at: '2026-08-01T10:00:00Z',
  created_at: '2026-07-01T10:00:00Z',
}

const testMessage: EmailMessage = {
  id: 10,
  project: 7,
  gmail_thread_id: 't1',
  from_address: 'consultant@example.sa',
  subject: 'RFI: Concrete mix for Zone B',
  snippet: 'Please confirm the mix design.',
  category: 'rfi',
  requires_action: true,
  received_at: '2026-08-01T09:00:00Z',
  read_at: null,
  read_by: null,
  read_by_name: null,
  decision_id: 5,
  decision_status: 'hearing',
  created_at: '2026-08-01T09:00:00Z',
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <EmailIntegrationsPage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EmailIntegrationsPage', () => {
  it('shows a connect prompt with no fabricated data when no account is connected', async () => {
    getEmailAccountMock.mockResolvedValue(null)
    listMessagesMock.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No Gmail account connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument()
    expect(screen.queryByText(/RFI #47/)).not.toBeInTheDocument()
  })

  it('redirects to the Google consent URL when connecting', async () => {
    getEmailAccountMock.mockResolvedValue(null)
    listMessagesMock.mockResolvedValue([])
    getConnectUrlMock.mockResolvedValue('https://accounts.google.com/o/oauth2/v2/auth?client_id=test')
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Connect Gmail' }))

    await waitFor(() => expect(getConnectUrlMock).toHaveBeenCalledWith(7))
  })

  it('shows the connected account and its real synced messages', async () => {
    getEmailAccountMock.mockResolvedValue(testAccount)
    listMessagesMock.mockResolvedValue([testMessage])
    renderPage()

    expect(await screen.findByText('pm@horizon-tower.sa')).toBeInTheDocument()
    expect(screen.getByText(/Connected by Sara Al-Fahad/)).toBeInTheDocument()
    expect(screen.getByText('RFI: Concrete mix for Zone B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
  })

  it('syncs the inbox and reloads the message list', async () => {
    getEmailAccountMock.mockResolvedValue(testAccount)
    listMessagesMock.mockResolvedValue([])
    syncInboxMock.mockResolvedValue({ new_messages: 2 })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Sync now' }))

    await waitFor(() => expect(syncInboxMock).toHaveBeenCalledWith(7))
    expect(await screen.findByText('2 new message(s) synced.')).toBeInTheDocument()
  })
})
