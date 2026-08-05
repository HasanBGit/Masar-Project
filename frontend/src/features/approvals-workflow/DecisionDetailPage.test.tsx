import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DecisionDetailPage } from './DecisionDetailPage'
import type { Decision } from '../../lib/types'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ me: { id: 1, full_name: 'Ahmed', email: 'ahmed@example.com', preferred_language: 'en', is_staff: false } }),
}))

const { getDecisionMock, recordUnderstandingMock } = vi.hoisted(() => ({
  getDecisionMock: vi.fn(),
  recordUnderstandingMock: vi.fn(),
}))

vi.mock('./api', () => ({
  getDecision: getDecisionMock,
  recordUnderstanding: recordUnderstandingMock,
  confirmHearing: vi.fn(),
  agree: vi.fn(),
}))

function baseDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: 1,
    project: 1,
    title: 'Approve drainage detail change',
    description: 'Zone C drainage reroute per consultant response.',
    subject_type: 'rfi',
    high_stakes: true,
    status: 'understanding',
    sla_deadline: new Date(Date.now() + 86400000).toISOString(),
    is_overdue: false,
    hearing_confirmed_at: new Date().toISOString(),
    understanding_text: '',
    understanding_confirmed_at: null,
    agreement_confirmed_at: null,
    fallback_approver_name: null,
    participants: [{ id: 1, user: 1, user_name: 'Ahmed', raci_role: 'A' }],
    my_raci_role: 'A',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/decisions/1']}>
      <Routes>
        <Route path="/decisions/:id" element={<DecisionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DecisionDetailPage - teach-back understanding gate', () => {
  it('rejects a generic phrase and keeps the confirm button disabled', async () => {
    getDecisionMock.mockResolvedValue(baseDecision())
    renderPage()

    const textarea = await screen.findByPlaceholderText(/MEP schedule/i)
    await userEvent.type(textarea, 'ok')

    expect(screen.getByText(/too generic/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm understanding/i })).toBeDisabled()
    expect(recordUnderstandingMock).not.toHaveBeenCalled()
  })

  it('accepts a specific paraphrase and calls recordUnderstanding', async () => {
    getDecisionMock.mockResolvedValue(baseDecision())
    recordUnderstandingMock.mockResolvedValue(baseDecision({ status: 'agreeing' }))
    renderPage()

    const textarea = await screen.findByPlaceholderText(/MEP schedule/i)
    const specificParaphrase = 'This reroutes the Zone C drain and adds two days to MEP.'
    await userEvent.type(textarea, specificParaphrase)

    const confirmButton = screen.getByRole('button', { name: /confirm understanding/i })
    expect(confirmButton).toBeEnabled()
    await userEvent.click(confirmButton)

    expect(recordUnderstandingMock).toHaveBeenCalledWith(1, specificParaphrase)
  })
})

describe('DecisionDetailPage - closed decision attribution', () => {
  it('attributes closure to the named accountable approver, not the platform', async () => {
    getDecisionMock.mockResolvedValue(
      baseDecision({
        status: 'closed',
        agreement_confirmed_at: new Date('2026-01-15T10:00:00Z').toISOString(),
      }),
    )
    renderPage()

    expect(await screen.findByText(/closed - agreed by ahmed on/i)).toBeInTheDocument()
  })
})
