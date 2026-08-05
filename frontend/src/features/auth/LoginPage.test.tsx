import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset()
  })

  it('submits the form and navigates to the dashboard on success', async () => {
    loginMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'owner@truepoint.sa')
    await user.type(screen.getByLabelText('Password'), 'demo1234')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(loginMock).toHaveBeenCalledWith('owner@truepoint.sa', 'demo1234')
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument()
  })

  it('shows a role=alert error when login fails and stays on the page', async () => {
    loginMock.mockRejectedValue(new Error('401'))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'owner@truepoint.sa')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Incorrect email or password.')
    expect(screen.queryByText('Dashboard destination')).not.toBeInTheDocument()
  })

  it('labels inputs and carries autocomplete attributes', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
  })
})
