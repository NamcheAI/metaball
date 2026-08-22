import * as React from 'react';
import { ENGINE, generate, type Edge, type Node } from '@namche/metaball';

export type MetaballProps = {
  /** Named mark — see `Metaball.PRESETS`. Ignored when `nodes` is given. @default 'trio' */
  preset?: string;
  /** Explicit spec. Takes precedence over `preset` and `seed`. */
  nodes?: Node[];
  edges?: Edge[];
  /** Deterministic procedural layout. */
  seed?: string | number;
  /** Capsule thickness vs. the smaller node radius. @default 0.55 */
  neck?: number;
  /** Fusion width — blur std-dev. @default 9 */
  blur?: number;
  /** Alpha cutoff; higher = sharper waist. @default 22 */
  contrast?: number;
  /** 0 = barbell tubes, 1 = pinched metaball. @default 0 */
  pinch?: number;
  /** Path simplification tolerance. @default 0.9 */
  detail?: number;
  /** Raster supersampling, 1–4. @default 1 */
  resolution?: number;
  /** Decimal places in path data. @default 2 */
  precision?: number;
  /** Rendered edge length in px. @default 128 */
  size?: number;
  /** Any CSS colour. @default 'currentColor' */
  color?: string;
  /** Accessible name. Omit for decorative marks — they are hidden from AT. */
  title?: string;
} & Omit<React.SVGProps<SVGSVGElement>, 'color' | 'title'>;

/**
 * A NAMCHE metaball mark as inline SVG.
 *
 * The path is generated, not fetched: one element, no request, tintable with
 * `color` and crisp at any size. Deterministic — the same props always produce
 * the same path — so it is safe to render on the server.
 *
 * ```tsx
 * <Metaball preset="loop" size={128} color="var(--mark-color)" />
 * <Metaball seed="biosphäre" title="Namche" />
 * ```
 */
export function Metaball({
  preset = 'trio',
  nodes,
  edges,
  seed,
  neck,
  blur,
  contrast,
  pinch,
  detail,
  resolution,
  precision,
  size = 128,
  color = 'currentColor',
  title,
  style,
  ...rest
}: MetaballProps) {
  // Eleven plain-data params. Serialising them once and parsing back inside the
  // memo keeps the dependency array honest — one value, genuinely the only input
  // — instead of listing all eleven and silencing the linter when they drift.
  const key = JSON.stringify({
    preset, nodes, edges, seed, neck, blur, contrast, pinch, detail, resolution, precision,
  });

  const result = React.useMemo(() => {
    try {
      return generate(JSON.parse(key));
    } catch (error) {
      // A bad preset or spec should leave a hole in the layout, not take the
      // page down with it.
      console.error('Metaball:', error);
      return null;
    }
  }, [key]);

  if (!result) return null;

  return (
    <svg
      viewBox={result.viewBox}
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...rest}
    >
      <path d={result.d} fill={color} fillRule="evenodd" />
    </svg>
  );
}

/** The marks this build of the engine knows about. */
Metaball.PRESETS = ENGINE.PRESETS;
