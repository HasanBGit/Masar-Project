import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { LANDING_MARKUP } from './landingMarkup'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('LANDING_MARKUP integrity', () => {
  it('has a matching id for every internal #anchor (no dead links)', () => {
    const host = document.createElement('div')
    host.innerHTML = LANDING_MARKUP

    const anchors = Array.from(host.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
    expect(anchors.length).toBeGreaterThan(0)

    for (const a of anchors) {
      const target = a.getAttribute('href')!.slice(1)
      expect(target, `dead link: #${target}`).not.toBe('')
      expect(host.querySelector(`#${CSS.escape(target)}`), `no element with id="${target}"`).not.toBeNull()
    }
  })

  it('includes privacy and terms sections for the footer legal links', () => {
    const host = document.createElement('div')
    host.innerHTML = LANDING_MARKUP
    expect(host.querySelector('#privacy')).not.toBeNull()
    expect(host.querySelector('#terms')).not.toBeNull()
  })
})

describe('LandingPage', () => {
  it('renders the landing content', () => {
    const { container } = render(<LandingPage />)
    expect(container.querySelector('.hero-title')?.textContent).toBe('TRUEPOINT')
    expect(container.querySelector('#modal-overlay')).not.toBeNull()
  })

  it('hides the login link when VITE_APP_URL is not configured', () => {
    const { container } = render(<LandingPage />)
    const login = container.querySelector<HTMLAnchorElement>('#site-login-link')!
    expect(login.hidden).toBe(true)
  })

  it('points the login link at VITE_APP_URL when configured', () => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com/')
    const { container } = render(<LandingPage />)
    const login = container.querySelector<HTMLAnchorElement>('#site-login-link')!
    expect(login.hidden).toBe(false)
    expect(login.href).toBe('https://app.example.com/')
  })

  it('opens the nav modal as a dialog with the full NAV_INFO title and closes on Escape, restoring focus', () => {
    const { container } = render(<LandingPage />)
    const overlay = container.querySelector<HTMLElement>('#modal-overlay')!
    const panel = container.querySelector<HTMLElement>('.modal-panel')!
    // (Attribute selectors containing "&" trip jsdom's selector engine, so
    // find the button by iterating instead.)
    const trustBtn = Array.from(container.querySelectorAll<HTMLElement>('[data-nav]')).find(
      (el) => el.dataset.nav === 'Trust & Evidence',
    )!
    expect(trustBtn).toBeDefined()

    expect(overlay.hidden).toBe(true)
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.getAttribute('aria-modal')).toBe('true')

    trustBtn.focus()
    fireEvent.click(trustBtn)

    expect(overlay.hidden).toBe(false)
    // Title comes from the NAV_INFO key, not the shortened button text ("Trust").
    expect(container.querySelector('#modal-title')?.textContent).toBe('Trust & Evidence')
    // Focus moved into the dialog.
    expect(document.activeElement).toBe(panel)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(overlay.hidden).toBe(true)
    // Focus restored to the trigger.
    expect(document.activeElement).toBe(trustBtn)
  })

  it('shows a validation error for an invalid email and keeps the form', () => {
    const { container } = render(<LandingPage />)
    fireEvent.click(container.querySelector<HTMLElement>('.request-access-btn')!)

    const form = container.querySelector<HTMLFormElement>('#early-access-form')!
    const name = container.querySelector<HTMLInputElement>('#ea-name')!
    const email = container.querySelector<HTMLInputElement>('#ea-email')!

    name.value = 'Test Person'
    email.value = 'not-an-email'
    fireEvent.submit(form)

    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(container.querySelector<HTMLElement>('#ea-email-error')!.hidden).toBe(false)
    // Form is still there  -  nothing was submitted.
    expect(container.querySelector('#early-access-form')).not.toBeNull()
    expect(container.querySelector('.modal-success')).toBeNull()
  })

  it('POSTs to the configured endpoint and shows the thank-you on success', async () => {
    vi.stubEnv('VITE_EARLY_ACCESS_ENDPOINT', 'https://example.com/early-access')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<LandingPage />)
    fireEvent.click(container.querySelector<HTMLElement>('.request-access-btn')!)

    const form = container.querySelector<HTMLFormElement>('#early-access-form')!
    container.querySelector<HTMLInputElement>('#ea-name')!.value = 'Test Person'
    container.querySelector<HTMLInputElement>('#ea-email')!.value = 'person@example.com'
    fireEvent.submit(form)

    // Submit button disabled while the request is in flight.
    expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)

    await waitFor(() => {
      expect(container.querySelector('.modal-success')).not.toBeNull()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/early-access',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Person', email: 'person@example.com' }),
      }),
    )
  })

  it('shows an inline error and keeps the form when the endpoint fails', async () => {
    vi.stubEnv('VITE_EARLY_ACCESS_ENDPOINT', 'https://example.com/early-access')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const { container } = render(<LandingPage />)
    fireEvent.click(container.querySelector<HTMLElement>('.request-access-btn')!)

    const form = container.querySelector<HTMLFormElement>('#early-access-form')!
    container.querySelector<HTMLInputElement>('#ea-name')!.value = 'Test Person'
    container.querySelector<HTMLInputElement>('#ea-email')!.value = 'person@example.com'
    fireEvent.submit(form)

    await waitFor(() => {
      expect(container.querySelector<HTMLElement>('#ea-form-error')!.hidden).toBe(false)
    })
    expect(container.querySelector('#early-access-form')).not.toBeNull()
    expect(container.querySelector('.modal-success')).toBeNull()
    expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false)
  })
})
