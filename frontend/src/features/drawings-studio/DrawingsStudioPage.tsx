import { useEffect, useRef, useState } from 'react'
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
        className="flex items-center gap-1.5 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm hover:bg-cream"
      >
        <UploadCloud size={14} className="text-gold-ink" /> Upload 3D Mesh File
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-sand bg-paper p-4 text-navy">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-navy">Upload 3D Mesh Export</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/40 hover:text-navy">
          ✕
        </button>
      </div>
      <p className="mb-3 text-xs text-navy/60">
        Supports glTF, GLB, OBJ, STL, FBX, DAE, 3DS, PLY, USD, or USDZ. Loaded directly in-browser.
      </p>
      <input
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
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Model name (e.g. Phase 1 Podium)"
        className="mb-3 w-full rounded-[var(--radius-s)] border border-sand bg-white px-3 py-2 text-xs text-navy"
      />
      {error && <p className="mb-3 text-xs font-medium text-status-escalated">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy || !file || !name.trim()}
          onClick={async () => {
            if (!file) return
            setBusy(true)
            setError(null)
            try {
              await uploadDrawingModel(project.id, file, name.trim())
              setOpen(false)
              setFile(null)
              setName('')
              if (inputRef.current) inputRef.current.value = ''
              onUploaded()
            } catch (e: any) {
              setError(e?.response?.data?.non_field_errors?.[0] ?? e?.response?.data?.file?.[0] ?? 'Could not upload this model.')
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
        >
          {busy ? 'Uploading...' : 'Upload Model'}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-navy/50 hover:text-navy">
          Cancel
        </button>
      </div>
    </div>
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
  const [strVal, setStrVal] = useState(value.toString())

  useEffect(() => {
    setStrVal(value.toString())
  }, [value])

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-navy/60">{label}</span>
        <div className="flex items-center gap-1">
          <input
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
            className="w-16 rounded border border-sand bg-white px-2 py-1 text-xs font-semibold tabular-nums text-navy focus:border-navy focus:outline-none"
          />
          <span className="text-xs text-navy/40 font-medium">m</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value)
          if (Number.isFinite(n) && n > 0) onChange(n)
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-sand/60 accent-navy hover:bg-sand"
      />
    </div>
  )
}

