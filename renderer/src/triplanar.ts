import * as THREE from 'three';

/**
 * Triplanar texture projection for the marching-cubes surface.
 *
 * The isosurface has no UVs (and none that would survive its constant
 * re-tessellation), so the maps are projected along the three world axes and
 * blended by the surface normal — the standard answer for blobby geometry.
 * Injected into MeshPhysicalMaterial via onBeforeCompile so every preset
 * keeps its full physical shading; `amount` cross-fades the projected color,
 * roughness and normal detail over the preset's own values.
 */

export type TriplanarMaps = {
  map: THREE.Texture;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
};

export type TriplanarOptions = {
  /** Texture repeats per world unit (the mark is ~2.4 units wide). */
  scale?: number;
  /** 0..1 blend over the base material's color/roughness/normals. */
  amount?: number;
};

export const TRIPLANAR_DEFAULTS = { scale: 1.6, amount: 1 } as const;

const VERTEX_PARS = /* glsl */ `
varying vec3 vTriWorldPos;
varying vec3 vTriWorldNormal;
`;

const VERTEX_MAIN = /* glsl */ `
vTriWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vTriWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
`;

const FRAGMENT_PARS = /* glsl */ `
varying vec3 vTriWorldPos;
varying vec3 vTriWorldNormal;
uniform sampler2D uTriMap;
uniform float uTriScale;
uniform float uTriAmount;
#ifdef TRI_HAS_NORMAL
uniform sampler2D uTriNormalMap;
#endif
#ifdef TRI_HAS_ROUGH
uniform sampler2D uTriRoughMap;
#endif

vec3 triBlendWeights() {
  vec3 weights = pow(abs(normalize(vTriWorldNormal)), vec3(4.0));
  return weights / (weights.x + weights.y + weights.z);
}

vec4 triSample(sampler2D tex) {
  vec3 weights = triBlendWeights();
  vec3 p = vTriWorldPos * uTriScale;
  return texture2D(tex, p.zy) * weights.x +
    texture2D(tex, p.xz) * weights.y +
    texture2D(tex, p.xy) * weights.z;
}
`;

const FRAGMENT_MAP = /* glsl */ `
diffuseColor.rgb = mix(diffuseColor.rgb, triSample(uTriMap).rgb, uTriAmount);
`;

const FRAGMENT_ROUGH = /* glsl */ `
#ifdef TRI_HAS_ROUGH
roughnessFactor = mix(roughnessFactor, roughnessFactor * triSample(uTriRoughMap).g, uTriAmount);
#endif
`;

// Whiteout-blend triplanar normal mapping (no tangents on this geometry);
// the perturbed world normal is rotated into view space, matching the space
// `normal` lives in inside the lights fragment.
const FRAGMENT_NORMAL = /* glsl */ `
#ifdef TRI_HAS_NORMAL
{
  vec3 triN = normalize(vTriWorldNormal);
  vec3 weights = triBlendWeights();
  vec3 p = vTriWorldPos * uTriScale;
  vec3 tnx = texture2D(uTriNormalMap, p.zy).xyz * 2.0 - 1.0;
  vec3 tny = texture2D(uTriNormalMap, p.xz).xyz * 2.0 - 1.0;
  vec3 tnz = texture2D(uTriNormalMap, p.xy).xyz * 2.0 - 1.0;
  tnx = vec3(tnx.xy + triN.zy, abs(tnx.z) * triN.x);
  tny = vec3(tny.xy + triN.xz, abs(tny.z) * triN.y);
  tnz = vec3(tnz.xy + triN.xy, abs(tnz.z) * triN.z);
  vec3 triWorldN = normalize(tnx.zyx * weights.x + tny.xzy * weights.y + tnz.xyz * weights.z);
  vec3 triViewN = normalize((viewMatrix * vec4(triWorldN, 0.0)).xyz);
  normal = normalize(mix(normal, triViewN, uTriAmount));
}
#endif
`;

export function applyTriplanarTexture(
  material: THREE.MeshPhysicalMaterial,
  maps: TriplanarMaps,
  options: TriplanarOptions = {},
): void {
  const scale = options.scale ?? TRIPLANAR_DEFAULTS.scale;
  const amount = options.amount ?? TRIPLANAR_DEFAULTS.amount;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTriMap = { value: maps.map };
    shader.uniforms.uTriScale = { value: scale };
    shader.uniforms.uTriAmount = { value: amount };
    if (maps.normalMap) shader.uniforms.uTriNormalMap = { value: maps.normalMap };
    if (maps.roughnessMap) shader.uniforms.uTriRoughMap = { value: maps.roughnessMap };

    shader.defines = {
      ...shader.defines,
      ...(maps.normalMap ? { TRI_HAS_NORMAL: '' } : {}),
      ...(maps.roughnessMap ? { TRI_HAS_ROUGH: '' } : {}),
    };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${VERTEX_MAIN}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAGMENT_MAP}`)
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\n${FRAGMENT_ROUGH}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`,
      );
  };
  material.customProgramCacheKey = () =>
    `triplanar:${Number(Boolean(maps.normalMap))}:${Number(Boolean(maps.roughnessMap))}`;
  material.needsUpdate = true;
}

/** Load and configure the triplanar map set; caller owns disposal. */
export function loadTriplanarMaps(urls: {
  mapUrl: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
}): { promise: Promise<TriplanarMaps>; dispose: () => void } {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const loaded: THREE.Texture[] = [];

  const load = (url: string, color: boolean) =>
    loader.loadAsync(url).then((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      loaded.push(texture);
      return texture;
    });

  const promise = Promise.all([
    load(urls.mapUrl, true),
    urls.normalMapUrl ? load(urls.normalMapUrl, false) : Promise.resolve(null),
    urls.roughnessMapUrl ? load(urls.roughnessMapUrl, false) : Promise.resolve(null),
  ]).then(([map, normalMap, roughnessMap]) => ({ map, normalMap, roughnessMap }));

  return { promise, dispose: () => loaded.forEach((texture) => texture.dispose()) };
}
