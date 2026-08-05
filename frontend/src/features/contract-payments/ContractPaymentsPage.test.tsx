import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContractPaymentsPage } from './ContractPaymentsPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { Contract, ContractVsActual, PaymentMilestone, Project } from '../../lib/types'

const {
  listContractsMock,
  listPaymentMilestonesMock,
  getContractVsActualMock,
  listAmendmentsMock,
  askLegalAgentMock,
} = vi.hoisted(() => ({
  listContractsMock: vi.fn(),
  listPaymentMilestonesMock: vi.fn(),
  getContractVsActualMock: vi.fn(),
  listAmendmentsMock: vi.fn(),
  askLegalAgentMock: vi.fn(),
}))

vi.mock('./api', () => ({
  listContracts: listContractsMock,
  listPaymentMilestones: listPaymentMilestonesMock,
  getContractVsActual: getContractVsActualMock,
  listAmendments: listAmendmentsMock,
  askLegalAgent: askLegalAgentMock,
  createContract: vi.fn(),
  createPaymentMilestone: vi.fn(),
  releasePaymentMilestone: vi.fn(),
  requestContractAmendment: vi.fn(),
  getCeilingCheck: vi.fn(),
  ingestLegalAgent: vi.fn(),
}))

const testProject: Project = { id: 10, name: 'Riyadh Tower Phase 1', slug: 'riyadh-tower-phase-1', role: 'owner' }

const testContract: Contract = {
  id: 5,
  project: 10,
  title: 'Villa build contract',
  contract_value: '1000000',
  currency: 'SAR',
  scope_baseline: 'Single villa, 4 bedrooms.',
  source_file: null,
  status: 'approved',
  plain_arabic_summary: '',
  retention_percentage: '5',
  ceiling_threshold_percentage: '10',
  created_at: new Date().toISOString(),
}

const testMilestone: PaymentMilestone = {
  id: 1,
  contract: 5,
  project: 10,
  name: 'Structural completion',
  due_condition: '40% structural complete',
  amount: '300000',
  retention_held: '0',
  status: 'pending',
  released_at: null,
  released_by: null,
  created_at: new Date().toISOString(),
}

const testVsActual: ContractVsActual = {
  has_contract: true,
  original_contract_value: '1000000',
  approved_change_order_total: '0',
  adjusted_contract_value: '1000000',
  paid_to_date: '0',
  remaining_balance: '1000000',
}

function primeHappyPath() {
  listContractsMock.mockResolvedValue([testContract])
  listPaymentMilestonesMock.mockResolvedValue([testMilestone])
  getContractVsActualMock.mockResolvedValue(testVsActual)
  listAmendmentsMock.mockResolvedValue([])
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <ContractPaymentsPage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('ContractPaymentsPage', () => {
  it('shows a loading skeleton while the contract is being fetched', () => {
    listContractsMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument()
  })

  it('shows an ErrorState (not an eternal loading state) when listContracts rejects, and retry recovers', async () => {
    listContractsMock.mockRejectedValueOnce(new Error('Network unreachable'))
    primeHappyPath()

    const user = userEvent.setup()
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Network unreachable')
    expect(screen.queryByRole('status', { name: 'Loading page' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Villa build contract')).toBeInTheDocument()
  })

  it('offers the create-contract form when the project has no contract yet', async () => {
    listContractsMock.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No contract on this project yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create contract' })).toBeInTheDocument()
  })

  it('renders empty states for milestones and amendments instead of bare text', async () => {
    listContractsMock.mockResolvedValue([testContract])
    listPaymentMilestonesMock.mockResolvedValue([])
    getContractVsActualMock.mockResolvedValue(testVsActual)
    listAmendmentsMock.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No payment milestones yet')).toBeInTheDocument()
    expect(await screen.findByText('No amendments yet')).toBeInTheDocument()
  })

  it('renders the contract, its milestones, and the contract-vs-actual tracker', async () => {
    primeHappyPath()
    renderPage()

    expect(await screen.findByText('Villa build contract')).toBeInTheDocument()
    expect(await screen.findByText('Structural completion')).toBeInTheDocument()
    // Original/adjusted/remaining all equal 1,000,000 in this fixture, so
    // multiple stat cards render the same string - assert count, not identity.
    expect((await screen.findAllByText('SAR 1,000,000')).length).toBeGreaterThanOrEqual(3)
  })

  it('asks the legal agent and renders a sourced answer', async () => {
    primeHappyPath()
    askLegalAgentMock.mockResolvedValue({
      answer: 'The retention percentage is 5%.',
      sources: [{ source_ref: 'contract:5:terms', excerpt: 'Retention percentage: 5%.' }],
      language: 'en',
    })

    const user = userEvent.setup()
    renderPage()

    const input = await screen.findByPlaceholderText('Ask a question about this contract…')
    await user.type(input, 'What is the retention percentage?')
    await user.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() => expect(askLegalAgentMock).toHaveBeenCalledWith(5, 'What is the retention percentage?', 'en'))
    expect(await screen.findByText('The retention percentage is 5%.')).toBeInTheDocument()
    expect(await screen.findByText('contract:5:terms')).toBeInTheDocument()
  })

  it('submits a legal agent question when Enter is pressed in the form', async () => {
    primeHappyPath()
    askLegalAgentMock.mockResolvedValue({ answer: 'Yes.', sources: [], language: 'en' })

    const user = userEvent.setup()
    renderPage()

    const input = await screen.findByPlaceholderText('Ask a question about this contract…')
    await user.type(input, 'Does ZATCA invoicing apply?{Enter}')

    await waitFor(() => expect(askLegalAgentMock).toHaveBeenCalledWith(5, 'Does ZATCA invoicing apply?', 'en'))
  })
})
