import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { getApiError } from '../lib/api'
import { TextField } from './ui/Field'
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
            ? 'flex items-center gap-1 rounded-full border border-sand bg-white px-2.5 py-1.5 text-xs font-semibold text-navy transition hover:bg-cream'
            : 'flex items-center gap-1.5 rounded-[var(--radius-s)] bg-navy px-4 py-2 text-sm font-semibold text-cream transition hover:bg-navy-deep'
        }
      >
        <Plus size={14} aria-hidden="true" /> New project
      </button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const project = await createProject(name.trim(), description.trim())
      setOpen(false)
      setName('')
      setDescription('')
      onCreated(project)
    } catch (e) {
      setError(getApiError(e, 'Could not create the project.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-2 rounded-[var(--radius-m)] border border-sand/70 bg-paper p-4 ${panelClassName}`}
    >
      <TextField
        label="Project name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        error={error}
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create project'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-[var(--radius-s)] px-2 py-1.5 text-xs text-navy/50 transition hover:text-navy"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
