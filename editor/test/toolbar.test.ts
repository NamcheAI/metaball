import assert from 'node:assert/strict';
import test from 'node:test';
import React, { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_PRESET, clonePreset } from '../src/lib/model';

type ToolbarComponent = (typeof import('../src/components/Toolbar'))['default'];
type ToolbarProps = ComponentProps<ToolbarComponent>;

// The test runner transpiles JSX with the classic runtime; Vite uses the automatic runtime.
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { default: Toolbar } = await import('../src/components/Toolbar');

function renderToolbar(view: '2d' | '3d', mode: 'metaball' | 'graph' = 'metaball'): string {
  const doc = clonePreset(DEFAULT_PRESET);
  const props = {
    view,
    mode,
    materialPreset: doc.materialPreset,
    lookMode: doc.lookMode,
    liquidPreset: doc.liquidPreset,
    liquidBackdrop: doc.liquidBackdrop,
    liquidParams: doc.liquidParams,
    surfaceSamplerEnabled: doc.surfaceSamplerEnabled,
    surfaceSamplerMode: doc.surfaceSamplerMode,
    surfaceSamplerCount: doc.surfaceSamplerCount,
    surfaceSamplerPointSize: doc.surfaceSamplerPointSize,
    surfaceSamplerSphereSize: doc.surfaceSamplerSphereSize,
    surfaceSamplerShowMesh: doc.surfaceSamplerShowMesh,
    surfaceSamplerAnimate: doc.surfaceSamplerAnimate,
    selectedSize: null,
    selectedRadius: null,
    radiusOverridden: false,
    radiusMin: 1,
    radiusMax: 100,
    theme: doc.theme,
    showGrid: doc.rasterEnabled,
    fullGrid: doc.fullGrid,
    gooStd: doc.gooStd,
    gooThreshold: doc.gooThreshold,
    tubeFactor: doc.tubeFactor,
    inwardPull: doc.inwardPull,
    flattenEpsilon: doc.flattenEpsilon,
    flattenResolution: doc.flattenResolution,
    showExportPreview: false,
    selectedEdge: null,
    edgeFactor: null,
    edgeFactorOverridden: false,
    edgePull: null,
    edgePullOverridden: false,
    markOnly: false,
    pngScale: 4,
    canUndo: false,
    canRedo: false,
    activePresetId: 'loop',
    refImageName: null,
    growing: false,
    canGrow: true,
    activeMotion: null,
    canMotion: true,
    breakNecks: true,
  } as unknown as ToolbarProps;

  return renderToStaticMarkup(createElement(Toolbar, props));
}

test('2D exposes flat appearance and raster controls, not materials', () => {
  const html = renderToolbar('2d');
  assert.match(html, /Namche raster/);
  assert.match(html, />Form</);
  assert.doesNotMatch(html, />Organic</);
  assert.doesNotMatch(html, /Surface sampling/);
});

test('3D exposes materials and advanced sampling, not raster controls', () => {
  const html = renderToolbar('3d');
  assert.match(html, />Organic</);
  assert.match(html, />Liquid</);
  assert.match(html, /Surface sampling/);
  assert.doesNotMatch(html, /Namche raster/);
  assert.doesNotMatch(html, />Form</);
});

test('Graph view suppresses vector export actions', () => {
  const html = renderToolbar('2d', 'graph');
  assert.doesNotMatch(html, /Export SVG/);
  assert.match(html, /Switch to Form to export SVG or PNG/);
});
