import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HandoverPage } from './HandoverPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { HandoverRecord, OMChecklistItem, PostHandoverDefect, Project, PunchListItem, RosterEntry } from '../../lib/types'

const {
  getHandoverRecordMock,
  listPunchListMock,
  listOMChecklistMock,
  listDefectsMock,
  listRosterMock,
  createPunchListItemMock,
  verifyOMItemMock,
} = vi.hoisted(() => ({
  getHandoverRecordMock: vi.fn(),
  listPunchListMock: vi.fn(),
  listOMChecklistMock: vi.fn(),
  listDefectsMock: vi.fn(),
  listRosterMock: vi.fn(),
  createPunchListItemMock: vi.fn(),
  verifyOMItemMock: vi.fn(),
}))

vi.mock('./api', () => ({
  getHandoverRecord: getHandoverRecordMock,
  listPunchList: listPunchListMock,
  listOMChecklist: listOMChecklistMock,
  listDefects: listDefectsMock,
  listRoster: listRosterMock,
  createPunchListItem: createPunchListItemMock,
  verifyOMItem: verifyOMItemMock,
  requestPunchListSignoff: vi.fn(),
  reportDefect: vi.fn(),
  acknowledgeDefect: vi.fn(),
  resolveDefect: vi.fn(),
}))

const testProject: Project = { id: 10, name: 'Riyadh Tower Phase 1', slug: 'riyadh-tower-phase-1', role: 'owner' }

const testRecord: HandoverRecord = {
  id: 1,
  project: 10,
  practical_completion_date: '2026-01-10T00:00:00Z',
  decennial_liability_expires_at: '2036-01-10T00:00:00Z',
  recorded_by: 1,
  within_liability_window: true,
}

const testPunchItem: PunchListItem = {
  id: 4,
  project: 10,
  unit_or_zone: 'Villa 2',
  title: 'Cracked tile at entrance',
  description: '',
  raised_by: 1,
  raised_by_name: 'Hassan',
  status: 'open',
  assigned_approver: null,
  assigned_approver_name: null,
  created_at: new Date().toISOString(),
}

const testOMItem: OMChecklistItem = {
  id: 6,
  project: 10,
  category: 'HVAC',
  description_en: 'AC maintenance manual delivered',
  description_ar: '',
  document_ref: '',
  installed_verified: false,
  verified_by: null,
  verified_by_name: null,
  verified_at: null,
  created_at: new Date().toISOString(),
}

const testDefect: PostHandoverDefect = {
  id: 9,
  project: 10,
  unit_or_zone: 'Villa 2',
  title: 'Roof leak above kitchen',
  description: '',
  reported_by: 1,
  reported_by_name: 'Hassan',
  status: 'reported',
  created_at: new Date().toISOString(),
}

const testRosterEntry: RosterEntry = {
  id: 1,
  user: 1,
  user_name: 'Hassan',
  user_email: 'owner@example.com',
  project: 10,
  role: 'owner',
  created_at: new Date().toISOString(),
}

function primeEmpty() {
  getHandoverRecordMock.mockResolvedValue(null)
  listPunchListMock.mockResolvedValue([])
  listOMChecklistMock.mockResolvedValue([])
  listDefectsMock.mockResolvedValue([])
  listRosterMock.mockResolvedValue([])
}

function primeHappyPath() {
  getHandoverRecordMock.mockResolvedValue(testRecord)
  listPunchListMock.mockResolvedValue([testPunchItem])
  listOMChecklistMock.mockResolvedValue([testOMItem])
  listDefectsMock.mockResolvedValue([testDefect])
  listRosterMock.mockResolvedValue([testRosterEntry])
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <HandoverPage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  primeEmpty()
})

describe('HandoverPage', () => {
  it('shows a loading skeleton while data is being fetched', () => {
    getHandoverRecordMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument()
  })

  it('shows an ErrorState with retry when loading fails, and retry recovers', async () => {
    primeHappyPath()
    listPunchListMock.mockRejectedValueOnce(new Error('Handover backend down'))

    const user = userEvent.setup()
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Handover backend down')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Cracked tile at entrance')).toBeInTheDocument()
  })

  it('renders meaningful empty states for punch list, O&M checklist, and defects', async () => {
    renderPage()

    expect(await screen.findByText('Practical completion not yet recorded for this project.')).toBeInTheDocument()
    expect(screen.getByText('No punch list items yet')).toBeInTheDocument()
    expect(screen.getByText('No O&M checklist items yet')).toBeInTheDocument()
    expect(screen.getByText('No post-handover defects reported')).toBeInTheDocument()
  })

  it('renders the handover record, punch list, O&M items, and defects', async () => {
    primeHappyPath()
    renderPage()

    expect(await screen.findByText(/Practical completion/)).toBeInTheDocument()
    expect(screen.getByText('Cracked tile at entrance')).toBeInTheDocument()
    expect(screen.getByText('AC maintenance manual delivered')).toBeInTheDocument()
    expect(screen.getByText(/Roof leak above kitchen/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request sign-off' })).toBeInTheDocument()
  })

  it('adds a punch list item through the form and reloads', async () => {
    primeHappyPath()
    createPunchListItemMock.mockResolvedValue({ ...testPunchItem, id: 5 })

    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Unit / zone'), 'Villa 3')
    await user.type(screen.getByLabelText('Snag description'), 'Paint scuff in hallway')
    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    await waitFor(() =>
      expect(createPunchListItemMock).toHaveBeenCalledWith({
        project: 10,
        unit_or_zone: 'Villa 3',
        title: 'Paint scuff in hallway',
      }),
    )
    await waitFor(() => expect(listPunchListMock.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('verifies an O&M item and surfaces failures without a stuck busy flag', async () => {
    primeHappyPath()
    verifyOMItemMock.mockRejectedValueOnce(new Error('Verification not allowed'))

    const user = userEvent.setup()
    renderPage()

    const verifyButton = await screen.findByRole('button', { name: 'Verify' })
    await user.click(verifyButton)

    await waitFor(() => expect(verifyOMItemMock).toHaveBeenCalledWith(6))
    expect(await screen.findByText('Verification not allowed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled()
  })
})
