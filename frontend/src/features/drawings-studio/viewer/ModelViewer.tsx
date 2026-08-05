// New for Truepoint's Drawings Studio - not ported from OpenConstructionERP.
// BIMViewer.tsx (the original) fetches model/element data from bim_hub's
// tiled 3D-Tiles backend; this instead loads a mesh file directly in the
// browser (loadMeshFile, from meshImport/loaders.ts) and drives the same
// standalone SceneManager/ClipManager/BIMViewCube classes against it.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AlertTriangle, Box, Loader2, Ruler, Scissors } from 'lucide-react';
import { SceneManager } from './SceneManager';
import { ClipManager } from './ClipManager';
import { BIMViewCube } from './BIMViewCube';
import { SnapDetector } from './SnapDetector';
import { distance3 } from './measureMath';
import { installBVH, ensureBoundsTree } from './bvh';
import { loadMeshFile, defaultUnitFor } from './loaders';

interface ModelViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

interface MeasureState {
  points: THREE.Vector3[];
  distance: number | null;
}

const HIGHLIGHT_COLOR = new THREE.Color(0xf5c518);

export function ModelViewer({ fileUrl, fileName, className }: ModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const clipManagerRef = useRef<ClipManager | null>(null);
  const snapDetectorRef = useRef<SnapDetector | null>(null);
  const loadedObjectRef = useRef<THREE.Object3D | null>(null);
  const measureRef = useRef<MeasureState>({ points: [], distance: null });
  const selectedMeshRef = useRef<{ mesh: THREE.Mesh; color: THREE.Color } | null>(null);
  const measureLineRef = useRef<THREE.Line | null>(null);

  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sectionOn, setSectionOn] = useState(false);
  const [measureOn, setMeasureOn] = useState(false);
  const [measureText, setMeasureText] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;

    installBVH();
    // WebGL context creation can fail outright (disabled/blocklisted GPU,
    // headless/automated browser, exhausted per-page context budget) -
    // SceneManager.createRenderer() already falls back through progressively
    // reduced options, but a genuinely WebGL-less environment still throws.
    // Catch it here the same way OpenConstructionERP's BIMViewer.tsx does,
    // so that failure shows a friendly message instead of unmounting the
    // whole page (there is no error boundary above this component).
    let sm: SceneManager;
    try {
      sm = new SceneManager(canvas);
    } catch (err) {
      console.warn('[ModelViewer] WebGL unavailable, 3D view disabled:', err);
      setError('3D graphics are not available in this browser (WebGL could not start). Try a different browser or device.');
      setStatus('error');
      return;
    }
    sceneManagerRef.current = sm;
    clipManagerRef.current = new ClipManager(sm);
    snapDetectorRef.current = new SnapDetector();
    setSceneManager(sm);

    (async () => {
      try {
        // DRF's FileField serialises to a full absolute URL, e.g.
        // http://127.0.0.1:8010/media/drawings_studio/model.glb. In dev that
        // is cross-origin relative to the Vite dev server (port 5174) so a
        // plain fetch() would need CORS pre-flight and hit the backend
        // directly. Instead we always normalise the URL to a path-only form
        // so it travels through the Vite proxy (/media → Django) in dev.
        // In production VITE_API_URL is set, so we prepend the backend origin
        // to keep it pointing at the right host.
        const apiBase = import.meta.env.VITE_API_URL as string | undefined;
        const backendOrigin = apiBase ? new URL(apiBase).origin : '';

        let resolvedUrl: string;
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
          // Absolute URL from the serializer: strip the origin so the Vite
          // proxy can intercept it in dev. In production re-prefix with the
          // configured backend origin so it reaches the right host.
          const parsed = new URL(fileUrl);
          resolvedUrl = backendOrigin + parsed.pathname + parsed.search;
        } else {
          resolvedUrl = backendOrigin + fileUrl;
        }

        // Attach the JWT so authenticated media endpoints can validate the
        // request (and for future media-auth enforcement).
        const { tokenStore } = await import('../../../lib/api');
        const token = tokenStore.getAccess();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(resolvedUrl, { headers });
        if (!res.ok) throw new Error(`Could not download the file (${res.status}).`);
        const blob = await res.blob();
        const file = new File([blob], fileName);
        const { object, format } = await loadMeshFile(file);
        if (disposed) return;
        object.traverse((obj) => {
          if (obj instanceof THREE.Mesh) ensureBoundsTree(obj.geometry);
        });
        sm.scene.add(object);
        loadedObjectRef.current = object;
        clipManagerRef.current?.invalidateModelBox();
        sm.zoomToFit();
        sm.requestRender();
        setStatus('ready');
        void format;
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : 'Could not load this model.');
        setStatus('error');
      }
    })();

    return () => {
      disposed = true;
      clipManagerRef.current?.dispose();
      clipManagerRef.current = null;
      sm.dispose();
      sceneManagerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, fileName]);

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

  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hoverMarkerRef = useRef<THREE.Mesh | null>(null);
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
      let point = hit.point;
      if (hit.face) {
        const snap = snapDetectorRef.current?.refine(
          hit.point, hit.face, mesh, sm.camera, canvasRef.current!, hit.faceIndex ?? undefined,
        );
        if (snap && snap.kind !== 'none') point = snap.point;
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
        const unit = defaultUnitFor('gltf');
        setMeasureText(`${dist.toFixed(3)} ${unit} (model units)`);
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

    // Selection mode: highlight the picked mesh, restoring the previous one.
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

  const cursorClass = measureOn
    ? 'cursor-crosshair'
    : hoveredSnapInfo
    ? 'cursor-pointer'
    : 'cursor-grab active:cursor-grabbing';

  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--radius-s)] border border-sand bg-white ${className ?? ''}`}>
      <canvas
        key={fileUrl}
        ref={canvasRef}
        className={`block h-[520px] w-full ${cursorClass}`}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onClick={handleCanvasClick}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-navy/60">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-sm">Loading model...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 px-6 text-center text-navy/70">
          <AlertTriangle size={24} className="text-gold-ink" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {status === 'ready' && (
        <>
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
              <Box size={14} className="text-navy/50" />
              {measureText ?? 'Click two points on the model to measure.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ModelViewer;
