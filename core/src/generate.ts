import {
  DEFAULT_FLATTEN_EPSILON,
  DEFAULT_FLATTEN_RESOLUTION,
  DEFAULT_GOO_STD,
  DEFAULT_GOO_THRESHOLD,
  DEFAULT_TUBE_FACTOR,
  VIEWBOX,
} from './constants.js'
import { clamp, effectiveBlur } from './geometry.js'
import { PRESETS, presetById } from './presets.js'
import { buildRenderData } from './primitives.js'
import { rasterizeCanvas } from './raster-canvas.js'
import { blurField, rasterize } from './raster-pure.js'
import { layoutFromSeed, type SeedLayoutOptions } from './seed.js'
import { thresholdFor, traceField } from './trace.js'
import type { Edge, Node, RenderData } from './types.js'

export interface GenerateParams extends SeedLayoutOptions {
  /** A named mark from PRESETS. */
  preset?: string
  /** Explicit spec — takes precedence over `preset` and `seed`. */
  nodes?: Node[]
  edges?: Edge[]
  /** Per-edge overrides, keyed by the sorted `"a|b"` edge key. */
  edgeFactors?: Record<string, number>
  edgePulls?: Record<string, number>

  /** Capsule thickness vs. the smaller node radius. @default 0.55 */
  neck?: number
  /** Fusion width — the blur std-dev. @default 9 */
  blur?: number
  /** Alpha cutoff; higher = sharper waist, tighter neck. @default 22 */
  contrast?: number
  /** 0 = barbell tubes, 1 = pinched metaball. @default 0 */
  pinch?: number

  /** Douglas–Peucker tolerance, in view units. @default 0.9 */
  detail?: number
  /** Raster supersampling, 1–4. @default 1 */
  resolution?: number
  /** Decimal places in the emitted path data. @default 2 */
  precision?: number
  /**
   * Rasterizer to use. 'auto' prefers canvas in the browser (fast, and the
   * reference these marks were designed against) and falls back to the pure
   * implementation everywhere else. @default 'auto'
   */
  backend?: 'auto' | 'canvas' | 'pure'
}

export interface GenerateResult {
  /** SVG path data — possibly several subpaths; fill with `evenodd`. */
  d: string
  viewBox: string
  size: number
  /** Which rasterizer actually ran. */
  backend: 'canvas' | 'pure'
  /** The primitives the path was traced from. */
  primitives: RenderData
}

function resolveSpec(params: GenerateParams): { nodes: Node[]; edges: Edge[] } {
  if (params.nodes) return { nodes: params.nodes, edges: params.edges ?? [] }
  if (params.preset) {
    const preset = presetById(params.preset)
    if (!preset) {
      throw new Error(
        `metaball: unknown preset "${params.preset}" ` +
          `(have: ${PRESETS.map((p) => p.id).join(', ')})`,
      )
    }
    return { nodes: preset.nodes, edges: preset.edges }
  }
  if (params.seed !== undefined) return layoutFromSeed(params)
  return { nodes: PRESETS[0].nodes, edges: PRESETS[0].edges }
}

/**
 * Generate a metaball mark as SVG path data.
 *
 * Give it a `preset`, an explicit `nodes`/`edges` spec, or a `seed` — in that
 * order of precedence. Everything else has a default, and the same input
 * always produces the same path.
 */
export function generate(params: GenerateParams = {}): GenerateResult {
  const { nodes, edges } = resolveSpec(params)
  const preset =
    params.nodes || params.seed !== undefined
      ? null
      : presetById(params.preset ?? PRESETS[0].id) ?? null

  const neck = params.neck ?? preset?.tubeFactor ?? DEFAULT_TUBE_FACTOR
  const blur = Math.max(0, params.blur ?? preset?.gooStd ?? DEFAULT_GOO_STD)
  const contrast = Math.max(1e-6, params.contrast ?? preset?.gooThreshold ?? DEFAULT_GOO_THRESHOLD)
  const pinch = clamp(params.pinch ?? 0, 0, 1)
  const detail = Math.max(0, params.detail ?? DEFAULT_FLATTEN_EPSILON)
  const resolution = clamp(Math.round(params.resolution ?? DEFAULT_FLATTEN_RESOLUTION), 1, 4)
  const precision = clamp(Math.round(params.precision ?? 2), 0, 6)

  const primitives = buildRenderData(
    nodes,
    edges,
    neck,
    params.edgeFactors,
    pinch,
    params.edgePulls,
  )

  const viewBox = `0 0 ${VIEWBOX} ${VIEWBOX}`
  const empty: GenerateResult = {
    d: '',
    viewBox,
    size: VIEWBOX,
    backend: 'pure',
    primitives,
  }
  if (!primitives.circles.length && !primitives.capsules.length) return empty

  const hasShapeOverrides =
    params.nodes !== undefined ||
    params.edges !== undefined ||
    params.edgeFactors !== undefined ||
    params.edgePulls !== undefined ||
    params.neck !== undefined ||
    params.blur !== undefined ||
    params.contrast !== undefined ||
    params.pinch !== undefined ||
    params.detail !== undefined ||
    params.resolution !== undefined ||
    params.precision !== undefined
  if (preset?.referencePath && !hasShapeOverrides) {
    return { ...empty, d: preset.referencePath }
  }

  const rasterSize = Math.ceil(VIEWBOX * resolution)
  const stdDev = effectiveBlur(blur, pinch) * resolution
  const wanted = params.backend ?? 'auto'

  let read: ((x: number, y: number) => number) | null = null
  let backend: 'canvas' | 'pure' = 'pure'

  if (wanted === 'canvas' || wanted === 'auto') {
    read = rasterizeCanvas(primitives, rasterSize, resolution, stdDev)
    if (read) backend = 'canvas'
    else if (wanted === 'canvas') {
      throw new Error('metaball: canvas backend unavailable (no DOM or no canvas filters)')
    }
  }

  if (!read) {
    const field = blurField(rasterize(primitives, rasterSize, resolution), rasterSize, stdDev)
    read = (x, y) => field[y * rasterSize + x]
    backend = 'pure'
  }

  const d = traceField(read, rasterSize, {
    threshold: thresholdFor(contrast),
    scale: resolution,
    epsilon: detail,
    precision,
  }).trim()

  return { d, viewBox, size: VIEWBOX, backend, primitives }
}

export interface SvgParams extends GenerateParams {
  /** Path fill. @default 'currentColor' */
  fill?: string
  /** width/height attributes. @default the viewBox size */
  width?: number
}

/** Generate a complete standalone `<svg>` string. */
export function generateSvg(params: SvgParams = {}): string {
  const { viewBox, size, d } = generate(params)
  const w = params.width ?? size
  const fill = params.fill ?? 'currentColor'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" ` +
    `viewBox="${viewBox}" fill="none">` +
    `<path d="${d}" fill="${fill}" fill-rule="evenodd"/>` +
    `</svg>`
  )
}

/**
 * Generate a `url("data:image/svg+xml,…")` value for use as a CSS mask token.
 * The shape is filled black because a mask only reads coverage — the element
 * wearing it supplies the colour.
 */
export function generateMaskToken(params: GenerateParams = {}): string {
  const svg = generateSvg({ ...params, fill: '#000' })
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`
}
