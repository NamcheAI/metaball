// Adapter that turns the 2D Document into a live THREE.MarchingCubes isosurface
// for the 3D showcase view. Reuses the same per-edge neck/pinch logic as
// getMetaballShapes() so the Style sliders drive both renders identically.
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import {
  edgePull,
  edgeTubeFactor,
  effectiveNodeRadius,
  GOO_STD_MAX,
  GOO_STD_MIN,
  GOO_THRESHOLD_MAX,
  GOO_THRESHOLD_MIN,
  inwardTubeScale,
  nodeId,
  nodePosition,
  SVG_SIZE,
  type Document,
  type GridNode,
  type NodeId,
} from './model';

/** Real-time-safe field resolution for the MarchingCubes voxel grid. */
export const MC_RESOLUTION = 96;

// Fixed falloff steepness for each ball's field contribution. Isolation (the
// draw threshold) is what "Contrast" drives; this stays constant.
const MC_SUBTRACT = 12;

const MC_ISOLATION_MIN = 50;
const MC_ISOLATION_MAX = 130;

/** Padding inside the unit marching-cubes cube so the isosurface never clips. */
const FIT_PAD = 0.18;

/** Cap capsule ball count to keep rebuilds interactive while scrubbing. */
const MAX_CAPSULE_STEPS = 20;

type Ball = { x: number; y: number; z: number; r: number };

function ballRadiusNorm(r: number): number {
  return r / SVG_SIZE;
}

/** Contrast (gooThreshold) -> isolation. Higher contrast = tighter, sharper merges. */
export function isolationFromThreshold(gooThreshold: number): number {
  const t =
    (gooThreshold - GOO_THRESHOLD_MIN) / (GOO_THRESHOLD_MAX - GOO_THRESHOLD_MIN);
  const clamped = Math.min(1, Math.max(0, t));
  return MC_ISOLATION_MIN + clamped * (MC_ISOLATION_MAX - MC_ISOLATION_MIN);
}

/**
 * Blur (gooStd) -> soft radius inflate + at most one field blur pass.
 * Avoids the previous 1–4 full-volume blur loops, which dominate rebuild cost.
 */
export function blurFromGooStd(gooStd: number): { radiusScale: number; blur: number } {
  const t = (gooStd - GOO_STD_MIN) / (GOO_STD_MAX - GOO_STD_MIN);
  const clamped = Math.min(1, Math.max(0, t));
  return {
    radiusScale: 1 + clamped * 0.28,
    blur: clamped > 0.15 ? 0.35 + clamped * 0.45 : 0,
  };
}

function collectBalls(doc: Document): Ball[] {
  const byId = new Map<NodeId, GridNode>();
  for (const node of doc.nodes) byId.set(nodeId(node.r, node.c), node);

  const balls: Ball[] = [];

  for (const node of doc.nodes) {
    const { cx, cy } = nodePosition(node);
    balls.push({
      // Flip Y so the 3D view reads right-side-up by default.
      x: cx / SVG_SIZE,
      y: 1 - cy / SVG_SIZE,
      z: 0.5,
      r: ballRadiusNorm(effectiveNodeRadius(node)),
    });
  }

  for (const [a, b] of doc.edges) {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (!na || !nb) continue;
    const ca = nodePosition(na);
    const cb = nodePosition(nb);
    const pull = edgePull(a, b, doc.inwardPull, doc.edgePulls);
    const factor =
      edgeTubeFactor(a, b, doc.tubeFactor, doc.edgeFactors) * inwardTubeScale(pull);
    const r =
      factor * Math.min(effectiveNodeRadius(na), effectiveNodeRadius(nb));
    if (r <= 0) continue;

    const x1 = ca.cx / SVG_SIZE;
    const y1 = 1 - ca.cy / SVG_SIZE;
    const x2 = cb.cx / SVG_SIZE;
    const y2 = 1 - cb.cy / SVG_SIZE;
    const radiusNorm = ballRadiusNorm(r);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    // Slightly coarser than a true capsule sampling; enough for a smooth tube.
    const spacing = Math.max(radiusNorm * 0.72, 0.012);
    const steps = Math.min(MAX_CAPSULE_STEPS, Math.max(1, Math.round(length / spacing)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      balls.push({
        x: x1 + dx * t,
        y: y1 + dy * t,
        z: 0.5,
        r: radiusNorm,
      });
    }
  }

  return balls;
}

/** Fit the mark into the unit cube with padding so voxel resolution is spent on the shape. */
function fitTransform(balls: Ball[]): {
  map: (x: number, y: number, z: number) => [number, number, number];
  scale: number;
} {
  if (balls.length === 0) {
    return {
      map: (x, y, z) => [x, y, z],
      scale: 1,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const b of balls) {
    minX = Math.min(minX, b.x - b.r);
    minY = Math.min(minY, b.y - b.r);
    minZ = Math.min(minZ, b.z - b.r);
    maxX = Math.max(maxX, b.x + b.r);
    maxY = Math.max(maxY, b.y + b.r);
    maxZ = Math.max(maxZ, b.z + b.r);
  }

  const spanX = Math.max(maxX - minX, 1e-4);
  const spanY = Math.max(maxY - minY, 1e-4);
  const spanZ = Math.max(maxZ - minZ, 1e-4);
  const span = Math.max(spanX, spanY, spanZ);
  const usable = 1 - 2 * FIT_PAD;
  const scale = usable / span;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  return {
    scale,
    map: (x, y, z) => [
      0.5 + (x - cx) * scale,
      0.5 + (y - cy) * scale,
      0.5 + (z - cz) * scale,
    ],
  };
}

function addBallWithRadius(
  mc: MarchingCubes,
  x: number,
  y: number,
  z: number,
  radiusNorm: number,
): void {
  if (radiusNorm <= 0) return;
  // Isolated-ball isosurface sits at exactly `radiusNorm` regardless of the
  // current isolation setting: strength/(radius^2) - subtract = isolation.
  const strength = (mc.isolation + MC_SUBTRACT) * radiusNorm * radiusNorm;
  mc.addBall(x, y, z, strength, MC_SUBTRACT);
}

/**
 * Rebuilds the marching-cubes scalar field from the document and recomputes
 * the isosurface geometry in place. Call whenever nodes/edges/style change.
 */
export function updateMarchingCubesField(mc: MarchingCubes, doc: Document): void {
  mc.isolation = isolationFromThreshold(doc.gooThreshold);
  mc.reset();

  const balls = collectBalls(doc);
  if (balls.length === 0) {
    mc.update();
    return;
  }

  const { map, scale } = fitTransform(balls);
  const { radiusScale, blur } = blurFromGooStd(doc.gooStd);

  for (const b of balls) {
    const [x, y, z] = map(b.x, b.y, b.z);
    addBallWithRadius(mc, x, y, z, b.r * scale * radiusScale);
  }

  if (blur > 0) mc.blur(blur);
  mc.update();
  // MarchingCubes already writes normals; recomputing over the preallocated
  // buffer can corrupt unused verts and blank the mesh — leave MC normals as-is.
}
