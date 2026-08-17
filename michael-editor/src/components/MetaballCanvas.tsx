import { forwardRef, useMemo, useRef, useState } from 'react';
import {
  CELL,
  COLS,
  DOT_RADIUS,
  GRAPH_STROKE,
  ROWS,
  SVG_SIZE,
  cellCenter,
  cellRect,
  edgeKey,
  edgePull,
  edgeTubeFactor,
  effectiveNodeRadius,
  getMetaballShapes,
  inwardGooStd,
  inwardTubeScale,
  isEditableCell,
  isInner,
  nodeId,
  nodePosition,
  type Edge,
  type GridNode,
  type Mode,
  type NodeId,
  type Theme,
} from '../lib/model';
import type { LiquidParams } from '../lib/liquidPresets';
import { liquidBodyFloodColor, liquidBodyFloodOpacity } from '../lib/liquidPresets';

type Props = {
  mode: Mode;
  nodes: GridNode[];
  edges: Edge[];
  theme: Theme;
  /** When set (liquid mode), drives cell fill pattern: cells | checker | stripes. */
  gridPattern?: 'cells' | 'checker' | 'stripes';
  /** Wall-clock ms for animated internal refraction (liquid idle / simmer). */
  liquidTime?: number;
  showGrid: boolean;
  fullGrid: boolean;
  gooStd: number;
  gooThreshold: number;
  tubeFactor: number;
  inwardPull: number;
  edgeFactors: Record<string, number>;
  edgePulls: Record<string, number>;
  selected: NodeId | null;
  selectedEdge: string | null;
  exportPreviewPath: string | null;
  onAddNode: (r: number, c: number) => void;
  onSelect: (id: NodeId | null) => void;
  onSelectEdge: (key: string) => void;
  onToggleEdge: (a: NodeId, b: NodeId) => void;
  onRemoveNode: (id: NodeId) => void;
  onMoveNode: (from: NodeId, toR: number, toC: number) => void;
  /** When set, soft translucent body + chromatic rim SVG filter. */
  liquid?: LiquidParams | null;
};

const ACCENT = '#111';
const CONNECT_THRESHOLD = 5;

type DragState = {
  from: NodeId;
  x: number;
  y: number;
  moved: boolean;
  moveNode: boolean;
};

