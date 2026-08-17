// Core data model + geometry for the metaball brandmark editor.

export type Size = 'S' | 'M' | 'L' | 'XL';
export type Mode = 'graph' | 'metaball';

export type Theme = {
  pink: string; // outer ring cells
  blue: string; // inner canvas cells
  ink: string; // nodes / connectors / dots
  bg: string; // page/canvas background
};

export const DEFAULT_THEME: Theme = {
  pink: '#F5A3FF',
  blue: '#87DCF9',
  ink: '#000000',
  bg: '#FFFFFF',
};

export type ThemePreset = { id: string; label: string; theme: Theme };

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'default', label: 'Default', theme: DEFAULT_THEME },
];

// A node lives on exactly one cell; optional offset nudges it off center.
export type NodeId = string; // `${r}-${c}`
export type GridNode = {
  r: number;
  c: number;
  size: Size;
  offsetX?: number;
  offsetY?: number;
  radius?: number; // optional override in svg units
};
export type Edge = [NodeId, NodeId];

// ---- Grid geometry -------------------------------------------------------
export const COLS = 5;
export const ROWS = 5;
export const INNER_MIN = 1;
export const INNER_MAX = 3;

export const CELL = 100;
export const GAP = 14;
export const PAD = GAP;

export const SVG_SIZE = PAD * 2 + COLS * CELL + (COLS - 1) * GAP;

// Max nudge from cell center (40% of half-cell).
export const OFFSET_MAX = CELL * 0.4;

// Custom radius range in svg units.
export const RADIUS_MIN = CELL * 0.2;
export const RADIUS_MAX = CELL * 0.7;

const SIZE_FACTOR: Record<Size, number> = {
  S: 0.3,
  M: 0.44,
  L: 0.52,
  XL: (CELL / 2 + GAP) / CELL,
};

export const DOT_RADIUS = CELL * 0.06;

export const GOO_STD = CELL * 0.09;
export const GOO_STD_MIN = CELL * 0.02;
export const GOO_STD_MAX = CELL * 0.18;

export const TUBE_RADIUS_FACTOR = 0.55;
export const TUBE_FACTOR_MIN = 0.1;
export const TUBE_FACTOR_MAX = 1;

export const GOO_THRESHOLD = 22;
export const GOO_THRESHOLD_MIN = 6;
export const GOO_THRESHOLD_MAX = 44;

export const GRAPH_STROKE = CELL * 0.3;

// Pinch necks toward classic circle–circle metaball (concave waist).
// pull = 0 → full Connection tubes (barbell). pull = 1 → no tubes, blur-only merge.
export const INWARD_PULL = 0;
export const INWARD_PULL_MIN = 0;
export const INWARD_PULL_MAX = 1;
// Extra blur as tubes vanish so distant nodes still fuse.
const INWARD_PULL_BLUR_BOOST = 0.65;

// 3D showcase: id of the default material preset (see lib/materialPresets.ts).
export const DEFAULT_MATERIAL_PRESET = 'wax';

import {
  DEFAULT_LIQUID_PRESET,
  defaultLiquidParams,
  cloneLiquidParams,
  type LookMode,
  type LiquidParams,
} from './liquidPresets';
import { DEFAULT_LIQUID_BACKDROP } from './liquidBackdrops';

export type { LookMode, LiquidParams };
export { DEFAULT_LIQUID_PRESET, defaultLiquidParams, cloneLiquidParams };
export { DEFAULT_LIQUID_BACKDROP };

// Surface sampling overlay (MeshSurfaceSampler on the whole isosurface).
export type SurfaceSamplerMode = 'points' | 'spheres' | 'both';

