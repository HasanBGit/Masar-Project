import { useEffect, useState } from 'react'

function format(msRemaining: number): { text: string; overdue: boolean } {
  const overdue = msRemaining <= 0
  const abs = Math.abs(msRemaining)
  const hours = Math.floor(abs / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  const text = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  return { text: overdue ? `overdue by ${text}` : `${text} left`, overdue }
}

export function SlaCountdown({ deadline }: { deadline: string }) {
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const { text, overdue } = format(new Date(deadline).getTime() - Date.now())

  return (
    <span className={`text-xs font-medium ${overdue ? 'text-status-escalated' : 'text-navy/60'}`}>
      SLA: {text}
    </span>
  )
}
