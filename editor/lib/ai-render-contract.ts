export const AI_RENDER_QUALITIES = ['low', 'medium', 'high'] as const;
export type AIRenderQuality = (typeof AI_RENDER_QUALITIES)[number];

export const AI_RENDER_SIZES = ['1024x1024', '1536x1024', '1024x1536'] as const;
export type AIRenderSize = (typeof AI_RENDER_SIZES)[number];

export const AI_RENDER_BACKGROUNDS = ['opaque', 'transparent', 'auto'] as const;
export type AIRenderBackground = (typeof AI_RENDER_BACKGROUNDS)[number];

export type AIRenderParams = {
  materialDescription: string;
  geometryFidelity: number;
  materialInfluence: number;
  lightingDescription: string;
  backgroundDescription: string;
  quality: AIRenderQuality;
  size: AIRenderSize;
  background: AIRenderBackground;
};

export type AIRenderRequest = {
  shapeImage: string;
  materialImage?: string | null;
  params: AIRenderParams;
};

export type AIRenderResult = {
  image: string;
  model: string;
  prompt: string;
  requestId?: string;
};

export const DEFAULT_AI_RENDER_PARAMS: AIRenderParams = {
  materialDescription:
    'Iridescent mother-of-pearl with warm coral undertones, translucent depth and fine organic variation.',
  geometryFidelity: 95,
  materialInfluence: 75,
  lightingDescription: 'Soft directional studio light with a broad highlight and subtle rim light.',
  backgroundDescription: 'A quiet, pale neutral studio background.',
  quality: 'medium',
  size: '1024x1024',
  background: 'opaque',
};

const MAX_DESCRIPTION_LENGTH = 1_200;
const MAX_SUPPORTING_DESCRIPTION_LENGTH = 600;

function clampPercent(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.round(Math.min(100, Math.max(0, numeric)));
}

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return (normalized || fallback).slice(0, maxLength);
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  return typeof value === 'string' && allowed.includes(value) ? (value as T[number]) : fallback;
}

export function normalizeAIRenderParams(value: unknown): AIRenderParams {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    materialDescription: normalizeText(
      input.materialDescription,
      DEFAULT_AI_RENDER_PARAMS.materialDescription,
      MAX_DESCRIPTION_LENGTH,
    ),
    geometryFidelity: clampPercent(
      input.geometryFidelity,
      DEFAULT_AI_RENDER_PARAMS.geometryFidelity,
    ),
    materialInfluence: clampPercent(
      input.materialInfluence,
      DEFAULT_AI_RENDER_PARAMS.materialInfluence,
    ),
    lightingDescription: normalizeText(
      input.lightingDescription,
      DEFAULT_AI_RENDER_PARAMS.lightingDescription,
      MAX_SUPPORTING_DESCRIPTION_LENGTH,
    ),
    backgroundDescription: normalizeText(
      input.backgroundDescription,
      DEFAULT_AI_RENDER_PARAMS.backgroundDescription,
      MAX_SUPPORTING_DESCRIPTION_LENGTH,
    ),
    quality: enumValue(input.quality, AI_RENDER_QUALITIES, DEFAULT_AI_RENDER_PARAMS.quality),
    size: enumValue(input.size, AI_RENDER_SIZES, DEFAULT_AI_RENDER_PARAMS.size),
    background: enumValue(
      input.background,
      AI_RENDER_BACKGROUNDS,
      DEFAULT_AI_RENDER_PARAMS.background,
    ),
  };
}

function influenceInstruction(value: number): string {
  if (value <= 25) return 'Use the material as a restrained surface accent.';
  if (value <= 60) return 'Make the material clearly readable without overwhelming the object.';
  if (value <= 85) return 'Apply the material strongly across the complete visible surface.';
  return 'Let the material character dominate every visible surface detail.';
}

function fidelityInstruction(value: number): string {
  if (value >= 90) {
    return 'Treat the silhouette, holes, topology, proportions, framing and camera angle as locked.';
  }
  if (value >= 70) {
    return 'Preserve the silhouette, holes, proportions and camera; allow only fine surface relief.';
  }
  if (value >= 40) {
    return 'Keep the object recognizable and camera-locked; modest surface deformation is allowed.';
  }
  return 'Keep the overall object identity and camera, but allow expressive material-driven deformation.';
}

export function buildAIRenderPrompt(params: AIRenderParams, hasMaterialImage: boolean): string {
  const materialReference = hasMaterialImage
    ? 'Image 2 is the material reference. Transfer its material family, palette and microstructure onto Image 1; do not copy its object, composition or background.'
    : 'There is no second image. Derive the material only from the written material direction.';
  const backgroundInstruction =
    params.background === 'transparent'
      ? 'Isolate the object on a fully transparent background. Add no scenery or checkerboard.'
      : params.background === 'opaque'
        ? params.backgroundDescription
        : `Choose a background that supports the object. Direction: ${params.backgroundDescription}`;

  return `GOAL
Create one photorealistic, high-end material study of the exact metaball object in Image 1.

INPUT ROLES
Image 1 is the canonical shape, composition and camera reference.
${materialReference}

MATERIAL DIRECTION
${params.materialDescription}
Material influence: ${params.materialInfluence}/100. ${influenceInstruction(params.materialInfluence)}

GEOMETRY CONSTRAINTS
Shape fidelity: ${params.geometryFidelity}/100. ${fidelityInstruction(params.geometryFidelity)}
Do not add or remove lobes, holes, limbs or separate objects. Keep the subject centered at the same scale. Change only material, fine surface response, lighting and background unless the fidelity instruction explicitly permits fine relief.

LIGHTING
${params.lightingDescription}

BACKGROUND
${backgroundInstruction}

OUTPUT CONSTRAINTS
One object only. No text, captions, watermark, frame, pedestal, hands or people. Render as a polished material/industrial-design photograph with coherent highlights, contact shadow when appropriate and physically plausible depth.`;
}
