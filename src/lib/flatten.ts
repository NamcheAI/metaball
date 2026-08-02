import { VIEWBOX } from './constants'
import type { RenderData } from './types'

interface Point {
  x: number
  y: number
}

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
 * ambiguous saddles) are split into two segments, matching the source.
 */
function marchingSquares(
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
function douglasPeucker(points: Point[], epsilon: number): Point[] {
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
    const left = douglasPeucker(points.slice(0, idx + 1), epsilon)
    const right = douglasPeucker(points.slice(idx), epsilon)
    return left.slice(0, -1).concat(right)
  }
  return [first, last]
}

/** Drop the duplicate closing point, rotate to a stable start, then simplify. */
function normalizeRing(ring: Point[], epsilon: number): Point[] {
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
  return douglasPeucker(pts.slice(start).concat(pts.slice(0, start)), epsilon)
}

/** Closed Catmull–Rom spline expressed as cubic Bézier segments. */
function ringToPath(points: Point[]): string {
  const n = points.length
  if (n < 3) return ''
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} `
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `
  }
  return d + 'Z '
}

export interface FlattenInput extends RenderData {
  gooStd: number
  gooThreshold: number
  epsilon?: number
  resolution?: number
}

/**
 * "Flatten" the goo effect into a single filled SVG path: rasterize the
 * circles + capsules, blur, threshold the alpha channel, then trace the
 * resulting contour(s) with marching squares and smooth them. Contours are
 * traced in device-pixel space (VIEWBOX · resolution) and scaled back to
 * VIEWBOX coordinates, so higher resolutions only add tracing detail.
 */
export function flattenToPath(input: FlattenInput): string {
  if (!input.circles.length && !input.capsules.length) return ''

  const t = input.resolution ?? 1
  const epsilon = input.epsilon ?? 0.9
  const size = Math.ceil(VIEWBOX * t)

  const shape = document.createElement('canvas')
  shape.width = size
  shape.height = size
  const sctx = shape.getContext('2d')
  if (!sctx) return ''
  sctx.fillStyle = '#000'
  sctx.strokeStyle = '#000'
  sctx.lineCap = 'round'
  sctx.lineJoin = 'round'
  if (t !== 1) sctx.scale(t, t)
  for (const c of input.circles) {
    sctx.beginPath()
    sctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2)
    sctx.fill()
  }
  for (const cap of input.capsules) {
    sctx.lineWidth = cap.r * 2
    sctx.beginPath()
    sctx.moveTo(cap.x1, cap.y1)
    sctx.lineTo(cap.x2, cap.y2)
    sctx.stroke()
  }

  const blurred = document.createElement('canvas')
  blurred.width = size
  blurred.height = size
  const bctx = blurred.getContext('2d')
  if (!bctx) return ''
  bctx.filter = `blur(${input.gooStd * t}px)`
  if (bctx.filter === 'none') {
    // Engine without canvas filter support (e.g. older Safari): tracing the
    // un-blurred shapes would silently produce a barbell instead of a
    // metaball, so bail out and let the caller fall back to raw geometry.
    console.warn('metaball flatten: canvas 2d filters unsupported, skipping flatten')
    return ''
  }
  bctx.drawImage(shape, 0, 0)

  const data = bctx.getImageData(0, 0, size, size).data
  const threshold = Math.min(0.95, 0.5 + 0.5 / input.gooThreshold)
  // Sample through a 1px zero border so shapes clipped at the raster edge
  // still produce closed contours (open chains would otherwise be stitched
  // into arbitrary fragments).
  const padded = size + 2
  const rings = marchingSquares(
    (x, y) => {
      const px = x - 1
      const py = y - 1
      if (px < 0 || py < 0 || px >= size || py >= size) return 0
      return data[(py * size + px) * 4 + 3] / 255
    },
    padded,
    padded,
    threshold,
  )

  let path = ''
  for (const ring of rings) {
    // Undo the border offset and scale from device-pixel space back to
    // VIEWBOX coordinates, then simplify with epsilon in those final units.
    const scaled = ring.map((p) => ({ x: (p.x - 1) / t, y: (p.y - 1) / t }))
    const simplified = normalizeRing(scaled, epsilon)
    if (simplified.length >= 3) path += ringToPath(simplified)
  }
  return path
}
