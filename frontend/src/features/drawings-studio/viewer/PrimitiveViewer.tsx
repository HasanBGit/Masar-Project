// PrimitiveViewer – renders a primitive shape (box/cylinder/sphere) live in
// the browser with no file upload. The parent controls `shape` and `dims`; any
// prop change swaps the geometry in real time so the user sees the result
// immediately. Uses the same SceneManager / BIMViewCube / ClipManager stack as
// ModelViewer so orbit, section and measure all work out of the box.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AlertTriangle, Ruler, Scissors } from 'lucide-react';
import { SceneManager } from './SceneManager';
import { ClipManager } from './ClipManager';
import { BIMViewCube } from './BIMViewCube';
import { SnapDetector } from './SnapDetector';
import { distance3 } from './measureMath';
import { installBVH, ensureBoundsTree } from './bvh';
import { buildPrimitiveMesh, type PrimitiveShape, type PrimitiveDimensions } from './primitives';

interface PrimitiveViewerProps {
  shape: PrimitiveShape;
  dims: PrimitiveDimensions;
  className?: string;
}

interface MeasureState {
  points: THREE.Vector3[];
  distance: number | null;
}

const HIGHLIGHT_COLOR = new THREE.Color(0xf5c518);

export function PrimitiveViewer({ shape, dims, className }: PrimitiveViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const clipManagerRef = useRef<ClipManager | null>(null);
  const snapDetectorRef = useRef<SnapDetector | null>(null);
  const loadedObjectRef = useRef<THREE.Object3D | null>(null);
  const measureRef = useRef<MeasureState>({ points: [], distance: null });
  const selectedMeshRef = useRef<{ mesh: THREE.Mesh; color: THREE.Color } | null>(null);
  const measureLineRef = useRef<THREE.Line | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hoverMarkerRef = useRef<THREE.Mesh | null>(null);

  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionOn, setSectionOn] = useState(false);
  const [measureOn, setMeasureOn] = useState(false);
  const [measureText, setMeasureText] = useState<string | null>(null);
  const [hoveredSnapInfo, setHoveredSnapInfo] = useState<string | null>(null);

  function getHoverMarker(sm: SceneManager): THREE.Mesh {
    if (!hoverMarkerRef.current) {
      const geo = new THREE.SphereGeometry(0.12, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xf5c518, depthTest: false });
      const marker = new THREE.Mesh(geo, mat);
      marker.renderOrder = 999;
      marker.visible = false;
      sm.scene.add(marker);
      hoverMarkerRef.current = marker;
    }
    return hoverMarkerRef.current;
  }

  const prevShapeRef = useRef<PrimitiveShape>(shape);
  const isMountedRef = useRef(false);

  // ── Scene setup (runs once on mount) ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;

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

    // Initial shape load
    const mesh = buildPrimitiveMesh(shape, dims);
    mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) ensureBoundsTree(obj.geometry);
    });
    sm.scene.add(mesh);
    loadedObjectRef.current = mesh;
    clipManagerRef.current.invalidateModelBox();
    sm.zoomToFit();
    sm.requestRender();

    isMountedRef.current = true;

    if (disposed) return;

    return () => {
      disposed = true;
      clipManagerRef.current?.dispose();
      clipManagerRef.current = null;
      sm.dispose();
      sceneManagerRef.current = null;
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Live geometry swap when shape/dims change ───────────────────────────────
  useEffect(() => {
    if (!isMountedRef.current) return;
    const sm = sceneManagerRef.current;
    if (!sm) return;

    // Remove old mesh
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

    // Clear selection + measure when geometry swaps
    selectedMeshRef.current = null;
    if (measureLineRef.current) {
      sm.scene.remove(measureLineRef.current);
      measureLineRef.current.geometry.dispose();
      measureLineRef.current = null;
    }
    measureRef.current = { points: [], distance: null };
    setMeasureText(null);

    // Add new mesh
    const mesh = buildPrimitiveMesh(shape, dims);
    mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) ensureBoundsTree(obj.geometry);
    });
    sm.scene.add(mesh);
    loadedObjectRef.current = mesh;
    clipManagerRef.current?.invalidateModelBox();

    if (prevShapeRef.current !== shape) {
      sm.zoomToFit();
      prevShapeRef.current = shape;
    }
    sm.requestRender();
  }, [shape, dims]);

  // ── Interaction helpers ────────────────────────────────────────────────────
  function clearSelection() {
    const sel = selectedMeshRef.current;
    if (sel) {
      const mat = sel.mesh.material;
      if (!Array.isArray(mat) && 'color' in mat) (mat as THREE.MeshStandardMaterial).color.copy(sel.color);
      selectedMeshRef.current = null;
    }
  }

  function clearMeasure() {
    measureRef.current = { points: [], distance: null };
    setMeasureText(null);
    const sm = sceneManagerRef.current;
    if (measureLineRef.current && sm) {
      sm.scene.remove(measureLineRef.current);
      measureLineRef.current.geometry.dispose();
      measureLineRef.current = null;
      sm.requestRender();
    }
  }

  function handlePointerDown(ev: React.MouseEvent<HTMLCanvasElement>) {
    pointerDownPosRef.current = { x: ev.clientX, y: ev.clientY };
  }

  function handlePointerMove(ev: React.MouseEvent<HTMLCanvasElement>) {
    const sm = sceneManagerRef.current;
    const root = loadedObjectRef.current;
    if (!sm || !root) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, sm.camera);

    const hits = raycaster.intersectObject(root, true);
    const meshHits = hits.filter((h) => h.object instanceof THREE.Mesh);

    const marker = getHoverMarker(sm);

    if (meshHits.length > 0) {
      const hit = meshHits[0]!;
      const mesh = hit.object as THREE.Mesh;
      let point = hit.point;
      let snapKind = 'surface';

      if (hit.face) {
        const snap = snapDetectorRef.current?.refine(
          hit.point,
          hit.face,
          mesh,
          sm.camera,
          canvasRef.current!,
          hit.faceIndex ?? undefined,
        );
        if (snap && snap.kind !== 'none') {
          point = snap.point;
          snapKind = snap.kind;
        }
      }

      marker.position.copy(point);
      marker.visible = true;
      setHoveredSnapInfo(`Snap: ${snapKind.replace('_', ' ')}`);
      sm.requestRender();
    } else {
      if (marker.visible) {
        marker.visible = false;
        setHoveredSnapInfo(null);
        sm.requestRender();
      }
    }
  }

  function handleCanvasClick(ev: React.MouseEvent<HTMLCanvasElement>) {
    // If the pointer moved more than 5px since pointerdown, it was a camera drag/orbit
    if (pointerDownPosRef.current) {
      const dx = Math.abs(ev.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(ev.clientY - pointerDownPosRef.current.y);
      if (dx > 5 || dy > 5) return;
    }

    const sm = sceneManagerRef.current;
    const root = loadedObjectRef.current;
    if (!sm || !root) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, sm.camera);
    const hits = raycaster.intersectObject(root, true);
    const meshHits = hits.filter((h) => h.object instanceof THREE.Mesh);

    if (meshHits.length === 0) return;
    const hit = meshHits[0]!;
    const mesh = hit.object as THREE.Mesh;

    if (measureOn) {
      const snap = snapDetectorRef.current;
      let point = hit.point;
      if (hit.face && snap) {
        const refined = snap.refine(hit.point, hit.face, mesh, sm.camera, canvasRef.current!, hit.faceIndex ?? undefined);
        if (refined && refined.kind !== 'none') point = refined.point;
      }
      const points = [...measureRef.current.points, point.clone()];
      if (points.length > 2) points.shift();
      measureRef.current.points = points;

      if (measureLineRef.current) {
        sm.scene.remove(measureLineRef.current);
        measureLineRef.current.geometry.dispose();
        measureLineRef.current = null;
      }
      if (points.length === 2) {
        const dist = distance3(points[0]!, points[1]!);
        measureRef.current.distance = dist;
        setMeasureText(`${dist.toFixed(3)} m (model units)`);
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf5c518, depthTest: false }));
        sm.scene.add(line);
        measureLineRef.current = line;
      } else {
        setMeasureText('Pick a second point to measure the distance.');
      }
      sm.requestRender();
      return;
    }

    clearSelection();
    const mat = mesh.material;
    if (!Array.isArray(mat) && 'color' in mat) {
      const stdMat = mat as THREE.MeshStandardMaterial;
      selectedMeshRef.current = { mesh, color: stdMat.color.clone() };
      stdMat.color.copy(HIGHLIGHT_COLOR);
    }
    sm.requestRender();
  }

  function toggleSection() {
    const cm = clipManagerRef.current;
    if (!cm) return;
    const next = !sectionOn;
    setSectionOn(next);
    cm.setMode(next ? 'box' : 'none');
    if (next) cm.setBoxExtent({ maxX: 0.5 });
    sceneManagerRef.current?.requestRender();
  }

  function toggleMeasure() {
    setMeasureOn((v) => !v);
    clearMeasure();
  }

  if (error) {
    return (
      <div className={`flex h-[420px] flex-col items-center justify-center gap-2 rounded-[var(--radius-s)] border border-sand bg-white text-center text-navy/70 ${className ?? ''}`}>
        <AlertTriangle size={24} className="text-gold-ink" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  const cursorClass = measureOn
    ? 'cursor-crosshair'
    : hoveredSnapInfo
    ? 'cursor-pointer'
    : 'cursor-grab active:cursor-grabbing';

  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--radius-s)] border border-sand bg-white ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className={`block h-[420px] w-full ${cursorClass}`}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onClick={handleCanvasClick}
      />

      <BIMViewCube sceneManager={sceneManager} className="absolute right-3 top-3" size={72} />

      <div className="absolute left-3 top-3 flex gap-2">
        <button
          type="button"
          onClick={toggleSection}
          className={`flex items-center gap-1.5 rounded-[var(--radius-s)] border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
            sectionOn ? 'border-navy bg-navy text-cream' : 'border-sand bg-white text-navy hover:bg-cream'
          }`}
        >
          <Scissors size={14} /> Section
        </button>
        <button
          type="button"
          onClick={toggleMeasure}
          className={`flex items-center gap-1.5 rounded-[var(--radius-s)] border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
            measureOn ? 'border-navy bg-navy text-cream' : 'border-sand bg-white text-navy hover:bg-cream'
          }`}
        >
          <Ruler size={14} /> Measure
        </button>
      </div>

      {measureOn && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-[var(--radius-s)] border border-sand bg-white px-3 py-1.5 text-xs text-navy shadow-sm">
          {measureText ?? 'Click two points on the model to measure.'}
        </div>
      )}
    </div>
  );
}

export default PrimitiveViewer;
