import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccessControlPage } from './AccessControlPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { ComplianceStatus, Project, RosterEntry } from '../../lib/types'

const {
  listRosterMock,
  getComplianceStatusMock,
  addRosterMemberMock,
  findUserByEmailMock,
  reassignRosterMemberMock,
  removeRosterMemberMock,
  updateRetentionPolicyMock,
  getAuditLogMock,
} = vi.hoisted(() => ({
  listRosterMock: vi.fn(),
  getComplianceStatusMock: vi.fn(),
  addRosterMemberMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  reassignRosterMemberMock: vi.fn(),
  removeRosterMemberMock: vi.fn(),
  updateRetentionPolicyMock: vi.fn(),
  getAuditLogMock: vi.fn(),
}))

vi.mock('./api', () => ({
  listRoster: listRosterMock,
  getComplianceStatus: getComplianceStatusMock,
  addRosterMember: addRosterMemberMock,
  findUserByEmail: findUserByEmailMock,
  reassignRosterMember: reassignRosterMemberMock,
  removeRosterMember: removeRosterMemberMock,
  updateRetentionPolicy: updateRetentionPolicyMock,
  getAuditLog: getAuditLogMock,
}))

const testProject: Project = { id: 10, name: 'Riyadh Tower Phase 1', slug: 'riyadh-tower-phase-1', role: 'owner' }

const testEntry: RosterEntry = {
  id: 1,
  user: 5,
  user_name: 'Salem Project Manager',
  user_email: 'salem@example.com',
  project: 10,
  role: 'project_manager',
  created_at: new Date().toISOString(),
}

const testCompliance: ComplianceStatus = {
  platform_data_residency_region: 'ksa',
  project_data_residency_region: 'ksa',
  residency_matches_platform: true,
  retention_years: 10,
  pdpl_compliant: true,
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <AccessControlPage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

function mockLoad(roster: RosterEntry[] = [testEntry]) {
  listRosterMock.mockResolvedValue(roster)
  getComplianceStatusMock.mockResolvedValue(testCompliance)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AccessControlPage', () => {
  it('shows a skeleton while data is loading', () => {
    listRosterMock.mockReturnValue(new Promise(() => {}))
    getComplianceStatusMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: /loading page/i })).toBeInTheDocument()
  })

  it('shows an error state with a working retry on failure', async () => {
    listRosterMock.mockRejectedValueOnce(new Error('Roster unavailable')).mockResolvedValue([testEntry])
    getComplianceStatusMock.mockResolvedValue(testCompliance)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Roster unavailable')

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Salem Project Manager')).toBeInTheDocument()
  })

  it('shows an empty state when the roster has no members', async () => {
    mockLoad([])
    renderPage()

    expect(await screen.findByText('No members on this roster yet')).toBeInTheDocument()
  })

  it('renders the roster and compliance summary on the happy path', async () => {
    mockLoad()
    renderPage()

    expect(await screen.findByText('Salem Project Manager')).toBeInTheDocument()
    expect(screen.getByText('salem@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('KSA').length).toBe(2)
    expect(screen.getByText('10y')).toBeInTheDocument()
    expect(screen.getByText('Compliant')).toBeInTheDocument()
  })

  it('removes a member only after confirmation in the dialog', async () => {
    mockLoad()
    removeRosterMemberMock.mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(removeRosterMemberMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Remove member' }))

    await waitFor(() => expect(removeRosterMemberMock).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Salem Project Manager removed from the roster.')).toBeInTheDocument()
    expect(listRosterMock).toHaveBeenCalledTimes(2)
  })

  it('validates the retention-years form instead of using prompt()', async () => {
    mockLoad()
    updateRetentionPolicyMock.mockResolvedValue({ ...testCompliance, retention_years: 15 })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Update retention policy' }))

    const input = screen.getByLabelText('Retention years')
    await userEvent.clear(input)
    await userEvent.type(input, '99')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Enter a whole number of years between 1 and 50.')).toBeInTheDocument()
    expect(updateRetentionPolicyMock).not.toHaveBeenCalled()

    await userEvent.clear(input)
    await userEvent.type(input, '15')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateRetentionPolicyMock).toHaveBeenCalledWith(10, { retention_years: 15 }))
  })

  it('loads the audit log on demand into a sortable table', async () => {
    mockLoad()
    getAuditLogMock.mockResolvedValue([
      {
        id: 1,
        created_at: new Date('2026-07-01T09:00:00Z').toISOString(),
        actor: 'Hassan',
        actor_role: 'owner',
        event_type: 'decision.agreed',
        channel: 'web',
        subject_type: 'decision',
        subject_id: '4',
      },
    ])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Load' }))

    expect(await screen.findByText('decision.agreed')).toBeInTheDocument()
    expect(getAuditLogMock).toHaveBeenCalledWith(10)
    expect(screen.getByRole('button', { name: 'Sort by Time' })).toBeInTheDocument()
  })
})
