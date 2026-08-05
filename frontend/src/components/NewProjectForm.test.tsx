import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewProjectForm } from './NewProjectForm'
import type { Project } from '../lib/types'

const { createProjectMock } = vi.hoisted(() => ({ createProjectMock: vi.fn() }))

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ createProject: createProjectMock }),
}))

const createdProject: Project = {
  id: 7,
  name: 'North Villa',
  slug: 'north-villa',
  role: 'owner',
}

describe('NewProjectForm', () => {
  beforeEach(() => {
    createProjectMock.mockReset()
  })

  it('creates a project and reports it back on success', async () => {
    createProjectMock.mockResolvedValue(createdProject)
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<NewProjectForm onCreated={onCreated} />)

    await user.click(screen.getByRole('button', { name: /new project/i }))
    await user.type(screen.getByLabelText('Project name'), 'North Villa')
    await user.type(screen.getByLabelText('Description (optional)'), 'Two floors')
    await user.click(screen.getByRole('button', { name: 'Create project' }))

    expect(createProjectMock).toHaveBeenCalledWith('North Villa', 'Two floors')
    expect(onCreated).toHaveBeenCalledWith(createdProject)
    // The form closes again after a successful create.
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
  })

  it('shows a role=alert error when the API rejects and keeps the form open', async () => {
    createProjectMock.mockRejectedValue(new Error('A project with this name already exists.'))
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<NewProjectForm onCreated={onCreated} />)

    await user.click(screen.getByRole('button', { name: /new project/i }))
    await user.type(screen.getByLabelText('Project name'), 'North Villa')
    await user.click(screen.getByRole('button', { name: 'Create project' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('A project with this name already exists.')
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Project name')).toHaveAttribute('aria-invalid', 'true')
  })

  it('disables submit while the name is empty', async () => {
    const user = userEvent.setup()
    render(<NewProjectForm onCreated={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /new project/i }))
    expect(screen.getByRole('button', { name: 'Create project' })).toBeDisabled()
  })
})
