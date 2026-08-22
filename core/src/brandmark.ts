import { VIEWBOX } from './constants.js'

/**
 * Approved legacy TWBD/Namche brandmark, Figma node 71:744.
 *
 * The source vector uses a 600 × 600 viewBox. The engine's authoring grid is
 * 584 × 584, so coordinates are scaled uniformly without changing the
 * silhouette. Keeping this canonical path next to the engine preserves the
 * legacy mark exactly while its node graph remains editable. `BRANDMARK_PATH`
 * intentionally remains the full-bleed asset path. The editor preset uses the
 * separately framed path below so it shares a coordinate convention with the
 * rest of the mark family.
 */
const SOURCE_SIZE = 600
const SOURCE_PATH =
  'M508 0C558.81 0 600 41.1898 600 92C600 107.308 596.261 121.742 589.647 134.44C567.986 176.026 528 215.189 528 262.078V337.921C528 384.81 567.986 423.973 589.647 465.559C596.261 478.257 600 492.692 600 508C600 558.81 558.81 600 508 600C492.692 600 478.258 596.261 465.56 589.647C423.974 567.986 384.811 528 337.922 528H262.078C215.189 528 176.026 567.986 134.44 589.647C121.742 596.261 107.308 600 92 600C41.1898 600 0 558.81 0 508C0 457.19 41.1898 416 92 416C122.441 416 156.681 415.034 178.206 393.508L185.508 386.206C207.033 364.681 208 330.441 208 300C208 249.19 249.19 208 300 208C350.81 208 392 249.19 392 300C392 350.81 350.81 392 300 392C269.558 392 235.317 392.966 213.792 414.492L180.942 447.342C174.344 453.94 173.386 464.058 176.972 472.673C180.558 481.289 188.46 488 197.792 488H366.077C396.518 488 421.423 464.472 442.947 442.947C464.472 421.422 488 396.516 488 366.076V233.923C488 203.482 464.472 178.578 442.947 157.053C421.422 135.528 396.518 112 366.077 112H262.078C215.189 112 176.026 151.986 134.44 173.647C121.742 180.261 107.308 184 92 184C41.1898 184 0 142.81 0 92C0 41.1898 41.1898 0 92 0C107.308 0 121.742 3.73871 134.44 10.3528C176.026 32.0141 215.189 72 262.078 72H337.922C384.811 72 423.974 32.0141 465.56 10.3528C478.258 3.73871 492.692 0 508 0Z'

const scale = VIEWBOX / SOURCE_SIZE

export const BRANDMARK_PATH = SOURCE_PATH.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (token) =>
  String(Number((Number(token) * scale).toFixed(4))),
)

/**
 * The approved silhouette fitted to the inner 3 × 3 authoring grid.
 *
 * The original graph's outer node centres are 404.9 units apart. Mapping that
 * span to the 228-unit distance between cells 1 and 3 makes Classic use the
 * same node centres as Loop and R, while preserving the silhouette exactly.
 */
export const BRANDMARK_PRESET_SCALE = 228 / 404.9
export const BRANDMARK_PRESET_RADIUS = 89.55 * BRANDMARK_PRESET_SCALE
const presetTranslate = VIEWBOX / 2 - (VIEWBOX / 2) * BRANDMARK_PRESET_SCALE

export const BRANDMARK_PRESET_PATH = BRANDMARK_PATH.replace(
  /-?\d*\.?\d+(?:e[-+]?\d+)?/gi,
  (token) => {
    // This path contains only absolute M/C commands, whose numeric values are
    // coordinate pairs. A uniform transform is therefore identical for x/y.
    const transformed = Number(token) * BRANDMARK_PRESET_SCALE + presetTranslate
    return String(Number(transformed.toFixed(4)))
  },
)
