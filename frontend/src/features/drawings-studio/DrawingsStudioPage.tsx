import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  Box,
  Layers,
  RotateCcw,
  Save,
  Shapes,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import type { DrawingModel, Project } from '../../lib/types'
import { useAuth } from '../auth/AuthContext'
import { getApiError } from '../../lib/api'
import { useProjectData } from '../../lib/useProjectData'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { TextField } from '../../components/ui/Field'
import { deleteDrawingModel, listDrawingModels, uploadDrawingModel } from './api'
import { MESH_IMPORT_EXTENSIONS } from './viewer/formats'
import { ModelViewer } from './viewer/ModelViewer'
import { PrimitiveViewer } from './viewer/PrimitiveViewer'
import {
  COLOR_PRESETS,
  DEFAULT_DIMENSIONS,
  buildPrimitiveMesh,
  buildSaudiArchitectureMesh,
  exportMeshToGlb,
  type PrimitiveDimensions,
  type PrimitiveShape,
} from './viewer/primitives'

const ACCEPT = MESH_IMPORT_EXTENSIONS.join(',')

const SHAPE_LABELS: Record<PrimitiveShape, string> = {
  saudi_tower: 'Saudi Architectural Tower',
  box: 'Box / Block',
  cylinder: 'Cylinder / Column',
  sphere: 'Sphere / Dome',
}

const SHAPE_BUTTONS: Record<PrimitiveShape, { icon: string; short: string }> = {
  saudi_tower: { icon: '🇸🇦', short: 'Saudi Tower' },
  box: { icon: '📦', short: 'Box' },
  cylinder: { icon: '🏛️', short: 'Pillar' },
  sphere: { icon: '🛢️', short: 'Sphere' },
}

/** Numeric dimension keys  -  colour has its own setter with its own type. */
type DimKey = 'width' | 'depth' | 'height' | 'radius'

interface PresetBlock {
  id: string
  name: string
  shape: PrimitiveShape
  dims: PrimitiveDimensions
  icon: string
}

const PRESET_BLOCKS: PresetBlock[] = [
  {
    id: 'saudi_tower',
    name: 'Riyadh Landmark Tower',
    shape: 'saudi_tower',
    dims: { width: 12, depth: 12, height: 42, radius: 6, color: '#d97706' },
    icon: '🇸🇦',
  },
  {
    id: 'najdi_palace',
    name: 'Diriyah Sandstone Podium',
    shape: 'saudi_tower',
    dims: { width: 18, depth: 18, height: 28, radius: 8, color: '#b45309' },
    icon: '🏛️',
  },
  {
    id: 'tower',
    name: 'Riyadh Tower Block',
    shape: 'box',
    dims: { width: 10, depth: 10, height: 32, radius: 4, color: '#2563eb' },
    icon: '🏢',
  },
  {
    id: 'slab',
    name: 'Foundation Concrete Slab',
    shape: 'box',
    dims: { width: 24, depth: 18, height: 2.5, radius: 4, color: '#64748b' },
    icon: '🧱',
  },
]

