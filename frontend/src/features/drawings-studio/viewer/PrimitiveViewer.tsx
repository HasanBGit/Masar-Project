// PrimitiveViewer – renders a primitive shape (box/cylinder/sphere) live in
// the browser with no file upload. The parent controls `shape` and `dims`; a
// shape (or colour) change rebuilds the geometry, while numeric dimension
// changes only rescale the existing mesh so slider drags stay cheap. Uses the
// same SceneManager / BIMViewCube / ClipManager stack as ModelViewer so orbit,
// section and measure all work out of the box.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AlertTriangle, Loader2, Ruler, Scissors } from 'lucide-react';
import { SceneManager } from './SceneManager';
import { ClipManager } from './ClipManager';
import { BIMViewCube } from './BIMViewCube';
import { SnapDetector } from './SnapDetector';
import { installBVH, ensureBoundsTree } from './bvh';
import { useViewerInteractions } from './viewerInteractions';
import { buildPrimitiveMesh, type PrimitiveShape, type PrimitiveDimensions } from './primitives';

interface PrimitiveViewerProps {
  shape: PrimitiveShape;
  dims: PrimitiveDimensions;
  className?: string;
}

/** The dimensions a mesh was built with, so later changes can be applied as scale. */
interface BuiltMeshInfo {
  dims: PrimitiveDimensions;
  baseY: number;
}

export function PrimitiveViewer({ shape, dims, className }: PrimitiveViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const clipManagerRef = useRef<ClipManager | null>(null);
  const snapDetectorRef = useRef<SnapDetector | null>(null);
  const loadedObjectRef = useRef<THREE.Object3D | null>(null);
  const builtInfoRef = useRef<BuiltMeshInfo | null>(null);
  const prevShapeRef = useRef<PrimitiveShape | null>(null);

  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const interactions = useViewerInteractions({
    canvasRef,
    sceneManagerRef,
    clipManagerRef,
    snapDetectorRef,
    loadedObjectRef,
  });
  const { clearSelection, clearMeasure, resetForTeardown } = interactions;

  // The rebuild effect reads the latest dims through a ref so that numeric
  // dimension changes do NOT trigger a full geometry rebuild (they are applied
  // as a scale update in the effect below instead).
  const dimsRef = useRef(dims);
  dimsRef.current = dims;
  const { width, depth, height, radius, color } = dims;

  // ── Scene setup (runs once on mount) ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    installBVH();

    let sm: SceneManager;
    try {
      sm = new SceneManager(canvas);
    } catch (err) {
      console.warn('[PrimitiveViewer] WebGL unavailable:', err);
      setError('3D graphics are not available in this browser (WebGL could not start).');
      return;
    }

    sceneManagerRef.current = sm;
    clipManagerRef.current = new ClipManager(sm);
    snapDetectorRef.current = new SnapDetector();
    setSceneManager(sm);
    setReady(true);

    return () => {
      clipManagerRef.current?.dispose();
      clipManagerRef.current = null;
      sm.dispose();
      sceneManagerRef.current = null;
      loadedObjectRef.current = null;
      builtInfoRef.current = null;
      prevShapeRef.current = null;
      resetForTeardown();
      setReady(false);
    };
  }, [resetForTeardown]);

  // ── Full geometry rebuild — only when the shape or colour changes ──────────
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;

    // Remove and dispose the old mesh.
    if (loadedObjectRef.current) {
      sm.scene.remove(loadedObjectRef.current);
      loadedObjectRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
      loadedObjectRef.current = null;
    }

    // Clear selection + measure overlays: they referenced the old geometry.
    clearSelection();
    clearMeasure();

    // Build the new mesh at the current dimensions.
    const currentDims = { ...dimsRef.current };
    const mesh = buildPrimitiveMesh(shape, currentDims);
    mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) ensureBoundsTree(obj.geometry);
    });
    sm.scene.add(mesh);
    loadedObjectRef.current = mesh;
    builtInfoRef.current = { dims: currentDims, baseY: mesh.position.y };
    clipManagerRef.current?.invalidateModelBox();

    if (prevShapeRef.current !== shape) {
      sm.zoomToFit();
      prevShapeRef.current = shape;
    }
    sm.requestRender();
    // Dimensions are intentionally read through dimsRef so slider ticks
    // rescale (effect below) instead of rebuilding all geometry.
  }, [shape, color, sceneManager, clearSelection, clearMeasure]);

  // ── Cheap scale update — numeric dimension changes rescale the built mesh ──
  useEffect(() => {
    const sm = sceneManagerRef.current;
    const obj = loadedObjectRef.current;
    const built = builtInfoRef.current;
    if (!sm || !obj || !built) return;

    let sx = 1;
    let sy = 1;
    let sz = 1;
    if (shape === 'sphere') {
      sx = sy = sz = radius / built.dims.radius;
    } else if (shape === 'cylinder') {
      sx = sz = radius / built.dims.radius;
      sy = height / built.dims.height;
    } else {
      // box / saudi_tower
      sx = width / built.dims.width;
      sy = height / built.dims.height;
      sz = depth / built.dims.depth;
    }
    obj.scale.set(sx, sy, sz);
    // Keep the mesh resting on the ground plane (built.baseY was height/2 or
    // radius for centred geometries, 0 for the ground-anchored tower group).
    obj.position.y = built.baseY * sy;
    obj.updateMatrixWorld();

    // Measurement endpoints no longer lie on the surface after a rescale.
    clearMeasure();
    clipManagerRef.current?.invalidateModelBox();
    sm.requestRender();
  }, [shape, width, depth, height, radius, clearMeasure]);

  if (error) {
    return (
      <div
        className={`flex h-[50svh] max-h-[420px] flex-col items-center justify-center gap-2 rounded-[var(--radius-s)] border border-sand bg-white text-center text-navy/70 ${className ?? ''}`}
      >
        <AlertTriangle size={24} className="text-gold-ink" aria-hidden="true" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--radius-s)] border border-sand bg-white ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className={`block h-[50svh] max-h-[420px] w-full ${interactions.cursorClass}`}
        onMouseDown={interactions.handlePointerDown}
        onMouseMove={interactions.handlePointerMove}
        onClick={interactions.handleCanvasClick}
      />

      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-navy/60">
          <Loader2 className="animate-spin" size={24} aria-hidden="true" />
          <span className="text-sm">Preparing 3D view...</span>
        </div>
      )}

      {ready && (
        <>
          <BIMViewCube sceneManager={sceneManager} className="absolute end-3 top-3" size={72} />

          <div className="absolute start-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={interactions.toggleSection}
              className={`flex items-center gap-1.5 rounded-[var(--radius-s)] border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
                interactions.sectionOn ? 'border-navy bg-navy text-cream' : 'border-sand bg-white text-navy hover:bg-cream'
              }`}
            >
              <Scissors size={14} aria-hidden="true" /> Section
            </button>
            <button
              type="button"
              onClick={interactions.toggleMeasure}
              className={`flex items-center gap-1.5 rounded-[var(--radius-s)] border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition ${
                interactions.measureOn ? 'border-navy bg-navy text-cream' : 'border-sand bg-white text-navy hover:bg-cream'
              }`}
            >
              <Ruler size={14} aria-hidden="true" /> Measure
            </button>
          </div>

          {interactions.measureOn && (
            <div className="absolute bottom-3 start-3 flex items-center gap-2 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy shadow-sm">
              {interactions.measureText ?? 'Click two points on the model to measure.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PrimitiveViewer;
