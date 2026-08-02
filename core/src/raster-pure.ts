import { clamp, clamp01 } from './geometry.js'
import type { RenderData } from './types.js'

/**
 * Pure-JS rasterizer. No DOM, no canvas — runs in Node, workers, and the
 * browser alike, which is what makes headless baking and CI checks possible.
 *
 * Coverage is computed analytically from the signed distance to the union of
 * primitives (exact for circles and capsules), then blurred with the same
 * three-box-blur approximation the SVG spec prescribes for feGaussianBlur.
 */

/** Distance from point (px,py) to the segment (x1,y1)-(x2,y2). */
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  const t = lenSq === 0 ? 0 : clamp01(((px - x1) * dx + (py - y1) * dy) / lenSq)
  return Math.hypot(x1 + t * dx - px, y1 + t * dy - py)
}

/**
 * Rasterize the union of primitives into an alpha field, anti-aliased across
 * one pixel so the traced contour is smooth rather than stair-stepped.
 */
export function rasterize(
  { circles, capsules }: RenderData,
  rasterSize: number,
  scale: number,
): Float32Array {
  const field = new Float32Array(rasterSize * rasterSize)
  const inv = 1 / scale
  for (let y = 0; y < rasterSize; y++) {
    const py = (y + 0.5) * inv
    for (let x = 0; x < rasterSize; x++) {
      const px = (x + 0.5) * inv
      let dist = Infinity
      for (const c of circles) {
        const d = Math.hypot(px - c.cx, py - c.cy) - c.r
        if (d < dist) dist = d
      }
      for (const c of capsules) {
        const d = distToSegment(px, py, c.x1, c.y1, c.x2, c.y2) - c.r
        if (d < dist) dist = d
      }
      field[y * rasterSize + x] = clamp01(0.5 - dist * scale)
    }
  }
  return field
}

function boxBlurH(src: Float32Array, dst: Float32Array, size: number, box: number): void {
  const half = box >> 1
  const norm = 1 / box
  for (let y = 0; y < size; y++) {
    const row = y * size
    let sum = 0
    for (let i = -half; i <= half; i++) sum += src[row + clamp(i, 0, size - 1)]
    for (let x = 0; x < size; x++) {
      dst[row + x] = sum * norm
      sum +=
        src[row + clamp(x + half + 1, 0, size - 1)] - src[row + clamp(x - half, 0, size - 1)]
    }
  }
}

function boxBlurV(src: Float32Array, dst: Float32Array, size: number, box: number): void {
  const half = box >> 1
  const norm = 1 / box
  for (let x = 0; x < size; x++) {
    let sum = 0
    for (let i = -half; i <= half; i++) sum += src[clamp(i, 0, size - 1) * size + x]
    for (let y = 0; y < size; y++) {
      dst[y * size + x] = sum * norm
      sum +=
        src[clamp(y + half + 1, 0, size - 1) * size + x] -
        src[clamp(y - half, 0, size - 1) * size + x]
    }
  }
}

/**
 * Three successive box blurs — the SVG spec's Gaussian approximation, and
 * what browsers implement for feGaussianBlur and canvas `filter: blur()`.
 * Using the same approximation keeps baked assets visually identical to the
 * live filtered rendering.
 */
export function blurField(field: Float32Array, size: number, stdDev: number): Float32Array {
  if (stdDev <= 0) return field
  const box = Math.floor((stdDev * 3 * Math.sqrt(2 * Math.PI)) / 4 + 0.5)
  if (box < 1) return field
  // Odd box sizes blur symmetrically three times; even ones need a final
  // larger pass to stay centred (SVG 1.1 filter effects, feGaussianBlur).
  const passes = box % 2 === 1 ? [box, box, box] : [box, box, box + 1]
  let src = field
  const dst = new Float32Array(size * size)
  for (const pass of passes) {
    boxBlurH(src, dst, size, pass)
    boxBlurV(dst, src, size, pass)
  }
  return src
}
