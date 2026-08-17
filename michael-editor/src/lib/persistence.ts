import {
  cloneDocument,
  clonePreset,
  createDefaultDocument,
  DOCUMENT_VERSION,
  PRESETS,
  type Document,
  type StoredDocument,
} from './model';
import {
  DEFAULT_LIQUID_PRESET,
  defaultLiquidParams,
  getLiquidPreset,
  normalizeLiquidParams,
  normalizeLookMode,
} from './liquidPresets';
import { normalizeLiquidBackdropId } from './liquidBackdrops';
import { getMaterialPreset } from './materialPresets';

const STORAGE_KEY = 'metaball-editor-document';

export function saveDocument(doc: Document): void {
  try {
    const stored: StoredDocument = { ...cloneDocument(doc), version: DOCUMENT_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function loadDocument(): Document | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDocument;
    if (!parsed || typeof parsed !== 'object') return null;
    return normalizeDocument(parsed);
  } catch {
    return null;
  }
}

export function normalizeDocument(input: Partial<StoredDocument>): Document {
  const base = createDefaultDocument();

  // Migrate legacy materialPreset === 'prism' into lookMode liquid.
  const legacyPrism = input.materialPreset === 'prism';
  const lookMode = legacyPrism
    ? 'liquid'
    : normalizeLookMode((input as { lookMode?: unknown }).lookMode);
  const liquidPresetRaw =
    typeof (input as { liquidPreset?: unknown }).liquidPreset === 'string'
      ? (input as { liquidPreset: string }).liquidPreset
      : legacyPrism
        ? 'prism'
        : base.liquidPreset;
  const liquidPreset = getLiquidPreset(liquidPresetRaw).id;
  const liquidFallback = getLiquidPreset(liquidPreset).params;
  const liquidParams = normalizeLiquidParams(
    (input as { liquidParams?: Partial<typeof liquidFallback> }).liquidParams,
    legacyPrism ? defaultLiquidParams() : liquidFallback,
  );

  let materialPreset =
    typeof input.materialPreset === 'string' ? input.materialPreset : base.materialPreset;
  if (materialPreset === 'prism') materialPreset = 'wax';
  materialPreset = getMaterialPreset(materialPreset).id;

  return {
    nodes: Array.isArray(input.nodes) ? input.nodes.map((n) => ({ ...n })) : base.nodes,
    edges: Array.isArray(input.edges)
      ? input.edges.map((e) => [e[0], e[1]] as [string, string])
      : base.edges,
    edgeFactors:
      input.edgeFactors && typeof input.edgeFactors === 'object'
        ? { ...input.edgeFactors }
        : base.edgeFactors,
    edgePulls:
      input.edgePulls && typeof input.edgePulls === 'object'
        ? { ...input.edgePulls }
        : base.edgePulls,
    mode: input.mode === 'graph' ? 'graph' : 'metaball',
    theme: input.theme ? { ...base.theme, ...input.theme } : base.theme,
    gooStd: typeof input.gooStd === 'number' ? input.gooStd : base.gooStd,
    gooThreshold:
      typeof input.gooThreshold === 'number' ? input.gooThreshold : base.gooThreshold,
    tubeFactor: typeof input.tubeFactor === 'number' ? input.tubeFactor : base.tubeFactor,
    inwardPull: typeof input.inwardPull === 'number' ? input.inwardPull : base.inwardPull,
    fullGrid: Boolean(input.fullGrid),
    flattenEpsilon:
      typeof input.flattenEpsilon === 'number' ? input.flattenEpsilon : base.flattenEpsilon,
    flattenResolution:
      typeof input.flattenResolution === 'number'
        ? input.flattenResolution
        : base.flattenResolution,
    materialPreset,
    lookMode,
    liquidPreset: liquidPreset || DEFAULT_LIQUID_PRESET,
    liquidParams,
    liquidBackdrop: normalizeLiquidBackdropId(
      (input as { liquidBackdrop?: unknown }).liquidBackdrop,
    ),
    surfaceSamplerEnabled:
      typeof input.surfaceSamplerEnabled === 'boolean'
        ? input.surfaceSamplerEnabled
        : base.surfaceSamplerEnabled,
    surfaceSamplerMode:
      input.surfaceSamplerMode === 'points' ||
      input.surfaceSamplerMode === 'spheres' ||
      input.surfaceSamplerMode === 'both'
        ? input.surfaceSamplerMode
        : base.surfaceSamplerMode,
    surfaceSamplerCount:
      typeof input.surfaceSamplerCount === 'number'
        ? input.surfaceSamplerCount
        : base.surfaceSamplerCount,
    surfaceSamplerPointSize:
      typeof input.surfaceSamplerPointSize === 'number'
        ? input.surfaceSamplerPointSize
        : base.surfaceSamplerPointSize,
    surfaceSamplerSphereSize:
      typeof input.surfaceSamplerSphereSize === 'number'
        ? input.surfaceSamplerSphereSize
        : base.surfaceSamplerSphereSize,
    surfaceSamplerShowMesh:
      typeof input.surfaceSamplerShowMesh === 'boolean'
        ? input.surfaceSamplerShowMesh
        : base.surfaceSamplerShowMesh,
    surfaceSamplerAnimate:
      typeof input.surfaceSamplerAnimate === 'boolean'
        ? input.surfaceSamplerAnimate
        : base.surfaceSamplerAnimate,
  };
}

export function initialDocument(): Document {
  const saved = loadDocument();
  if (saved) return saved;
  return clonePreset(PRESETS[0]);
}

export function serializeDocument(doc: Document): string {
  const stored: StoredDocument = { ...cloneDocument(doc), version: DOCUMENT_VERSION };
  return JSON.stringify(stored, null, 2);
}

export function parseDocumentJson(json: string): Document {
  const parsed = JSON.parse(json) as Partial<StoredDocument>;
  return normalizeDocument(parsed);
}

export function downloadJson(doc: Document, name = 'metaball-document'): void {
  const blob = new Blob([serializeDocument(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
