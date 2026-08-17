import type { GenerateParams } from '@namche/metaball';
import { isBrandmarkDocument, type Document } from './model';

/** Map the extended studio document onto the canonical 2D engine API. */
export function toGenerateParams(
  doc: Pick<
    Document,
    | 'nodes'
    | 'edges'
    | 'edgeFactors'
    | 'edgePulls'
    | 'tubeFactor'
    | 'gooStd'
    | 'gooThreshold'
    | 'inwardPull'
    | 'flattenEpsilon'
    | 'flattenResolution'
  >,
): GenerateParams {
  if (isBrandmarkDocument(doc as Document)) return { preset: 'brandmark' };
  return {
    nodes: doc.nodes,
    edges: doc.edges,
    edgeFactors: doc.edgeFactors,
    edgePulls: doc.edgePulls,
    neck: doc.tubeFactor,
    blur: doc.gooStd,
    contrast: doc.gooThreshold,
    pinch: doc.inwardPull,
    detail: doc.flattenEpsilon,
    resolution: doc.flattenResolution,
  };
}
