import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObservabilityPage } from './ObservabilityPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { AlertEvent, IntegrationHealthCheck, SlaComplianceSummary } from '../../lib/types'

const { getIntegrationHealthMock, getAlertsMock, getSlaComplianceMock, getQuietProjectsMock, getSecurityEventsMock, acknowledgeAlertMock, createAlertMock } =
  vi.hoisted(() => ({
    getIntegrationHealthMock: vi.fn(),
    getAlertsMock: vi.fn(),
    getSlaComplianceMock: vi.fn(),
    getQuietProjectsMock: vi.fn(),
    getSecurityEventsMock: vi.fn(),
    acknowledgeAlertMock: vi.fn(),
    createAlertMock: vi.fn(),
  }))

vi.mock('./api', () => ({
  getIntegrationHealth: getIntegrationHealthMock,
  getAlerts: getAlertsMock,
  getSlaCompliance: getSlaComplianceMock,
  getQuietProjects: getQuietProjectsMock,
  getSecurityEvents: getSecurityEventsMock,
  acknowledgeAlert: acknowledgeAlertMock,
  createAlert: createAlertMock,
}))

const testSla: SlaComplianceSummary = {
  total_decisions: 42,
  escalated_count: 3,
  escalation_rate: 0.071,
  currently_breached_unescalated: 0,
  closed_count: 30,
  avg_hours_to_close: 18,
}

const testHealth: IntegrationHealthCheck = {
  id: 1,
  project: null,
  project_name: null,
  integration_type: 'email_oauth',
  status: 'healthy',
  last_checked_at: new Date().toISOString(),
  last_error: '',
  details: {},
}

const testAlert: AlertEvent = {
  id: 7,
  severity: 'warning',
  source: 'Escalation sweep',
  message: 'Sweep took longer than 5 minutes',
  project: null,
  project_name: null,
  acknowledged: false,
  acknowledged_by_name: null,
  acknowledged_at: null,
  created_at: new Date().toISOString(),
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <ObservabilityPage />
      </ToastProvider>
    </LanguageProvider>,
  )
}

function mockLoad({
  health = [testHealth],
  alerts = [testAlert],
  sla = testSla,
  quiet = [] as { project_id: number; project_name: string; last_activity_at: string | null }[],
  security = [] as { id: number; created_at: string; actor: string | null; path: string | null; detail: string | null }[],
} = {}) {
  getIntegrationHealthMock.mockResolvedValue(health)
  getAlertsMock.mockResolvedValue(alerts)
  getSlaComplianceMock.mockResolvedValue(sla)
  getQuietProjectsMock.mockResolvedValue(quiet)
  getSecurityEventsMock.mockResolvedValue(security)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ObservabilityPage', () => {
  it('shows a skeleton while data is loading', () => {
    getIntegrationHealthMock.mockReturnValue(new Promise(() => {}))
    getAlertsMock.mockReturnValue(new Promise(() => {}))
    getSlaComplianceMock.mockReturnValue(new Promise(() => {}))
    getQuietProjectsMock.mockReturnValue(new Promise(() => {}))
    getSecurityEventsMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: /loading page/i })).toBeInTheDocument()
  })

  it('shows an error state with a working retry on failure', async () => {
    getIntegrationHealthMock.mockRejectedValueOnce(new Error('Monitoring backend unreachable')).mockResolvedValue([testHealth])
    getAlertsMock.mockResolvedValue([testAlert])
    getSlaComplianceMock.mockResolvedValue(testSla)
    getQuietProjectsMock.mockResolvedValue([])
    getSecurityEventsMock.mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Monitoring backend unreachable')

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Sweep took longer than 5 minutes')).toBeInTheDocument()
  })

  it('shows empty states for health, alerts, quiet projects, and security events', async () => {
    mockLoad({ health: [], alerts: [] })
    renderPage()

    expect(await screen.findByText('No integration health checks registered')).toBeInTheDocument()
    expect(screen.getByText('No alerts')).toBeInTheDocument()
    expect(screen.getByText('Nothing quiet')).toBeInTheDocument()
    expect(screen.getByText('No permission-denied events recorded')).toBeInTheDocument()
  })

  it('renders health, SLA stats, and alerts on the happy path', async () => {
    mockLoad()
    renderPage()

    expect(await screen.findByText('email oauth')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('7.1%')).toBeInTheDocument()
    expect(screen.getByText('Sweep took longer than 5 minutes')).toBeInTheDocument()
  })

  it('acknowledges an alert and reloads', async () => {
    mockLoad()
    acknowledgeAlertMock.mockResolvedValue({ ...testAlert, acknowledged: true, acknowledged_by_name: 'Staff' })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge' }))

    await waitFor(() => expect(acknowledgeAlertMock).toHaveBeenCalledWith(7))
    expect(await screen.findByText('Alert acknowledged.')).toBeInTheDocument()
    expect(getAlertsMock).toHaveBeenCalledTimes(2)
  })
})
