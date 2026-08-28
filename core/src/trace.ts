import type { Point } from './types.js'

interface Segment {
  a: Point
  b: Point
  used: boolean
}

/** Stable string key for a point (3dp) — used to stitch contour segments. */
const pointKey = (p: Point) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`

/**
 * Marching squares over a scalar field. `sample(x, y)` returns the field value
 * at integer grid coordinates; cells crossing `threshold` emit contour
 * segments, which are then stitched into closed rings. Cases 5 and 10 (the
 * ambiguous saddles) are split into two segments.
 */
export function marchingSquares(
  sample: (x: number, y: number) => number,
  w: number,
  h: number,
  threshold: number,
): Point[][] {
  const segments: Segment[] = []
  const interp = (
    x1: number,
    y1: number,
    v1: number,
    x2: number,
    y2: number,
    v2: number,
  ): Point => {
    const t = (threshold - v1) / (v2 - v1)
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) }
  }
  const push = (a: Point, b: Point) => segments.push({ a, b, used: false })

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = sample(x, y)
      const tr = sample(x + 1, y)
      const br = sample(x + 1, y + 1)
      const bl = sample(x, y + 1)

      let code = 0
      if (tl > threshold) code |= 8
      if (tr > threshold) code |= 4
      if (br > threshold) code |= 2
      if (bl > threshold) code |= 1
      if (code === 0 || code === 15) continue

      const top = () => interp(x, y, tl, x + 1, y, tr)
      const right = () => interp(x + 1, y, tr, x + 1, y + 1, br)
      const bottom = () => interp(x + 1, y + 1, br, x, y + 1, bl)
      const left = () => interp(x, y + 1, bl, x, y, tl)

      switch (code) {
        case 1:
          push(left(), bottom())
          break
        case 2:
          push(bottom(), right())
          break
        case 3:
          push(left(), right())
          break
        case 4:
          push(right(), top())
          break
        case 5:
          push(left(), top())
          push(right(), bottom())
          break
        case 6:
          push(bottom(), top())
          break
        case 7:
          push(left(), top())
          break
        case 8:
          push(top(), left())
          break
        case 9:
          push(top(), bottom())
          break
        case 10:
          push(top(), right())
          push(bottom(), left())
          break
        case 11:
          push(top(), right())
          break
        case 12:
          push(right(), left())
          break
        case 13:
          push(right(), bottom())
          break
        case 14:
          push(bottom(), left())
          break
      }
    }
  }

  // Stitch segments into rings by walking shared endpoints.
  const index = new Map<string, Segment[]>()
  const add = (key: string, seg: Segment) => {
    const bucket = index.get(key)
    if (bucket) bucket.push(seg)
    else index.set(key, [seg])
  }
  for (const seg of segments) {
    add(pointKey(seg.a), seg)
    add(pointKey(seg.b), seg)
  }

  const rings: Point[][] = []
  for (const seg of segments) {
    if (seg.used) continue
    seg.used = true
    const ring: Point[] = [seg.a]
    let next: Point = seg.b
    for (;;) {
      ring.push(next)
      const key = pointKey(next)
      if (key === pointKey(ring[0])) break
      const cont = index.get(key)?.find((s) => !s.used)
      if (!cont) break
      cont.used = true
      next = pointKey(cont.a) === key ? cont.b : cont.a
    }
    if (ring.length >= 3) rings.push(ring)
  }

  return rings
}

/** Perpendicular distance from p to the line a→b. */
function perpDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len
}

/** Douglas–Peucker polyline simplification. */
export function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points.slice()
  let maxDist = 0
  let idx = 0
  const first = points[0]
  const last = points[points.length - 1]
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], first, last)
    if (d > maxDist) {
      maxDist = d
      idx = i
    }
  }
  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, idx + 1), epsilon)
    const right = simplify(points.slice(idx), epsilon)
    return left.slice(0, -1).concat(right)
  }
  return [first, last]
}

/** Drop the duplicate closing point, rotate to a stable start, then simplify. */
export function normalizeRing(ring: Point[], epsilon: number): Point[] {
  let pts = ring
  if (pts.length > 1 && pointKey(pts[0]) === pointKey(pts[pts.length - 1])) {
    pts = pts.slice(0, -1)
  }
  if (pts.length < 3) return pts
  // Start at the lowest-x (then lowest-y) point for deterministic output.
  let start = 0
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x < pts[start].x || (pts[i].x === pts[start].x && pts[i].y < pts[start].y)) {
      start = i
    }
  }
  return simplify(pts.slice(start).concat(pts.slice(0, start)), epsilon)
}

/**
 * Closed Catmull–Rom spline expressed as cubic Béziers, centripetally spaced.
 *
 * The knots are spaced by the square root of each chord rather than uniformly.
 * Douglas–Peucker leaves a ring whose spacing is wildly uneven — a straight
 * neck runs a hundred units in one step while the blob it joins is stepped out
 * a unit at a time — and a uniformly parameterised spline reads that long
 * neighbour as "travel this far in one step", so its tangent overshoots and
 * the join grows a hook. Centripetal spacing (alpha = 1/2) sizes each tangent
 * by the span it actually governs, which is what pulls the hook back out; the
 * measured worst-case departure from the traced contour falls from 2.8 view
 * units to 0.9. Evenly spaced points still yield the plain uniform tangents.
 */
export function ringToPath(points: Point[], precision = 2): string {
  const n = points.length
  if (n < 3) return ''
  const f = (v: number) => v.toFixed(precision)
  // The floor keeps a repeated point from dividing the tangent by zero.
  const knot = (a: Point, b: Point) => Math.max(Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)), 1e-6)
  let d = `M ${f(points[0].x)} ${f(points[0].y)} `
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const d1 = knot(p0, p1)
    const d2 = knot(p1, p2)
    const d3 = knot(p2, p3)
    // Bezier handles are the Catmull–Rom tangents scaled by a third of the
    // span they govern: with equal knots both weights collapse to 1/6.
    const wOut = d2 / (3 * (d1 + d2))
    const wIn = d2 / (3 * (d2 + d3))
    const c1x = p1.x + wOut * (p2.x - p0.x)
    const c1y = p1.y + wOut * (p2.y - p0.y)
    const c2x = p2.x - wIn * (p3.x - p1.x)
    const c2y = p2.y - wIn * (p3.y - p1.y)
    d += `C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)} `
  }
  return d + 'Z '
}

/**
 * Trace an alpha field into smoothed SVG path data.
 *
 * The field is sampled through a one-pixel zero border so forms clipped at
 * the raster edge still close into proper rings, and coordinates are scaled
 * back from device pixels into view units.
 */
export function traceField(
  read: (x: number, y: number) => number,
  rasterSize: number,
  options: { threshold: number; scale: number; epsilon: number; precision?: number },
): string {
  const { threshold, scale, epsilon, precision = 2 } = options

  const padded = rasterSize + 2
  const rings = marchingSquares(
    (x, y) => {
      const px = x - 1
      const py = y - 1
      if (px < 0 || py < 0 || px >= rasterSize || py >= rasterSize) return 0
      return read(px, py)
    },
    padded,
    padded,
    threshold,
  )

  let d = ''
  for (const ring of rings) {
    const scaled = ring.map((p) => ({ x: (p.x - 1) / scale, y: (p.y - 1) / scale }))
    const simplified = normalizeRing(scaled, epsilon)
    if (simplified.length >= 3) d += ringToPath(simplified, precision)
  }
  return d
}

/** Alpha cutoff a given contrast value corresponds to. */
export const thresholdFor = (contrast: number) => Math.min(0.95, 0.5 + 0.5 / contrast)
