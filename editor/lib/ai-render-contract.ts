export const AI_RENDER_QUALITIES = ['low', 'medium', 'high'] as const;
export type AIRenderQuality = (typeof AI_RENDER_QUALITIES)[number];

// gpt-image-2 renders these natively -- no upscaling pass. Its constraints:
// both edges divisible by 16, long:short ratio <= 3:1, and 655,360 <= total
// pixels <= 8,294,400 (so 2880x2880 and 3840x2160 both sit exactly on the
// ceiling). `assertRenderSizesAreValid` in the tests pins every entry to
// those rules, so a hand-added size fails here rather than at the provider.
export const AI_RENDER_SIZES = [
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '2048x2048',
  '2880x2880',
  '3840x2160',
  '2160x3840',
] as const;

export const GPT_IMAGE_MAX_EDGE = 3840;
export const GPT_IMAGE_MIN_PIXELS = 655_360;
export const GPT_IMAGE_MAX_PIXELS = 8_294_400;
export type AIRenderSize = (typeof AI_RENDER_SIZES)[number];

export const AI_RENDER_BACKGROUNDS = ['opaque', 'transparent', 'auto'] as const;
export type AIRenderBackground = (typeof AI_RENDER_BACKGROUNDS)[number];

/**
 * The metamorph knobs, all 0-100 percent. The first five describe STRUCTURE
 * (what the material does to the form); the last three describe OPTICS (how
 * the surface reads under light). Structure alone could not separate wet
 * stone from chalk, milk from marble, or a few huge polka dots from a fine
 * speckle -- those differences live entirely in the optics group, which is
 * why materials that are structurally identical used to render alike.
 */
export type AIMetamorphParams = {
  deformAmount: number;
  nubDensity: number;
  porosityAmount: number;
  poreSize: number;
  heightVariation: number;
  glossiness: number;
  translucency: number;
  patternScale: number;
};

export const DEFAULT_AI_METAMORPH_PARAMS: AIMetamorphParams = {
  deformAmount: 25,
  nubDensity: 40,
  porosityAmount: 60,
  poreSize: 20,
  heightVariation: 50,
  glossiness: 50,
  translucency: 15,
  patternScale: 40,
};

export const AI_METAMORPH_PARAM_KEYS = [
  'deformAmount',
  'nubDensity',
  'porosityAmount',
  'poreSize',
  'heightVariation',
  'glossiness',
  'translucency',
  'patternScale',
] as const satisfies ReadonlyArray<keyof AIMetamorphParams>;

export type AIRenderParams = {
  materialDescription: string;
  geometryFidelity: number;
  materialInfluence: number;
  lightingDescription: string;
  backgroundDescription: string;
  quality: AIRenderQuality;
  size: AIRenderSize;
  background: AIRenderBackground;
  /** When set (and a material image is present), the metamorph template
   *  replaces the standard material-study prompt. */
  metamorph?: AIMetamorphParams | null;
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

export function normalizeAIMetamorphParams(value: unknown): AIMetamorphParams | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const result = {} as AIMetamorphParams;
  for (const key of AI_METAMORPH_PARAM_KEYS) {
    result[key] = clampPercent(input[key], DEFAULT_AI_METAMORPH_PARAMS[key]);
  }
  return result;
}

export function normalizeAIRenderParams(value: unknown): AIRenderParams {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    metamorph: normalizeAIMetamorphParams(input.metamorph),
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

/** The tuned metamorph template with the five variables filled as
 *  percentages. Material and structure come from the reference (Image 2);
 *  camera, position, lighting and background stay owned by the Studio —
 *  the reference photo's scene must never leak into the render. */
export function buildAIMetamorphPrompt(params: AIRenderParams): string {
  const m = params.metamorph ?? DEFAULT_AI_METAMORPH_PARAMS;
  const backgroundInstruction =
    params.background === 'transparent'
      ? 'Isolate the object on a fully transparent background. Add no scenery or checkerboard.'
      : params.background === 'opaque'
        ? params.backgroundDescription
        : `Choose a background that supports the object. Direction: ${params.backgroundDescription}`;
  return `Apply the surface texture, material, color palette, and finish from the second reference image onto the object in the first image. Use the second image ONLY as a material sample: ignore its scene, objects, background, perspective and lighting entirely. Keep the camera angle, framing, scale and position of the object exactly as in the first image. Apply surface deformation at ${m.deformAmount}% intensity — at low intensity, keep the geometry close to the original with only fine surface-level texture; at high intensity, let the form itself warp, bulge, or fracture to match the irregular structure of the reference material. Grow ${m.nubDensity}% organic, finger-like nubs and tendrils out from the surface, as if the material itself is dripping or budding outward. Thread ${m.porosityAmount}% porosity through the entire structure — including through the nubs and tendrils themselves, not just the flat surface — with ${m.poreSize}% holes and cavities running organically through the material. Vary the surface relief at ${m.heightVariation}%, with peaks, ridges, and recessed areas of uneven height across the whole form, matching the irregular topology of the reference. Render the finish at ${m.glossiness}% gloss — 0% is fully matte and light-absorbing like chalk or unglazed clay, 100% is a wet, mirror-bright specular sheen. Give the material ${m.translucency}% translucency — 0% fully opaque, 100% light passing visibly through thinner areas with soft subsurface scattering, as in wax, jade or milk. Scale the material's pattern to ${m.patternScale}% — low values read as a few large motifs spanning the whole form, high values as fine, dense repetition. Fully replace the original surface with the material qualities shown in the reference: its texture pattern, color, reflectivity, and finish.

LIGHTING
${params.lightingDescription}

BACKGROUND
${backgroundInstruction}

Photorealistic result. One object only. No table, floor, scenery or props from the reference image. No text, captions, watermark, frame, pedestal, hands or people.`;
}

export function buildAIRenderPrompt(params: AIRenderParams, hasMaterialImage: boolean): string {
  if (params.metamorph && hasMaterialImage) return buildAIMetamorphPrompt(params);
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

export type AISuggestRequest = {
  /** Material photo as a data URL; the model reads it and proposes settings. */
  materialImage: string;
};

export type AISuggestResult = {
  params: AIMetamorphParams;
  materialDescription: string;
  model: string;
};