// ─── Upload modal/form ────────────────────────────────────────────────────────
function UploadForm({ project, onUploaded }: { project: Project; onUploaded: () => void }) {
  const toast = useToast()
  const fileInputId = useId()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm transition hover:bg-cream"
      >
        <UploadCloud size={14} className="text-gold-ink" aria-hidden="true" /> Upload 3D Mesh File
      </button>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await uploadDrawingModel(project.id, file, name.trim())
      setOpen(false)
      setFile(null)
      setName('')
      if (inputRef.current) inputRef.current.value = ''
      toast.success(`Uploaded "${name.trim()}" to project models.`)
      onUploaded()
    } catch (err) {
      setError(getApiError(err, 'Could not upload this model.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[var(--radius-m)] border border-sand bg-paper p-5 text-navy">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-navy">Upload 3D Mesh Export</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close upload form"
          className="rounded p-1 text-xs text-navy/40 transition hover:text-navy"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <p className="mb-3 text-xs text-navy/60">
        Supports glTF, GLB, OBJ, STL, FBX, DAE, 3DS, PLY, USD, or USDZ. Loaded directly in-browser.
      </p>
      <label htmlFor={fileInputId} className="mb-1 block text-xs font-semibold text-navy/70">
        Mesh file
      </label>
      <input
        id={fileInputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null
          setFile(picked)
          if (picked && !name) setName(picked.name.replace(/\.[^.]+$/, ''))
        }}
        className="mb-3 w-full text-xs text-navy"
      />
      <div className="mb-3">
        <TextField
          label="Model name"
          hideLabel
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Model name (e.g. Phase 1 Podium)"
          error={error}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !file || !name.trim()}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? 'Uploading...' : 'Upload Model'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/50 transition hover:text-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Number & Range input helper ─────────────────────────────────────────────
function DimInput({
  label,
  value,
  onChange,
  min = 0.5,
  max = 100,
  step = 0.5,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const inputId = useId()
  const [strVal, setStrVal] = useState(value.toString())

  useEffect(() => {
    setStrVal(value.toString())
  }, [value])

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-navy/60">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            id={inputId}
            type="number"
            min={min}
            max={max}
            step={step}
            value={strVal}
            onChange={(e) => {
              const raw = e.target.value
              setStrVal(raw)
              const n = parseFloat(raw)
              if (Number.isFinite(n) && n > 0) onChange(n)
            }}
            onBlur={() => {
              const n = parseFloat(strVal)
              if (!Number.isFinite(n) || n <= 0) {
                setStrVal(value.toString())
              } else {
                setStrVal(n.toString())
              }
            }}
            className="w-16 rounded-[var(--radius-s)] border border-sand bg-white px-2 py-1 text-xs font-semibold tabular-nums text-navy focus:border-navy"
          />
          <span className="text-xs font-medium text-navy/40">m</span>
        </div>
      </div>
      <input
        type="range"
        aria-label={`${label} (metres)`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value)
          if (Number.isFinite(n) && n > 0) onChange(n)
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sand/60 accent-navy transition hover:bg-sand"
      />
    </div>
  )
}

// ─── Main Drawings Studio Page ────────────────────────────────────────────────
const TABS = [
  { id: 'studio' as const, label: 'Interactive 3D Shape Studio' },
  { id: 'saved' as const, label: 'Saved Project Models' },
]

export function DrawingsStudioPage({ project }: { project: Project }) {
  const toast = useToast()
  const { me } = useAuth()
  // Matches the backend's destroy() gate: uploader or project owner/admin.
  const canDeleteModel = (m: DrawingModel) =>
    m.uploaded_by === me?.id || project.role === 'owner' || project.role === 'admin'
  const [activeTab, setActiveTab] = useState<'studio' | 'saved'>('studio')
  const [selectedModel, setSelectedModel] = useState<DrawingModel | null>(null)
  const [modelToDelete, setModelToDelete] = useState<DrawingModel | null>(null)

  // Interactive 3D Shape State
  const [shape, setShape] = useState<PrimitiveShape>('saudi_tower')
  const [dims, setDims] = useState<PrimitiveDimensions>(DEFAULT_DIMENSIONS)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('saudi_tower')
  const [shapeName, setShapeName] = useState('Riyadh Landmark Tower - Phase 1')
  const [savingShape, setSavingShape] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const autoSeededRef = useRef(false)

  // useProjectData discards stale responses when the active project switches
  // mid-request, so a slow load for project A can never overwrite project B.
  const loadModels = useCallback(async (projectId: number | string): Promise<DrawingModel[]> => {
    const pid = Number(projectId)
    const list = await listDrawingModels(pid)
    if (list.length === 0 && !autoSeededRef.current) {
      autoSeededRef.current = true
      try {
        const meshGroup = buildSaudiArchitectureMesh(DEFAULT_DIMENSIONS)
        const file = await exportMeshToGlb(meshGroup, 'Riyadh Landmark Tower - Phase 1.glb')
        await uploadDrawingModel(pid, file, 'Riyadh Landmark Tower - Phase 1')
        return await listDrawingModels(pid)
      } catch {
        // ignore auto-seed failures
        return list
      }
    }
    return list
  }, [])

  const { data, loading, error, reload } = useProjectData(project.id, loadModels)
  const models = data ?? []

  // A selected model belongs to the previous project once the switcher fires.
  useEffect(() => {
    setSelectedModel(null)
  }, [project.id])

  function setDim(key: DimKey, value: number) {
    setDims((d) => ({ ...d, [key]: value }))
  }

  function setColor(color: string) {
    setDims((d) => ({ ...d, color }))
  }

  function applyPreset(preset: PresetBlock) {
    setShape(preset.shape)
    setDims(preset.dims)
    setShapeName(preset.name)
    setSelectedPresetId(preset.id)
    setActiveTab('studio')
  }

  async function handleSaveShape(e: React.FormEvent) {
    e.preventDefault()
    if (savingShape || !shapeName.trim()) return
    setSavingShape(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const meshGroup = buildPrimitiveMesh(shape, dims)
      const file = await exportMeshToGlb(meshGroup, `${shapeName.trim()}.glb`)
      await uploadDrawingModel(project.id, file, shapeName.trim())
      setSaveSuccess(`Saved "${shapeName.trim()}" to project models.`)
      toast.success(`Saved "${shapeName.trim()}" to project models.`)
      reload()
    } catch (err) {
      const message = getApiError(err, 'Failed to save 3D shape as a project model.')
      setSaveError(message)
      toast.error(message)
    } finally {
      setSavingShape(false)
    }
  }

  const selectedTabId = selectedModel ? 'saved' : activeTab

  function activateTab(id: 'studio' | 'saved') {
    setActiveTab(id)
    if (id === 'studio') setSelectedModel(null)
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const current = TABS.findIndex((t) => t.id === selectedTabId)
    let next = -1
    if (e.key === 'ArrowRight') next = (current + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next === -1) return
    e.preventDefault()
    activateTab(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gold-ink">{project.name}</p>
          <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Drawings Studio</h1>
          <p className="mt-1 text-sm text-navy/60">
            View, orbit, section and measure 3D models. Build 3D blocks live or upload CAD/BIM mesh exports.
          </p>
        </div>
        <UploadForm project={project} onUploaded={reload} />
      </div>

      {/* Navigation Mode Bar */}
      <div className="flex items-center justify-between border-b border-sand pb-3">
        <div role="tablist" aria-label="Drawings Studio views" className="flex gap-2">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selectedTabId === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selectedTabId === tab.id ? 0 : -1}
              onClick={() => activateTab(tab.id)}
              onKeyDown={onTabKeyDown}
              className={`flex items-center gap-2 rounded-[var(--radius-s)] px-3 py-1.5 text-xs font-semibold transition ${
                selectedTabId === tab.id ? 'bg-navy text-cream shadow-sm' : 'bg-paper text-navy/70 hover:bg-sand/40'
              }`}
            >
              {tab.id === 'studio' ? (
                <Sparkles size={14} className={selectedTabId === 'studio' ? 'text-gold-soft' : 'text-gold-ink'} aria-hidden="true" />
              ) : (
                <Layers size={14} aria-hidden="true" />
              )}
              {tab.label}
              {tab.id === 'saved' ? ` (${models.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Viewport Section */}
      <div
        role="tabpanel"
        id="panel-studio"
        aria-labelledby="tab-studio"
        className="grid grid-cols-1 gap-6 lg:grid-cols-4"
      >
        {/* 3D Viewport (3 Cols). On mobile the controls come first so the
            shape/dimension inputs are reachable without scrolling past the
            tall canvas. */}
        <div className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-navy">
              <Box size={14} className="text-gold-ink" aria-hidden="true" />
              {selectedModel ? selectedModel.name : `Live 3D Viewport: ${SHAPE_LABELS[shape]}`}
            </span>
            {selectedModel && (
              <button
                onClick={() => setSelectedModel(null)}
                className="text-xs font-semibold text-navy/60 underline transition hover:text-navy"
              >
                Back to Live Shape Editor
              </button>
            )}
          </div>

          {/* 3D Canvas */}
          {selectedModel ? (
            <ModelViewer
              fileUrl={selectedModel.file}
              fileName={`${selectedModel.name}.${selectedModel.format}`}
              modelId={selectedModel.id}
              meId={me?.id}
              isOwnerOrAdmin={project.role === 'owner' || project.role === 'admin'}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <PrimitiveViewer shape={shape} dims={dims} />
              <div className="flex items-center justify-between rounded-[var(--radius-s)] border border-sand bg-paper px-3 py-2 text-xs font-semibold text-navy">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-agreeing animate-pulse" aria-hidden="true" />
                  <span>
                    {shape === 'saudi_tower' && `Saudi Tower: Base ${dims.width}m × ${dims.depth}m | Height ${dims.height}m`}
                    {shape === 'box' && `Box: ${dims.width}m (W) × ${dims.depth}m (D) × ${dims.height}m (H)`}
                    {shape === 'cylinder' && `Cylinder: Radius ${dims.radius}m × Height ${dims.height}m`}
                    {shape === 'sphere' && `Sphere: Radius ${dims.radius}m`}
                  </span>
                </span>
                <span className="font-mono text-navy/70">
                  Est. Volume: {
                    (shape === 'saudi_tower' || shape === 'box'
                      ? dims.width * dims.depth * dims.height * (shape === 'saudi_tower' ? 0.72 : 1)
                      : shape === 'cylinder'
                      ? Math.PI * Math.pow(dims.radius, 2) * dims.height
                      : (4 / 3) * Math.PI * Math.pow(dims.radius, 3)
                    ).toLocaleString(undefined, { maximumFractionDigits: 1 })
                  } m³
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Control Panel (1 Col) */}
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          {!selectedModel ? (
            <div className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-sand bg-paper p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-sand/60 pb-2">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-navy">
                  <Shapes size={14} className="text-gold-ink" aria-hidden="true" /> 3D Block Controls
                </h2>
                <button
                  onClick={() => setDims(DEFAULT_DIMENSIONS)}
                  aria-label="Reset dimensions"
                  title="Reset dimensions"
                  className="rounded p-1 text-navy/40 transition hover:text-navy"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                </button>
              </div>

              {/* Shape Selection - Selective Button Group */}
              <div className="flex flex-col gap-1.5">
                <span id="geometry-type-label" className="text-xs font-semibold uppercase tracking-wider text-navy/50">
                  Geometry Type
                </span>
                <div
                  role="group"
                  aria-labelledby="geometry-type-label"
                  className="grid grid-cols-2 gap-1.5 rounded-[var(--radius-s)] border border-sand bg-sand/30 p-1"
                >
                  {(Object.keys(SHAPE_LABELS) as PrimitiveShape[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-label={SHAPE_LABELS[s]}
                      aria-pressed={shape === s}
                      onClick={() => {
                        setShape(s)
                        setSelectedPresetId(null)
                      }}
                      className={`flex items-center justify-center gap-1 rounded-[var(--radius-s)] py-1.5 text-xs font-semibold transition ${
                        shape === s
                          ? 'bg-navy text-cream shadow-sm'
                          : 'text-navy/70 hover:bg-white/60 hover:text-navy'
                      }`}
                    >
                      <span aria-hidden="true">{SHAPE_BUTTONS[s].icon}</span> {SHAPE_BUTTONS[s].short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions Input Grid */}
              <div className="flex flex-wrap gap-3">
                {(shape === 'box' || shape === 'saudi_tower') && (
                  <>
                    <DimInput label="Base Width" value={dims.width} onChange={(v) => { setDim('width', v); setSelectedPresetId(null) }} />
                    <DimInput label="Base Depth" value={dims.depth} onChange={(v) => { setDim('depth', v); setSelectedPresetId(null) }} />
                    <DimInput label="Total Height" value={dims.height} onChange={(v) => { setDim('height', v); setSelectedPresetId(null) }} />
                  </>
                )}
                {(shape === 'cylinder' || shape === 'sphere') && (
                  <DimInput label="Radius" value={dims.radius} onChange={(v) => { setDim('radius', v); setSelectedPresetId(null) }} />
                )}
                {shape === 'cylinder' && (
                  <DimInput label="Height" value={dims.height} onChange={(v) => { setDim('height', v); setSelectedPresetId(null) }} />
                )}
              </div>

              {/* Color Presets */}
              <div className="flex flex-col gap-1.5">
                <span id="material-color-label" className="text-xs font-semibold uppercase tracking-wider text-navy/50">
                  Material Color
                </span>
                <div role="group" aria-labelledby="material-color-label" className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => {
                    const isSelected = (dims.color ?? '#2563eb') === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        aria-label={c.name}
                        aria-pressed={isSelected}
                        title={c.name}
                        style={{ backgroundColor: c.value }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-white transition ${
                          isSelected ? 'border-navy scale-110 shadow-md ring-2 ring-navy/30' : 'border-white opacity-80 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <span className="text-xs font-bold" aria-hidden="true">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preset Blocks */}
              <div className="flex flex-col gap-1.5 border-t border-sand/60 pt-2">
                <span id="quick-presets-label" className="text-xs font-semibold uppercase tracking-wider text-navy/50">
                  Quick 3D Presets
                </span>
                <div role="group" aria-labelledby="quick-presets-label" className="grid grid-cols-2 gap-2">
                  {PRESET_BLOCKS.map((p) => {
                    const isSelected = selectedPresetId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => applyPreset(p)}
                        className={`flex items-center gap-1.5 rounded-[var(--radius-s)] border p-2 text-start text-xs font-semibold transition ${
                          isSelected
                            ? 'border-navy bg-navy/15 font-bold text-navy shadow-sm ring-1 ring-navy'
                            : 'border-sand bg-white text-navy/80 hover:border-navy/40 hover:bg-cream/40'
                        }`}
                      >
                        <span className="text-sm" aria-hidden="true">{p.icon}</span>
                        <span className="truncate text-xs">{p.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Save Block Form */}
              <form onSubmit={handleSaveShape} className="flex flex-col gap-2 border-t border-sand/60 pt-2">
                <TextField
                  label="Save to Project"
                  value={shapeName}
                  onChange={(e) => setShapeName(e.target.value)}
                  placeholder="Block / Model Name"
                  error={saveError}
                />
                <button
                  type="submit"
                  disabled={savingShape || !shapeName.trim()}
                  className="flex items-center justify-center gap-1.5 rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-50"
                >
                  <Save size={13} aria-hidden="true" /> {savingShape ? 'Saving Model...' : 'Save to Project Models'}
                </button>
                {saveSuccess && (
                  <p role="status" className="text-xs font-semibold text-status-agreeing">
                    {saveSuccess}
                  </p>
                )}
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-[var(--radius-m)] border border-sand bg-paper p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Model Metadata</h2>
              <div className="space-y-1.5 text-xs text-navy/70">
                <p>
                  <span className="font-semibold text-navy">Name:</span> {selectedModel.name}
                </p>
                <p>
                  <span className="font-semibold text-navy">Format:</span>{' '}
                  <span className="uppercase">{selectedModel.format}</span>
                </p>
                <p>
                  <span className="font-semibold text-navy">Uploaded by:</span> {selectedModel.uploaded_by_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-[var(--radius-s)] border border-navy/30 bg-white py-1.5 text-xs font-semibold text-navy transition hover:bg-cream"
              >
                Switch to 3D Shape Studio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Models Grid */}
      <div role="tabpanel" id="panel-saved" aria-labelledby="tab-saved" className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">
            Saved Models & 3D Exports ({models.length})
          </h2>
        </div>

        {loading ? (
          <div role="status" aria-label="Loading saved models" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} compact />
        ) : models.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No saved models yet"
            hint="Use the 3D Shape Studio above to save a block, or upload a mesh file."
            compact
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <div
                key={m.id}
                className={`flex items-center justify-between gap-2 rounded-[var(--radius-m)] border p-3 text-xs transition ${
                  selectedModel?.id === m.id
                    ? 'border-navy bg-navy/10 shadow-sm'
                    : 'border-sand bg-white hover:border-navy/40'
                }`}
              >
                <button
                  onClick={() => {
                    setSelectedModel(m)
                    setActiveTab('saved')
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-start"
                >
                  <Box size={16} className="shrink-0 text-gold-ink" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy">{m.name}</span>
                    <span className="block text-xs uppercase text-navy/40">{m.format}</span>
                  </span>
                </button>
                {canDeleteModel(m) && (
                  <button
                    onClick={() => setModelToDelete(m)}
                    aria-label={`Delete ${m.name}`}
                    title="Delete model"
                    className="shrink-0 rounded p-1 text-navy/40 transition hover:bg-status-escalated/10 hover:text-status-escalated"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={modelToDelete !== null}
        onClose={() => setModelToDelete(null)}
        title="Delete model"
        message={`Delete "${modelToDelete?.name ?? ''}" from this project's saved models? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!modelToDelete) return
          await deleteDrawingModel(modelToDelete.id)
          if (selectedModel?.id === modelToDelete.id) setSelectedModel(null)
          toast.success(`Deleted "${modelToDelete.name}".`)
          reload()
        }}
      />
    </div>
  )
}
