import * as THREE from 'three';
import type { MaterialPresetId } from './materials.js';

export const SURFACE_PRESET_IDS = ['smooth', 'pearl', 'coral', 'moss', 'grass', 'fur'] as const;

export type SurfacePresetId = (typeof SURFACE_PRESET_IDS)[number];

export type SurfaceStrategy = 'plain' | 'shader' | 'fibers';

export type SurfaceCommonParameters = {
  scale: number;
  intensity: number;
  seed: number;
};

export type SmoothSurfaceParameters = SurfaceCommonParameters & { kind: 'smooth' };
export type PearlSurfaceParameters = SurfaceCommonParameters & {
  kind: 'pearl';
  microRelief: number;
  layerVariation: number;
};
export type CoralSurfaceParameters = SurfaceCommonParameters & {
  kind: 'coral';
  deformAmount: number;
  porosityAmount: number;
  poreSize: number;
  nubDensity: number;
};
export type FiberSurfaceParameters = SurfaceCommonParameters & {
  kind: 'moss' | 'grass' | 'fur';
  density: number;
  length: number;
  thickness: number;
  clumping: number;
  curl: number;
  gravity: number;
  colorVariation: number;
};

export type SurfaceParameters =
  | SmoothSurfaceParameters
  | PearlSurfaceParameters
  | CoralSurfaceParameters
  | FiberSurfaceParameters;

export type SurfaceInput =
  | SurfacePresetId
  | ({ kind: 'smooth' } & Partial<Omit<SmoothSurfaceParameters, 'kind'>>)
  | ({ kind: 'pearl' } & Partial<Omit<PearlSurfaceParameters, 'kind'>>)
  | ({ kind: 'coral' } & Partial<Omit<CoralSurfaceParameters, 'kind'>>)
  | ({ kind: 'moss' | 'grass' | 'fur' } & Partial<Omit<FiberSurfaceParameters, 'kind'>>);

export type SurfaceControl = {
  key: Exclude<keyof SurfaceParameters, 'kind'> | string;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
};

export type SurfacePreset = {
  id: SurfacePresetId;
  label: string;
  hint: string;
  strategy: SurfaceStrategy;
  /** A production path may need real topology even when live preview is shader-based. */
  productionStrategy?: 'lattice';
  defaultMaterial: MaterialPresetId;
  params: SurfaceParameters;
  controls: SurfaceControl[];
};

const COMMON_CONTROLS: SurfaceControl[] = [
  { key: 'scale', label: 'Scale', min: 0.5, max: 12, step: 0.1, hint: 'Size of the surface pattern.' },
  { key: 'intensity', label: 'Intensity', min: 0, max: 1, step: 0.01, hint: 'Overall strength of this surface treatment.' },
  { key: 'seed', label: 'Seed', min: 0, max: 9999, step: 1, hint: 'Repeatable variation.' },
];

