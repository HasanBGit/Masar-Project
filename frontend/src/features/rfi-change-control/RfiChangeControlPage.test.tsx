import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RfiChangeControlPage } from './RfiChangeControlPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { ChangeOrder, Project, RFI } from '../../lib/types'

const {
  listRFIsMock,
  listChangeOrdersMock,
  getMasterScheduleMock,
  listCoordinationThreadsMock,
  listSubmittalsMock,
  listPermitsMock,
  listSupplierDeliveriesMock,
  listQualityCheckpointsMock,
  respondToRFIMock,
  createRFIMock,
} = vi.hoisted(() => ({
  listRFIsMock: vi.fn(),
  listChangeOrdersMock: vi.fn(),
  getMasterScheduleMock: vi.fn(),
  listCoordinationThreadsMock: vi.fn(),
  listSubmittalsMock: vi.fn(),
  listPermitsMock: vi.fn(),
  listSupplierDeliveriesMock: vi.fn(),
  listQualityCheckpointsMock: vi.fn(),
  respondToRFIMock: vi.fn(),
  createRFIMock: vi.fn(),
}))

vi.mock('./api', () => ({
  listRFIs: listRFIsMock,
  listChangeOrders: listChangeOrdersMock,
  getMasterSchedule: getMasterScheduleMock,
  listCoordinationThreads: listCoordinationThreadsMock,
  listSubmittals: listSubmittalsMock,
  listPermits: listPermitsMock,
  listSupplierDeliveries: listSupplierDeliveriesMock,
  listQualityCheckpoints: listQualityCheckpointsMock,
  respondToRFI: respondToRFIMock,
  createRFI: createRFIMock,
  createChangeOrder: vi.fn(),
  createCoordinationThread: vi.fn(),
  createPermit: vi.fn(),
  createQualityCheckpoint: vi.fn(),
  createSubmittal: vi.fn(),
  createSupplierDelivery: vi.fn(),
  postCoordinationMessage: vi.fn(),
}))

const testProject: Project = { id: 10, name: 'Riyadh Tower Phase 1', slug: 'riyadh-tower-phase-1', role: 'owner' }

const testRfi: RFI = {
  id: 7,
  project: 10,
  number: 'RFI-007',
  title: 'Drainage detail at Zone C',
  question: 'Which drainage detail applies at grid C4?',
  response: '',
  schedule_impact_days: 3,
  location_tag: 'Zone C',
  raised_by: 2,
  raised_by_name: 'Sara',
  status: 'under_review',
  sla_deadline: new Date(Date.now() + 86400000).toISOString(),
  is_overdue: false,
  created_at: new Date().toISOString(),
}

const testChangeOrder: ChangeOrder = {
  id: 3,
  project: 10,
  title: 'Reroute Zone C drainage',
  baseline_scope: 'Drainage per issued-for-construction set.',
  scope_delta: 'Reroute main run around new footing.',
  cost_impact: '40000',
  schedule_impact_days: 12,
  evidence_ref: '',
  raised_by: 2,
  raised_by_name: 'Sara',
  status: 'under_review',
  created_at: new Date().toISOString(),
}

function primeEmpty() {
  listRFIsMock.mockResolvedValue([])
  listChangeOrdersMock.mockResolvedValue([])
  getMasterScheduleMock.mockResolvedValue([])
  listCoordinationThreadsMock.mockResolvedValue([])
  listSubmittalsMock.mockResolvedValue([])
  listPermitsMock.mockResolvedValue([])
  listSupplierDeliveriesMock.mockResolvedValue([])
  listQualityCheckpointsMock.mockResolvedValue([])
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <MemoryRouter>
          <RfiChangeControlPage project={testProject} />
        </MemoryRouter>
      </ToastProvider>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  primeEmpty()
})

describe('RfiChangeControlPage', () => {
  it('shows a loading skeleton while data is being fetched', () => {
    listRFIsMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument()
  })

  it('shows an ErrorState with retry when loading fails, and retry recovers', async () => {
    listRFIsMock.mockRejectedValueOnce(new Error('RFI backend down'))
    listRFIsMock.mockResolvedValue([testRfi])

    const user = userEvent.setup()
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('RFI backend down')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Drainage detail at Zone C')).toBeInTheDocument()
  })

  it('renders meaningful empty states for every section', async () => {
    renderPage()

    expect(await screen.findByText('No RFIs yet')).toBeInTheDocument()
    expect(screen.getByText('No change orders yet')).toBeInTheDocument()
    expect(screen.getByText('No submittals yet')).toBeInTheDocument()
    expect(screen.getByText('No permits yet')).toBeInTheDocument()
    expect(screen.getByText('No supplier deliveries yet')).toBeInTheDocument()
    expect(screen.getByText('No checkpoints yet')).toBeInTheDocument()
    expect(screen.getByText('No coordination threads active')).toBeInTheDocument()
    expect(screen.getByText('Nothing scheduled yet')).toBeInTheDocument()
  })

  it('renders RFIs and change orders, and submits an RFI response from the modal', async () => {
    listRFIsMock.mockResolvedValue([testRfi])
    listChangeOrdersMock.mockResolvedValue([testChangeOrder])
    respondToRFIMock.mockResolvedValue({ ...testRfi, status: 'approved', response: 'Use detail D-12.' })

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('RFI-007')).toBeInTheDocument()
    expect(screen.getByText('Reroute Zone C drainage')).toBeInTheDocument()
    expect(screen.getByText('+3d if unanswered')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Respond' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Which drainage detail applies at grid C4?')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Response'), 'Use detail D-12.')
    await user.click(within(dialog).getByRole('button', { name: 'Submit response' }))

    await waitFor(() => expect(respondToRFIMock).toHaveBeenCalledWith(7, 'Use detail D-12.'))
    // The modal closes and the list reloads after a successful response.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(listRFIsMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('re-enables the RFI submit button after a failed response submit', async () => {
    listRFIsMock.mockResolvedValue([testRfi])
    respondToRFIMock.mockRejectedValueOnce(new Error('Response rejected by server'))

    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Respond' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Response'), 'Use detail D-12.')
    await user.click(within(dialog).getByRole('button', { name: 'Submit response' }))

    await waitFor(() => expect(respondToRFIMock).toHaveBeenCalledTimes(1))
    // The failure is surfaced and the button is usable again - no stuck busy flag.
    expect(await within(dialog).findByText('Response rejected by server')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Submit response' })).toBeEnabled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('creates an RFI through the new-RFI form', async () => {
    createRFIMock.mockResolvedValue({ ...testRfi, id: 8 })

    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: '+ New RFI' }))
    await user.type(screen.getByLabelText('Title'), 'Clarify slab thickness')
    await user.type(screen.getByLabelText('Question'), 'Is the slab 200mm or 250mm at grid B2?')
    await user.click(screen.getByRole('button', { name: 'Create RFI' }))

    await waitFor(() =>
      expect(createRFIMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 10,
          title: 'Clarify slab thickness',
          question: 'Is the slab 200mm or 250mm at grid B2?',
          schedule_impact_days: 0,
        }),
      ),
    )
  })
})
