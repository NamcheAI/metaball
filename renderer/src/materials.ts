import * as THREE from 'three';
import type { MeshPhysicalMaterialParameters } from 'three';

export const MATERIAL_PRESET_IDS = [
  'wax',
  'clay',
  'honey',
  'chrome',
  'glass',
  'resin_moss',
  'rock',
  'foam',
  'mycelium',
] as const;

export type MaterialPresetId = (typeof MATERIAL_PRESET_IDS)[number];

export type MaterialPreset = {
  id: MaterialPresetId;
  label: string;
  hint: string;
  needsEnvironment?: boolean;
  params: MeshPhysicalMaterialParameters;
};

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'wax',
    label: 'Wachs',
    hint: 'Warm, soft wax — matte with a faint sheen.',
    params: {
      color: '#f4e8d9', roughness: 0.48, metalness: 0, sheen: 0.45,
      sheenColor: '#fff4e6', sheenRoughness: 0.55, clearcoat: 0.08,
      clearcoatRoughness: 0.35,
    },
  },
  {
    id: 'clay',
    label: 'Ton',
    hint: 'Dry, matte clay — no reflections, earthy tone.',
    params: { color: '#c98a63', roughness: 0.92, metalness: 0 },
  },
  {
    id: 'honey',
    label: 'Honig',
    hint: 'Translucent amber syrup — light passes through.',
    needsEnvironment: true,
    params: {
      color: '#fff6e8', roughness: 0.12, metalness: 0, transmission: 0.82,
      ior: 1.4, thickness: 1.2, attenuationColor: '#c46a08',
      attenuationDistance: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.12,
      envMapIntensity: 0.9,
    },
  },
  {
    id: 'chrome',
    label: 'Chrom',
    hint: 'Polished chrome — fully mirrored, needs the studio reflections.',
    needsEnvironment: true,
    params: { color: '#eef0f2', roughness: 0.04, metalness: 1, envMapIntensity: 1.35 },
  },
  {
    id: 'glass',
    label: 'Glas',
    hint: 'Clear glass — transmissive with subtle refraction.',
    needsEnvironment: true,
    params: {
      color: '#ffffff', roughness: 0.03, metalness: 0, transmission: 1, ior: 1.5,
      thickness: 0.7, attenuationColor: '#eef4ff', attenuationDistance: 2.2,
      clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.15,
    },
  },
  {
    id: 'resin_moss',
    label: 'Harz+Moos',
    hint: 'Amber resin with a green moss sheen.',
    needsEnvironment: true,
    params: {
      color: '#fff4e0', roughness: 0.18, metalness: 0, transmission: 0.72,
      ior: 1.48, thickness: 1.35, attenuationColor: '#9a5808',
      attenuationDistance: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.15,
      sheen: 0.35, sheenColor: '#2a5a28', sheenRoughness: 0.75, envMapIntensity: 0.95,
    },
  },
  {
    id: 'rock',
    label: 'Fels',
    hint: 'Cool matte stone.',
    needsEnvironment: true,
    params: { color: '#cfcbc2', roughness: 0.95, metalness: 0.02, envMapIntensity: 0.35 },
  },
  {
    id: 'foam',
    label: 'Schaum',
    hint: 'Soft peach foam — slightly translucent.',
    needsEnvironment: true,
    params: {
      color: '#ffe8e0', roughness: 0.68, metalness: 0, transmission: 0.28,
      ior: 1.33, thickness: 1.25, attenuationColor: '#e07058',
      attenuationDistance: 0.35, sheen: 0.45, sheenColor: '#ffc8b0',
      sheenRoughness: 0.65, envMapIntensity: 0.45,
    },
  },
  {
    id: 'mycelium',
    label: 'Myzel',
    hint: 'Pale flesh with a violet sheen — soft, living mycelium.',
    needsEnvironment: true,
    params: {
      color: '#f5ebe3', roughness: 0.72, metalness: 0, transmission: 0.12,
      ior: 1.38, thickness: 1.1, attenuationColor: '#c4a090',
      attenuationDistance: 0.55, sheen: 0.4, sheenColor: '#6b3a6e',
      sheenRoughness: 0.7, clearcoat: 0.06, clearcoatRoughness: 0.45,
      envMapIntensity: 0.55,
    },
  },
];