export const SURFACE_SAMPLER_ENABLED = true;
export const SURFACE_SAMPLER_MODE: SurfaceSamplerMode = 'both';
export const SURFACE_SAMPLER_COUNT = 3000;
export const SURFACE_SAMPLER_COUNT_MIN = 100;
export const SURFACE_SAMPLER_COUNT_MAX = 15000;
export const SURFACE_SAMPLER_POINT_SIZE = 0.04;
export const SURFACE_SAMPLER_POINT_SIZE_MIN = 0.005;
export const SURFACE_SAMPLER_POINT_SIZE_MAX = 0.12;
export const SURFACE_SAMPLER_SPHERE_SIZE = 0.028;
export const SURFACE_SAMPLER_SPHERE_SIZE_MIN = 0.004;
export const SURFACE_SAMPLER_SPHERE_SIZE_MAX = 0.08;
export const SURFACE_SAMPLER_SHOW_MESH = true;
export const SURFACE_SAMPLER_ANIMATE = true;

export function clampSurfaceSamplerCount(v: number): number {
  return Math.min(SURFACE_SAMPLER_COUNT_MAX, Math.max(SURFACE_SAMPLER_COUNT_MIN, Math.round(v)));
}

export function clampSurfaceSamplerPointSize(v: number): number {
  return Math.min(SURFACE_SAMPLER_POINT_SIZE_MAX, Math.max(SURFACE_SAMPLER_POINT_SIZE_MIN, v));
}

export function clampSurfaceSamplerSphereSize(v: number): number {
  return Math.min(SURFACE_SAMPLER_SPHERE_SIZE_MAX, Math.max(SURFACE_SAMPLER_SPHERE_SIZE_MIN, v));
}

export function normalizeSurfaceSamplerMode(v: unknown): SurfaceSamplerMode {
  if (v === 'points' || v === 'spheres' || v === 'both') return v;
  return SURFACE_SAMPLER_MODE;
}

// Flatten export defaults.
export const FLATTEN_EPSILON = 0.9;
export const FLATTEN_EPSILON_MIN = 0.1;
export const FLATTEN_EPSILON_MAX = 3;
export const FLATTEN_RESOLUTION = 1;
export const FLATTEN_RESOLUTION_MIN = 1;
export const FLATTEN_RESOLUTION_MAX = 3;

export const PNG_SCALES = [1, 2, 4, 8] as const;
export type PngScale = (typeof PNG_SCALES)[number];

export function nodeRadius(size: Size): number {
  return CELL * SIZE_FACTOR[size];
}

export function effectiveNodeRadius(node: GridNode): number {
  return node.radius ?? nodeRadius(node.size);
}

export function clampOffset(v: number): number {
  return Math.min(OFFSET_MAX, Math.max(-OFFSET_MAX, v));
}

export function clampRadius(v: number): number {
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, v));
}

export function nodePosition(node: GridNode): { cx: number; cy: number } {
  const { cx, cy } = cellCenter(node.r, node.c);
  return {
    cx: cx + (node.offsetX ?? 0),
    cy: cy + (node.offsetY ?? 0),
  };
}

export function isInner(r: number, c: number): boolean {
  return r >= INNER_MIN && r <= INNER_MAX && c >= INNER_MIN && c <= INNER_MAX;
}

export function isEditableCell(r: number, c: number, fullGrid: boolean): boolean {
  return fullGrid || isInner(r, c);
}

export function cellRect(r: number, c: number) {
  return {
    x: PAD + c * (CELL + GAP),
    y: PAD + r * (CELL + GAP),
    w: CELL,
    h: CELL,
  };
}

export function cellCenter(r: number, c: number) {
  const { x, y, w, h } = cellRect(r, c);
  return { cx: x + w / 2, cy: y + h / 2 };
}

export function nodeId(r: number, c: number): NodeId {
  return `${r}-${c}`;
}

export function parseNodeId(id: NodeId): { r: number; c: number } {
  const [r, c] = id.split('-').map(Number);
  return { r, c };
}

export function edgeKey(a: NodeId, b: NodeId): string {
  return [a, b].sort().join('|');
}

