// Idle liquid simmer: internal swirl so goo / refraction / caustics keep changing.
import { clampRadius, nodeId, nodePosition, type Edge, type GridNode } from './model';

export type SimmerDisplay = {
  nodes: GridNode[];
  edges: Edge[];
};

function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function markCentroid(nodes: GridNode[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const node of nodes) {
    const { cx, cy } = nodePosition(node);
    sx += cx;
    sy += cy;
  }
  return { x: sx / nodes.length, y: sy / nodes.length };
}

/**
 * Internal fluid motion: swirl around centroid + radius breathing.
 * Strong enough that 2D refraction and 3D caustics visibly evolve.
 */
export function applySimmerDisplay(
  nodes: GridNode[],
  edges: Edge[],
  elapsedMs: number,
  amplitude = 1,
): SimmerDisplay {
  if (nodes.length === 0 || amplitude <= 0.001) {
    return { nodes, edges };
  }

  const t = elapsedMs / 1000;
  const amp = 5.5 * amplitude;
  const { x: cx, y: cy } = markCentroid(nodes);
  const swirl = t * (0.55 + amplitude * 0.25);

  const displayNodes: GridNode[] = nodes.map((node) => {
    const id = nodeId(node.r, node.c);
    const ph = hash01(`${id}|simmer`);
    const ph2 = hash01(`${id}|simmer2`);
    const pos = nodePosition(node);
    const rx = pos.cx - cx;
    const ry = pos.cy - cy;
    const len = Math.hypot(rx, ry) || 1;
    // Tangential flow around the blob (internal current).
    const tx = -ry / len;
    const ty = rx / len;
    const flow =
      Math.sin(swirl * 1.4 + ph * Math.PI * 2) * amp * (0.7 + ph2 * 0.5) +
      Math.sin(swirl * 0.55 + ph2 * 4.2) * amp * 0.45;
    const radial =
      Math.sin(swirl * 0.9 + ph * 5.1) * amp * 0.35 +
      Math.cos(t * 1.3 + ph2 * 3.3) * amp * 0.22;

    const targetX = pos.cx + tx * flow + (rx / len) * radial;
    const targetY = pos.cy + ty * flow + (ry / len) * radial;
    const cellX = pos.cx - (node.offsetX ?? 0);
    const cellY = pos.cy - (node.offsetY ?? 0);

    const next: GridNode = {
      ...node,
      offsetX: targetX - cellX,
      offsetY: targetY - cellY,
    };

    const baseR = node.radius;
    const breath = 1 + Math.sin(t * 1.7 + ph * 6.8) * 0.055 * amplitude;
    if (baseR != null) {
      next.radius = clampRadius(baseR * breath);
    } else {
      // Soft size pulse even without override — via temporary radius.
      // Leave size alone; offset motion is enough for most looks.
    }
    return next;
  });

  return { nodes: displayNodes, edges };
}
