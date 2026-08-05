// New for Truepoint's Drawings Studio - not ported from OpenConstructionERP.
// BIMViewer.tsx (the original) fetches model/element data from bim_hub's
// tiled 3D-Tiles backend; this instead loads a mesh file directly in the
// browser (loadMeshFile, from meshImport/loaders.ts) and drives the same
// standalone SceneManager/ClipManager/BIMViewCube classes against it.
// Pointer interaction (hover snap, measure, select) lives in the shared
// useViewerInteractions hook, also used by PrimitiveViewer.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AlertTriangle, Box, Loader2, Ruler, Scissors } from 'lucide-react';
import { SceneManager } from './SceneManager';
import { ClipManager } from './ClipManager';
import { BIMViewCube } from './BIMViewCube';
import { SnapDetector } from './SnapDetector';
import { installBVH, ensureBoundsTree } from './bvh';
import { useViewerInteractions } from './viewerInteractions';
import { loadMeshFile, defaultUnitFor } from './loaders';

interface ModelViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

export function ModelViewer({ fileUrl, fileName, className }: ModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const clipManagerRef = useRef<ClipManager | null>(null);
  const snapDetectorRef = useRef<SnapDetector | null>(null);
  const loadedObjectRef = useRef<THREE.Object3D | null>(null);

  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const interactions = useViewerInteractions(
    {
      canvasRef,
      sceneManagerRef,
      clipManagerRef,
      snapDetectorRef,
      loadedObjectRef,
    },
    defaultUnitFor('gltf'),
  );
  const { resetForTeardown } = interactions;

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
      loadedObjectRef.current = null;
      resetForTeardown();
    };
  }, [fileUrl, fileName, resetForTeardown]);

  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--radius-s)] border border-sand bg-white ${className ?? ''}`}>
      <canvas
        key={fileUrl}
        ref={canvasRef}
        className={`block h-[50svh] max-h-[520px] w-full ${interactions.cursorClass}`}
        onMouseDown={interactions.handlePointerDown}
        onMouseMove={interactions.handlePointerMove}
        onClick={interactions.handleCanvasClick}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-navy/60">
          <Loader2 className="animate-spin" size={24} aria-hidden="true" />
          <span className="text-sm">Loading model...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 px-6 text-center text-navy/70">
          <AlertTriangle size={24} className="text-gold-ink" aria-hidden="true" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {status === 'ready' && (
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
              <Box size={14} className="text-navy/50" aria-hidden="true" />
              {interactions.measureText ?? 'Click two points on the model to measure.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ModelViewer;
