import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import type { Project } from '../lib/types'

export function NewProjectForm({
  onCreated,
  compact = false,
  panelClassName = '',
}: {
  onCreated: (project: Project) => void
  compact?: boolean
  /** Extra classes on the open form's wrapper - e.g. to float it as a popover. */
  panelClassName?: string
}) {
  const { createProject } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'flex items-center gap-1 rounded-full border border-sand bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-cream'
            : 'flex items-center gap-1.5 rounded-[var(--radius-s)] bg-navy px-4 py-2 text-sm font-semibold text-cream hover:bg-navy-deep'
        }
      >
        <Plus size={14} /> New project
      </button>
    )
  }

  return (
    <div className={`rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 ${panelClassName}`}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="mb-2 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-sm"
      />
      {error && <p className="mb-2 text-xs text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              const project = await createProject(name.trim(), description.trim())
              setOpen(false)
              setName('')
              setDescription('')
              onCreated(project)
            } catch (e: any) {
              setError(e?.response?.data?.name?.[0] ?? 'Could not create the project.')
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          Create project
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50">
          Cancel
        </button>
      </div>
    </div>
  )
}
