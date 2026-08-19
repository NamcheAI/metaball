import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  applySurfaceShader,
  getSurfacePreset,
  normalizeSurface,
  surfaceBoundsScale,
  surfaceDefaultMaterial,
} from '../dist/index.js';

test('surface strategies expose only parameters that belong to their medium', () => {
  const coralKeys = getSurfacePreset('coral').controls.map((control) => control.key);
  const furKeys = getSurfacePreset('fur').controls.map((control) => control.key);
  const pearlKeys = getSurfacePreset('pearl').controls.map((control) => control.key);

  assert.ok(coralKeys.includes('poreSize'));
  assert.ok(!coralKeys.includes('density'));
  assert.ok(furKeys.includes('density'));
  assert.ok(!furKeys.includes('poreSize'));
  assert.ok(pearlKeys.includes('layerVariation'));
  assert.ok(!pearlKeys.includes('porosityAmount'));
});

test('surface inputs normalize and clamp within their own strategy', () => {
  const coral = normalizeSurface({
    kind: 'coral',
    porosityAmount: 8,
    poreSize: -2,
    deformAmount: Number.NaN,
    seed: 4.6,
  });
  assert.equal(coral.kind, 'coral');
  assert.equal(coral.porosityAmount, 1);
  assert.equal(coral.poreSize, 0.01);
  assert.equal(coral.deformAmount, getSurfacePreset('coral').params.deformAmount);
  assert.equal(coral.seed, 5);
});

test('surface presets select suitable physical base materials', () => {
  assert.equal(surfaceDefaultMaterial('pearl'), 'pearl');
  assert.equal(surfaceDefaultMaterial('moss'), 'moss');
  assert.equal(surfaceDefaultMaterial('fur'), 'fur');
  assert.ok(surfaceBoundsScale('grass') > 1);
});

test('shader surfaces patch physical materials while fibers stay separate', () => {
  const pearl = applySurfaceShader(new THREE.MeshPhysicalMaterial(), 'pearl');
  const fur = applySurfaceShader(new THREE.MeshPhysicalMaterial(), 'fur');
  assert.match(pearl.customProgramCacheKey(), /namche-surface-pearl/);
  assert.doesNotMatch(fur.customProgramCacheKey(), /namche-surface/);
  pearl.dispose();
  fur.dispose();
});
