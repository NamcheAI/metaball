import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BRANDMARK_PATH,
  DEFAULT_PRESET_ID,
  generate,
  generateMaskToken,
  generateSvg,
  layoutFromSeed,
  PRESETS,
  VIEWBOX,
} from '../dist/index.js'

test('the default is the current Namche Loop', () => {
  assert.equal(DEFAULT_PRESET_ID, 'loop')
  const implicit = generate()
  const explicit = generate({ preset: 'loop' })

  assert.equal(implicit.d, explicit.d)
  assert.equal(explicit.viewBox, `0 0 ${VIEWBOX} ${VIEWBOX}`)
})

test('the legacy brandmark preset keeps its exact approved vector', () => {
  const explicit = generate({ preset: 'brandmark' })

  assert.equal(explicit.d, BRANDMARK_PATH)

  const box = bbox(pathPoints(explicit.d))
  assert.deepEqual(box, { x0: 0, x1: VIEWBOX, y0: 0, y1: VIEWBOX })
})

test('preset geometry and styling take precedence over a supplied seed', () => {
  const presetOnly = generate({ preset: 'loop', backend: 'pure' })
  const presetAndSeed = generate({
    preset: 'loop',
    seed: 'ignored',
    backend: 'pure',
  })
  assert.equal(presetAndSeed.d, presetOnly.d)
  assert.deepEqual(presetAndSeed.primitives, presetOnly.primitives)
})

/** On-curve endpoints of each path command, for geometric comparisons. */
function pathPoints(d) {
  const points = []
  const re = /[MC]([^MCZ]*)/g
  let m
  while ((m = re.exec(d))) {
    const nums = m[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((v) => !Number.isNaN(v))
    if (nums.length >= 2) points.push({ x: nums[nums.length - 2], y: nums[nums.length - 1] })
  }
  return points
}

const bbox = (points) => ({
  x0: Math.min(...points.map((p) => p.x)),
  x1: Math.max(...points.map((p) => p.x)),
  y0: Math.min(...points.map((p) => p.y)),
  y1: Math.max(...points.map((p) => p.y)),
})

test('every preset generates a non-empty path inside the viewBox', () => {
  for (const preset of PRESETS) {
    const result = generate({ preset: preset.id })
    if (preset.id === 'empty') {
      assert.equal(result.d, '', 'empty preset yields no path')
      continue
    }
    assert.ok(result.d.length > 0, `${preset.id} produced a path`)
    assert.equal(result.backend, 'pure', 'headless runs use the pure rasterizer')

    const box = bbox(pathPoints(result.d))
    assert.ok(box.x0 >= 0 && box.y0 >= 0, `${preset.id} stays within the viewBox origin`)
    assert.ok(
      box.x1 <= VIEWBOX && box.y1 <= VIEWBOX,
      `${preset.id} stays within the viewBox extent`,
    )
  }
})

test('output is deterministic for identical params', () => {
  const a = generate({ preset: 'r' })
  const b = generate({ preset: 'r' })
  assert.equal(a.d, b.d)
})

test('seeded layouts are reproducible and seed-sensitive', () => {
  const a = generate({ seed: 'namche', count: 5 })
  const b = generate({ seed: 'namche', count: 5 })
  const c = generate({ seed: 'namche-2', count: 5 })
  assert.equal(a.d, b.d, 'same seed → same path')
  assert.notEqual(a.d, c.d, 'different seed → different path')

  const layout = layoutFromSeed({ seed: 'namche', count: 5 })
  assert.equal(layout.nodes.length, 5)
  assert.equal(layout.edges.length, 4, 'a spanning structure has n-1 edges')
})

test('seeded layouts are fully connected', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const { nodes, edges } = layoutFromSeed({ seed, count: 6 })
    const keys = nodes.map((n) => `${n.r}-${n.c}`)
    const seen = new Set([keys[0]])
    let grew = true
    while (grew) {
      grew = false
      for (const [a, b] of edges) {
        if (seen.has(a) && !seen.has(b)) (seen.add(b), (grew = true))
        if (seen.has(b) && !seen.has(a)) (seen.add(a), (grew = true))
      }
    }
    assert.equal(seen.size, keys.length, `seed ${seed} yields one connected form`)
  }
})

test('resolution changes detail, not size', () => {
  const low = generate({ preset: 'r', resolution: 1 })
  const high = generate({ preset: 'r', resolution: 2 })
  const a = bbox(pathPoints(low.d))
  const b = bbox(pathPoints(high.d))
  // Same mark, so the bounding boxes must agree within a pixel or so.
  for (const key of ['x0', 'x1', 'y0', 'y1']) {
    assert.ok(
      Math.abs(a[key] - b[key]) < 2,
      `${key} agrees across resolutions (${a[key]} vs ${b[key]})`,
    )
  }
})

test('a fully linked ring encloses a hole', () => {
  // Four corners linked in a cycle leave a counter-shape in the middle, which
  // must come out as a second subpath so evenodd can punch it out.
  const result = generate({ preset: 'quad' })
  const subpaths = result.d.match(/M /g) ?? []
  assert.equal(subpaths.length, 2, 'outer contour plus the enclosed hole')
})

test('pinch thins the connections', () => {
  const open = generate({ preset: 'trio', pinch: 0 })
  const pinched = generate({ preset: 'trio', pinch: 1 })
  assert.notEqual(open.d, pinched.d)
  assert.ok(open.primitives.capsules[0].r > 0, 'un-pinched edges have thickness')
  assert.ok(
    pinched.primitives.capsules.every((c) => c.r === 0),
    'a full pinch reduces every tube to nothing',
  )
})

test('empty specs produce an empty path, not a crash', () => {
  const result = generate({ nodes: [], edges: [] })
  assert.equal(result.d, '')
  assert.equal(result.viewBox, `0 0 ${VIEWBOX} ${VIEWBOX}`)
})

test('unknown presets fail loudly', () => {
  assert.throws(() => generate({ preset: 'nope' }), /unknown preset/)
})

test('svg and mask-token wrappers are well formed', () => {
  const svg = generateSvg({ preset: 'node' })
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(svg, /fill-rule="evenodd"/)
  assert.match(svg, /<\/svg>$/)

  const token = generateMaskToken({ preset: 'node' })
  assert.match(token, /^url\("data:image\/svg\+xml,/)
  assert.ok(!token.includes("'"), 'apostrophes are encoded for CSS safety')
  const decoded = decodeURIComponent(token.slice('url("data:image/svg+xml,'.length, -2))
  assert.match(decoded, /^<svg /)
})
