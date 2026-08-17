import assert from 'node:assert/strict';
import test from 'node:test';
import { VIEWBOX, generate } from '@namche/metaball';
import { toGenerateParams } from '../src/lib/coreDocument';
import { PRESETS, clonePreset } from '../src/lib/model';

test('studio presets flatten through the canonical engine', () => {
  const preset = PRESETS.find(({ id }) => id === 'r');
  assert.ok(preset);
  const doc = clonePreset(preset);

  const fromStudio = generate({ ...toGenerateParams(doc), backend: 'pure' });
  const fromCore = generate({ preset: 'r', backend: 'pure' });

  assert.equal(fromStudio.d, fromCore.d);
});

test('high-resolution studio export stays in viewBox coordinates', () => {
  const preset = PRESETS.find(({ id }) => id === 'loop');
  assert.ok(preset);
  const doc = { ...clonePreset(preset), flattenResolution: 3 };
  const result = generate({ ...toGenerateParams(doc), backend: 'pure' });
  const coordinates = [...result.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(([value]) => Number(value));

  assert.ok(coordinates.length > 0);
  assert.ok(Math.max(...coordinates) <= VIEWBOX + 1);
  assert.ok(Math.min(...coordinates) >= -1);
});