// ─── Main Drawings Studio Page ────────────────────────────────────────────────
export function DrawingsStudioPage({ project }: { project: Project }) {
  const [models, setModels] = useState<DrawingModel[]>([])
  const [activeTab, setActiveTab] = useState<'studio' | 'saved'>('studio')
  const [selectedModel, setSelectedModel] = useState<DrawingModel | null>(null)

  // Interactive 3D Shape State
  const [shape, setShape] = useState<PrimitiveShape>('saudi_tower')
  const [dims, setDims] = useState<PrimitiveDimensions>(DEFAULT_DIMENSIONS)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('saudi_tower')
  const [shapeName, setShapeName] = useState('Riyadh Landmark Tower — Phase 1')
  const [savingShape, setSavingShape] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const autoSeededRef = useRef(false)

  async function loadModels() {
    try {
      const list = await listDrawingModels(project.id)
      setModels(list)
      if (list.length === 0 && !autoSeededRef.current) {
        autoSeededRef.current = true
        try {
          const meshGroup = buildSaudiArchitectureMesh(DEFAULT_DIMENSIONS)
          const file = await exportMeshToGlb(meshGroup, 'Riyadh Landmark Tower — Phase 1.glb')
          await uploadDrawingModel(project.id, file, 'Riyadh Landmark Tower — Phase 1')
          const updated = await listDrawingModels(project.id)
          setModels(updated)
        } catch {
          // ignore auto-seed failures
        }
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  function setDim(key: keyof PrimitiveDimensions, value: number) {
    setDims((d) => ({ ...d, [key]: value }))
  }

  function applyPreset(preset: PresetBlock) {
    setShape(preset.shape)
    setDims(preset.dims)
    setShapeName(preset.name)
    setSelectedPresetId(preset.id)
    setActiveTab('studio')
  }

  async function handleDeleteModel(id: number) {
    await deleteDrawingModel(id)
    if (selectedModel?.id === id) setSelectedModel(null)
    await loadModels()
  }

  async function handleSaveShape() {
    setSavingShape(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const meshGroup = buildPrimitiveMesh(shape, dims)
      const file = await exportMeshToGlb(meshGroup, `${shapeName.trim()}.glb`)
      await uploadDrawingModel(project.id, file, shapeName.trim())
      setSaveSuccess(`Saved "${shapeName.trim()}" to project models.`)
      await loadModels()
    } catch {
      setSaveError('Failed to save 3D shape as a project model.')
    } finally {
      setSavingShape(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gold-ink">{project.name}</p>
          <h1 className="font-[var(--font-display)] text-3xl font-bold text-navy">Drawings Studio</h1>
          <p className="mt-1 text-sm text-navy/60">
            View, orbit, section and measure 3D models — build 3D blocks live or upload CAD/BIM mesh exports.
          </p>
        </div>
        <UploadForm project={project} onUploaded={loadModels} />
      </div>

      {/* Navigation Mode Bar */}
      <div className="flex items-center justify-between border-b border-sand pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('studio')
              setSelectedModel(null)
            }}
            className={`flex items-center gap-2 rounded-[var(--radius-s)] px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'studio' && !selectedModel
                ? 'bg-navy text-cream shadow-sm'
                : 'bg-paper text-navy/70 hover:bg-sand/40'
            }`}
          >
            <Sparkles size={14} className="text-gold-ink" /> Interactive 3D Shape Studio
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 rounded-[var(--radius-s)] px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'saved' || selectedModel
                ? 'bg-navy text-cream shadow-sm'
                : 'bg-paper text-navy/70 hover:bg-sand/40'
            }`}
          >
            <Layers size={14} /> Saved Project Models ({models.length})
          </button>
        </div>
      </div>

      {/* Main 3D Viewport Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 3D Viewport (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
              <Box size={14} className="text-gold-ink" />
              {selectedModel ? selectedModel.name : `Live 3D Viewport — ${SHAPE_LABELS[shape]}`}
            </span>
            {selectedModel && (
              <button
                onClick={() => setSelectedModel(null)}
                className="text-xs font-semibold text-navy/60 hover:text-navy underline"
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
            />
          ) : (
            <div className="flex flex-col gap-2">
              <PrimitiveViewer shape={shape} dims={dims} />
              <div className="flex items-center justify-between rounded-[var(--radius-s)] border border-sand bg-paper px-3 py-2 text-xs font-semibold text-navy">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-active animate-pulse" />
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
        <div className="flex flex-col gap-4">
          {!selectedModel ? (
            <div className="rounded-[var(--radius-m)] border border-sand bg-paper p-4 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-sand/60 pb-2">
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <Shapes size={14} className="text-gold-ink" /> 3D Block Controls
                </h3>
                <button
                  onClick={() => setDims(DEFAULT_DIMENSIONS)}
                  title="Reset dimensions"
                  className="text-navy/40 hover:text-navy"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Shape Selection - Selective Button Group */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-navy/50">Geometry Type</label>
                <div className="grid grid-cols-2 gap-1.5 rounded-[var(--radius-s)] bg-sand/30 p-1 border border-sand">
                  {(Object.keys(SHAPE_LABELS) as PrimitiveShape[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setShape(s)
                        setSelectedPresetId(null)
                      }}
                      className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded transition ${
                        shape === s
                          ? 'bg-navy text-cream shadow-sm'
                          : 'text-navy/70 hover:bg-white/60 hover:text-navy'
                      }`}
                    >
                      {s === 'saudi_tower' ? '🇸🇦 Saudi Tower' : s === 'box' ? '📦 Box' : s === 'cylinder' ? '🏛️ Pillar' : '🛢️ Sphere'}
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
                <label className="text-[11px] font-semibold uppercase tracking-wider text-navy/50">Material Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => {
                    const isSelected = (dims.color ?? '#2563eb') === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setDim('color' as keyof PrimitiveDimensions, c.value as any)}
                        title={c.name}
                        style={{ backgroundColor: c.value }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-white transition ${
                          isSelected ? 'border-navy scale-110 shadow-md ring-2 ring-navy/30' : 'border-white opacity-80 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preset Blocks */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-sand/60">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-navy/50">Quick 3D Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_BLOCKS.map((p) => {
                    const isSelected = selectedPresetId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className={`flex items-center gap-1.5 rounded-[var(--radius-s)] border p-2 text-left text-xs font-semibold transition ${
                          isSelected
                            ? 'border-navy bg-navy/15 ring-1 ring-navy text-navy font-bold shadow-sm'
                            : 'border-sand bg-white text-navy/80 hover:border-navy/40 hover:bg-cream/40'
                        }`}
                      >
                        <span className="text-sm">{p.icon}</span>
                        <span className="truncate text-[11px]">{p.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Save Block Form */}
              <div className="flex flex-col gap-2 pt-2 border-t border-sand/60">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-navy/50">Save to Project</label>
                <input
                  value={shapeName}
                  onChange={(e) => setShapeName(e.target.value)}
                  placeholder="Block / Model Name"
                  className="rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy focus:border-navy focus:outline-none"
                />
                <button
                  disabled={savingShape || !shapeName.trim()}
                  onClick={handleSaveShape}
                  className="flex items-center justify-center gap-1.5 rounded-[var(--radius-s)] bg-navy px-3 py-2 text-xs font-semibold text-cream hover:bg-navy/90 disabled:opacity-50"
                >
                  <Save size={13} /> {savingShape ? 'Saving Model...' : 'Save to Project Models'}
                </button>
                {saveSuccess && <p className="text-[11px] font-semibold text-status-closed">{saveSuccess}</p>}
                {saveError && <p className="text-[11px] font-semibold text-status-escalated">{saveError}</p>}
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius-m)] border border-sand bg-paper p-4 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-navy uppercase tracking-wider">Model Metadata</h3>
              <div className="text-xs text-navy/70 space-y-1.5">
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
                className="mt-2 flex items-center justify-center gap-1.5 rounded-[var(--radius-s)] border border-navy/30 bg-white py-1.5 text-xs font-semibold text-navy hover:bg-cream"
              >
                Switch to 3D Shape Studio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Models Grid */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-lg font-bold text-navy">
            Saved Models & 3D Exports ({models.length})
          </h2>
        </div>

        {models.length === 0 ? (
          <div className="rounded-[var(--radius-m)] border border-dashed border-sand bg-paper p-6 text-center text-xs text-navy/50">
            No saved models yet. Use the 3D Shape Studio above to save a block, or upload a mesh file.
          </div>
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
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Box size={16} className="shrink-0 text-gold-ink" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy">{m.name}</span>
                    <span className="block text-[10px] uppercase text-navy/40">{m.format}</span>
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteModel(m.id)}
                  title="Delete model"
                  className="shrink-0 rounded p-1 text-navy/40 hover:bg-status-escalated/10 hover:text-status-escalated"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