// Serializable document for save/load and undo history.
export type Document = {
  nodes: GridNode[];
  edges: Edge[];
  edgeFactors: Record<string, number>;
  edgePulls: Record<string, number>;
  mode: Mode;
  theme: Theme;
  gooStd: number;
  gooThreshold: number;
  tubeFactor: number;
  inwardPull: number;
  fullGrid: boolean;
  flattenEpsilon: number;
  flattenResolution: number;
  materialPreset: string;
  lookMode: LookMode;
  liquidPreset: string;
  liquidParams: LiquidParams;
  /** Test backdrop id while lookMode === 'liquid' (see liquidBackdrops.ts). */
  liquidBackdrop: string;
  surfaceSamplerEnabled: boolean;
  surfaceSamplerMode: SurfaceSamplerMode;
  surfaceSamplerCount: number;
  surfaceSamplerPointSize: number;
  surfaceSamplerSphereSize: number;
  surfaceSamplerShowMesh: boolean;
  surfaceSamplerAnimate: boolean;
};

/** Bump when stored docs need a one-time field migration. */
export const DOCUMENT_VERSION = 8;

export type StoredDocument = Document & { version: number };

export function createDefaultDocument(
  nodes: GridNode[] = [],
  edges: Edge[] = [],
): Document {
  return {
    nodes,
    edges,
    edgeFactors: {},
    edgePulls: {},
    mode: 'metaball',
    theme: { ...DEFAULT_THEME },
    gooStd: GOO_STD,
    gooThreshold: GOO_THRESHOLD,
    tubeFactor: TUBE_RADIUS_FACTOR,
    inwardPull: INWARD_PULL,
    fullGrid: false,
    flattenEpsilon: FLATTEN_EPSILON,
    flattenResolution: FLATTEN_RESOLUTION,
    materialPreset: DEFAULT_MATERIAL_PRESET,
    lookMode: 'material',
    liquidPreset: DEFAULT_LIQUID_PRESET,
    liquidParams: defaultLiquidParams(),
    liquidBackdrop: DEFAULT_LIQUID_BACKDROP,
    surfaceSamplerEnabled: SURFACE_SAMPLER_ENABLED,
    surfaceSamplerMode: SURFACE_SAMPLER_MODE,
    surfaceSamplerCount: SURFACE_SAMPLER_COUNT,
    surfaceSamplerPointSize: SURFACE_SAMPLER_POINT_SIZE,
    surfaceSamplerSphereSize: SURFACE_SAMPLER_SPHERE_SIZE,
    surfaceSamplerShowMesh: SURFACE_SAMPLER_SHOW_MESH,
    surfaceSamplerAnimate: SURFACE_SAMPLER_ANIMATE,
  };
}

// ---- Presets -------------------------------------------------------------
export type Preset = {
  id: string;
  label: string;
  nodes: GridNode[];
  edges: Edge[];
  tubeFactor?: number;
  gooStd?: number;
  gooThreshold?: number;
};

const n = (r: number, c: number, size: Size = 'L'): GridNode => ({ r, c, size });

export const PRESETS: Preset[] = [
  {
    id: 'r',
    label: 'R',
    nodes: [n(1, 1), n(1, 3), n(2, 2), n(3, 1), n(3, 3)],
    edges: [
      [nodeId(1, 1), nodeId(1, 3)],
      [nodeId(1, 1), nodeId(3, 1)],
      [nodeId(1, 3), nodeId(2, 2)],
      [nodeId(2, 2), nodeId(3, 3)],
    ],
    tubeFactor: 0.55,
    gooStd: GOO_STD,
    gooThreshold: GOO_THRESHOLD,
  },
  {
    id: 'loop',
    label: 'Loop',
    nodes: [n(1, 1), n(1, 3), n(2, 2), n(3, 1), n(3, 3)],
    edges: [
      [nodeId(1, 1), nodeId(1, 3)],
      [nodeId(1, 3), nodeId(3, 3)],
      [nodeId(3, 1), nodeId(3, 3)],
      [nodeId(2, 2), nodeId(3, 1)],
    ],
    tubeFactor: 0.55,
    gooStd: GOO_STD,
    gooThreshold: GOO_THRESHOLD,
  },
  {
    id: 'sizes',
    label: 'Sizes',
    nodes: [n(1, 1, 'L'), n(1, 3, 'L'), n(2, 2, 'L'), n(3, 1, 'L'), n(3, 3, 'L')],
    edges: [],
  },
  {
    id: 'empty',
    label: 'Empty',
    nodes: [],
    edges: [],
  },
];