export const SURFACE_PRESETS: SurfacePreset[] = [
  {
    id: 'smooth',
    label: 'Smooth',
    hint: 'Canonical metaball surface without procedural relief.',
    strategy: 'plain',
    defaultMaterial: 'wax',
    params: {
      kind: 'smooth',
      scale: 4,
      intensity: 0,
      seed: 0,
    },
    controls: [],
  },
  {
    id: 'pearl',
    label: 'Pearl',
    hint: 'Fine nacre relief with iridescent highlights; keeps the silhouette intact.',
    strategy: 'shader',
    defaultMaterial: 'pearl',
    params: {
      kind: 'pearl',
      scale: 2.8,
      intensity: 0.54,
      seed: 17,
      microRelief: 0.018,
      layerVariation: 0.28,
    },
    controls: [
      ...COMMON_CONTROLS,
      { key: 'microRelief', label: 'Micro relief', min: 0, max: 1, step: 0.01, hint: 'Fine nacre ridges without changing the mark silhouette.' },
      { key: 'layerVariation', label: 'Layer variation', min: 0, max: 1, step: 0.01, hint: 'Variation across iridescent mineral layers.' },
    ],
  },
  {
    id: 'coral',
    label: 'Coral',
    hint: 'Porous coral skin for live preview. Open through-cells require the Blender lattice handoff.',
    strategy: 'shader',
    productionStrategy: 'lattice',
    defaultMaterial: 'coral_porcelain',
    params: {
      kind: 'coral',
      scale: 3.2,
      intensity: 0.82,
      seed: 31,
      deformAmount: 0.06,
      porosityAmount: 1,
      poreSize: 0.02,
      nubDensity: 1,
    },
    controls: [
      ...COMMON_CONTROLS,
      { key: 'deformAmount', label: 'Deformation', min: 0, max: 1, step: 0.01, hint: 'Broad organic deformation.' },
      { key: 'porosityAmount', label: 'Porosity', min: 0, max: 1, step: 0.01, hint: 'Density and depth of cellular cavities.' },
      { key: 'poreSize', label: 'Pore size', min: 0.01, max: 1, step: 0.01, hint: 'Scale of individual cavities.' },
      { key: 'nubDensity', label: 'Nub density', min: 0, max: 1, step: 0.01, hint: 'Organic buds growing from ridges.' },
    ],
  },
  ...(
    [
      {
        id: 'moss', label: 'Moss', defaultMaterial: 'moss',
        hint: 'Short clustered fibers with strong color variation.',
        params: { kind: 'moss', scale: 5, intensity: 0.82, seed: 43, density: 0.72, length: 0.18, thickness: 0.5, clumping: 0.82, curl: 0.45, gravity: 0.18, colorVariation: 0.72 },
      },
      {
        id: 'grass', label: 'Grass', defaultMaterial: 'grass',
        hint: 'Longer directional blades with moderate clumping and gravity.',
        params: { kind: 'grass', scale: 4, intensity: 0.9, seed: 59, density: 0.62, length: 0.52, thickness: 0.26, clumping: 0.38, curl: 0.18, gravity: 0.42, colorVariation: 0.46 },
      },
      {
        id: 'fur', label: 'Fur', defaultMaterial: 'fur',
        hint: 'Dense soft fibers with curl and subtle coat variation.',
        params: { kind: 'fur', scale: 6, intensity: 0.86, seed: 71, density: 0.88, length: 0.34, thickness: 0.18, clumping: 0.28, curl: 0.58, gravity: 0.26, colorVariation: 0.34 },
      },
    ] as const
  ).map((entry): SurfacePreset => ({
    ...entry,
    strategy: 'fibers',
    controls: [
      ...COMMON_CONTROLS,
      { key: 'density', label: 'Density', min: 0, max: 1, step: 0.01, hint: 'Number of visible fibers.' },
      { key: 'length', label: 'Length', min: 0, max: 1, step: 0.01, hint: 'Fiber or blade length.' },
      { key: 'thickness', label: 'Thickness', min: 0, max: 1, step: 0.01, hint: 'Width of individual fibers.' },
      { key: 'clumping', label: 'Clumping', min: 0, max: 1, step: 0.01, hint: 'How strongly neighboring fibers form patches.' },
      { key: 'curl', label: 'Curl', min: 0, max: 1, step: 0.01, hint: 'Bend and irregularity along fibers.' },
      { key: 'gravity', label: 'Gravity', min: 0, max: 1, step: 0.01, hint: 'Downward lean.' },
      { key: 'colorVariation', label: 'Color variation', min: 0, max: 1, step: 0.01, hint: 'Per-fiber tonal variation.' },
    ],
  })),
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function getSurfacePreset(id: string): SurfacePreset {
  return SURFACE_PRESETS.find((preset) => preset.id === id) ?? SURFACE_PRESETS[0]!;
}

export function normalizeSurface(input: SurfaceInput = 'smooth'): SurfaceParameters {
  const requestedKind =
    typeof input === 'string' ? input : typeof input.kind === 'string' ? input.kind : 'smooth';
  const preset = getSurfacePreset(requestedKind);
  const source = (typeof input === 'string' ? preset.params : input) as Record<string, unknown>;
  const fallback = preset.params as unknown as Record<string, unknown>;
  const common = {
    scale: clamp(finiteOr(source.scale, fallback.scale as number), 0.5, 12),
    intensity: clamp(finiteOr(source.intensity, fallback.intensity as number), 0, 1),
    seed: Math.round(clamp(finiteOr(source.seed, fallback.seed as number), 0, 9999)),
  };
  if (preset.id === 'smooth') return { kind: 'smooth', ...common };
  if (preset.id === 'pearl') {
    return {
      kind: 'pearl', ...common,
      microRelief: clamp(finiteOr(source.microRelief, fallback.microRelief as number), 0, 1),
      layerVariation: clamp(finiteOr(source.layerVariation, fallback.layerVariation as number), 0, 1),
    };
  }
  if (preset.id === 'coral') {
    return {
      kind: 'coral', ...common,
      deformAmount: clamp(finiteOr(source.deformAmount, fallback.deformAmount as number), 0, 1),
      porosityAmount: clamp(finiteOr(source.porosityAmount, fallback.porosityAmount as number), 0, 1),
      poreSize: clamp(finiteOr(source.poreSize, fallback.poreSize as number), 0.01, 1),
      nubDensity: clamp(finiteOr(source.nubDensity, fallback.nubDensity as number), 0, 1),
    };
  }
  return {
    kind: preset.id, ...common,
    density: clamp(finiteOr(source.density, fallback.density as number), 0, 1),
    length: clamp(finiteOr(source.length, fallback.length as number), 0, 1),
    thickness: clamp(finiteOr(source.thickness, fallback.thickness as number), 0, 1),
    clumping: clamp(finiteOr(source.clumping, fallback.clumping as number), 0, 1),
    curl: clamp(finiteOr(source.curl, fallback.curl as number), 0, 1),
    gravity: clamp(finiteOr(source.gravity, fallback.gravity as number), 0, 1),
    colorVariation: clamp(finiteOr(source.colorVariation, fallback.colorVariation as number), 0, 1),
  };
}

export function surfaceDefaultMaterial(input: SurfaceInput = 'smooth'): MaterialPresetId {
  return getSurfacePreset(normalizeSurface(input).kind).defaultMaterial;
}

/** Conservative camera padding for vertex-shader displacement. */
export function surfaceBoundsScale(input: SurfaceInput = 'smooth'): number {
  const params = normalizeSurface(input);
  if (params.kind === 'smooth') return 1;
  if (params.kind === 'pearl') return 1 + params.microRelief * params.intensity * 0.025;
  if (params.kind === 'coral') {
    return 1 + params.deformAmount * params.intensity * 0.08 + params.nubDensity * 0.025;
  }
  return 1 + params.length * params.intensity * 0.18;
}

const surfaceCommon = /* glsl */ `
float namcheHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float namcheNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(namcheHash(i), namcheHash(i + vec3(1, 0, 0)), f.x),
        mix(namcheHash(i + vec3(0, 1, 0)), namcheHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(namcheHash(i + vec3(0, 0, 1)), namcheHash(i + vec3(1, 0, 1)), f.x),
        mix(namcheHash(i + vec3(0, 1, 1)), namcheHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

float namcheFbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.55;
  for (int octave = 0; octave < 3; octave++) {
    value += amplitude * namcheNoise(p);
    p = p * 2.03 + vec3(7.1, 3.7, 5.9);
    amplitude *= 0.48;
  }
  return value;
}

float namcheCells(vec3 p, float poreSize, float seed) {
  float frequency = mix(3.6, 0.72, sqrt(clamp(poreSize, 0.0, 1.0)));
  vec3 q = p * frequency + vec3(seed * 0.017, seed * 0.011, seed * 0.023);
  float warp = namcheFbm(q * 0.42) - 0.5;
  q += vec3(warp * 1.7, -warp * 1.1, warp * 0.8);
  return abs(sin(q.x) * sin(q.y) * sin(q.z));
}
`;

/**
 * Adds UV-free object-space relief and shading to a MeshPhysicalMaterial.
 * The shader is intentionally self-contained: no texture downloads, global
 * handles or extra render passes, so multiple public renderer instances stay
 * independent and demand-rendering remains possible.
 */
export function applySurfaceShader(
  material: THREE.MeshPhysicalMaterial,
  input: SurfaceInput = 'smooth',
): THREE.MeshPhysicalMaterial {
  const params = normalizeSurface(input);
  if (params.kind !== 'pearl' && params.kind !== 'coral') return material;

  const kind = params.kind === 'pearl' ? 1 : 2;
  const pearlMicroRelief = params.kind === 'pearl' ? params.microRelief : 0;
  const pearlLayerVariation = params.kind === 'pearl' ? params.layerVariation : 0;
  const coralDeformAmount = params.kind === 'coral' ? params.deformAmount : 0;
  const coralPorosityAmount = params.kind === 'coral' ? params.porosityAmount : 0;
  const coralPoreSize = params.kind === 'coral' ? params.poreSize : 0.1;
  const coralNubDensity = params.kind === 'coral' ? params.nubDensity : 0;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      namcheSurfaceKind: { value: kind },
      namcheSurfaceIntensity: { value: params.intensity },
      namchePearlMicroRelief: { value: pearlMicroRelief },
      namchePearlLayerVariation: { value: pearlLayerVariation },
      namcheCoralDeformAmount: { value: coralDeformAmount },
      namcheCoralPorosityAmount: { value: coralPorosityAmount },
      namcheCoralPoreSize: { value: coralPoreSize },
      namcheCoralNubDensity: { value: coralNubDensity },
      namcheSurfaceScale: { value: params.scale },
      namcheSurfaceSeed: { value: params.seed },
    });

    const declarations = /* glsl */ `
uniform float namcheSurfaceKind;
uniform float namcheSurfaceIntensity;
uniform float namchePearlMicroRelief;
uniform float namchePearlLayerVariation;
uniform float namcheCoralDeformAmount;
uniform float namcheCoralPorosityAmount;
uniform float namcheCoralPoreSize;
uniform float namcheCoralNubDensity;
uniform float namcheSurfaceScale;
uniform float namcheSurfaceSeed;
varying vec3 vNamcheSurfacePosition;
varying vec3 vNamcheSurfaceNormal;
${surfaceCommon}
`;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${declarations}`)
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>\n  vNamcheSurfaceNormal = normalize(normalMatrix * objectNormal);`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
  vec3 namchePoint = position * namcheSurfaceScale;
  float namcheBroad = namcheFbm(namchePoint * 0.58 + vec3(namcheSurfaceSeed * 0.013));
  float namcheDisplacement = (namcheBroad - 0.48) * namchePearlMicroRelief * namcheSurfaceIntensity * 0.024;
  if (namcheSurfaceKind > 1.5) {
    float namcheCell = namcheCells(position * namcheSurfaceScale, namcheCoralPoreSize, namcheSurfaceSeed);
    float namchePore = smoothstep(
      0.76 - namcheCoralPorosityAmount * 0.33,
      0.94 - namcheCoralPorosityAmount * 0.20,
      namcheCell
    );
    float namcheNub = smoothstep(0.74, 0.94, namcheFbm(namchePoint * 1.9 + vec3(9.7)));
    namcheDisplacement = namcheCoralDeformAmount * namcheSurfaceIntensity * (-namchePore * 0.055 + (namcheBroad - 0.48) * 0.07 + namcheNub * namcheCoralNubDensity * 0.035);
  }
  transformed += normal * namcheDisplacement;
  vNamcheSurfacePosition = transformed;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${declarations}`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  float namcheFine = namcheFbm(vNamcheSurfacePosition * namcheSurfaceScale * 2.1 + vec3(namcheSurfaceSeed * 0.013));
  if (namcheSurfaceKind < 1.5) {
    float namcheFacing = 1.0 - abs(dot(normalize(vNamcheSurfaceNormal), normalize(vViewPosition)));
    vec3 namchePearlShift = mix(vec3(1.035, 0.985, 0.94), vec3(0.84, 0.94, 1.08), clamp(namcheFacing + (namcheFine - 0.5) * 0.34, 0.0, 1.0));
    diffuseColor.rgb *= mix(vec3(1.0), namchePearlShift, namchePearlLayerVariation * namcheSurfaceIntensity);
  } else {
    float namcheCell = namcheCells(vNamcheSurfacePosition * namcheSurfaceScale, namcheCoralPoreSize, namcheSurfaceSeed);
    float namchePore = smoothstep(0.76 - namcheCoralPorosityAmount * 0.33, 0.94 - namcheCoralPorosityAmount * 0.20, namcheCell);
    vec3 namcheCoralRidge = vec3(1.035, 1.01, 0.955);
    vec3 namcheCoralCavity = vec3(0.48, 0.56, 0.82);
    diffuseColor.rgb *= mix(namcheCoralRidge, namcheCoralCavity, namchePore * 0.68);
  }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
  if (namcheSurfaceKind < 1.5) {
    roughnessFactor = clamp(roughnessFactor + (namcheFine - 0.5) * 0.035, 0.035, 1.0);
  } else {
    roughnessFactor = clamp(roughnessFactor + (namcheFine - 0.45) * 0.30, 0.12, 1.0);
  }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
  float namcheHeight = namcheFbm(vNamcheSurfacePosition * namcheSurfaceScale * 2.3 + vec3(namcheSurfaceSeed * 0.013));
  if (namcheSurfaceKind > 1.5) {
    float namcheCell = namcheCells(vNamcheSurfacePosition * namcheSurfaceScale, namcheCoralPoreSize, namcheSurfaceSeed);
    namcheHeight -= smoothstep(0.76 - namcheCoralPorosityAmount * 0.33, 0.94 - namcheCoralPorosityAmount * 0.20, namcheCell) * 0.72;
  }
  vec3 namcheDp1 = dFdx(vNamcheSurfacePosition);
  vec3 namcheDp2 = dFdy(vNamcheSurfacePosition);
  vec3 namcheR1 = cross(namcheDp2, normal);
  vec3 namcheR2 = cross(normal, namcheDp1);
  float namcheDet = dot(namcheDp1, namcheR1);
  vec3 namcheGradient = sign(namcheDet) * (dFdx(namcheHeight) * namcheR1 + dFdy(namcheHeight) * namcheR2);
  float namcheBumpStrength = namcheSurfaceKind < 1.5 ? namchePearlMicroRelief * 0.55 : namcheCoralPorosityAmount * 0.22;
  normal = normalize(abs(namcheDet) * normal - namcheGradient * namcheBumpStrength * namcheSurfaceIntensity);`,
      );
  };
  material.customProgramCacheKey = () => `namche-surface-${params.kind}-v1`;
  material.needsUpdate = true;
  return material;
}
