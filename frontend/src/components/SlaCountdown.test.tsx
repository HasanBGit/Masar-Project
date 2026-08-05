import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SlaCountdown } from './SlaCountdown'

describe('SlaCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down as time passes', () => {
    const deadline = new Date(Date.now() + 2 * 60_000).toISOString()
    render(<SlaCountdown deadline={deadline} />)

    expect(screen.getByText('SLA: 2m left')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('SLA: 1m left')).toBeInTheDocument()
  })

  it('flips to overdue (with status semantics) once the deadline passes', () => {
    const deadline = new Date(Date.now() + 60_000).toISOString()
    render(<SlaCountdown deadline={deadline} />)

    expect(screen.getByText('SLA: 1m left')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2 * 60_000)
    })
    expect(screen.getByText('SLA: overdue by 1m')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shares one interval across many instances', () => {
    const deadline = new Date(Date.now() + 60 * 60_000).toISOString()
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

    render(
      <>
        {Array.from({ length: 25 }, (_, i) => (
          <SlaCountdown key={i} deadline={deadline} />
        ))}
      </>,
    )

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    setIntervalSpy.mockRestore()
  })
})
