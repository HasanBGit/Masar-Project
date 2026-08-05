import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../config', () => ({
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GMAIL_SCOPES: 'https://www.googleapis.com/auth/gmail.readonly',
}))

import { useGmailAuth } from './useGmailAuth'

describe('useGmailAuth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    delete window.google
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.google
  })

  it('initializes the token client when window.google appears late', () => {
    const requestAccessToken = vi.fn()
    const initTokenClient = vi.fn().mockReturnValue({ requestAccessToken })

    const { result } = renderHook(() => useGmailAuth())

    // Script not there yet: still polling, no error, no client.
    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(initTokenClient).not.toHaveBeenCalled()

    // The async/defer GIS script "arrives" late.
    window.google = { accounts: { oauth2: { initTokenClient } } }
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(initTokenClient).toHaveBeenCalledTimes(1)
    expect(initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-client-id.apps.googleusercontent.com',
      }),
    )
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()

    // login now reaches the real client instead of erroring.
    act(() => {
      result.current.login()
    })
    expect(requestAccessToken).toHaveBeenCalledTimes(1)
  })

  it('sets a visible error state when the script never appears', () => {
    const { result } = renderHook(() => useGmailAuth())

    act(() => {
      vi.advanceTimersByTime(11_000)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toMatch(/failed to load/i)
  })

  it('retryInit re-runs detection after a timeout', () => {
    const initTokenClient = vi.fn().mockReturnValue({ requestAccessToken: vi.fn() })
    const { result } = renderHook(() => useGmailAuth())

    act(() => {
      vi.advanceTimersByTime(11_000)
    })
    expect(result.current.error).toMatch(/failed to load/i)

    // Script becomes available (e.g. network recovered + user hit Retry).
    window.google = { accounts: { oauth2: { initTokenClient } } }
    act(() => {
      result.current.retryInit()
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(initTokenClient).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})
