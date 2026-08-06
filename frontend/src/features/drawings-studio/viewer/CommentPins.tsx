// HTML overlay markers for pinned comments on a DrawingModel - projected from
// each comment's stored 3D position onto screen space every camera move via
// SceneManager.onCameraChange. Deliberately not a raycast-hit-testable 3D
// object: an absolutely-positioned button is far simpler than adding pins to
// the scene graph and picking them out in the click handler.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import type { SceneManager } from './SceneManager';
import type { DrawingComment } from '../../../lib/types';

interface PinPosition {
  id: number;
  x: number;
  y: number;
  resolved: boolean;
}

export interface CommentPinsProps {
  sceneManager: SceneManager | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Root comments only (position_x/y/z set). */
  comments: DrawingComment[];
  activeCommentId: number | null;
  onSelectPin: (id: number) => void;
}

export function CommentPins({ sceneManager, canvasRef, comments, activeCommentId, onSelectPin }: CommentPinsProps) {
  const [positions, setPositions] = useState<PinPosition[]>([]);
  const vecRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!sceneManager || !canvas) {
      setPositions([]);
      return;
    }

    function recompute() {
      const rect = canvas!.getBoundingClientRect();
      const next: PinPosition[] = [];
      for (const c of comments) {
        if (c.position_x == null || c.position_y == null || c.position_z == null) continue;
        const vec = vecRef.current.set(c.position_x, c.position_y, c.position_z);
        // Camera-space z > 0 means the point sits behind the camera - three.js's
        // NDC divide can otherwise fold that behind-camera point back into the
        // visible [-1, 1] range, so this check has to happen before project().
        const camSpace = vec.clone().applyMatrix4(sceneManager!.camera.matrixWorldInverse);
        if (camSpace.z > 0) continue;
        vec.project(sceneManager!.camera);
        if (vec.x < -1.2 || vec.x > 1.2 || vec.y < -1.2 || vec.y > 1.2) continue;
        next.push({
          id: c.id,
          x: (vec.x * 0.5 + 0.5) * rect.width,
          y: (-vec.y * 0.5 + 0.5) * rect.height,
          resolved: c.resolved,
        });
      }
      setPositions(next);
    }

    recompute();
    const unsubscribe = sceneManager.onCameraChange(recompute);
    return () => unsubscribe();
  }, [sceneManager, canvasRef, comments]);

  return (
    <>
      {positions.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectPin(p.id)}
          aria-label={p.resolved ? `Open resolved comment thread ${p.id}` : `Open comment thread ${p.id}`}
          style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%, -100%)' }}
          className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-md transition ${
            p.id === activeCommentId
              ? 'scale-125 border-navy bg-gold-soft'
              : p.resolved
              ? 'border-status-agreeing bg-white'
              : 'border-navy bg-white hover:scale-110'
          }`}
        >
          {p.resolved ? (
            <CheckCircle2 size={12} className="text-status-agreeing" aria-hidden="true" />
          ) : (
            <MessageCircle size={12} className="text-navy" aria-hidden="true" />
          )}
        </button>
      ))}
    </>
  );
}
