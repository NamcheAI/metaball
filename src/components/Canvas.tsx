import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react'
import { GRID, VIEWBOX } from '../lib/constants'
import {
  cellCenter,
  cellRect,
  clamp01,
  edgeKey,
  effectiveBlur,
  isInner,
  isPlaceable,
  nodeCenter,
  nodeKey,
  nodeRadius,
} from '../lib/geometry'
import { buildRenderData } from '../lib/render'
import type { Edge, Mode, Node, Theme } from '../lib/types'

const HIGHLIGHT = '#111'
const DRAG_THRESHOLD = 5

interface CanvasProps {
  mode: Mode
  nodes: Node[]
  edges: Edge[]
  theme: Theme
  showGrid: boolean
  fullGrid: boolean
  gooStd: number
  gooThreshold: number
  tubeFactor: number
  inwardPull: number
  edgeFactors: Record<string, number>
  edgePulls: Record<string, number>
  selected: string | null
  selectedEdge: string | null
  exportPreviewPath: string | null
  onAddNode: (r: number, c: number) => void
  onSelect: (key: string | null) => void
  onSelectEdge: (edgeKey: string) => void
  onToggleEdge: (aKey: string, bKey: string) => void
  onRemoveNode: (key: string) => void
  onMoveNode: (fromKey: string, r: number, c: number) => void
}

interface DragState {
  from: string
  x: number
  y: number
  moved: boolean
  moveNode: boolean
}