export type MaterialInput = MaterialPresetId | MeshPhysicalMaterialParameters;

export function getMaterialPreset(id: string): MaterialPreset {
  return MATERIAL_PRESETS.find((preset) => preset.id === id) ?? MATERIAL_PRESETS[0]!;
}

export function materialNeedsEnvironment(input: MaterialInput): boolean {
  if (typeof input === 'string') return Boolean(getMaterialPreset(input).needsEnvironment);
  return Boolean(
    input.metalness ||
      input.transmission ||
      input.clearcoat ||
      input.envMap ||
      input.envMapIntensity,
  );
}

export function createMaterial(
  input: MaterialInput = 'wax',
): { material: THREE.MeshPhysicalMaterial; needsEnvironment: boolean } {
  const preset = typeof input === 'string' ? getMaterialPreset(input) : null;
  const params: MeshPhysicalMaterialParameters =
    typeof input === 'string' ? getMaterialPreset(input).params : input;
  const transmission = typeof params.transmission === 'number' ? params.transmission : 0;
  return {
    material: new THREE.MeshPhysicalMaterial({
      ...params,
      flatShading: false,
      transparent: transmission > 0,
      depthWrite: transmission <= 0.5,
    }),
    needsEnvironment: preset ? Boolean(preset.needsEnvironment) : materialNeedsEnvironment(input),
  };
}

export function createMaterialForPreset(presetId: string): THREE.MeshPhysicalMaterial {
  return createMaterial(getMaterialPreset(presetId).id).material;
}

function colorToHex(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value instanceof THREE.Color) return `#${value.getHexString()}`;
  return fallback;
}

export type ExportMaterialParams = {
  color: string;
  roughness: number;
  metalness: number;
  transmission?: number;
  ior?: number;
  thickness?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string;
  sheenRoughness?: number;
  iridescence?: number;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: [number, number];
  dispersion?: number;
};

export function exportMaterialParams(presetId: string): ExportMaterialParams {
  const params = getMaterialPreset(presetId).params;
  const result: ExportMaterialParams = {
    color: colorToHex(params.color, '#cccccc'),
    roughness: typeof params.roughness === 'number' ? params.roughness : 0.5,
    metalness: typeof params.metalness === 'number' ? params.metalness : 0,
  };
  if (typeof params.transmission === 'number' && params.transmission > 0) result.transmission = params.transmission;
  if (typeof params.ior === 'number') result.ior = params.ior;
  if (typeof params.thickness === 'number') result.thickness = params.thickness;
  if (params.attenuationColor != null) result.attenuationColor = colorToHex(params.attenuationColor, '#ffffff');
  if (typeof params.attenuationDistance === 'number') result.attenuationDistance = params.attenuationDistance;
  if (typeof params.clearcoat === 'number' && params.clearcoat > 0) result.clearcoat = params.clearcoat;
  if (typeof params.clearcoatRoughness === 'number') result.clearcoatRoughness = params.clearcoatRoughness;
  if (typeof params.sheen === 'number' && params.sheen > 0) result.sheen = params.sheen;
  if (params.sheenColor != null) result.sheenColor = colorToHex(params.sheenColor, '#ffffff');
  if (typeof params.sheenRoughness === 'number') result.sheenRoughness = params.sheenRoughness;
  if (typeof params.iridescence === 'number' && params.iridescence > 0) result.iridescence = params.iridescence;
  if (typeof params.iridescenceIOR === 'number') result.iridescenceIOR = params.iridescenceIOR;
  if (Array.isArray(params.iridescenceThicknessRange) && params.iridescenceThicknessRange.length === 2) {
    result.iridescenceThicknessRange = [params.iridescenceThicknessRange[0], params.iridescenceThicknessRange[1]];
  }
  if (typeof params.dispersion === 'number' && params.dispersion > 0) result.dispersion = params.dispersion;
  return result;
}
