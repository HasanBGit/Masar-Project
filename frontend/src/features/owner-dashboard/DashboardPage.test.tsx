import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { DashboardSummary, Decision, Project } from '../../lib/types'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ me: { id: 1, full_name: 'Hassan Mohamed', email: 'owner@example.com', preferred_language: 'en', is_staff: false } }),
}))

const { getDashboardSummaryMock } = vi.hoisted(() => ({
  getDashboardSummaryMock: vi.fn(),
}))

vi.mock('./api', () => ({
  getDashboardSummary: getDashboardSummaryMock,
}))

const testProject: Project = {
  id: 10,
  name: 'Riyadh Tower Phase 1',
  slug: 'riyadh-tower-phase-1',
  role: 'owner',
}

const digestDecision: Decision = {
  id: 101,
  project: 10,
  title: 'Foundation concrete pour approval',
  description: 'Sign off on foundation slab pour.',
  subject_type: 'milestone',
  high_stakes: true,
  status: 'understanding',
  sla_deadline: new Date(Date.now() + 86400000).toISOString(),
  is_overdue: false,
  hearing_confirmed_at: new Date().toISOString(),
  understanding_text: '',
  understanding_confirmed_at: null,
  agreement_confirmed_at: null,
  fallback_approver_name: null,
  participants: [],
  my_raci_role: 'A',
  created_at: new Date().toISOString(),
}

const mockSummary: DashboardSummary = {
  role: 'owner',
  project: testProject,
  stats: {
    total: 5,
    pending: 2,
    overdue: 1,
    high_stakes_pending: 1,
    closed: 2,
  },
  digest: [digestDecision],
  decisions: [{ ...digestDecision, id: 102, title: 'Approve rebar supplier change' }],
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <MemoryRouter>
          <DashboardPage project={testProject} />
        </MemoryRouter>
      </ToastProvider>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  getDashboardSummaryMock.mockReset()
})

describe('DashboardPage', () => {
  it('shows a skeleton while the summary is loading', () => {
    getDashboardSummaryMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status', { name: /loading page/i })).toBeInTheDocument()
  })

  it('shows an error state with a working retry on failure', async () => {
    getDashboardSummaryMock
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(mockSummary)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText(/Foundation concrete pour approval/i)).toBeInTheDocument()
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(2)
  })

  it('shows meaningful empty states when there is nothing to decide', async () => {
    getDashboardSummaryMock.mockResolvedValue({ ...mockSummary, digest: [], decisions: [] })
    renderPage()

    expect(await screen.findByText(/Nothing urgent - you're caught up/i)).toBeInTheDocument()
    expect(screen.getByText(/No decisions in view for your role yet/i)).toBeInTheDocument()
  })

  it('renders project name, user greeting, digest items, and the decisions table', async () => {
    getDashboardSummaryMock.mockResolvedValue(mockSummary)
    renderPage()

    expect(await screen.findByText(/Riyadh Tower Phase 1/i)).toBeInTheDocument()
    expect(await screen.findByText(/Hassan, Your project, one seat with full visibility./i)).toBeInTheDocument()
    expect(await screen.findByText(/Foundation concrete pour approval/i)).toBeInTheDocument()
    expect(await screen.findByText(/Approve rebar supplier change/i)).toBeInTheDocument()
  })

  it('does not render the hardcoded Gmail promo card', async () => {
    getDashboardSummaryMock.mockResolvedValue(mockSummary)
    renderPage()

    await screen.findByText(/Foundation concrete pour approval/i)
    expect(screen.queryByText(/Gmail & Email Intelligence Active/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Manage Gmail Integration/i)).not.toBeInTheDocument()
  })
})
