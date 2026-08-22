import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOCUMENT_VERSION,
  GOO_STD_MAX,
  OFFSET_MAX,
  RADIUS_MAX,
  SURFACE_SAMPLER_COUNT_MAX,
  TUBE_FACTOR_MIN,
  edgeKey,
  presetIdForDocument,
} from '../src/lib/model';
import { initialDocument, normalizeDocument, parseDocumentJson } from '../src/lib/persistence';

test('import sanitizes geometry, styles, and studio settings', () => {
  const doc = normalizeDocument({
    nodes: [
      { r: 1, c: 1, size: 'XL', radius: 999, offsetX: -999 },
      { r: 1, c: 1, size: 'S' },
      { r: 2, c: 2, size: 'invalid' },
      { r: 99, c: 99, size: 'L' },
    ],
    edges: [
      ['1-1', '2-2'],
      ['1-1', '2-2'],
      ['1-1', '4-4'],
    ],
    edgeFactors: { [edgeKey('1-1', '2-2')]: -10, '1-1|4-4': 0.9 },
    gooStd: 999,
    surfaceSamplerCount: 999999,
    theme: { pink: 'not-a-color', blue: '#123456', ink: '#000', bg: '#fff' },
  });

  assert.equal(doc.nodes.length, 2);
  assert.equal(doc.nodes[0].radius, undefined);
  assert.equal(doc.nodes[1].radius, undefined);
  assert.equal(doc.nodes[1].size, 'M');
  assert.equal(doc.edges.length, 1);
  assert.equal(doc.edgeFactors[edgeKey('1-1', '2-2')], TUBE_FACTOR_MIN);
  assert.equal(doc.edgeFactors['1-1|4-4'], undefined);
  assert.equal(doc.gooStd, GOO_STD_MAX);
  assert.equal(doc.surfaceSamplerCount, SURFACE_SAMPLER_COUNT_MAX);
  assert.equal(doc.theme.blue, '#123456');
});

test('individual node overrides are clamped', () => {
  const doc = normalizeDocument({
    nodes: [{ r: 1, c: 1, size: 'L', radius: 999, offsetX: -999 }],
  });
  assert.equal(doc.nodes[0].radius, RADIUS_MAX);
  assert.equal(doc.nodes[0].offsetX, -OFFSET_MAX);
});

test('invalid JSON still fails loudly for the UI error path', () => {
  assert.throws(() => parseDocumentJson('{'));
});

test('new documents use Namche Loop, raster on, and opt-in surface sampling', () => {
  const doc = initialDocument();
  assert.equal(presetIdForDocument(doc), 'loop');
  assert.equal(doc.rasterEnabled, true);
  assert.equal(doc.surfaceSamplerEnabled, false);
  assert.equal(doc.fullGrid, false);
});

test('raster visibility survives document normalization', () => {
  assert.equal(normalizeDocument({ rasterEnabled: false }).rasterEnabled, false);
  assert.equal(normalizeDocument({}).rasterEnabled, true);
});

test('version 10 migrates the full-bleed Classic graph into the shared inner frame', () => {
  const doc = normalizeDocument({
    version: 10,
    nodes: [
      { r: 0, c: 0, size: 'L', radius: 89.55, offsetX: 25.55, offsetY: 25.55 },
      { r: 0, c: 4, size: 'L', radius: 89.55, offsetX: -25.55, offsetY: 25.55 },
      { r: 2, c: 2, size: 'L', radius: 89.55 },
      { r: 4, c: 0, size: 'L', radius: 89.55, offsetX: 25.55, offsetY: -25.55 },
      { r: 4, c: 4, size: 'L', radius: 89.55, offsetX: -25.55, offsetY: -25.55 },
    ],
    edges: [
      ['0-0', '0-4'],
      ['0-4', '4-4'],
      ['4-0', '4-4'],
      ['2-2', '4-0'],
    ],
    fullGrid: true,
    tubeFactor: 0.22,
    rasterEnabled: false,
  });

  assert.equal(presetIdForDocument(doc), 'brandmark');
  assert.equal(doc.fullGrid, false);
  assert.equal(doc.rasterEnabled, false);
  assert.ok(doc.nodes.every(({ r, c }) => r >= 1 && r <= 3 && c >= 1 && c <= 3));
  assert.equal(DOCUMENT_VERSION, 11);
});
