import { useEffect, useState } from 'react'

function format(msRemaining: number): { text: string; overdue: boolean } {
  const overdue = msRemaining <= 0
  const abs = Math.abs(msRemaining)
  const hours = Math.floor(abs / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  const text = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  return { text: overdue ? `overdue by ${text}` : `${text} left`, overdue }
}

const TICK_MS = 30_000

// One module-level ticker drives every mounted countdown: a table with 100
// rows keeps a single interval alive instead of creating 100 timers.
const subscribers = new Set<() => void>()
let sharedInterval: ReturnType<typeof setInterval> | null = null

function subscribe(onTick: () => void): () => void {
  subscribers.add(onTick)
  if (sharedInterval === null) {
    sharedInterval = setInterval(() => {
      subscribers.forEach((fn) => fn())
    }, TICK_MS)
  }
  return () => {
    subscribers.delete(onTick)
    if (subscribers.size === 0 && sharedInterval !== null) {
      clearInterval(sharedInterval)
      sharedInterval = null
    }
  }
}

export function SlaCountdown({ deadline }: { deadline: string }) {
  const [, tick] = useState(0)

  useEffect(() => subscribe(() => tick((n) => n + 1)), [])

  const { text, overdue } = format(new Date(deadline).getTime() - Date.now())

  return (
    <span
      role={overdue ? 'status' : undefined}
      className={`text-xs font-medium ${overdue ? 'text-status-escalated' : 'text-navy/60'}`}
    >
      SLA: {text}
    </span>
  )
}
