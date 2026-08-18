export type Size = 'S' | 'M' | 'L' | 'XL'
export type Mode = 'metaball' | 'graph'

/** A node lives in a grid cell (r, c). Its drawn radius comes from its size
 *  preset unless `radius` overrides it. `offsetX/offsetY` nudge it off the
 *  cell center (clamped to ±OFFSET_LIMIT px). */
export interface Node {
  r: number
  c: number
  size: Size
  radius?: number
  offsetX?: number
  offsetY?: number
}

/** An undirected edge between two node keys (`"r-c"`). */
export type Edge = [string, string]

export interface Theme {
  /** outer-ring cell tint */
  pink: string
  /** inner 3×3 cell tint */
  blue: string
  /** the mark itself */
  ink: string
  /** canvas background */
  bg: string
}

/** The full editor document — everything that is persisted and exported. */
export interface EditorDoc {
  nodes: Node[]
  edges: Edge[]
  /** per-edge neck-width override, keyed by edgeKey; falls back to tubeFactor */
  edgeFactors: Record<string, number>
  /** per-edge pinch override, keyed by edgeKey; falls back to inwardPull */
  edgePulls: Record<string, number>
  mode: Mode
  theme: Theme
  /** show the Namche raster behind the mark */
  rasterEnabled: boolean
  /** gaussian blur std-dev feeding the goo filter (the "Blur" control) */
  gooStd: number
  /** alpha contrast / cutoff in the goo color-matrix (the "Contrast" control) */
  gooThreshold: number
  /** global neck width — capsule thickness as a fraction of the smaller node */
  tubeFactor: number
  /** global pinch/merge, 0 (barbell tubes) … 1 (pinched metaball) */
  inwardPull: number
  /** allow nodes to be placed in the outer ring, not just the inner 3×3 */
  fullGrid: boolean
  /** Douglas–Peucker tolerance for the flatten export */
  flattenEpsilon: number
  /** raster supersampling for the flatten export (1…3) */
  flattenResolution: number
}

export interface Preset {
  id: string
  label: string
  nodes: Node[]
  edges: Edge[]
  /** Allow authoring in the outer ring when this preset opens in the editor. */
  fullGrid?: boolean
  /** Exact canonical silhouette used until its geometry controls are changed. */
  referencePath?: string
  tubeFactor?: number
  gooStd?: number
  gooThreshold?: number
}

export interface Point {
  x: number
  y: number
}

export interface Circle {
  cx: number
  cy: number
  r: number
}

export interface Capsule {
  x1: number
  y1: number
  x2: number
  y2: number
  r: number
}

export interface RenderData {
  circles: Circle[]
  capsules: Capsule[]
}
