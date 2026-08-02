import { VIEWBOX } from './constants'
import { flattenToPath, type FlattenInput } from './flatten'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface ExportOptions {
  /** Drop the grid background so only the mark is exported (transparent). */
  markOnly: boolean
}

/** A flatten request plus the ink color to fill the resulting path with. */
export interface FlattenExport extends FlattenInput {
  ink: string
}

function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Clone the live editor SVG into a clean, export-ready one: strip editor-only
 * overlays, optionally drop the grid, and either flatten the goo-filtered group
 * into a single path or just remove the filter (leaving raw circles/capsules).
 */
export function buildExportSvg(
  source: SVGSVGElement,
  options: ExportOptions,
  flatten: FlattenExport | null,
): SVGSVGElement {
  const clone = source.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('.editor-only').forEach((el) => el.remove())
  if (options.markOnly) clone.querySelectorAll('.grid-layer').forEach((el) => el.remove())

  const filtered = clone.querySelector('g[filter]')
  if (filtered) {
    const d = flatten ? flattenToPath(flatten) : ''
    if (flatten && (d || (!flatten.circles.length && !flatten.capsules.length))) {
      const path = document.createElementNS(SVG_NS, 'path')
      path.setAttribute('d', d)
      path.setAttribute('fill', flatten.ink)
      path.setAttribute('fill-rule', 'evenodd')
      filtered.replaceWith(path)
    } else {
      // No flatten requested, or flattening failed (e.g. no canvas filter
      // support) — keep the raw circles/capsules rather than exporting an
      // empty mark.
      filtered.removeAttribute('filter')
    }
  }

  clone.querySelectorAll('filter#goo').forEach((el) => el.remove())
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('width', String(VIEWBOX))
  clone.setAttribute('height', String(VIEWBOX))
  clone.removeAttribute('style')
  return clone
}

export function serializeSvg(
  source: SVGSVGElement,
  options: ExportOptions,
  flatten: FlattenExport | null,
): string {
  const svg = buildExportSvg(source, options, flatten)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`
}

/** Returns false when the clipboard is unavailable (insecure context,
 *  permission denied, document unfocused) instead of failing silently. */
export async function copySvg(
  source: SVGSVGElement,
  options: ExportOptions,
  flatten: FlattenExport | null,
): Promise<boolean> {
  const svg = serializeSvg(source, options, flatten)
  try {
    await navigator.clipboard.writeText(svg)
    return true
  } catch {
    return false
  }
}

export function exportSvg(
  source: SVGSVGElement,
  options: ExportOptions,
  flatten: FlattenExport | null,
  name = 'metaball',
): void {
  const svg = serializeSvg(source, options, flatten)
  downloadBlob(`${name}.svg`, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
}

export async function exportPng(
  source: SVGSVGElement,
  options: ExportOptions,
  flatten: FlattenExport | null,
  scale = 4,
  name = 'metaball',
): Promise<void> {
  const svg = serializeSvg(source, options, flatten)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.width = VIEWBOX
    image.height = VIEWBOX
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Failed to render SVG for PNG export'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = VIEWBOX * scale
    canvas.height = VIEWBOX * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    await new Promise<void>((resolve) => {
      canvas.toBlob((out) => {
        if (out) downloadBlob(`${name}.png`, out)
        resolve()
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
