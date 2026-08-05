import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import type { DashboardSummary, Project } from '../../lib/types'

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
  digest: [
    {
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
    },
  ],
  decisions: [],
}

describe('DashboardPage', () => {
  it('renders project name, user greeting, and digest items', async () => {
    getDashboardSummaryMock.mockResolvedValue(mockSummary)

    render(
      <MemoryRouter>
        <DashboardPage project={testProject} />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Riyadh Tower Phase 1/i)).toBeInTheDocument()
    expect(await screen.findByText(/Hassan, Your project, one seat with full visibility./i)).toBeInTheDocument()
    expect(await screen.findByText(/Foundation concrete pour approval/i)).toBeInTheDocument()
  })
})
