# @namche/metaball-svg

A NAMCHE metaball mark as inline SVG, for React.

```bash
npm install @namche/metaball-svg
```

```tsx
import { Metaball } from '@namche/metaball-svg';

<Metaball preset="loop" size={128} color="var(--mark-color)" />
<Metaball seed="biosphäre" title="Namche" />
<Metaball nodes={[{ r: 1, c: 1, size: 'L' }, { r: 3, c: 3, size: 'XL' }]} edges={[['1-1', '3-3']]} />
```

The path is generated, not fetched — one element, no network request, tintable
with `color`, crisp at any size. Output is deterministic, so it renders on the
server and hydrates without a mismatch.

## Which package do I want?

| | |
|---|---|
| `@namche/metaball` | the engine. Framework-free, no dependencies. |
| **`@namche/metaball-svg`** | **this** — flat 2D marks in React. Peers on `react` only. |
| `@namche/metaball-react` | 3D marks. Peers on `three`, `@react-three/fiber`, `@react-three/drei`, React 19. |

They are separate packages so that a 2D mark never drags a WebGL stack into
your bundle.

## Props

`preset` · `nodes` + `edges` · `seed` pick *what* is drawn — an explicit
`nodes` spec wins, then `seed`, then `preset` (default `'trio'`).

`neck` `0.55` · `blur` `9` · `contrast` `22` · `pinch` `0` · `detail` `0.9` ·
`resolution` `1` · `precision` `2` shape *how* it is drawn. They are the
engine's parameters — see [`@namche/metaball`](https://www.npmjs.com/package/@namche/metaball).

`size` `128` · `color` `'currentColor'` · `title` control presentation. Any
other prop is spread onto the `<svg>`.

`Metaball.PRESETS` lists the marks this build knows about.

## Accessibility

A mark with no `title` is decorative: it renders `aria-hidden="true"` and is
skipped by screen readers. Passing `title` makes it `role="img"` with that
accessible name. Decorative is the default because most marks sit beside a
heading that already says the same thing.

## Failure

An unusable spec logs and renders nothing. A bad preset should leave a gap in
the layout, not take the page down.

## Licence

MIT.
