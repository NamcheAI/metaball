// Flatten the metaball effect into a real vector outline so it survives export
// to tools that don't render SVG filters (Figma, Illustrator).
//
// It reproduces exactly what the on-screen goo filter does — take the union of
// the node circles + edge tubes, Gaussian-blur it, threshold the alpha — and
// then traces the resulting silhouette with marching squares into an SVG path.

import { SVG_SIZE, type MetaballShapes } from './model';

export type FlattenParams = MetaballShapes & {
  gooStd: number;
  gooThreshold: number;
  epsilon?: number;
  resolution?: number;
};

type Point = { x: number; y: number };

function key(p: Point): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
}

// Standard marching squares. `field` returns the scalar value at an integer
// grid coordinate; returns closed contour loops at the given iso level.
function marchingSquares(
  field: (x: number, y: number) => number,
  width: number,
  height: number,
  iso: number,
): Point[][] {
  type Seg = { a: Point; b: Point; used: boolean };
  const segs: Seg[] = [];

  const lerp = (
    x1: number,
    y1: number,
    v1: number,
    x2: number,
    y2: number,
    v2: number,
  ): Point => {
    const t = (iso - v1) / (v2 - v1);
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  };

  const push = (a: Point, b: Point) => segs.push({ a, b, used: false });

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = field(x, y);
      const tr = field(x + 1, y);
      const br = field(x + 1, y + 1);
      const bl = field(x, y + 1);

      let idx = 0;
      if (tl > iso) idx |= 8;
      if (tr > iso) idx |= 4;
      if (br > iso) idx |= 2;
      if (bl > iso) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      const top = () => lerp(x, y, tl, x + 1, y, tr);
      const right = () => lerp(x + 1, y, tr, x + 1, y + 1, br);
      const bottom = () => lerp(x + 1, y + 1, br, x, y + 1, bl);
      const left = () => lerp(x, y + 1, bl, x, y, tl);

      switch (idx) {
        case 1: push(left(), bottom()); break;
        case 2: push(bottom(), right()); break;
        case 3: push(left(), right()); break;
        case 4: push(right(), top()); break;
        case 5: push(left(), top()); push(right(), bottom()); break;
        case 6: push(bottom(), top()); break;
        case 7: push(left(), top()); break;
        case 8: push(top(), left()); break;
        case 9: push(top(), bottom()); break;
        case 10: push(top(), right()); push(bottom(), left()); break;
        case 11: push(top(), right()); break;
        case 12: push(right(), left()); break;
        case 13: push(right(), bottom()); break;
        case 14: push(bottom(), left()); break;
      }
    }
  }

  // Stitch segments into closed loops. Marching-squares segment orientation is
  // not globally consistent, so we walk the graph undirected: from a point, hop
  // to the other endpoint of an unused incident segment until the loop closes.
  const incident = new Map<string, Seg[]>();
  const addIncident = (k: string, s: Seg) => {
    const list = incident.get(k);
    if (list) list.push(s);
    else incident.set(k, [s]);
  };
  for (const s of segs) {
    addIncident(key(s.a), s);
    addIncident(key(s.b), s);
  }

  const loops: Point[][] = [];
  for (const seed of segs) {
    if (seed.used) continue;
    seed.used = true;
    const loop: Point[] = [seed.a];
    let point = seed.b;
    while (true) {
      loop.push(point);
      const pk = key(point);
      if (pk === key(loop[0])) break; // closed
      const next = incident.get(pk)?.find((s) => !s.used);
      if (!next) break;
      next.used = true;
      point = key(next.a) === pk ? next.b : next.a;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function perpDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

// Ramer-Douglas-Peucker on an open polyline.
function rdp(points: Point[], eps: number): Point[] {
  if (points.length < 3) return points.slice();
  let maxD = 0;
  let idx = 0;
  const a = points[0];
  const b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = rdp(points.slice(0, idx + 1), eps);
    const right = rdp(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

// Simplify a closed loop: drop the duplicated closing vertex, rotate to a
// stable anchor so RDP has two distinct endpoints, then simplify.
function simplifyLoop(loop: Point[], eps: number): Point[] {
  let pts = loop;
  if (pts.length > 1 && key(pts[0]) === key(pts[pts.length - 1])) {
    pts = pts.slice(0, -1);
  }
  if (pts.length < 3) return pts;

  let anchor = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x < pts[anchor].x || (pts[i].x === pts[anchor].x && pts[i].y < pts[anchor].y)) {
      anchor = i;
    }
  }
  const rotated = pts.slice(anchor).concat(pts.slice(0, anchor));
  return rdp(rotated, eps);
}

// Closed Catmull-Rom spline emitted as cubic beziers for smooth curves.
function catmullRomClosed(pts: Point[]): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `;
  }
  return d + 'Z ';
}

// Build the flattened SVG path `d` for the metaball silhouette. Holes are
// handled by concatenating all loops and using fill-rule="evenodd".
export function metaballPath(p: FlattenParams): string {
  if (!p.circles.length && !p.capsules.length) return '';

  const resolution = p.resolution ?? 1;
  const epsilon = p.epsilon ?? 0.9;
  const size = Math.ceil(SVG_SIZE * resolution);

  const union = document.createElement('canvas');
  union.width = size;
  union.height = size;
  const uctx = union.getContext('2d');
  if (!uctx) return '';
  uctx.fillStyle = '#000';
  uctx.strokeStyle = '#000';
  uctx.lineCap = 'round';
  uctx.lineJoin = 'round';
  if (resolution !== 1) uctx.scale(resolution, resolution);
  for (const c of p.circles) {
    uctx.beginPath();
    uctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
    uctx.fill();
  }
  for (const cap of p.capsules) {
    uctx.lineWidth = cap.r * 2;
    uctx.beginPath();
    uctx.moveTo(cap.x1, cap.y1);
    uctx.lineTo(cap.x2, cap.y2);
    uctx.stroke();
  }

  const blurred = document.createElement('canvas');
  blurred.width = size;
  blurred.height = size;
  const bctx = blurred.getContext('2d');
  if (!bctx) return '';
  bctx.filter = `blur(${p.gooStd * resolution}px)`;
  bctx.drawImage(union, 0, 0);

  const data = bctx.getImageData(0, 0, size, size).data;
  const field = (x: number, y: number) => data[(y * size + x) * 4 + 3] / 255;
  const iso = Math.min(0.95, 0.5 + 0.5 / p.gooThreshold);

  const loops = marchingSquares(field, size, size, iso);

  let d = '';
  for (const loop of loops) {
    const simplified = simplifyLoop(loop, epsilon / resolution);
    if (simplified.length >= 3) d += catmullRomClosed(simplified);
  }
  return d;
}
