/**
 * @namche/metaball — the engine behind the NAMCHE brandmark vocabulary.
 *
 * Nodes sit on a grid and are drawn as circles; connections between them are
 * drawn as capsules. The union is blurred and re-thresholded, which pulls
 * neighbouring forms into one organic shape — "vom Schachbrett zum Netzwerk"
 * expressed as a computation.
 *
 * The headline API is `generate`, which returns SVG path data:
 *
 *   import { generate, generateSvg } from '@namche/metaball'
 *   const { d, viewBox } = generate({ preset: 'trio' })
 *
 * Dependency-free and deterministic. `generate` runs in Node (pure-JS
 * rasterizer) and in the browser (canvas rasterizer, chosen automatically).
 */

export { generate, generateMaskToken, generateSvg } from './generate.js'
export {
  BRANDMARK_PATH,
  BRANDMARK_PRESET_PATH,
  BRANDMARK_PRESET_RADIUS,
  BRANDMARK_PRESET_SCALE,
} from './brandmark.js'
export type { GenerateParams, GenerateResult, SvgParams } from './generate.js'

export { layoutFromSeed, rng, seedFrom } from './seed.js'
export type { SeedLayoutOptions } from './seed.js'

export { DEFAULT_PRESET_ID, EDITOR_PRESET_IDS, PRESETS, presetById } from './presets.js'

export { buildRenderData, capsuleRadius } from './primitives.js'

export {
  marchingSquares,
  normalizeRing,
  ringToPath,
  simplify,
  thresholdFor,
  traceField,
} from './trace.js'

export { blurField, rasterize } from './raster-pure.js'
export { rasterizeCanvas } from './raster-canvas.js'

export {
  cellCenter,
  cellRect,
  clamp,
  clamp01,
  clampOffset,
  clampRadius,
  edgeKey,
  effectiveBlur,
  isInner,
  isPlaceable,
  nodeCenter,
  nodeKey,
  nodeRadius,
  parseKey,
  sizeRadius,
} from './geometry.js'

export {
  CELL,
  DEFAULT_FLATTEN_EPSILON,
  DEFAULT_FLATTEN_RESOLUTION,
  DEFAULT_GOO_STD,
  DEFAULT_GOO_THRESHOLD,
  DEFAULT_THEME,
  DEFAULT_TUBE_FACTOR,
  GRID,
  MARGIN,
  OFFSET_LIMIT,
  PITCH,
  PNG_SCALES,
  PULL_BLUR_BOOST,
  RADIUS_MAX,
  RADIUS_MIN,
  SIZE_FACTORS,
  SIZES,
  VIEWBOX,
} from './constants.js'

export type {
  Capsule,
  Circle,
  Edge,
  EditorDoc,
  Mode,
  Node,
  Point,
  Preset,
  RenderData,
  Size,
  Theme,
} from './types.js'