const MetaballCanvas = forwardRef<SVGSVGElement, Props>(function MetaballCanvas(
  {
    mode,
    nodes,
    edges,
    theme,
    gridPattern = 'cells',
    liquidTime = 0,
    showGrid,
    fullGrid,
    gooStd,
    gooThreshold,
    tubeFactor,
    inwardPull,
    edgeFactors,
    edgePulls,
    selected,
    selectedEdge,
    exportPreviewPath,
    onAddNode,
    onSelect,
    onSelectEdge,
    onToggleEdge,
    onRemoveNode,
    onMoveNode,
    liquid = null,
  },
  ref,
) {
  const isLiquid = mode === 'metaball' && liquid != null;
  const markFill = isLiquid ? '#ffffff' : theme.ink;
  const rim = isLiquid ? liquid.rimStrength : 0;
  const bloom = isLiquid ? liquid.bloom : 0;
  const bodyAlpha = isLiquid ? liquidBodyFloodOpacity(liquid) : 1;
  const bodyColor = isLiquid ? liquidBodyFloodColor(liquid) : theme.ink;
  // Form silhouette softness — independent of outer glow.
  const edgeStd = isLiquid ? 0.2 + liquid.edgeSoftness * 3.5 : 0.2;
  // Outer chromatic halo width — independent of edge.
  const rimBlur = isLiquid ? 6 + bloom * 14 : 10;
  // Fake refraction: displace strength from IOR + dispersion + living internal flow.
  const liquidT = liquidTime / 1000;
  const refractPulse = isLiquid ? 0.85 + 0.15 * Math.sin(liquidT * 1.4) : 1;
  const refractScale = isLiquid
    ? (3 + (liquid.ior - 1.2) * 28 + liquid.dispersion * 10) * refractPulse
    : 0;
  const turbFx =
    isLiquid
      ? 0.014 + liquid.dispersion * 0.018 + 0.006 * Math.sin(liquidT * 0.9)
      : 0.02;
  const turbFy =
    isLiquid
      ? 0.012 + liquid.dispersion * 0.016 + 0.005 * Math.cos(liquidT * 1.1)
      : 0.02;
  const chromaDx = isLiquid
    ? 1.2 + liquid.dispersion * 2 + Math.sin(liquidT * 1.6) * 0.8
    : 0;
  // Slightly snappier goo threshold in liquid so the silhouette reads before the rim filter.
  const effectiveGooThreshold = isLiquid ? gooThreshold * 1.08 : gooThreshold;
  const innerRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const setRefs = (el: SVGSVGElement | null) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<SVGSVGElement | null>).current = el;
  };

  const nodeByCell = useMemo(() => {
    const map = new Map<NodeId, GridNode>();
    for (const node of nodes) map.set(nodeId(node.r, node.c), node);
    return map;
  }, [nodes]);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = innerRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const cellAt = (x: number, y: number): { r: number; c: number } | null => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const { x: rx, y: ry, w, h } = cellRect(r, c);
        if (x >= rx && x <= rx + w && y >= ry && y <= ry + h) return { r, c };
      }
    }
    return null;
  };

  const hitNode = (x: number, y: number): GridNode | null => {
    let best: GridNode | null = null;
    let bestDist = Infinity;
    for (const node of nodes) {
      const { cx, cy } = nodePosition(node);
      const d = Math.hypot(cx - x, cy - y);
      const r = Math.max(effectiveNodeRadius(node), CELL * 0.4);
      if (d <= r && d < bestDist) {
        best = node;
        bestDist = d;
      }
    }
    return best;
  };

  const handleNodeDown = (e: React.PointerEvent, id: NodeId, moveNode = false) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e.clientX, e.clientY);
    downPos.current = { x: e.clientX, y: e.clientY };
    updateDrag({ from: id, x: p.x, y: p.y, moved: false, moveNode });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const current = dragRef.current;
    if (!current || !downPos.current) return;
    const p = toSvg(e.clientX, e.clientY);
    const moved =
      Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y) >
      CONNECT_THRESHOLD;
    updateDrag({ ...current, x: p.x, y: p.y, moved: current.moved || moved });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const current = dragRef.current;
    if (!current) return;
    const p = toSvg(e.clientX, e.clientY);

    if (current.moveNode && current.moved) {
      const cell = cellAt(p.x, p.y);
      if (cell && isEditableCell(cell.r, cell.c, fullGrid)) {
        const targetId = nodeId(cell.r, cell.c);
        if (targetId !== current.from && !nodeByCell.has(targetId)) {
          onMoveNode(current.from, cell.r, cell.c);
        }
      }
    } else if (current.moved) {
      const target = hitNode(p.x, p.y);
      if (target && nodeId(target.r, target.c) !== current.from) {
        onToggleEdge(current.from, nodeId(target.r, target.c));
      }
    } else if (!current.moved) {
      onSelect(current.from);
    }

    updateDrag(null);
    downPos.current = null;
  };

  const startNode = drag ? nodeByCell.get(drag.from) : null;
  const startCenter = startNode ? nodePosition(startNode) : null;

  const gridEls: React.ReactNode[] = [];
  const hitEls: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const { x, y, w, h } = cellRect(r, c);
      const inner = isInner(r, c);
      const editable = isEditableCell(r, c, fullGrid);
      const hasNode = nodeByCell.has(nodeId(r, c));
      if (showGrid) {
        const cellFill =
          gridPattern === 'checker'
            ? (r + c) % 2 === 0
              ? theme.pink
              : theme.blue
            : gridPattern === 'stripes'
              ? c % 2 === 0
                ? theme.pink
                : theme.blue
              : inner
                ? theme.blue
                : theme.pink;
        gridEls.push(
          <rect
            key={`bg-${r}-${c}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={gridPattern === 'cells' ? 2 : 0}
            fill={cellFill}
          />,
        );
        if (editable && !hasNode) {
          const { cx, cy } = cellCenter(r, c);
          gridEls.push(
            <circle key={`dot-${r}-${c}`} cx={cx} cy={cy} r={DOT_RADIUS} fill={theme.ink} />,
          );
        }
      }
      if (editable && !hasNode) {
        hitEls.push(
          <rect
            key={`hit-${r}-${c}`}
            x={x}
            y={y}
            width={w}
            height={h}
            fill="transparent"
            style={{ cursor: 'copy' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onAddNode(r, c);
            }}
          />,
        );
      }
    }
  }

  const markShapes =
    mode === 'metaball'
      ? getMetaballShapes(nodes, edges, tubeFactor, edgeFactors, inwardPull, edgePulls)
      : null;

  const markChildren = markShapes ? (
    <>
      {markShapes.capsules.map((cap, i) => (
        <line
          key={`edge-${i}`}
          x1={cap.x1}
          y1={cap.y1}
          x2={cap.x2}
          y2={cap.y2}
          stroke={markFill}
          strokeWidth={cap.r * 2}
          strokeLinecap="round"
        />
      ))}
      {markShapes.circles.map((c, i) => (
        <circle key={`node-${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={markFill} />
      ))}
    </>
  ) : (
    <>
      {edges.map(([a, b]) => {
        const na = nodeByCell.get(a);
        const nb = nodeByCell.get(b);
        if (!na || !nb) return null;
        const ca = nodePosition(na);
        const cb = nodePosition(nb);
        return (
          <line
            key={`edge-${edgeKey(a, b)}`}
            x1={ca.cx}
            y1={ca.cy}
            x2={cb.cx}
            y2={cb.cy}
            stroke={theme.ink}
            strokeWidth={GRAPH_STROKE}
            strokeLinecap="round"
          />
        );
      })}
      {nodes.map((node) => {
        const { cx, cy } = nodePosition(node);
        return (
          <circle
            key={`node-${nodeId(node.r, node.c)}`}
            cx={cx}
            cy={cy}
            r={effectiveNodeRadius(node)}
            fill={theme.ink}
          />
        );
      })}
    </>
  );

  return (
    <svg
      ref={setRefs}
      className="metaball-svg"
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerDown={() => onSelect(null)}
    >
      <defs>
        <filter id="goo" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={inwardGooStd(gooStd, inwardPull)}
            result="blur"
          />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${effectiveGooThreshold} ${-effectiveGooThreshold / 2}`}
          />
        </filter>
        {isLiquid && liquid && (
          <>
            <filter
              id="liquidRefract"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency={`${turbFx} ${turbFy}`}
                numOctaves={3}
                seed={2}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={refractScale}
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              {/* Mild chromatic split of the refracted backdrop — drifts with flow. */}
              <feOffset in="displaced" dx={-chromaDx} dy={Math.sin(liquidT * 1.2) * 0.6} result="cOff" />
              <feOffset in="displaced" dx={chromaDx} dy={0.4 + Math.cos(liquidT * 1.1) * 0.5} result="mOff" />
              <feColorMatrix
                in="cOff"
                type="matrix"
                values="1 0 0 0 0  0 0.2 0 0 0  0 0 0.35 0 0  0 0 0 0.55 0"
                result="cCh"
              />
              <feColorMatrix
                in="mOff"
                type="matrix"
                values="0.2 0 0 0 0  0 1 0 0 0  0 0 0.4 0 0  0 0 0 0.45 0"
                result="mCh"
              />
              <feBlend in="cCh" in2="displaced" mode="screen" result="cm" />
              <feBlend in="mCh" in2="cm" mode="screen" />
            </filter>
            <mask id="liquidMask" maskUnits="userSpaceOnUse">
              <g filter="url(#goo)">
                {markShapes?.capsules.map((cap, i) => (
                  <line
                    key={`mask-edge-${i}`}
                    x1={cap.x1}
                    y1={cap.y1}
                    x2={cap.x2}
                    y2={cap.y2}
                    stroke="#fff"
                    strokeWidth={cap.r * 2}
                    strokeLinecap="round"
                  />
                ))}
                {markShapes?.circles.map((c, i) => (
                  <circle key={`mask-node-${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="#fff" />
                ))}
              </g>
            </mask>
            <filter
              id="prismRim"
              x="-55%"
              y="-55%"
              width="210%"
              height="210%"
              colorInterpolationFilters="sRGB"
            >
              {/* Outer chromatic light-band — warm left / cool right (video). */}
              <feMorphology in="SourceAlpha" operator="dilate" radius={0.6 + bloom * 1.2} result="glowCore" />
              <feGaussianBlur in="glowCore" stdDeviation={Math.max(3.5, rimBlur * 0.55)} result="rimBlur" />

              {/* Warm arc (left / top-left) — orange → pink. */}
              <feOffset in="rimBlur" dx={-7} dy={-4} result="warmOff" />
              <feFlood floodColor="#ff9a3c" floodOpacity={0.95 * rim} result="warmFlood" />
              <feComposite in="warmFlood" in2="warmOff" operator="in" result="warm" />

              <feOffset in="rimBlur" dx={-4} dy={2} result="magOff" />
              <feFlood floodColor="#ff3eb5" floodOpacity={0.9 * rim} result="magFlood" />
              <feComposite in="magFlood" in2="magOff" operator="in" result="mag" />

              {/* Cool arc (right) — cyan / white. */}
              <feOffset in="rimBlur" dx={7} dy={-1} result="cyanOff" />
              <feFlood floodColor="#5ef0ff" floodOpacity={1 * rim} result="cyanFlood" />
              <feComposite in="cyanFlood" in2="cyanOff" operator="in" result="cyan" />

              <feOffset in="rimBlur" dx={5} dy={5} result="blueOff" />
              <feFlood floodColor="#6a8cff" floodOpacity={0.55 * rim} result="blueFlood" />
              <feComposite in="blueFlood" in2="blueOff" operator="in" result="blue" />

              {/* Soft yellow bottom kiss. */}
              <feOffset in="rimBlur" dx={1} dy={7} result="yelOff" />
              <feFlood floodColor="#ffe08a" floodOpacity={0.7 * rim} result="yelFlood" />
              <feComposite in="yelFlood" in2="yelOff" operator="in" result="yel" />

              {/* Form body: washed tint × coverage (tint is a wash, not gel paint). */}
              <feGaussianBlur in="SourceAlpha" stdDeviation={edgeStd} result="edgeAlpha" />
              <feFlood floodColor={bodyColor} floodOpacity={bodyAlpha} result="bodyFlood" />
              <feComposite in="bodyFlood" in2="edgeAlpha" operator="in" result="glassBody" />

              {/* Soft top specular reflection (roughness → gloss only). */}
              <feOffset in="SourceAlpha" dx={-3} dy={-6} result="specOff" />
              <feGaussianBlur in="specOff" stdDeviation={2 + liquid.roughness * 1.5} result="specBlur" />
              <feFlood
                floodColor="#ffffff"
                floodOpacity={0.35 + (1 - liquid.roughness) * 0.45}
                result="specFlood"
              />
              <feComposite in="specFlood" in2="specBlur" operator="in" result="spec" />
              <feComposite in="spec" in2="edgeAlpha" operator="in" result="specClip" />

              {/* Inner cool refraction tint. */}
              <feMorphology in="SourceAlpha" operator="erode" radius={3} result="inner" />
              <feGaussianBlur in="inner" stdDeviation={1.5 + edgeStd * 0.4} result="innerBlur" />
              <feFlood
                floodColor="#9ad4ff"
                floodOpacity={0.05 + liquid.transmission * 0.1}
                result="innerFlood"
              />
              <feComposite in="innerFlood" in2="innerBlur" operator="in" result="innerTint" />

              <feMerge>
                <feMergeNode in="warm" />
                <feMergeNode in="mag" />
                <feMergeNode in="yel" />
                <feMergeNode in="blue" />
                <feMergeNode in="cyan" />
                <feMergeNode in="glassBody" />
                <feMergeNode in="innerTint" />
                <feMergeNode in="specClip" />
              </feMerge>
            </filter>
          </>
        )}
      </defs>

      <g className="grid-layer">
        {showGrid && <rect x={0} y={0} width={SVG_SIZE} height={SVG_SIZE} fill={theme.bg} />}
        {gridEls}
      </g>

      {/* Fake refraction: displaced grid visible only inside the liquid silhouette. */}
      {isLiquid && showGrid && markShapes && (
        <g
          className="liquid-refract"
          mask="url(#liquidMask)"
          filter="url(#liquidRefract)"
          pointerEvents="none"
          opacity={0.55 + (liquid?.transmission ?? 0) * 0.35}
        >
          <rect x={0} y={0} width={SVG_SIZE} height={SVG_SIZE} fill={theme.bg} />
          {gridEls}
        </g>
      )}

      <g className="editor-only">{hitEls}</g>

      {mode === 'metaball' ? (
        isLiquid ? (
          <g filter="url(#prismRim)">
            <g filter="url(#goo)">{markChildren}</g>
          </g>
        ) : (
          <g filter="url(#goo)">{markChildren}</g>
        )
      ) : (
        <g>{markChildren}</g>
      )}

      {exportPreviewPath && mode === 'metaball' && (
        <path
          className="editor-only export-preview"
          d={exportPreviewPath}
          fill="none"
          stroke={ACCENT}
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeDasharray="6 6"
          fillRule="evenodd"
          pointerEvents="none"
        />
      )}

      <g className="editor-only">
        {edges.map(([a, b]) => {
          const na = nodeByCell.get(a);
          const nb = nodeByCell.get(b);
          if (!na || !nb) return null;
          const key = edgeKey(a, b);
          const ca = nodePosition(na);
          const cb = nodePosition(nb);
          const pull = mode === 'metaball' ? edgePull(a, b, inwardPull, edgePulls) : 0;
          const tubeScale = mode === 'metaball' ? inwardTubeScale(pull) : 1;
          const width =
            2 *
            edgeTubeFactor(a, b, tubeFactor, edgeFactors) *
            tubeScale *
            Math.min(effectiveNodeRadius(na), effectiveNodeRadius(nb));
          return (
            <g key={`edgeui-${key}`}>
              {selectedEdge === key && (
                <line
                  x1={ca.cx}
                  y1={ca.cy}
                  x2={cb.cx}
                  y2={cb.cy}
                  stroke={ACCENT}
                  strokeOpacity={0.5}
                  strokeWidth={width + 8}
                  strokeLinecap="round"
                  strokeDasharray="6 8"
                  pointerEvents="none"
                />
              )}
              <line
                x1={ca.cx}
                y1={ca.cy}
                x2={cb.cx}
                y2={cb.cy}
                stroke="transparent"
                strokeWidth={Math.max(width, 22)}
                strokeLinecap="round"
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectEdge(key);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onToggleEdge(a, b);
                }}
              />
            </g>
          );
        })}
        {nodes.map((node) => {
          const id = nodeId(node.r, node.c);
          const { cx, cy } = nodePosition(node);
          const hitR = Math.max(effectiveNodeRadius(node), CELL * 0.4);
          return (
            <g key={`ui-${id}`}>
              <circle
                cx={cx}
                cy={cy}
                r={hitR}
                fill="transparent"
                style={{ cursor: drag?.moveNode ? 'grabbing' : 'grab' }}
                onPointerDown={(e) => handleNodeDown(e, id, e.altKey || e.shiftKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onRemoveNode(id);
                }}
              />
              {selected === id && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={effectiveNodeRadius(node) + 8}
                  fill="none"
                  stroke={ACCENT}
                  strokeOpacity={0.5}
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
        {drag && drag.moved && startCenter && !drag.moveNode && (
          <line
            x1={startCenter.cx}
            y1={startCenter.cy}
            x2={drag.x}
            y2={drag.y}
            stroke={ACCENT}
            strokeOpacity={0.4}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="4 8"
            pointerEvents="none"
          />
        )}
        {drag && drag.moved && drag.moveNode && startCenter && (
          <circle
            cx={drag.x}
            cy={drag.y}
            r={startNode ? effectiveNodeRadius(startNode) : CELL * 0.44}
            fill={theme.ink}
            fillOpacity={0.35}
            stroke={ACCENT}
            strokeOpacity={0.5}
            strokeWidth={2}
            strokeDasharray="4 6"
            pointerEvents="none"
          />
        )}
      </g>
    </svg>
  );
});

export default MetaballCanvas;
