import type { RenderData } from './types.js'

/**
 * Canvas rasterizer — browser only. Faster than the pure-JS path for
 * interactive previews, and it is what the original editor used, so its
 * output is the reference these marks were designed against.
 *
 * Returns null when canvas filters are unavailable (older Safari silently
 * ignores `ctx.filter`, which would trace un-blurred shapes and quietly
 * produce a barbell instead of a metaball). Callers fall back to the pure
 * rasterizer.
 */
export function rasterizeCanvas(
  { circles, capsules }: RenderData,
  rasterSize: number,
  scale: number,
  stdDev: number,
): ((x: number, y: number) => number) | null {
  if (typeof document === 'undefined') return null

  const shape = document.createElement('canvas')
  shape.width = rasterSize
  shape.height = rasterSize
  const sctx = shape.getContext('2d')
  if (!sctx) return null

  sctx.fillStyle = '#000'
  sctx.strokeStyle = '#000'
  sctx.lineCap = 'round'
  sctx.lineJoin = 'round'
  if (scale !== 1) sctx.scale(scale, scale)
  for (const c of circles) {
    sctx.beginPath()
    sctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2)
    sctx.fill()
  }
  for (const cap of capsules) {
    sctx.lineWidth = cap.r * 2
    sctx.beginPath()
    sctx.moveTo(cap.x1, cap.y1)
    sctx.lineTo(cap.x2, cap.y2)
    sctx.stroke()
  }

  const blurred = document.createElement('canvas')
  blurred.width = rasterSize
  blurred.height = rasterSize
  const bctx = blurred.getContext('2d')
  if (!bctx) return null

  bctx.filter = `blur(${stdDev}px)`
  if (bctx.filter === 'none') return null
  bctx.drawImage(shape, 0, 0)

  const data = bctx.getImageData(0, 0, rasterSize, rasterSize).data
  return (x, y) => data[(y * rasterSize + x) * 4 + 3] / 255
}
