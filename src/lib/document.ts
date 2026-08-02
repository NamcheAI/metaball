import {
  DEFAULT_FLATTEN_EPSILON,
  DEFAULT_FLATTEN_RESOLUTION,
  DEFAULT_THEME,
  DEFAULT_TUBE_FACTOR,
  STORAGE_KEY,
} from './constants'
import { PRESETS } from './presets'
import type { EditorDoc, Edge, Node, Preset } from './types'

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
/** Coerce arbitrary parsed JSON into a valid document, filling gaps. */
export function sanitizeDocument(raw: Partial<EditorDoc> | null | undefined): EditorDoc {
  const base = createDocument()
  const r = raw ?? {}
  return {
    nodes: Array.isArray(r.nodes) ? r.nodes.map((n) => ({ ...n })) : base.nodes,
    edges: Array.isArray(r.edges) ? r.edges.map((e) => [e[0], e[1]] as Edge) : base.edges,
    edgeFactors:
      r.edgeFactors && typeof r.edgeFactors === 'object'
        ? { ...r.edgeFactors }
        : base.edgeFactors,
    edgePulls:
      r.edgePulls && typeof r.edgePulls === 'object' ? { ...r.edgePulls } : base.edgePulls,
    mode: r.mode === 'graph' ? 'graph' : 'metaball',
    theme: r.theme ? { ...base.theme, ...r.theme } : base.theme,
    gooStd: typeof r.gooStd === 'number' ? r.gooStd : base.gooStd,
    gooThreshold: typeof r.gooThreshold === 'number' ? r.gooThreshold : base.gooThreshold,
    tubeFactor: typeof r.tubeFactor === 'number' ? r.tubeFactor : base.tubeFactor,
    inwardPull: typeof r.inwardPull === 'number' ? r.inwardPull : base.inwardPull,
    fullGrid: !!r.fullGrid,
    flattenEpsilon:
      typeof r.flattenEpsilon === 'number' ? r.flattenEpsilon : base.flattenEpsilon,
    flattenResolution:
      typeof r.flattenResolution === 'number'
        ? r.flattenResolution
        : base.flattenResolution,
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
