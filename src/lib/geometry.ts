import {
  CELL,
  MARGIN,
  OFFSET_LIMIT,
  PITCH,
  PULL_BLUR_BOOST,
  RADIUS_MAX,
  RADIUS_MIN,
  SIZE_FACTORS,
} from './constants'
import type { Node, Size } from './types'

// --- clamps ------------------------------------------------------------------
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const clamp01 = (v: number) => clamp(v, 0, 1)
export const clampRadius = (v: number) => clamp(v, RADIUS_MIN, RADIUS_MAX)
export const clampOffset = (v: number) => clamp(v, -OFFSET_LIMIT, OFFSET_LIMIT)

// --- cell geometry -----------------------------------------------------------
export const cellRect = (r: number, c: number) => ({
  x: MARGIN + c * PITCH,
  y: MARGIN + r * PITCH,
  w: CELL,
  h: CELL,
})

export const cellCenter = (r: number, c: number) => {
  const { x, y, w, h } = cellRect(r, c)
  return { cx: x + w / 2, cy: y + h / 2 }
}

// --- node geometry -----------------------------------------------------------
export const sizeRadius = (size: Size) => CELL * SIZE_FACTORS[size]
export const nodeRadius = (n: Node) => n.radius ?? sizeRadius(n.size)

export const nodeCenter = (n: Node) => {
  const { cx, cy } = cellCenter(n.r, n.c)
  return { cx: cx + (n.offsetX ?? 0), cy: cy + (n.offsetY ?? 0) }
}

// --- cell classification -----------------------------------------------------
/** The inner 3×3 block (rows/cols 1..3) is where nodes live by default. */
export const isInner = (r: number, c: number) => r >= 1 && r <= 3 && c >= 1 && c <= 3
export const isPlaceable = (r: number, c: number, fullGrid: boolean) =>
  fullGrid || isInner(r, c)

// --- keys --------------------------------------------------------------------
export const nodeKey = (r: number, c: number) => `${r}-${c}`
export const parseKey = (key: string) => {
  const [r, c] = key.split('-').map(Number)
  return { r, c }
}
/** Undirected edge key — sorted so (a,b) and (b,a) collapse to one entry. */
export const edgeKey = (a: string, b: string) => [a, b].sort().join('|')

// --- blur ratio --------------------------------------------------------------
/** Pinch fades the connecting tubes, so we boost blur to keep the blobs
 *  merging: std · (1 + clamp01(pull) · PULL_BLUR_BOOST). */
export const effectiveBlur = (gooStd: number, inwardPull: number) =>
  gooStd * (1 + clamp01(inwardPull) * PULL_BLUR_BOOST)
