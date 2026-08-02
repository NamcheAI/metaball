import { clamp01, edgeKey, nodeCenter, nodeKey, nodeRadius } from './geometry'
import type { Capsule, Circle, Edge, Node, RenderData } from './types'

/** Per-edge value with fallback to a global default. */
const edgeValue = (
  a: string,
  b: string,
  fallback: number,
  map?: Record<string, number>,
) => map?.[edgeKey(a, b)] ?? fallback

/** Capsule radius for an edge: neck factor × un-pinched fraction × the
 *  smaller node radius. Shared with the canvas hit/highlight widths so the
 *  clickable area can never drift from the rendered neck. */
export const capsuleRadius = (factor: number, pull: number, rA: number, rB: number) =>
  factor * (1 - clamp01(pull)) * Math.min(rA, rB)

/**
 * Turn nodes + edges into the raw geometry the renderer and the flatten
 * exporter both consume: a circle per node and a capsule (fat round-capped
 * line) per edge. The capsule radius is the edge's neck factor times its
 * un-pinched fraction times the smaller of the two node radii.
 */
export function buildRenderData(
  nodes: Node[],
  edges: Edge[],
  tubeFactor: number,
  edgeFactors?: Record<string, number>,
  inwardPull = 0,
  edgePulls?: Record<string, number>,
): RenderData {
  const byKey = new Map<string, Node>()
  for (const n of nodes) byKey.set(nodeKey(n.r, n.c), n)

  const circles: Circle[] = nodes.map((n) => {
    const { cx, cy } = nodeCenter(n)
    return { cx, cy, r: nodeRadius(n) }
  })

  const capsules: Capsule[] = []
  for (const [aKey, bKey] of edges) {
    const a = byKey.get(aKey)
    const b = byKey.get(bKey)
    if (!a || !b) continue
    const ca = nodeCenter(a)
    const cb = nodeCenter(b)
    const pull = edgeValue(aKey, bKey, inwardPull, edgePulls)
    const factor = edgeValue(aKey, bKey, tubeFactor, edgeFactors)
    const r = capsuleRadius(factor, pull, nodeRadius(a), nodeRadius(b))
    capsules.push({ x1: ca.cx, y1: ca.cy, x2: cb.cx, y2: cb.cy, r })
  }

  return { circles, capsules }
}
