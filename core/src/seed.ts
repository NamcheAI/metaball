import { GRID } from './constants.js'
import { clamp } from './geometry.js'
import type { Edge, Node, Size } from './types.js'

/** Small, fast, deterministic PRNG (mulberry32). Same seed → same sequence. */
export function rng(seed = 1): () => number {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash a value to a 32-bit seed, so seeds can be words as well as numbers. */
export function seedFrom(value: number | string): number {
  if (typeof value === 'number') return value >>> 0
  let h = 2166136261 >>> 0
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface SeedLayoutOptions {
  seed?: number | string
  /** Number of nodes, clamped to the available cells. @default 4 */
  count?: number
  /** Size names to draw from. @default ['M','L','L','XL'] */
  sizes?: Size[]
  /** Allow the outer ring of cells, not just the inner field. @default false */
  fullGrid?: boolean
  /** Extra links beyond the spanning structure. @default 0 */
  extraEdges?: number
  grid?: number
}

/**
 * Build a node/edge spec deterministically from a seed. Every node is
 * connected — each new node links to an existing one — so the result is a
 * single fused form rather than loose islands.
 */
export function layoutFromSeed(options: SeedLayoutOptions = {}): {
  nodes: Node[]
  edges: Edge[]
} {
  const grid = options.grid ?? GRID
  const fullGrid = options.fullGrid ?? false
  const sizes = options.sizes ?? (['M', 'L', 'L', 'XL'] as Size[])
  const rand = rng(seedFrom(options.seed ?? 1))

  const lo = fullGrid ? 0 : 1
  const hi = fullGrid ? grid - 1 : grid - 2
  const cells: Array<{ r: number; c: number }> = []
  for (let r = lo; r <= hi; r++) for (let c = lo; c <= hi; c++) cells.push({ r, c })

  const count = clamp(Math.round(options.count ?? 4), 1, cells.length)

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = cells[i]
    cells[i] = cells[j]
    cells[j] = tmp
  }

  const nodes: Node[] = cells.slice(0, count).map((cell) => ({
    r: cell.r,
    c: cell.c,
    size: sizes[Math.floor(rand() * sizes.length)],
  }))

  const key = (n: Node) => `${n.r}-${n.c}`
  const edges: Edge[] = []
  for (let i = 1; i < nodes.length; i++) {
    edges.push([key(nodes[Math.floor(rand() * i)]), key(nodes[i])])
  }

  const extra = clamp(Math.round(options.extraEdges ?? 0), 0, 16)
  for (let k = 0; k < extra && nodes.length > 2; k++) {
    const a = nodes[Math.floor(rand() * nodes.length)]
    const b = nodes[Math.floor(rand() * nodes.length)]
    if (a === b) continue
    const ka = key(a)
    const kb = key(b)
    const exists = edges.some(([x, y]) => (x === ka && y === kb) || (x === kb && y === ka))
    if (!exists) edges.push([ka, kb])
  }

  return { nodes, edges }
}
