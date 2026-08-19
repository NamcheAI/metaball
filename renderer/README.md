# `@namche/metaball-react`

Embeddable React/Three.js renderer for NAMCHE metaball marks. It defaults to
the current **Namche Loop**, has no editor state or stylesheet dependency, and
supports multiple independent instances on one page.

## React / Vite

```tsx
import { Metaball3D } from '@namche/metaball-react';

export function BrandMark() {
  return (
    <Metaball3D
      preset="loop"
      material="wax"
      interactive
      autoRotate
      style={{ width: 'min(70vw, 720px)' }}
    />
  );
}
```

The component supplies a square aspect ratio by default. Pass `width`, `height`
or `aspectRatio` through `style` to fit the host layout.

## Parametric surfaces

`surface` selects an independent, UV-free surface strategy. A preset supplies
its appropriate base material when `material` is omitted:

```tsx
<Metaball3D preset="loop" surface="pearl" autoRotate />

<Metaball3D
  preset="loop"
  surface={{ kind: 'fur', density: 0.9, length: 0.42, curl: 0.65 }}
/>
```

Included strategies are `smooth`, `pearl`, `coral`, `moss`, `grass`, and
`fur`. Their controls are intentionally different: pearl exposes nacre-layer
variation, coral exposes cell growth, and fiber surfaces expose density,
length, clumping, curl, and gravity. Use `SURFACE_PRESETS` to build a matching
control panel and `normalizeSurface()` before persisting external input.

Coral is a performant relief preview in the browser; actual open cells require
the Blender lattice handoff. Fiber instances and shader displacement are live
layers and are not silently baked into the mesh exposed by the component ref.
See [`../docs/SURFACES.md`](../docs/SURFACES.md).

Static scenes render only when their state changes. Set `autoRotate` for the
built-in camera rotation, or `renderContinuously` when the host animates the
shape itself and needs a frame for every update.

## Next.js

Three.js needs a browser canvas, so load the component as a client-only chunk:

```tsx
'use client';

import dynamic from 'next/dynamic';

const Metaball3D = dynamic(
  () => import('@namche/metaball-react').then((module) => module.Metaball3D),
  { ssr: false },
);

export function BrandMark() {
  return <Metaball3D preset="loop" material="wax" interactive={false} autoRotate />;
}
```

Lazy loading is recommended on any site because Three.js is intentionally not
part of the initial 2D/page bundle.

## Custom shape

```tsx
<Metaball3D
  shape={{
    nodes: [
      { r: 1, c: 1, size: 'L' },
      { r: 3, c: 3, size: 'XL' },
    ],
    edges: [['1-1', '3-3']],
    neck: 0.55,
    blur: 9,
    contrast: 22,
    pinch: 0.2,
  }}
/>
```

`shape` takes precedence over `preset`. Material can be a preset id or Three.js
`MeshPhysicalMaterialParameters`. The component ref exposes its canvas, mesh
and `invalidate()` without any global state.

## Peer dependencies

The host application provides React, React DOM, Three.js,
`@react-three/fiber`, and `@react-three/drei`. This prevents duplicate React or
Three instances in the Brand site bundle.

Package releases use the repository's trusted-publishing workflow. See
[`../docs/RELEASING.md`](../docs/RELEASING.md).

## Credits

Original Metaball Studio concept, design direction, and implementation by
[Michael Marte](https://github.com/fizzybubbele) for
[Ruhm etc.](https://ruhmetc.com/). Package extraction and engineering are by
the NAMCHE contributors listed in the repository `AUTHORS.txt` and
`CONTRIBUTORS.txt`.

## License

MIT. The Namche name and logos remain trademarks; the software license does
not grant trademark rights or permission to imply endorsement. See
[`LICENSE`](LICENSE) for details.
