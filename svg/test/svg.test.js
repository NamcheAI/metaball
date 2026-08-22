import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ENGINE } from '@namche/metaball';
import { Metaball } from '../dist/index.js';

const render = (props) => renderToStaticMarkup(createElement(Metaball, props));

test('renders one inline svg carrying generated path data', () => {
  const html = render({ preset: 'trio' });
  assert.match(html, /^<svg /);
  assert.equal(html.match(/<path /g).length, 1);
  assert.match(html, / d="M [^"]+"/);
  assert.match(html, /viewBox="0 0 \d+ \d+"/);
});

test('is deterministic — identical props give identical markup', () => {
  assert.equal(render({ preset: 'loop' }), render({ preset: 'loop' }));
  assert.equal(render({ seed: 'biosphäre' }), render({ seed: 'biosphäre' }));
});

test('different presets give different paths', () => {
  assert.notEqual(render({ preset: 'trio' }), render({ preset: 'quad' }));
});

test('every preset the engine ships renders', () => {
  for (const { id } of ENGINE.PRESETS) {
    const html = render({ preset: id });
    // "empty" is the blank editor state: a valid svg with no geometry.
    assert.match(html, /^<svg /, `preset ${id} did not render an svg`);
  }
});

test('decorative by default, labelled when given a title', () => {
  assert.match(render({ preset: 'trio' }), /aria-hidden="true"/);
  const labelled = render({ preset: 'trio', title: 'Namche' });
  assert.match(labelled, /role="img"/);
  assert.match(labelled, /aria-label="Namche"/);
  assert.doesNotMatch(labelled, /aria-hidden/);
});

test('colour and size are applied', () => {
  const html = render({ preset: 'trio', size: 64, color: 'var(--mark-color)' });
  assert.match(html, /width="64"/);
  assert.match(html, /height="64"/);
  assert.match(html, /fill="var\(--mark-color\)"/);
});

test('an explicit node/edge spec beats the preset', () => {
  const spec = {
    nodes: [{ r: 1, c: 1, size: 'L' }, { r: 3, c: 3, size: 'XL' }],
    edges: [['1-1', '3-3']],
  };
  assert.notEqual(render(spec), render({ preset: 'trio' }));
});

test('a bad preset renders nothing instead of throwing', () => {
  const error = console.error;
  console.error = () => {};
  try {
    assert.equal(render({ preset: 'not-a-preset' }), '');
  } finally {
    console.error = error;
  }
});

test('PRESETS is exposed and matches the engine', () => {
  assert.deepEqual(Metaball.PRESETS, ENGINE.PRESETS);
});
