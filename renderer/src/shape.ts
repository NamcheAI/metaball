import {
  DEFAULT_GOO_STD,
  DEFAULT_GOO_THRESHOLD,
  DEFAULT_PRESET_ID,
  DEFAULT_TUBE_FACTOR,
  presetById,
  type Edge,
  type Node,
} from '@namche/metaball';

export type MetaballShape = {
  nodes: Node[];
  edges: Edge[];
  edgeFactors?: Record<string, number>;
  edgePulls?: Record<string, number>;
  /** Global connector radius relative to the smaller node. */
  neck?: number;
  /** Field blur, in the same units as the 2D generator. */
  blur?: number;
  /** Field threshold. Higher values make tighter, sharper joins. */
  contrast?: number;
  /** Connector pinch from 0 (tube) to 1 (fully merged). */
  pinch?: number;
};

export type ResolvedMetaballShape = Required<MetaballShape>;

export function resolveMetaballShape(
  shape?: MetaballShape,
  presetId = DEFAULT_PRESET_ID,
): ResolvedMetaballShape {
  const requestedPreset = presetById(presetId);
  if (!shape && !requestedPreset) {
    throw new Error(`Unknown metaball preset: ${presetId}`);
  }
  const preset = requestedPreset ?? presetById(DEFAULT_PRESET_ID);
  const source = shape ?? requestedPreset;
  if (!source) {
    throw new Error(`The default metaball preset "${DEFAULT_PRESET_ID}" is missing.`);
  }

  return {
    nodes: source.nodes.map((node) => ({ ...node })),
    edges: source.edges.map(([a, b]) => [a, b]),
    edgeFactors: shape?.edgeFactors ? { ...shape.edgeFactors } : {},
    edgePulls: shape?.edgePulls ? { ...shape.edgePulls } : {},
    neck: shape?.neck ?? preset?.tubeFactor ?? DEFAULT_TUBE_FACTOR,
    blur: shape?.blur ?? preset?.gooStd ?? DEFAULT_GOO_STD,
    contrast: shape?.contrast ?? preset?.gooThreshold ?? DEFAULT_GOO_THRESHOLD,
    pinch: shape?.pinch ?? 0,
  };
}
