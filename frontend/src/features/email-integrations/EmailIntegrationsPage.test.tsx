import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmailIntegrationsPage } from './EmailIntegrationsPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { Project } from '../../lib/types'

const testProject: Project = { id: 7, name: 'Masar Tower', slug: 'masar-tower', role: 'owner' }

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <EmailIntegrationsPage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EmailIntegrationsPage', () => {
  it('shows the dismissible demo-preview banner', async () => {
    const user = userEvent.setup()
    renderPage()

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(/Demo preview — sample data, not connected to your account/)

    await user.click(screen.getByRole('button', { name: 'Dismiss demo notice' }))
    expect(screen.queryByText(/Demo preview — sample data/)).not.toBeInTheDocument()
  })

  it('exposes the section tabs as a tablist with arrow-key navigation', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('tablist', { name: 'Email integration sections' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(5)

    const connectionTab = screen.getByRole('tab', { name: /Gmail Connection & OAuth/ })
    expect(connectionTab).toHaveAttribute('aria-selected', 'true')
    // Roving tabindex: only the active tab is in the tab order.
    expect(connectionTab).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: /Live Extraction Pipeline/ })).toHaveAttribute('tabindex', '-1')

    connectionTab.focus()
    await user.keyboard('{ArrowRight}')

    const extractionTab = screen.getByRole('tab', { name: /Live Extraction Pipeline/ })
    expect(extractionTab).toHaveFocus()
    expect(extractionTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-extraction')

    // ArrowLeft wraps back to the previous tab.
    await user.keyboard('{ArrowLeft}')
    expect(connectionTab).toHaveFocus()
    expect(connectionTab).toHaveAttribute('aria-selected', 'true')

    // End jumps to the last tab.
    await user.keyboard('{End}')
    const healthTab = screen.getByRole('tab', { name: /Sync Health & Webhooks/ })
    expect(healthTab).toHaveFocus()
    expect(healthTab).toHaveAttribute('aria-selected', 'true')
  })

  it('copies the webhook URL to the clipboard and confirms with a toast', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://api.masar-construction.sa/v1/webhooks/gmail/pubsub'),
    )
    expect(await screen.findByText('Webhook URL copied to clipboard.')).toBeInTheDocument()
  })

  it('opens the email preview as a dialog and closes it on Escape', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /Live Extraction Pipeline/ }))
    const previewButtons = screen.getAllByRole('button', { name: /Preview Email & AI JSON Payload/ })
    await user.click(previewButtons[0])

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Raw Email & Extraction Inspection')
    expect(dialog).toHaveTextContent('RFI #47 — Concrete Mix Specification Zone B')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
