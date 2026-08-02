import {
  DEFAULT_FLATTEN_EPSILON,
  DEFAULT_FLATTEN_RESOLUTION,
  DEFAULT_THEME,
  DEFAULT_TUBE_FACTOR,
  GRID,
  OFFSET_LIMIT,
  RADIUS_MAX,
  RADIUS_MIN,
  SIZES,
  STORAGE_KEY,
} from './constants'
import { PRESETS } from './presets'
import type { EditorDoc, Edge, Node, Preset, Size } from './types'

/** A fresh document with all the style defaults. */
export function createDocument(nodes: Node[] = [], edges: Edge[] = []): EditorDoc {
  return {
    nodes,
    edges,
    edgeFactors: {},
    edgePulls: {},
    mode: 'metaball',
    theme: { ...DEFAULT_THEME },
    gooStd: 9,
    gooThreshold: 22,
    tubeFactor: DEFAULT_TUBE_FACTOR,
    inwardPull: 0,
    fullGrid: false,
    flattenEpsilon: DEFAULT_FLATTEN_EPSILON,
    flattenResolution: DEFAULT_FLATTEN_RESOLUTION,
  }
}

/** Build a document from a preset, carrying over its style overrides. */
export function documentFromPreset(preset: Preset): EditorDoc {
  const doc = createDocument(
    preset.nodes.map((n) => ({ ...n })),
    preset.edges.map((e) => [e[0], e[1]] as Edge),
  )
  if (preset.tubeFactor !== undefined) doc.tubeFactor = preset.tubeFactor
  if (preset.gooStd !== undefined) doc.gooStd = preset.gooStd
  if (preset.gooThreshold !== undefined) doc.gooThreshold = preset.gooThreshold
  return doc
}

/** Deep-ish clone so undo snapshots never share mutable structure. */
export function cloneDocument(doc: EditorDoc): EditorDoc {
  return {
    ...doc,
    theme: { ...doc.theme },
    nodes: doc.nodes.map((n) => ({ ...n })),
    edges: doc.edges.map((e) => [e[0], e[1]] as Edge),
    edgeFactors: { ...doc.edgeFactors },
    edgePulls: { ...doc.edgePulls },
  }
}

// --- edge-map maintenance ----------------------------------------------------
/** Rename a node key inside an edge-keyed map (used when a node moves cell). */
export function renameNodeInEdgeMap(
  map: Record<string, number>,
  oldKey: string,
  newKey: string,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(map)) {
    const remapped = key
      .split('|')
      .map((k) => (k === oldKey ? newKey : k))
      .sort()
      .join('|')
    out[remapped] = value
  }
  return out
}

/** Drop every entry touching a node key (used when a node is deleted). */
export function dropNodeFromEdgeMap(
  map: Record<string, number>,
  nodeKey: string,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(map).filter(([key]) => !key.split('|').includes(nodeKey)),
  )
}

/** Drop a single edge entry by its edge key. */
export function dropEdgeKey(
  map: Record<string, number>,
  key: string,
): Record<string, number> {
  return Object.fromEntries(Object.entries(map).filter(([k]) => k !== key))
}

// --- persistence & serialization --------------------------------------------
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isGridIndex = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < GRID

const finiteOr = (v: unknown, fallback: number, lo: number, hi: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback

const NODE_KEY_RE = /^\d+-\d+$/

function sanitizeNode(raw: unknown): Node | null {
  if (!isRecord(raw)) return null
  if (!isGridIndex(raw.r) || !isGridIndex(raw.c)) return null
  const size = SIZES.includes(raw.size as Size) ? (raw.size as Size) : 'M'
  const node: Node = { r: raw.r, c: raw.c, size }
  if (typeof raw.radius === 'number' && Number.isFinite(raw.radius)) {
    node.radius = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, raw.radius))
  }
  if (typeof raw.offsetX === 'number' && Number.isFinite(raw.offsetX)) {
    node.offsetX = Math.min(OFFSET_LIMIT, Math.max(-OFFSET_LIMIT, raw.offsetX))
  }
  if (typeof raw.offsetY === 'number' && Number.isFinite(raw.offsetY)) {
    node.offsetY = Math.min(OFFSET_LIMIT, Math.max(-OFFSET_LIMIT, raw.offsetY))
  }
  return node
}

function sanitizeEdge(raw: unknown): Edge | null {
  if (!Array.isArray(raw) || raw.length < 2) return null
  const [a, b] = raw
  if (typeof a !== 'string' || typeof b !== 'string') return null
  if (!NODE_KEY_RE.test(a) || !NODE_KEY_RE.test(b) || a === b) return null
  return [a, b]
}

function sanitizeEdgeMap(raw: unknown, lo: number, hi: number): Record<string, number> {
  if (!isRecord(raw)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = Math.min(hi, Math.max(lo, value))
    }
  }
  return out
}

const isHexColor = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)

/** Coerce arbitrary parsed JSON (localStorage or user-imported files) into a
 *  valid document: invalid entries are dropped, numbers are clamped to the
 *  ranges the UI enforces, and missing fields fall back to defaults. */
export function sanitizeDocument(raw: unknown): EditorDoc {
  const base = createDocument()
  if (!isRecord(raw)) return base
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes.map(sanitizeNode).filter((n): n is Node => n !== null)
    : base.nodes
  const theme = isRecord(raw.theme)
    ? {
        pink: isHexColor(raw.theme.pink) ? raw.theme.pink : base.theme.pink,
        blue: isHexColor(raw.theme.blue) ? raw.theme.blue : base.theme.blue,
        ink: isHexColor(raw.theme.ink) ? raw.theme.ink : base.theme.ink,
        bg: isHexColor(raw.theme.bg) ? raw.theme.bg : base.theme.bg,
      }
    : base.theme
  return {
    nodes,
    edges: Array.isArray(raw.edges)
      ? raw.edges.map(sanitizeEdge).filter((e): e is Edge => e !== null)
      : base.edges,
    edgeFactors: sanitizeEdgeMap(raw.edgeFactors, 0.1, 1),
    edgePulls: sanitizeEdgeMap(raw.edgePulls, 0, 1),
    mode: raw.mode === 'graph' ? 'graph' : 'metaball',
    theme,
    gooStd: finiteOr(raw.gooStd, base.gooStd, 2, 18),
    gooThreshold: finiteOr(raw.gooThreshold, base.gooThreshold, 6, 44),
    tubeFactor: finiteOr(raw.tubeFactor, base.tubeFactor, 0.1, 1),
    inwardPull: finiteOr(raw.inwardPull, base.inwardPull, 0, 1),
    fullGrid: !!raw.fullGrid,
    flattenEpsilon: finiteOr(raw.flattenEpsilon, base.flattenEpsilon, 0.1, 3),
    flattenResolution: Math.round(
      finiteOr(raw.flattenResolution, base.flattenResolution, 1, 3),
    ),
  }
}

export function saveDocument(doc: EditorDoc): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cloneDocument(doc), version: 1 }))
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadDocument(): EditorDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return sanitizeDocument(parsed)
  } catch {
    return null
  }
}

/** Restore the persisted document, or fall back to the first preset. */
export function initialDocument(): EditorDoc {
  return loadDocument() ?? documentFromPreset(PRESETS[0])
}

export function serializeDocument(doc: EditorDoc): string {
  return JSON.stringify({ ...cloneDocument(doc), version: 1 }, null, 2)
}

export function parseDocument(json: string): EditorDoc {
  return sanitizeDocument(JSON.parse(json))
}

export function downloadJson(doc: EditorDoc, name = 'metaball-document'): void {
  const blob = new Blob([serializeDocument(doc)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