export type MetaballShapes = {
  circles: { cx: number; cy: number; r: number }[];
  capsules: { x1: number; y1: number; x2: number; y2: number; r: number }[];
};

export function remapEdgeRecord<T>(
  record: Record<string, T>,
  from: NodeId,
  to: NodeId,
): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [k, v] of Object.entries(record)) {
    const remapped = k
      .split('|')
      .map((p) => (p === from ? to : p))
      .sort()
      .join('|');
    next[remapped] = v;
  }
  return next;
}

export function filterEdgeRecordByNode<T>(
  record: Record<string, T>,
  nodeId: NodeId,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).filter(([k]) => !k.split('|').includes(nodeId)),
  );
}

export function omitEdgeRecordKey<T>(
  record: Record<string, T>,
  key: string,
): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

export function edgeTubeFactor(
  a: NodeId,
  b: NodeId,
  globalFactor: number,
  overrides?: Record<string, number>,
): number {
  return overrides?.[edgeKey(a, b)] ?? globalFactor;
}

/** Effective pinch for an edge: per-edge override or global inwardPull. */
export function edgePull(
  a: NodeId,
  b: NodeId,
  globalPull: number,
  overrides?: Record<string, number>,
): number {
  return overrides?.[edgeKey(a, b)] ?? globalPull;
}

function clampPull(pull: number): number {
  return Math.min(INWARD_PULL_MAX, Math.max(INWARD_PULL_MIN, pull));
}

/** Tube thickness scale: 1 at pull 0 → 0 at pull 1 (pure circle metaball). */
export function inwardTubeScale(pull: number): number {
  return 1 - clampPull(pull);
}

/** Blur boost so nodes still merge as geometric tubes disappear. */
export function inwardGooStd(gooStd: number, pull: number): number {
  return gooStd * (1 + clampPull(pull) * INWARD_PULL_BLUR_BOOST);
}

export function getMetaballShapes(
  nodes: GridNode[],
  edges: Edge[],
  tubeFactor: number,
  edgeFactors?: Record<string, number>,
  inwardPull = 0,
  edgePulls?: Record<string, number>,
): MetaballShapes {
  const byId = new Map<NodeId, GridNode>();
  for (const node of nodes) byId.set(nodeId(node.r, node.c), node);

  const circles = nodes.map((node) => {
    const { cx, cy } = nodePosition(node);
    return { cx, cy, r: effectiveNodeRadius(node) };
  });

  const capsules: MetaballShapes['capsules'] = [];
  for (const [a, b] of edges) {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (!na || !nb) continue;
    const ca = nodePosition(na);
    const cb = nodePosition(nb);
    const pull = edgePull(a, b, inwardPull, edgePulls);
    const factor =
      edgeTubeFactor(a, b, tubeFactor, edgeFactors) * inwardTubeScale(pull);
    const r = factor * Math.min(effectiveNodeRadius(na), effectiveNodeRadius(nb));
    capsules.push({ x1: ca.cx, y1: ca.cy, x2: cb.cx, y2: cb.cy, r });
  }

  return { circles, capsules };
}

export function clonePreset(preset: Preset): Document {
  const doc = createDefaultDocument(
    preset.nodes.map((node) => ({ ...node })),
    preset.edges.map((edge) => [edge[0], edge[1]] as Edge),
  );
  if (preset.tubeFactor !== undefined) doc.tubeFactor = preset.tubeFactor;
  if (preset.gooStd !== undefined) doc.gooStd = preset.gooStd;
  if (preset.gooThreshold !== undefined) doc.gooThreshold = preset.gooThreshold;
  return doc;
}

export function cloneDocument(doc: Document): Document {
  return {
    ...doc,
    theme: { ...doc.theme },
    nodes: doc.nodes.map((node) => ({ ...node })),
    edges: doc.edges.map((edge) => [edge[0], edge[1]] as Edge),
    edgeFactors: { ...doc.edgeFactors },
    edgePulls: { ...doc.edgePulls },
    liquidParams: cloneLiquidParams(doc.liquidParams),
  };
}
