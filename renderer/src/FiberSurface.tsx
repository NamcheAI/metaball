import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import type { FiberSurfaceParameters } from './surfaces.js';

type FiberPalette = { dark: string; light: string };

const PALETTES: Record<FiberSurfaceParameters['kind'], FiberPalette> = {
  moss: { dark: '#6f9255', light: '#c3d894' },
  grass: { dark: '#6f9b55', light: '#c8dc7d' },
  fur: { dark: '#b99b80', light: '#f0ddc9' },
};

function randomGenerator(seed: number): () => number {
  let state = (seed + 1) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildFiberMesh(
  source: MarchingCubes,
  params: FiberSurfaceParameters,
): THREE.InstancedMesh | null {
  if (source.count <= 0 || params.density <= 0 || params.intensity <= 0) return null;
  const positions = source.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  const normals = source.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (!positions || !normals) return null;

  const kindMultiplier = params.kind === 'fur' ? 2.2 : params.kind === 'moss' ? 1.8 : 1.25;
  const instanceCount = Math.round((220 + params.density * 1120) * params.intensity * kindMultiplier);
  const length = (0.018 + params.length * 0.15) * params.intensity;
  const radius = 0.003 + params.thickness * 0.012;
  const radialSegments = params.kind === 'moss' ? 5 : 3;
  const strand = new THREE.ConeGeometry(radius, length, radialSegments, 1, false);
  strand.translate(0, length * 0.5, 0);
  const palette = PALETTES[params.kind];
  const material = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    side: THREE.DoubleSide,
    toneMapped: true,
  });
  const mesh = new THREE.InstancedMesh(strand, material, instanceCount);
  mesh.name = `Namche${params.kind[0]!.toUpperCase()}${params.kind.slice(1)}Fibers`;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;

  const random = randomGenerator(params.seed);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3(1, 1, 1);
  const dark = new THREE.Color(palette.dark);
  const light = new THREE.Color(palette.light);
  const color = new THREE.Color();
  let written = 0;
  let attempts = 0;
  const maxAttempts = instanceCount * 16;

  while (written < instanceCount && attempts++ < maxAttempts) {
    const vertex = Math.floor(random() * Math.max(1, source.count));
    position.fromBufferAttribute(positions, vertex);
    normal.fromBufferAttribute(normals, vertex).normalize();
    const patch = 0.5 + 0.5 * Math.sin(
      position.x * params.scale * 3.1 +
      position.y * params.scale * 4.7 +
      position.z * params.scale * 2.3 +
      params.seed,
    );
    if (random() > THREE.MathUtils.lerp(1, patch, params.clumping)) continue;

    tangent.set(random() - 0.5, random() - 0.5, random() - 0.5);
    tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
    direction.copy(normal)
      .addScaledVector(tangent, (random() - 0.5) * params.curl * 0.85)
      .addScaledVector(up, -params.gravity * 0.42)
      .normalize();
    quaternion.setFromUnitVectors(up, direction);
    const lengthVariation = 0.72 + random() * 0.56;
    scale.set(0.72 + random() * 0.56, lengthVariation, 0.72 + random() * 0.56);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(written, matrix);
    color.copy(dark).lerp(light, random() * params.colorVariation);
    mesh.setColorAt(written, color);
    written++;
  }

  mesh.count = written;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export function FiberSurface({
  source,
  surface,
  revision,
}: {
  source: MarchingCubes;
  surface: FiberSurfaceParameters;
  revision: number;
}) {
  const mesh = useMemo(() => buildFiberMesh(source, surface), [source, surface, revision]);
  useEffect(() => {
    return () => {
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material | undefined)?.dispose();
    };
  }, [mesh]);
  return mesh ? <primitive object={mesh} /> : null;
}
