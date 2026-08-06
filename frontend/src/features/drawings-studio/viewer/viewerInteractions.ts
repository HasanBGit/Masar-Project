// Shared pointer-interaction logic for the Drawings Studio viewers.
//
// ModelViewer and PrimitiveViewer previously each carried an identical copy of
// the raycast / snap / measure / select handling (~200 lines). This hook owns
// that behaviour once: hover snapping with a marker sphere, two-point distance
// measurement with a line overlay, click-to-select mesh highlighting, and the
// section/measure mode toggles. Behaviour is unchanged from the inlined
// originals.
import { useCallback, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import type { SceneManager } from './SceneManager';
import type { ClipManager } from './ClipManager';
import type { SnapDetector } from './SnapDetector';
import { distance3 } from './measureMath';

export const HIGHLIGHT_COLOR = new THREE.Color(0xf5c518);

interface MeasureState {
  points: THREE.Vector3[];
  distance: number | null;
}

export interface ViewerInteractionRefs {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sceneManagerRef: RefObject<SceneManager | null>;
  clipManagerRef: RefObject<ClipManager | null>;
  snapDetectorRef: RefObject<SnapDetector | null>;
  loadedObjectRef: RefObject<THREE.Object3D | null>;
}

export interface ViewerInteractions {
  sectionOn: boolean;
  measureOn: boolean;
  measureText: string | null;
  hoveredSnapInfo: string | null;
  cursorClass: string;
  handlePointerDown: (ev: React.MouseEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (ev: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasClick: (ev: React.MouseEvent<HTMLCanvasElement>) => void;
  toggleSection: () => void;
  toggleMeasure: () => void;
  clearSelection: () => void;
  clearMeasure: () => void;
  /** Drop every transient scene object reference (marker, line, selection).
   *  Call from the owning component's teardown, after SceneManager.dispose(). */
  resetForTeardown: () => void;
}

export function useViewerInteractions(refs: ViewerInteractionRefs, measureUnit = 'm'): ViewerInteractions {
  const { canvasRef, sceneManagerRef, clipManagerRef, snapDetectorRef, loadedObjectRef } = refs;

  const measureRef = useRef<MeasureState>({ points: [], distance: null });
  const selectedMeshRef = useRef<{ mesh: THREE.Mesh; color: THREE.Color } | null>(null);
  const measureLineRef = useRef<THREE.Line | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hoverMarkerRef = useRef<THREE.Mesh | null>(null);

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

  function raycastMeshes(ev: React.MouseEvent<HTMLCanvasElement>, sm: SceneManager, root: THREE.Object3D) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, sm.camera);
    const hits = raycaster.intersectObject(root, true);
    return hits.filter((h) => h.object instanceof THREE.Mesh);
  }

  function refineSnapPoint(hit: THREE.Intersection, mesh: THREE.Mesh, sm: SceneManager) {
    let point = hit.point;
    let kind = 'surface';
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
        kind = snap.kind;
      }
    }
    return { point, kind };
  }

  // Stable identities (they only touch refs + state setters) so consuming
  // effects can list them as dependencies without re-running.
  const clearSelection = useCallback(() => {
    const sel = selectedMeshRef.current;
    if (sel) {
      const mat = sel.mesh.material;
      if (!Array.isArray(mat) && 'color' in mat) (mat as THREE.MeshStandardMaterial).color.copy(sel.color);
      selectedMeshRef.current = null;
    }
  }, []);

  const clearMeasure = useCallback(() => {
    measureRef.current = { points: [], distance: null };
    setMeasureText(null);
    const sm = sceneManagerRef.current;
    if (measureLineRef.current && sm) {
      sm.scene.remove(measureLineRef.current);
      measureLineRef.current.geometry.dispose();
      measureLineRef.current = null;
      sm.requestRender();
    }
  }, [sceneManagerRef]);

  function handlePointerDown(ev: React.MouseEvent<HTMLCanvasElement>) {
    pointerDownPosRef.current = { x: ev.clientX, y: ev.clientY };
  }

  function handlePointerMove(ev: React.MouseEvent<HTMLCanvasElement>) {
    const sm = sceneManagerRef.current;
    const root = loadedObjectRef.current;
    if (!sm || !root) return;

    const meshHits = raycastMeshes(ev, sm, root);
    const marker = getHoverMarker(sm);

    if (meshHits.length > 0) {
      const hit = meshHits[0]!;
      const mesh = hit.object as THREE.Mesh;
      const { point, kind } = refineSnapPoint(hit, mesh, sm);
      marker.position.copy(point);
      marker.visible = true;
      setHoveredSnapInfo(`Snap: ${kind.replace('_', ' ')}`);
      sm.requestRender();
    } else if (marker.visible) {
      marker.visible = false;
      setHoveredSnapInfo(null);
      sm.requestRender();
    }
  }

  function handleCanvasClick(ev: React.MouseEvent<HTMLCanvasElement>) {
    // If the pointer moved more than 5px since pointerdown, it was a camera drag/orbit.
    if (pointerDownPosRef.current) {
      const dx = Math.abs(ev.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(ev.clientY - pointerDownPosRef.current.y);
      if (dx > 5 || dy > 5) return;
    }

    const sm = sceneManagerRef.current;
    const root = loadedObjectRef.current;
    if (!sm || !root) return;

    const meshHits = raycastMeshes(ev, sm, root);
    if (meshHits.length === 0) return;
    const hit = meshHits[0]!;
    const mesh = hit.object as THREE.Mesh;

    if (measureOn) {
      const { point } = refineSnapPoint(hit, mesh, sm);
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
        setMeasureText(`${dist.toFixed(3)} ${measureUnit} (model units)`);
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

  const resetForTeardown = useCallback(() => {
    selectedMeshRef.current = null;
    measureLineRef.current = null;
    hoverMarkerRef.current = null;
    measureRef.current = { points: [], distance: null };
    pointerDownPosRef.current = null;
  }, []);

  const cursorClass = measureOn
    ? 'cursor-crosshair'
    : hoveredSnapInfo
    ? 'cursor-pointer'
    : 'cursor-grab active:cursor-grabbing';

  return {
    sectionOn,
    measureOn,
    measureText,
    hoveredSnapInfo,
    cursorClass,
    handlePointerDown,
    handlePointerMove,
    handleCanvasClick,
    toggleSection,
    toggleMeasure,
    clearSelection,
    clearMeasure,
    resetForTeardown,
  };
}

/** Raycast a canvas point against a root object's meshes - standalone copy of the
 *  picking logic above (kept free of hook state) so ModelViewer's comment-pin
 *  placement can reuse it without going through useViewerInteractions' click mode. */
export function raycastMeshesAt(
  clientPoint: { clientX: number; clientY: number },
  sm: SceneManager,
  root: THREE.Object3D,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientPoint.clientX - rect.left) / rect.width) * 2 - 1,
    -((clientPoint.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, sm.camera);
  const hits = raycaster.intersectObject(root, true);
  return hits.filter((h) => h.object instanceof THREE.Mesh);
}
