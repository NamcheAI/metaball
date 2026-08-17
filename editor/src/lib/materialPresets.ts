// Material presets for the 3D showcase. All presets are plain MeshPhysicalMaterial
// looks for the live view. Organic recipes for Blender MCP live in
// docs/blender-materials.md and docs/blender-texture-transfer-prompt.md.
import type { MeshPhysicalMaterialParameters } from 'three';

export type MaterialPreset = {
  id: string;
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
    needsEnvironment: false,
    params: {
      color: '#f4e8d9',
      roughness: 0.48,
      metalness: 0,
      sheen: 0.45,
      sheenColor: '#fff4e6',
      sheenRoughness: 0.55,
      clearcoat: 0.08,
      clearcoatRoughness: 0.35,
    },
  },
  {
    id: 'clay',
    label: 'Ton',
    hint: 'Dry, matte clay — no reflections, earthy tone.',
    needsEnvironment: false,
    params: {
      color: '#c98a63',
      roughness: 0.92,
      metalness: 0,
    },
  },
  {
    id: 'honey',
    label: 'Honig',
    hint: 'Translucent amber syrup — light passes through.',
    needsEnvironment: true,
    params: {
      // Near-white surface; hue via attenuation so transmission stays clear.
      color: '#fff6e8',
      roughness: 0.12,
      metalness: 0,
      transmission: 0.82,
      ior: 1.4,
      thickness: 1.2,
      attenuationColor: '#c46a08',
      attenuationDistance: 0.55,
      clearcoat: 0.35,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.9,
    },
  },
  {
    id: 'chrome',
    label: 'Chrom',
    hint: 'Polished chrome — fully mirrored, needs the studio reflections.',
    needsEnvironment: true,
    params: {
      color: '#eef0f2',
      roughness: 0.04,
      metalness: 1,
      envMapIntensity: 1.35,
    },
  },
  {
    id: 'glass',
    label: 'Glas',
    hint: 'Clear glass — transmissive with subtle refraction.',
    needsEnvironment: true,
    params: {
      color: '#ffffff',
      roughness: 0.03,
      metalness: 0,
      transmission: 1,
      ior: 1.5,
      thickness: 0.7,
      attenuationColor: '#eef4ff',
      attenuationDistance: 2.2,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.15,
    },
  },
  {
    id: 'resin_moss',
    label: 'Harz+Moos',
    hint: 'Amber resin with a green moss sheen.',
    needsEnvironment: true,
    params: {
      color: '#fff4e0',
      roughness: 0.18,
      metalness: 0,
      transmission: 0.72,
      ior: 1.48,
      thickness: 1.35,
      attenuationColor: '#9a5808',
      attenuationDistance: 0.42,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      sheen: 0.35,
      sheenColor: '#2a5a28',
      sheenRoughness: 0.75,
      envMapIntensity: 0.95,
    },
  },
  {
    id: 'rock',
    label: 'Fels',
    hint: 'Cool matte stone.',
    needsEnvironment: true,
    params: {
      color: '#cfcbc2',
      roughness: 0.95,
      metalness: 0.02,
      envMapIntensity: 0.35,
    },
  },
  {
    id: 'foam',
    label: 'Schaum',
    hint: 'Soft peach foam — slightly translucent.',
    needsEnvironment: true,
    params: {
      color: '#ffe8e0',
      roughness: 0.68,
      metalness: 0,
      transmission: 0.28,
      ior: 1.33,
      thickness: 1.25,
      attenuationColor: '#e07058',
      attenuationDistance: 0.35,
      sheen: 0.45,
      sheenColor: '#ffc8b0',
      sheenRoughness: 0.65,
      envMapIntensity: 0.45,
    },
  },
  {
    id: 'mycelium',
    label: 'Myzel',
    hint: 'Pale flesh with a violet sheen — soft, living mycelium.',
    needsEnvironment: true,
    params: {
      color: '#f5ebe3',
      roughness: 0.72,
      metalness: 0,
      transmission: 0.12,
      ior: 1.38,
      thickness: 1.1,
      attenuationColor: '#c4a090',
      attenuationDistance: 0.55,
      sheen: 0.4,
      sheenColor: '#6B3A6E',
      sheenRoughness: 0.7,
      clearcoat: 0.06,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.55,
    },
  },
];

export function getMaterialPreset(id: string): MaterialPreset {
  return MATERIAL_PRESETS.find((p) => p.id === id) ?? MATERIAL_PRESETS[0];
}
