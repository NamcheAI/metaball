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

import * as brandmark from './brandmark.js'
import * as constants from './constants.js'
import { DEFAULT_PRESET_ID, EDITOR_PRESET_IDS, PRESETS } from './presets.js'

/**
 * Stable namespace for data and configuration values.
 *
 * Keeping uppercase values behind one export prevents component-oriented
 * consumers from mistaking every engine constant for a UI component.
 */
export const ENGINE = Object.freeze({
  ...constants,
  ...brandmark,
  PRESETS,
  DEFAULT_PRESET_ID,
  EDITOR_PRESET_IDS,
})

export { generate, generateMaskToken, generateSvg } from './generate.js'
export type { GenerateParams, GenerateResult, SvgParams } from './generate.js'

export { layoutFromSeed, rng, seedFrom } from './seed.js'
export type { SeedLayoutOptions } from './seed.js'

export { presetById } from './presets.js'

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
