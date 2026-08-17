// Thin MeshPhysicalMaterial factory + GLB export params.
// Organic looks are finished in Blender (docs/blender-materials.md).
import * as THREE from 'three';
import { getMaterialPreset } from './materialPresets';

function colorToHex(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value instanceof THREE.Color) return `#${value.getHexString()}`;
  return fallback;
}

/** Create a disposable MeshPhysicalMaterial for the given preset id. */
export function createMaterialForPreset(presetId: string): THREE.MeshPhysicalMaterial {
  const preset = getMaterialPreset(presetId);
  const transmission =
    typeof preset.params.transmission === 'number' ? preset.params.transmission : 0;
  return new THREE.MeshPhysicalMaterial({
    ...preset.params,
    flatShading: false,
    // Liquid / glass presets need transparency so the background can read through.
    transparent: transmission > 0,
    depthWrite: transmission > 0.5 ? false : true,
  });
}

/** Principled-friendly params for glTF export (no procedural shader nodes). */
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
  const p = getMaterialPreset(presetId).params;
  const out: ExportMaterialParams = {
    color: colorToHex(p.color, '#cccccc'),
    roughness: typeof p.roughness === 'number' ? p.roughness : 0.5,
    metalness: typeof p.metalness === 'number' ? p.metalness : 0,
  };

  if (typeof p.transmission === 'number' && p.transmission > 0) {
    out.transmission = p.transmission;
  }
  if (typeof p.ior === 'number') out.ior = p.ior;
  if (typeof p.thickness === 'number') out.thickness = p.thickness;
  if (p.attenuationColor != null) {
    out.attenuationColor = colorToHex(p.attenuationColor, '#ffffff');
  }
  if (typeof p.attenuationDistance === 'number') {
    out.attenuationDistance = p.attenuationDistance;
  }
  if (typeof p.clearcoat === 'number' && p.clearcoat > 0) {
    out.clearcoat = p.clearcoat;
  }
  if (typeof p.clearcoatRoughness === 'number') {
    out.clearcoatRoughness = p.clearcoatRoughness;
  }
  if (typeof p.sheen === 'number' && p.sheen > 0) {
    out.sheen = p.sheen;
  }
  if (p.sheenColor != null) {
    out.sheenColor = colorToHex(p.sheenColor, '#ffffff');
  }
  if (typeof p.sheenRoughness === 'number') {
    out.sheenRoughness = p.sheenRoughness;
  }
  if (typeof p.iridescence === 'number' && p.iridescence > 0) {
    out.iridescence = p.iridescence;
  }
  if (typeof p.iridescenceIOR === 'number') {
    out.iridescenceIOR = p.iridescenceIOR;
  }
  if (
    Array.isArray(p.iridescenceThicknessRange) &&
    p.iridescenceThicknessRange.length === 2 &&
    typeof p.iridescenceThicknessRange[0] === 'number' &&
    typeof p.iridescenceThicknessRange[1] === 'number'
  ) {
    out.iridescenceThicknessRange = [
      p.iridescenceThicknessRange[0],
      p.iridescenceThicknessRange[1],
    ];
  }
  if (typeof p.dispersion === 'number' && p.dispersion > 0) {
    out.dispersion = p.dispersion;
  }

  return out;
}
