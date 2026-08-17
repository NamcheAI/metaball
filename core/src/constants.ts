import type { Size, Theme } from './types.js'

// --- Canvas geometry ---------------------------------------------------------
// A 5×5 grid of 100px cells with 14px margins and gaps (114px pitch), so the
// whole thing is 14 + 4·114 + 100 + 14 = 584px square.
export const VIEWBOX = 584
export const GRID = 5
export const CELL = 100
export const PITCH = 114
export const MARGIN = 14

// --- Node sizes --------------------------------------------------------------
// Drawn radius = CELL · factor. XL = 64/100.
export const SIZE_FACTORS: Record<Size, number> = { S: 0.3, M: 0.44, L: 0.52, XL: 0.64 }
export const SIZES: Size[] = ['S', 'M', 'L', 'XL']
export const KEY_TO_SIZE: Record<string, Size> = { '1': 'S', '2': 'M', '3': 'L', '4': 'XL' }

// Custom-radius slider bounds and cell-offset clamp.
export const RADIUS_MIN = 20
export const RADIUS_MAX = 92
export const OFFSET_LIMIT = 40

// --- Style defaults ----------------------------------------------------------
// The NAMCHE raster palette (tokens/colors.css in the design repo). The naming
// lines up exactly: raster-pink is "the surrounding field" — which is what the
// outer ring of cells is — and raster-cyan is "the X module", the inner 3×3
// where nodes live. So previews are brand-correct without anyone setting them.
// These tint the editor's grid only; they never reach an exported mark.
export const DEFAULT_THEME: Theme = {
  /** --namche-raster-pink — the surrounding field (outer cells) */
  pink: '#FBAAFF',
  /** --namche-raster-cyan — the X module (inner 3×3) */
  blue: '#8BE0FF',
  /** --namche-black — the mark itself */
  ink: '#000000',
  /** --namche-white */
  bg: '#FFFFFF',
}
export const DEFAULT_TUBE_FACTOR = 0.55
/** How much a full inwardPull boosts effective blur (see effectiveBlur). */
export const PULL_BLUR_BOOST = 0.65
export const DEFAULT_FLATTEN_EPSILON = 0.9
export const DEFAULT_FLATTEN_RESOLUTION = 1
export const DEFAULT_GOO_STD = 9
export const DEFAULT_GOO_THRESHOLD = 22
export const PNG_SCALES = [1, 2, 4, 8]
