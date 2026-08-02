import type { Size, Theme } from './types'

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
export const RADIUS_MAX = 70
export const OFFSET_LIMIT = 40

// --- Style defaults ----------------------------------------------------------
export const DEFAULT_THEME: Theme = {
  pink: '#F5A3FF',
  blue: '#87DCF9',
  ink: '#000000',
  bg: '#FFFFFF',
}
export const DEFAULT_TUBE_FACTOR = 0.55
/** How much a full inwardPull boosts effective blur (see effectiveBlur). */
export const PULL_BLUR_BOOST = 0.65
export const DEFAULT_FLATTEN_EPSILON = 0.9
export const DEFAULT_FLATTEN_RESOLUTION = 1
export const PNG_SCALES = [1, 2, 4, 8]

// --- App plumbing ------------------------------------------------------------
export const HISTORY_LIMIT = 50
export const STORAGE_KEY = 'metaball-editor-document'
export const EXPORT_PREVIEW_DEBOUNCE = 180
