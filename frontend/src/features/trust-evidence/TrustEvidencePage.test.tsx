import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrustEvidencePage } from './TrustEvidencePage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { ChangeOrderRollup, EvidenceRecord, Project } from '../../lib/types'

const { listEvidenceMock, listSilenceFlagsMock, getChangeOrderRollupMock, submitEvidenceMock, verifyEvidenceMock, getDisputeExportMock } =
  vi.hoisted(() => ({
    listEvidenceMock: vi.fn(),
    listSilenceFlagsMock: vi.fn(),
    getChangeOrderRollupMock: vi.fn(),
    submitEvidenceMock: vi.fn(),
    verifyEvidenceMock: vi.fn(),
    getDisputeExportMock: vi.fn(),
  }))

vi.mock('./api', () => ({
  listEvidence: listEvidenceMock,
  listSilenceFlags: listSilenceFlagsMock,
  getChangeOrderRollup: getChangeOrderRollupMock,
  submitEvidence: submitEvidenceMock,
  verifyEvidence: verifyEvidenceMock,
  getDisputeExport: getDisputeExportMock,
}))

const testProject: Project = { id: 10, name: 'Riyadh Tower Phase 1', slug: 'riyadh-tower-phase-1', role: 'owner' }

const testRollup: ChangeOrderRollup = { count: 2, cumulative_cost_impact: 150000, cumulative_schedule_impact_days: 12 }

const testEvidence: EvidenceRecord = {
  id: 1,
  project: 10,
  subject_type: 'milestone',
  subject_id: '4',
  submitted_by: 3,
  submitted_by_name: 'Salem Project Manager',
  caption: 'Foundation rebar in place before pour',
  media_url: '',
  latitude: null,
  longitude: null,
  captured_at: new Date('2026-07-01T09:00:00Z').toISOString(),
  verified: false,
  verified_by: null,
  verified_by_name: null,
  verified_at: null,
  created_at: new Date().toISOString(),
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <TrustEvidencePage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

function mockHappyLoad(evidence: EvidenceRecord[] = [testEvidence]) {
  listEvidenceMock.mockResolvedValue(evidence)
  listSilenceFlagsMock.mockResolvedValue([])
  getChangeOrderRollupMock.mockResolvedValue(testRollup)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TrustEvidencePage', () => {
  it('shows a skeleton while data is loading', () => {
    listEvidenceMock.mockReturnValue(new Promise(() => {}))
    listSilenceFlagsMock.mockReturnValue(new Promise(() => {}))
    getChangeOrderRollupMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: /loading page/i })).toBeInTheDocument()
  })

  it('shows an error state with a working retry on failure', async () => {
    listEvidenceMock.mockRejectedValueOnce(new Error('Server exploded')).mockResolvedValue([testEvidence])
    listSilenceFlagsMock.mockResolvedValue([])
    getChangeOrderRollupMock.mockResolvedValue(testRollup)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Foundation rebar in place before pour')).toBeInTheDocument()
  })

  it('shows an empty state with a submit CTA when there is no evidence', async () => {
    mockHappyLoad([])
    renderPage()

    expect(await screen.findByText('No evidence submitted yet')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Submit your first evidence' }))
    expect(screen.getByText('Submit Evidence Record')).toBeInTheDocument()
  })

  it('renders the rollup stats and the evidence ledger', async () => {
    mockHappyLoad()
    renderPage()

    expect(await screen.findByText('Foundation rebar in place before pour')).toBeInTheDocument()
    expect(screen.getByText('SAR 150,000')).toBeInTheDocument()
    expect(screen.getByText('12d')).toBeInTheDocument()
    expect(screen.getByText('Pending claim')).toBeInTheDocument()
  })

  it('submits new evidence through the form and reloads the ledger', async () => {
    mockHappyLoad()
    submitEvidenceMock.mockResolvedValue({ ...testEvidence, id: 2 })
    renderPage()

    await screen.findByText('Foundation rebar in place before pour')
    await userEvent.click(screen.getByRole('button', { name: '+ Submit evidence' }))

    await userEvent.type(screen.getByLabelText('Subject ID'), '7')
    await userEvent.type(screen.getByLabelText('Caption'), 'Column formwork complete')
    await userEvent.click(screen.getByRole('button', { name: 'Submit evidence' }))

    await waitFor(() =>
      expect(submitEvidenceMock).toHaveBeenCalledWith(
        expect.objectContaining({ project: 10, subject_type: 'milestone', subject_id: '7', caption: 'Column formwork complete' }),
      ),
    )
    // initial load + reload after create
    expect(listEvidenceMock).toHaveBeenCalledTimes(2)
  })

  it('shows inline field errors instead of submitting an empty form', async () => {
    mockHappyLoad()
    renderPage()

    await screen.findByText('Foundation rebar in place before pour')
    await userEvent.click(screen.getByRole('button', { name: '+ Submit evidence' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit evidence' }))

    expect(await screen.findByText('Subject ID is required.')).toBeInTheDocument()
    expect(screen.getByText('Caption is required.')).toBeInTheDocument()
    expect(submitEvidenceMock).not.toHaveBeenCalled()
  })
})