export const Canvas = forwardRef<SVGSVGElement, CanvasProps>(function Canvas(
  {
    mode,
    nodes,
    edges,
    theme,
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
  },
  forwardedRef,
) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const setDragState = (next: DragState | null) => {
    dragRef.current = next
    setDrag(next)
  }
  const attachRef = (el: SVGSVGElement | null) => {
    svgRef.current = el
    if (typeof forwardedRef === 'function') forwardedRef(el)
    else if (forwardedRef) forwardedRef.current = el
  }

  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>()
    for (const n of nodes) map.set(nodeKey(n.r, n.c), n)
    return map
  }, [nodes])

  // --- pointer → svg coordinate space ---------------------------------------
  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  const cellAt = (x: number, y: number) => {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const { x: rx, y: ry, w, h } = cellRect(r, c)
        if (x >= rx && x <= rx + w && y >= ry && y <= ry + h) return { r, c }
      }
    }
    return null
  }

  const nodeAt = (x: number, y: number) => {
    let hit: Node | null = null
    let best = Infinity
    for (const n of nodes) {
      const { cx, cy } = nodeCenter(n)
      const dist = Math.hypot(cx - x, cy - y)
      if (dist <= Math.max(nodeRadius(n), 100 * 0.4) && dist < best) {
        hit = n
        best = dist
      }
    }
    return hit
  }

  const beginDrag = (
    e: ReactPointerEvent,
    key: string,
    moveNode = false,
  ) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const p = toSvgPoint(e.clientX, e.clientY)
    pointerStart.current = { x: e.clientX, y: e.clientY }
    setDragState({ from: key, x: p.x, y: p.y, moved: false, moveNode })
  }

  const handlePointerMove = (e: ReactPointerEvent) => {
    const current = dragRef.current
    if (!current || !pointerStart.current) return
    const p = toSvgPoint(e.clientX, e.clientY)
    const moved =
      Math.hypot(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y) >
      DRAG_THRESHOLD
    setDragState({ ...current, x: p.x, y: p.y, moved: current.moved || moved })
  }

  const handlePointerUp = (e: ReactPointerEvent) => {
    const current = dragRef.current
    if (!current) return
    const p = toSvgPoint(e.clientX, e.clientY)
    if (current.moveNode && current.moved) {
      const cell = cellAt(p.x, p.y)
      if (cell && isPlaceable(cell.r, cell.c, fullGrid)) {
        const key = nodeKey(cell.r, cell.c)
        if (key !== current.from && !nodeMap.has(key)) onMoveNode(current.from, cell.r, cell.c)
      }
    } else if (current.moved) {
      const target = nodeAt(p.x, p.y)
      if (target && nodeKey(target.r, target.c) !== current.from) {
        onToggleEdge(current.from, nodeKey(target.r, target.c))
      }
    } else {
      onSelect(current.from)
    }
    setDragState(null)
    pointerStart.current = null
  }

  const dragSourceNode = drag ? nodeMap.get(drag.from) : null
  const dragSourceCenter = dragSourceNode ? nodeCenter(dragSourceNode) : null

  // --- grid layer + add-node hit targets ------------------------------------
  const gridEls: ReactElement[] = []
  const hitEls: ReactElement[] = []
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const { x, y, w, h } = cellRect(r, c)
      const inner = isInner(r, c)
      const placeable = isPlaceable(r, c, fullGrid)
      const occupied = nodeMap.has(nodeKey(r, c))

      if (showGrid) {
        gridEls.push(
          <rect
            key={`bg-${r}-${c}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={2}
            fill={inner ? theme.blue : theme.pink}
          />,
        )
        if (placeable && !occupied) {
          const { cx, cy } = cellCenter(r, c)
          gridEls.push(<circle key={`dot-${r}-${c}`} cx={cx} cy={cy} r={6} fill={theme.ink} />)
        }
      }

      if (placeable && !occupied) {
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
              e.stopPropagation()
              onAddNode(r, c)
            }}
          />,
        )
      }
    }
  }

  // --- the mark: metaball capsules/circles, or plain graph -------------------
  const render = mode === 'metaball'
    ? buildRenderData(nodes, edges, tubeFactor, edgeFactors, inwardPull, edgePulls)
    : null

  const mark = render ? (
    <>
      {render.capsules.map((cap, i) => (
        <line
          key={`edge-${i}`}
          x1={cap.x1}
          y1={cap.y1}
          x2={cap.x2}
          y2={cap.y2}
          stroke={theme.ink}
          strokeWidth={cap.r * 2}
          strokeLinecap="round"
        />
      ))}
      {render.circles.map((c, i) => (
        <circle key={`node-${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={theme.ink} />
      ))}
    </>
  ) : (
    <>
      {edges.map(([aKey, bKey]) => {
        const a = nodeMap.get(aKey)
        const b = nodeMap.get(bKey)
        if (!a || !b) return null
        const ca = nodeCenter(a)
        const cb = nodeCenter(b)
        return (
          <line
            key={`edge-${edgeKey(aKey, bKey)}`}
            x1={ca.cx}
            y1={ca.cy}
            x2={cb.cx}
            y2={cb.cy}
            stroke={theme.ink}
            strokeWidth={30}
            strokeLinecap="round"
          />
        )
      })}
      {nodes.map((n) => {
        const { cx, cy } = nodeCenter(n)
        return (
          <circle key={`node-${nodeKey(n.r, n.c)}`} cx={cx} cy={cy} r={nodeRadius(n)} fill={theme.ink} />
        )
      })}
    </>
  )

  return (
    <svg
      ref={attachRef}
      className="metaball-svg"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerDown={() => onSelect(null)}
    >
      <defs>
        <filter
          id="goo"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={effectiveBlur(gooStd, inwardPull)}
            result="blur"
          />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${gooThreshold} ${-gooThreshold / 2}`}
          />
        </filter>
      </defs>

      <g className="grid-layer">
        {showGrid && <rect x={0} y={0} width={VIEWBOX} height={VIEWBOX} fill={theme.bg} />}
        {gridEls}
      </g>

      <g className="editor-only">{hitEls}</g>

      {mode === 'metaball' ? <g filter="url(#goo)">{mark}</g> : <g>{mark}</g>}

      {exportPreviewPath && mode === 'metaball' && (
        <path
          className="editor-only export-preview"
          d={exportPreviewPath}
          fill="none"
          stroke={HIGHLIGHT}
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeDasharray="6 6"
          fillRule="evenodd"
          pointerEvents="none"
        />
      )}

      <g className="editor-only">
        {edges.map(([aKey, bKey]) => {
          const a = nodeMap.get(aKey)
          const b = nodeMap.get(bKey)
          if (!a || !b) return null
          const key = edgeKey(aKey, bKey)
          const ca = nodeCenter(a)
          const cb = nodeCenter(b)
          const pull = mode === 'metaball' ? edgePulls[key] ?? inwardPull : 0
          const unpinched = mode === 'metaball' ? 1 - clamp01(pull) : 1
          const factor = edgeFactors[key] ?? tubeFactor
          const width = 2 * factor * unpinched * Math.min(nodeRadius(a), nodeRadius(b))
          return (
            <g key={`edgeui-${key}`}>
              {selectedEdge === key && (
                <line
                  x1={ca.cx}
                  y1={ca.cy}
                  x2={cb.cx}
                  y2={cb.cy}
                  stroke={HIGHLIGHT}
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
                  e.stopPropagation()
                  onSelectEdge(key)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  onToggleEdge(aKey, bKey)
                }}
              />
            </g>
          )
        })}

        {nodes.map((n) => {
          const key = nodeKey(n.r, n.c)
          const { cx, cy } = nodeCenter(n)
          return (
            <g key={`ui-${key}`}>
              <circle
                cx={cx}
                cy={cy}
                r={Math.max(nodeRadius(n), 100 * 0.4)}
                fill="transparent"
                style={{ cursor: drag?.moveNode ? 'grabbing' : 'grab' }}
                onPointerDown={(e) => beginDrag(e, key, e.altKey || e.shiftKey)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  onRemoveNode(key)
                }}
              />
              {selected === key && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={nodeRadius(n) + 8}
                  fill="none"
                  stroke={HIGHLIGHT}
                  strokeOpacity={0.5}
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  pointerEvents="none"
                />
              )}
            </g>
          )
        })}

        {drag && drag.moved && dragSourceCenter && !drag.moveNode && (
          <line
            x1={dragSourceCenter.cx}
            y1={dragSourceCenter.cy}
            x2={drag.x}
            y2={drag.y}
            stroke={HIGHLIGHT}
            strokeOpacity={0.4}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="4 8"
            pointerEvents="none"
          />
        )}
        {drag && drag.moved && drag.moveNode && dragSourceCenter && (
          <circle
            cx={drag.x}
            cy={drag.y}
            r={dragSourceNode ? nodeRadius(dragSourceNode) : 100 * 0.44}
            fill={theme.ink}
            fillOpacity={0.35}
            stroke={HIGHLIGHT}
            strokeOpacity={0.5}
            strokeWidth={2}
            strokeDasharray="4 6"
            pointerEvents="none"
          />
        )}
      </g>
    </svg>
  )
})
