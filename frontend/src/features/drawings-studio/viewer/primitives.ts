// Truepoint's Drawings Studio - Live 3D Shape & Saudi Architectural Preset Generator
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export type PrimitiveShape = 'saudi_tower' | 'box' | 'cylinder' | 'sphere';

export interface PrimitiveDimensions {
  /** Metres. Box: width/depth/height. Cylinder: radius/height. Sphere: radius. */
  width: number;
  depth: number;
  height: number;
  radius: number;
  color?: string;
}

export const DEFAULT_DIMENSIONS: PrimitiveDimensions = {
  width: 10,
  depth: 10,
  height: 36,
  radius: 5,
  color: '#d97706', // Saudi Gold
};

export const COLOR_PRESETS = [
  { name: 'Saudi Gold', value: '#d97706' },
  { name: 'Blue Steel', value: '#2563eb' },
  { name: 'Slate Navy', value: '#1e293b' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Crimson', value: '#dc2626' },
  { name: 'Concrete', value: '#64748b' },
];

/**
 * Builds a multi-tiered, highly detailed Saudi Architectural Landmark model.
 * Features:
 * - Stepped Sandstone Najdi Podium Base with arched entryway portals
 * - Tier 1: Lower glass curtain wall skyscraper section
 * - Tier 2: Mid-tower tapered setback terrace
 * - Tier 3: Upper octagonal executive crown
 * - Top: Slender structural gold spire with a diamond crest peak
 */
export function buildSaudiArchitectureMesh(dims: PrimitiveDimensions): THREE.Group {
  const group = new THREE.Group();

  const primaryColorHex = dims.color ?? '#d97706';
  const primaryColor = new THREE.Color(primaryColorHex);
  const glassColor = new THREE.Color('#1e3a8a'); // Deep Sapphire Blue Glass
  const trimColor = new THREE.Color('#f59e0b'); // Bright Saudi Gold Trim
  const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 1.5 });

  const mainMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.3,
    metalness: 0.4,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: glassColor,
    roughness: 0.15,
    metalness: 0.7,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.2,
    metalness: 0.8,
  });

  const totalH = Math.max(dims.height, 12);
  const baseW = Math.max(dims.width, 6);
  const baseD = Math.max(dims.depth, 6);

  // 1. Podium (Sandstone Najdi Stepped Base)
  const podiumH = totalH * 0.15;
  const podiumGeo = new THREE.BoxGeometry(baseW * 1.4, podiumH, baseD * 1.4);
  const podiumMesh = new THREE.Mesh(podiumGeo, mainMat);
  podiumMesh.position.y = podiumH / 2;
  group.add(podiumMesh);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(podiumGeo), edgeLineMat));

  // Entrance Archway Portals (front & back)
  const archH = podiumH * 0.65;
  const archW = baseW * 0.4;
  const archGeo = new THREE.BoxGeometry(archW, archH, baseD * 1.42);
  const archMesh = new THREE.Mesh(archGeo, trimMat);
  archMesh.position.y = archH / 2;
  group.add(archMesh);

  // 2. Main Tower Tier 1 (Lower Skyscraper Body)
  const tier1H = totalH * 0.35;
  const tier1W = baseW;
  const tier1D = baseD;
  const tier1Geo = new THREE.BoxGeometry(tier1W, tier1H, tier1D);
  const tier1Mesh = new THREE.Mesh(tier1Geo, glassMat);
  tier1Mesh.position.y = podiumH + tier1H / 2;
  group.add(tier1Mesh);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(tier1Geo), edgeLineMat));

  // Tier 1 Gold Trim Band
  const trim1Geo = new THREE.BoxGeometry(tier1W * 1.05, totalH * 0.02, tier1D * 1.05);
  const trim1Mesh = new THREE.Mesh(trim1Geo, trimMat);
  trim1Mesh.position.y = podiumH + tier1H;
  group.add(trim1Mesh);

  // 3. Main Tower Tier 2 (Mid Tapered Terrace)
  const tier2H = totalH * 0.28;
  const tier2W = baseW * 0.8;
  const tier2D = baseD * 0.8;
  const tier2Geo = new THREE.BoxGeometry(tier2W, tier2H, tier2D);
  const tier2Mesh = new THREE.Mesh(tier2Geo, glassMat);
  tier2Mesh.position.y = podiumH + tier1H + tier2H / 2;
  group.add(tier2Mesh);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(tier2Geo), edgeLineMat));

  // Tier 2 Trim Band
  const trim2Geo = new THREE.BoxGeometry(tier2W * 1.06, totalH * 0.02, tier2D * 1.06);
  const trim2Mesh = new THREE.Mesh(trim2Geo, trimMat);
  trim2Mesh.position.y = podiumH + tier1H + tier2H;
  group.add(trim2Mesh);

  // 4. Main Tower Tier 3 (Upper Executive Crown)
  const tier3H = totalH * 0.15;
  const tier3W = baseW * 0.55;
  const tier3Geo = new THREE.CylinderGeometry(tier3W * 0.5, tier3W * 0.7, tier3H, 8);
  const tier3Mesh = new THREE.Mesh(tier3Geo, mainMat);
  tier3Mesh.position.y = podiumH + tier1H + tier2H + tier3H / 2;
  group.add(tier3Mesh);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(tier3Geo), edgeLineMat));

  // 5. Crown Spire & Diamond Crest
  const spireH = totalH * 0.18;
  const spireRadius = Math.max(baseW * 0.04, 0.25);
  const spireGeo = new THREE.CylinderGeometry(0.05, spireRadius, spireH, 16);
  const spireMesh = new THREE.Mesh(spireGeo, trimMat);
  spireMesh.position.y = podiumH + tier1H + tier2H + tier3H + spireH / 2;
  group.add(spireMesh);

  // Diamond Crest Top
  const diamondGeo = new THREE.OctahedronGeometry(baseW * 0.12);
  const diamondMesh = new THREE.Mesh(diamondGeo, trimMat);
  diamondMesh.position.y = podiumH + tier1H + tier2H + tier3H + spireH + baseW * 0.08;
  group.add(diamondMesh);

  return group;
}

export function buildPrimitiveMesh(shape: PrimitiveShape, dims: PrimitiveDimensions): THREE.Group {
  if (shape === 'saudi_tower') {
    return buildSaudiArchitectureMesh(dims);
  }

  const group = new THREE.Group();
  let geometry: THREE.BufferGeometry;
  let posY = 0;

  switch (shape) {
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(dims.radius, dims.radius, dims.height, 32);
      posY = dims.height / 2;
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(dims.radius, 32, 24);
      posY = dims.radius;
      break;
    case 'box':
    default:
      geometry = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
      posY = dims.height / 2;
      break;
  }

  const colorHex = dims.color ?? '#2563eb';
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.35,
    metalness: 0.25,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add sharp crisp edge lines for professional BIM readability
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 1.5 });
  const lineSegments = new THREE.LineSegments(edges, lineMat);
  group.add(lineSegments);

  group.position.y = posY;
  return group;
}

export async function exportMeshToGlb(object: THREE.Object3D, fileName: string): Promise<File> {
  const exporter = new GLTFExporter();
  const glb = (await exporter.parseAsync(object, { binary: true })) as ArrayBuffer;
  return new File([glb], fileName, { type: 'model/gltf-binary' });
}
