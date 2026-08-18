import {
  CELL,
  VIEWBOX,
  clamp01,
  edgeKey,
  nodeCenter,
  nodeKey,
  nodeRadius,
  type Node,
} from '@namche/metaball';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import type { ResolvedMetaballShape } from './shape.js';

const MC_SUBTRACT = 12;
const MC_ISOLATION_MIN = 50;
const MC_ISOLATION_MAX = 130;
const GOO_STD_MIN = CELL * 0.02;
const GOO_STD_MAX = CELL * 0.18;
const GOO_THRESHOLD_MIN = 6;
const GOO_THRESHOLD_MAX = 44;
const FIT_PAD = 0.18;
const MAX_CAPSULE_STEPS = 20;

type Ball = { x: number; y: number; z: number; r: number };

export function isolationFromThreshold(contrast: number): number {
  const t = (contrast - GOO_THRESHOLD_MIN) / (GOO_THRESHOLD_MAX - GOO_THRESHOLD_MIN);
  return MC_ISOLATION_MIN + clamp01(t) * (MC_ISOLATION_MAX - MC_ISOLATION_MIN);
}

export function blurFromGooStd(blurAmount: number): { radiusScale: number; blur: number } {
  const t = (blurAmount - GOO_STD_MIN) / (GOO_STD_MAX - GOO_STD_MIN);
  const clamped = clamp01(t);
  return {
    radiusScale: 1 + clamped * 0.28,
    blur: clamped > 0.15 ? 0.35 + clamped * 0.45 : 0,
  };
}

function collectBalls(shape: ResolvedMetaballShape): Ball[] {
  const byId = new Map<string, Node>();
  for (const node of shape.nodes) byId.set(nodeKey(node.r, node.c), node);
  const balls: Ball[] = [];

  for (const node of shape.nodes) {
    const { cx, cy } = nodeCenter(node);
    balls.push({
      x: cx / VIEWBOX,
      y: 1 - cy / VIEWBOX,
      z: 0.5,
      r: nodeRadius(node) / VIEWBOX,
    });
  }

  for (const [a, b] of shape.edges) {
    const nodeA = byId.get(a);
    const nodeB = byId.get(b);
    if (!nodeA || !nodeB) continue;
    const centerA = nodeCenter(nodeA);
    const centerB = nodeCenter(nodeB);
    const pull = shape.edgePulls[edgeKey(a, b)] ?? shape.pinch;
    const factor = (shape.edgeFactors[edgeKey(a, b)] ?? shape.neck) * (1 - clamp01(pull));
    const radius = factor * Math.min(nodeRadius(nodeA), nodeRadius(nodeB));
    if (radius <= 0) continue;

    const x1 = centerA.cx / VIEWBOX;
    const y1 = 1 - centerA.cy / VIEWBOX;
    const x2 = centerB.cx / VIEWBOX;
    const y2 = 1 - centerB.cy / VIEWBOX;
    const radiusNorm = radius / VIEWBOX;
    const length = Math.hypot(x2 - x1, y2 - y1);
    const spacing = Math.max(radiusNorm * 0.72, 0.012);
    const steps = Math.min(MAX_CAPSULE_STEPS, Math.max(1, Math.round(length / spacing)));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      balls.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        z: 0.5,
        r: radiusNorm,
      });
    }
  }

  return balls;
}

function fitBalls(balls: Ball[]): {
  map: (x: number, y: number, z: number) => [number, number, number];
  scale: number;
} {
  if (balls.length === 0) return { map: (x, y, z) => [x, y, z], scale: 1 };

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const ball of balls) {
    minX = Math.min(minX, ball.x - ball.r);
    minY = Math.min(minY, ball.y - ball.r);
    minZ = Math.min(minZ, ball.z - ball.r);
    maxX = Math.max(maxX, ball.x + ball.r);
    maxY = Math.max(maxY, ball.y + ball.r);
    maxZ = Math.max(maxZ, ball.z + ball.r);
  }

  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-4);
  const scale = (1 - 2 * FIT_PAD) / span;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return {
    scale,
    map: (x, y, z) => [
      0.5 + (x - centerX) * scale,
      0.5 + (y - centerY) * scale,
      0.5 + (z - centerZ) * scale,
    ],
  };
}

export function updateMarchingCubesField(
  marchingCubes: MarchingCubes,
  shape: ResolvedMetaballShape,
): void {
  marchingCubes.isolation = isolationFromThreshold(shape.contrast);
  marchingCubes.reset();
  const balls = collectBalls(shape);
  if (balls.length === 0) {
    marchingCubes.update();
    return;
  }

  const { map, scale } = fitBalls(balls);
  const blurSettings = blurFromGooStd(shape.blur);
  for (const ball of balls) {
    const [x, y, z] = map(ball.x, ball.y, ball.z);
    const radius = ball.r * scale * blurSettings.radiusScale;
    const strength =
      (marchingCubes.isolation + MC_SUBTRACT) * radius * radius;
    marchingCubes.addBall(x, y, z, strength, MC_SUBTRACT);
  }
  if (blurSettings.blur > 0) marchingCubes.blur(blurSettings.blur);
  marchingCubes.update();
}
