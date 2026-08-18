# `@namche/metaball`

Dependency-free, deterministic geometry engine for the NAMCHE metaball mark
vocabulary. It produces SVG path data, complete SVGs and CSS mask tokens from
canonical presets, explicit node graphs or seeded layouts.

```js
import { generate, generateSvg } from '@namche/metaball';

generate(); // current Namche Loop
generate({ preset: 'r' });
generateSvg({ preset: 'trio', fill: '#262626' });
```

Full API and geometry documentation live in the repository
[`README.md`](../README.md).

Original Metaball Studio concept, design direction, and implementation by
[Michael Marte](https://github.com/fizzybubbele) for
[Ruhm etc.](https://ruhmetc.com/).
