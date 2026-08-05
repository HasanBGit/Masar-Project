import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import { LandingPage } from './LandingPage'
import { LANDING_MARKUP } from './landingMarkup'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ me: null, loading: false }),
}))

function renderLanding() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>
          <LandingPage />
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('renders the hero and main sections', () => {
    renderLanding()
    expect(screen.getByRole('heading', { level: 1, name: 'TRUEPOINT' })).toBeInTheDocument()
    expect(screen.getByText('Why teams switch')).toBeInTheDocument()
  })

  it('has a matching id target for every internal anchor in the markup', () => {
    const hrefs = [...LANDING_MARKUP.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])
    const ids = new Set([...LANDING_MARKUP.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))

    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      expect(ids.has(href), `anchor #${href} has no matching id in the landing markup`).toBe(true)
    }
    // The footer legal links specifically must resolve.
    expect(ids.has('privacy')).toBe(true)
    expect(ids.has('terms')).toBe(true)
  })

  it('opens the nav info modal as a dialog and closes it on Escape', async () => {
    const user = userEvent.setup()
    renderLanding()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const productButton = screen.getByRole('button', { name: 'Product' })
    await user.click(productButton)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // Focus moves into the dialog on open.
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Focus returns to the element that opened the dialog.
    expect(document.activeElement).toBe(productButton)
  })

  it('shows an inline error for an invalid early-access email', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getAllByRole('button', { name: /request early access/i })[0])
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Full name'), 'Huda')
    await user.type(within(dialog).getByLabelText('Email'), 'not-an-email')
    await user.click(within(dialog).getByRole('button', { name: /request early access/i }))

    const alert = within(dialog).getByRole('alert')
    expect(alert).toHaveTextContent('Please enter a valid email address.')
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})
