import assert from 'node:assert/strict';
import test from 'node:test';
import { ENGINE } from '@namche/metaball';
import { resolveMetaballShape } from '../dist/index.js';

const { DEFAULT_PRESET_ID } = ENGINE;

test('the public renderer resolves to the current NAMCHE Loop by default', () => {
  assert.equal(DEFAULT_PRESET_ID, 'loop');
  const shape = resolveMetaballShape();
  assert.equal(shape.nodes.length, 5);
  assert.equal(shape.edges.length, 4);
  assert.equal(shape.neck, 0.55);
  assert.equal(shape.blur, 9);
  assert.equal(shape.contrast, 22);
  assert.equal(shape.pinch, 0);
});

test('custom shapes are copied and keep their overrides', () => {
  const input = {
    nodes: [{ r: 2, c: 2, size: 'XL' }],
    edges: [],
    edgeFactors: { '1-1|1-2': 0.4 },
    neck: 0.3,
    pinch: 0.5,
  };
  const shape = resolveMetaballShape(input);
  assert.notEqual(shape.nodes, input.nodes);
  assert.notEqual(shape.edgeFactors, input.edgeFactors);
  assert.equal(shape.neck, 0.3);
  assert.equal(shape.pinch, 0.5);
});

test('unknown presets fail loudly', () => {
  assert.throws(() => resolveMetaballShape(undefined, 'missing'), /Unknown metaball preset/);
});
