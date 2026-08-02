import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from './components/Canvas'
import { Toolbar } from './components/Toolbar'
import {
  clampOffset,
  clampRadius,
  edgeKey,
  generate,
  nodeKey,
  nodeRadius,
  parseKey,
  PRESETS,
  RADIUS_MAX,
  RADIUS_MIN,
  type EditorDoc,
  type Size,
  type Theme,
} from '@namche/metaball'
import { EXPORT_PREVIEW_DEBOUNCE, KEY_TO_SIZE } from './lib/appConstants'
import {
  cloneDocument,
  documentFromPreset,
  downloadJson,
  dropEdgeKey,
  dropNodeFromEdgeMap,
  initialDocument,
  parseDocument,
  renameNodeInEdgeMap,
  saveDocument,
} from './lib/document'
import {
  canRedo,
  canUndo,
  initHistory,
  pushHistory,
  redo,
  replacePresent,
  undo,
} from './lib/history'
import { copySvg, exportPng, exportSvg, type FlattenExport } from './lib/exportImage'

/** Map an editor document onto the engine's parameter names. */
const generateParams = (doc: EditorDoc) => ({
  nodes: doc.nodes,
  edges: doc.edges,
  edgeFactors: doc.edgeFactors,
  edgePulls: doc.edgePulls,
  neck: doc.tubeFactor,
  blur: doc.gooStd,
  contrast: doc.gooThreshold,
  pinch: doc.inwardPull,
  detail: doc.flattenEpsilon,
  resolution: doc.flattenResolution,
})

export function App() {
  const [history, setHistory] = useState(() => initHistory(initialDocument()))
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [markOnly, setMarkOnly] = useState(false)
  const [pngScale, setPngScale] = useState(4)
  const [showExportPreview, setShowExportPreview] = useState(false)
  const [exportPreviewPath, setExportPreviewPath] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  /** Identity of the control currently coalescing into one undo step, or
   *  null when the next change should start a fresh step. Per-control (not a
   *  boolean) so an uncommitted keyboard tweak on one slider can't swallow
   *  the undo step of the next slider drag. */
  const coalescing = useRef<string | null>(null)

  const doc = history.present

  // --- history primitives ----------------------------------------------------
  const commit = useCallback(() => {
    coalescing.current = null
  }, [])

  /** Replace the whole document as one undo step (presets, import). */
  const pushDoc = useCallback((next: EditorDoc) => {
    coalescing.current = null
    setHistory((h) => pushHistory(h, next))
  }, [])

  /** Apply a change as its own discrete undo step. */
  const mutate = useCallback((fn: (doc: EditorDoc) => EditorDoc) => {
    coalescing.current = null
    setHistory((h) => pushHistory(h, fn(cloneDocument(h.present))))
  }, [])

  /** Apply a change that coalesces into the current step while the same
   *  control keeps changing, until commit() (so one slider drag == one
   *  undo). The ref is read and written outside the updater — inside it,
   *  StrictMode's double-invoke would flip it on the discarded first run. */
  const coalesceUpdate = useCallback((group: string, fn: (doc: EditorDoc) => EditorDoc) => {
    const continues = coalescing.current === group
    coalescing.current = group
    setHistory((h) => {
      const next = fn(cloneDocument(h.present))
      return continues ? replacePresent(h, next) : pushHistory(h, next)
    })
  }, [])

  // --- persistence (debounced; flushed on unload) -----------------------------
  const latestDoc = useRef(doc)
  useEffect(() => {
    latestDoc.current = doc
    const timer = window.setTimeout(() => saveDocument(doc), 300)
    return () => window.clearTimeout(timer)
  }, [doc])
  useEffect(() => {
    const flush = () => saveDocument(latestDoc.current)
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  // Drop selections that point at nodes/edges that no longer exist.
  useEffect(() => {
    setSelected((key) => {
      if (!key) return null
      const { r, c } = parseKey(key)
      return doc.nodes.some((n) => n.r === r && n.c === c) ? key : null
    })
    setSelectedEdge((key) =>
      key && doc.edges.some(([a, b]) => edgeKey(a, b) === key) ? key : null,
    )
  }, [doc.nodes, doc.edges])

  // --- debounced flatten preview ---------------------------------------------
  // Depends on the individual fields the flatten actually reads (not the
  // whole doc), so e.g. dragging a theme color doesn't re-trace contours.
  useEffect(() => {
    if (!showExportPreview || doc.mode !== 'metaball') {
      setExportPreviewPath(null)
      return
    }
    const timer = window.setTimeout(() => {
      const { d } = generate(generateParams(doc))
      setExportPreviewPath(d || null)
    }, EXPORT_PREVIEW_DEBOUNCE)
    return () => window.clearTimeout(timer)
  }, [
    showExportPreview,
    doc.mode,
    doc.nodes,
    doc.edges,
    doc.tubeFactor,
    doc.edgeFactors,
    doc.inwardPull,
    doc.edgePulls,
    doc.gooStd,
    doc.gooThreshold,
    doc.flattenEpsilon,
    doc.flattenResolution,
  ])

  // --- derived selection state ------------------------------------------------
  const selectedNode = (() => {
    if (!selected) return null
    const { r, c } = parseKey(selected)
    return doc.nodes.find((n) => n.r === r && n.c === c) ?? null
  })()
  const edgeFactor = selectedEdge ? doc.edgeFactors[selectedEdge] ?? doc.tubeFactor : null
  const edgeFactorOverridden = selectedEdge ? selectedEdge in doc.edgeFactors : false
  const edgePull = selectedEdge ? doc.edgePulls[selectedEdge] ?? doc.inwardPull : null
  const edgePullOverridden = selectedEdge ? selectedEdge in doc.edgePulls : false

  // --- selection --------------------------------------------------------------
  const selectNode = (key: string | null) => {
    setSelected(key)
    setSelectedEdge(null)
  }
  const selectEdge = (key: string) => {
    setSelectedEdge(key)
    setSelected(null)
  }

  // --- node CRUD --------------------------------------------------------------
  const addNode = (r: number, c: number) => {
    const key = nodeKey(r, c)
    mutate((d) =>
      d.nodes.some((n) => n.r === r && n.c === c)
        ? d
        : { ...d, nodes: [...d.nodes, { r, c, size: 'M' }] },
    )
    selectNode(key)
  }

  const removeNode = (key: string) => {
    const { r, c } = parseKey(key)
    mutate((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => !(n.r === r && n.c === c)),
      edges: d.edges.filter(([a, b]) => a !== key && b !== key),
      edgeFactors: dropNodeFromEdgeMap(d.edgeFactors, key),
      edgePulls: dropNodeFromEdgeMap(d.edgePulls, key),
    }))
  }

  const moveNode = (fromKey: string, r: number, c: number) => {
    const toKey = nodeKey(r, c)
    if (fromKey === toKey) return
    mutate((d) => {
      const { r: fr, c: fc } = parseKey(fromKey)
      const source = d.nodes.find((n) => n.r === fr && n.c === fc)
      if (!source || d.nodes.some((n) => n.r === r && n.c === c)) return d
      const moved = { ...source, r, c }
      return {
        ...d,
        nodes: d.nodes.map((n) => (n.r === fr && n.c === fc ? moved : n)),
        edges: d.edges.map(([a, b]) => [a === fromKey ? toKey : a, b === fromKey ? toKey : b]),
        edgeFactors: renameNodeInEdgeMap(d.edgeFactors, fromKey, toKey),
        edgePulls: renameNodeInEdgeMap(d.edgePulls, fromKey, toKey),
      }
    })
    selectNode(toKey)
  }

  const setSelectedSize = (size: Size) => {
    if (!selected) return
    const { r, c } = parseKey(selected)
    mutate((d) => ({
      ...d,
      nodes: d.nodes.map((n) =>
        n.r === r && n.c === c ? { ...n, size, radius: undefined } : n,
      ),
    }))
  }

  const setRadius = (value: number) => {
    if (!selected) return
    const { r, c } = parseKey(selected)
    coalesceUpdate(`radius:${selected}`, (d) => ({
      ...d,
      nodes: d.nodes.map((n) =>
        n.r === r && n.c === c ? { ...n, radius: clampRadius(value) } : n,
      ),
    }))
  }

  const resetRadius = () => {
    if (!selected) return
    const { r, c } = parseKey(selected)
    mutate((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.r === r && n.c === c ? { ...n, radius: undefined } : n)),
    }))
  }

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selected) return
    const { r, c } = parseKey(selected)
    mutate((d) => ({
      ...d,
      nodes: d.nodes.map((n) =>
        n.r !== r || n.c !== c
          ? n
          : { ...n, offsetX: clampOffset((n.offsetX ?? 0) + dx), offsetY: clampOffset((n.offsetY ?? 0) + dy) },
      ),
    }))
  }

  // --- edge CRUD --------------------------------------------------------------
  const toggleEdge = (aKey: string, bKey: string) => {
    const key = edgeKey(aKey, bKey)
    // Decide from the committed doc, not inside the updater — with a pending
    // update React may defer the updater past the check below.
    const exists = doc.edges.some(([a, b]) => edgeKey(a, b) === key)
    mutate((d) => ({
      ...d,
      edges: exists
        ? d.edges.filter(([a, b]) => edgeKey(a, b) !== key)
        : [...d.edges, [aKey, bKey]],
      edgeFactors: exists ? dropEdgeKey(d.edgeFactors, key) : d.edgeFactors,
      edgePulls: exists ? dropEdgeKey(d.edgePulls, key) : d.edgePulls,
    }))
    if (exists) setSelectedEdge((k) => (k === key ? null : k))
  }

  const setEdgeFactor = (value: number) => {
    if (!selectedEdge) return
    coalesceUpdate(`edgeFactor:${selectedEdge}`, (d) => ({
      ...d,
      edgeFactors: { ...d.edgeFactors, [selectedEdge]: value },
    }))
  }
  const resetEdgeFactor = () => {
    if (!selectedEdge) return
    mutate((d) =>
      selectedEdge in d.edgeFactors
        ? { ...d, edgeFactors: dropEdgeKey(d.edgeFactors, selectedEdge) }
        : d,
    )
  }
  const setEdgePull = (value: number) => {
    if (!selectedEdge) return
    coalesceUpdate(`edgePull:${selectedEdge}`, (d) => ({
      ...d,
      edgePulls: { ...d.edgePulls, [selectedEdge]: value },
    }))
  }
  const resetEdgePull = () => {
    if (!selectedEdge) return
    mutate((d) =>
      selectedEdge in d.edgePulls
        ? { ...d, edgePulls: dropEdgeKey(d.edgePulls, selectedEdge) }
        : d,
    )
  }
  const enableEdgeStyle = () => {
    if (!selectedEdge) return
    mutate((d) => ({
      ...d,
      edgeFactors: { ...d.edgeFactors, [selectedEdge]: d.edgeFactors[selectedEdge] ?? d.tubeFactor },
      edgePulls: { ...d.edgePulls, [selectedEdge]: d.edgePulls[selectedEdge] ?? d.inwardPull },
    }))
  }
  const disableEdgeStyle = () => {
    if (!selectedEdge) return
    mutate((d) => ({
      ...d,
      edgeFactors: dropEdgeKey(d.edgeFactors, selectedEdge),
      edgePulls: dropEdgeKey(d.edgePulls, selectedEdge),
    }))
  }
  const removeSelectedEdge = () => {
    if (!selectedEdge) return
    mutate((d) => ({
      ...d,
      edges: d.edges.filter(([a, b]) => edgeKey(a, b) !== selectedEdge),
      edgeFactors: dropEdgeKey(d.edgeFactors, selectedEdge),
      edgePulls: dropEdgeKey(d.edgePulls, selectedEdge),
    }))
  }

  // --- document-level actions -------------------------------------------------
  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    pushDoc(documentFromPreset(preset))
    setSelected(null)
    setSelectedEdge(null)
  }
  const clearCanvas = () => {
    if (!doc.nodes.length && !doc.edges.length) return
    mutate((d) => ({ ...d, nodes: [], edges: [], edgeFactors: {}, edgePulls: {} }))
    setSelected(null)
    setSelectedEdge(null)
  }
  const doUndo = () => {
    commit()
    setHistory((h) => undo(h))
  }
  const doRedo = () => {
    commit()
    setHistory((h) => redo(h))
  }
  const setField = <K extends keyof EditorDoc>(key: K, value: EditorDoc[K]) => {
    if (doc[key] === value) return
    mutate((d) => ({ ...d, [key]: value }))
  }
  const setFieldCoalesced = <K extends keyof EditorDoc>(key: K, value: EditorDoc[K]) => {
    coalesceUpdate(key, (d) => ({ ...d, [key]: value }))
  }
  const setTheme = (theme: Theme) => {
    coalesceUpdate('theme', (d) => ({ ...d, theme }))
  }

  // --- export -----------------------------------------------------------------
  const flattenExport = (): FlattenExport | null => {
    if (doc.mode !== 'metaball') return null
    return { params: generateParams(doc), ink: doc.theme.ink }
  }
  const handleExportSvg = () => {
    if (svgRef.current) exportSvg(svgRef.current, { markOnly }, flattenExport())
  }
  const handleExportPng = () => {
    if (!svgRef.current) return
    exportPng(svgRef.current, { markOnly }, flattenExport(), pngScale).catch(() => {
      window.alert('PNG export failed.')
    })
  }
  const handleCopySvg = async (): Promise<boolean> => {
    if (!svgRef.current) return false
    return copySvg(svgRef.current, { markOnly }, flattenExport())
  }
  const handleExportJson = () => downloadJson(doc)
  const handleImportJson = (text: string) => {
    try {
      const next = parseDocument(text)
      pushDoc(next)
      setSelected(null)
      setSelectedEdge(null)
    } catch {
      window.alert('Could not import JSON. Check the file format.')
    }
  }

  // --- keyboard shortcuts (latest handlers via ref) ---------------------------
  const shortcutHandlers = useRef({
    selected,
    selectedEdge,
    undo: doUndo,
    redo: doRedo,
    removeNode,
    removeSelectedEdge,
    nudgeSelected,
    setSelectedSize,
    selectNode,
  })
  // Assigned in an effect, not during render — a discarded concurrent render
  // must not leave handlers that close over never-committed selection state.
  useEffect(() => {
    shortcutHandlers.current = {
      selected,
      selectedEdge,
      undo: doUndo,
      redo: doRedo,
      removeNode,
      removeSelectedEdge,
      nudgeSelected,
      setSelectedSize,
      selectNode,
    }
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      if (
        target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return
      }
      const h = shortcutHandlers.current
      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        h.undo()
        return
      }
      if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        h.redo()
        return
      }
      if (e.key === 'Escape') {
        h.selectNode(null)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !meta) {
        e.preventDefault()
        if (h.selectedEdge) h.removeSelectedEdge()
        else if (h.selected) h.removeNode(h.selected)
        return
      }
      if (h.selected && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 5 : 1
        if (e.key === 'ArrowUp') h.nudgeSelected(0, -step)
        if (e.key === 'ArrowDown') h.nudgeSelected(0, step)
        if (e.key === 'ArrowLeft') h.nudgeSelected(-step, 0)
        if (e.key === 'ArrowRight') h.nudgeSelected(step, 0)
        return
      }
      if (h.selected && KEY_TO_SIZE[e.key]) {
        e.preventDefault()
        h.setSelectedSize(KEY_TO_SIZE[e.key])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const selectedRadius = selectedNode ? nodeRadius(selectedNode) : null
  const radiusOverridden = selectedNode ? selectedNode.radius !== undefined : false

  return (
    <div className="app">
      <Toolbar
        mode={doc.mode}
        onModeChange={(mode) => setField('mode', mode)}
        selectedSize={selectedNode?.size ?? null}
        onSizeChange={setSelectedSize}
        selectedRadius={selectedRadius}
        radiusOverridden={radiusOverridden}
        onRadiusChange={setRadius}
        onRadiusCommit={commit}
        onRadiusReset={resetRadius}
        radiusMin={RADIUS_MIN}
        radiusMax={RADIUS_MAX}
        onDeleteSelected={() => selected && removeNode(selected)}
        theme={doc.theme}
        onThemeChange={setTheme}
        onThemeCommit={commit}
        showGrid={showGrid}
        onShowGridChange={setShowGrid}
        fullGrid={doc.fullGrid}
        onFullGridChange={(value) => setField('fullGrid', value)}
        gooStd={doc.gooStd}
        onGooStdChange={(value) => setFieldCoalesced('gooStd', value)}
        onGooStdCommit={commit}
        gooThreshold={doc.gooThreshold}
        onGooThresholdChange={(value) => setFieldCoalesced('gooThreshold', value)}
        onGooThresholdCommit={commit}
        tubeFactor={doc.tubeFactor}
        onTubeFactorChange={(value) => setFieldCoalesced('tubeFactor', value)}
        onTubeFactorCommit={commit}
        inwardPull={doc.inwardPull}
        onInwardPullChange={(value) => setFieldCoalesced('inwardPull', value)}
        onInwardPullCommit={commit}
        flattenEpsilon={doc.flattenEpsilon}
        onFlattenEpsilonChange={(value) => setFieldCoalesced('flattenEpsilon', value)}
        onFlattenEpsilonCommit={commit}
        flattenResolution={doc.flattenResolution}
        onFlattenResolutionChange={(value) => setFieldCoalesced('flattenResolution', value)}
        onFlattenResolutionCommit={commit}
        showExportPreview={showExportPreview}
        onShowExportPreviewChange={setShowExportPreview}
        selectedEdge={selectedEdge}
        edgeFactor={edgeFactor}
        edgeFactorOverridden={edgeFactorOverridden}
        onEdgeFactorChange={setEdgeFactor}
        onEdgeFactorCommit={commit}
        onEdgeFactorReset={resetEdgeFactor}
        edgePull={edgePull}
        edgePullOverridden={edgePullOverridden}
        onEdgePullChange={setEdgePull}
        onEdgePullCommit={commit}
        onEdgePullReset={resetEdgePull}
        onEnableEdgeStyle={enableEdgeStyle}
        onDisableEdgeStyle={disableEdgeStyle}
        onRemoveEdge={removeSelectedEdge}
        markOnly={markOnly}
        onMarkOnlyChange={setMarkOnly}
        pngScale={pngScale}
        onPngScaleChange={setPngScale}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={doUndo}
        onRedo={doRedo}
        onApplyPreset={applyPreset}
        onClear={clearCanvas}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onCopySvg={handleCopySvg}
        onExportJson={handleExportJson}
        onImportJsonClick={() => fileInputRef.current?.click()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === 'string') handleImportJson(reader.result)
          }
          reader.readAsText(file)
          e.target.value = ''
        }}
      />

      <main className="stage" style={{ background: doc.theme.bg }}>
        <div className="canvas-wrap">
          <Canvas
            ref={svgRef}
            mode={doc.mode}
            nodes={doc.nodes}
            edges={doc.edges}
            theme={doc.theme}
            showGrid={showGrid}
            fullGrid={doc.fullGrid}
            gooStd={doc.gooStd}
            gooThreshold={doc.gooThreshold}
            tubeFactor={doc.tubeFactor}
            inwardPull={doc.inwardPull}
            edgeFactors={doc.edgeFactors}
            edgePulls={doc.edgePulls}
            selected={selected}
            selectedEdge={selectedEdge}
            exportPreviewPath={exportPreviewPath}
            onAddNode={addNode}
            onSelect={selectNode}
            onSelectEdge={selectEdge}
            onToggleEdge={toggleEdge}
            onRemoveNode={removeNode}
            onMoveNode={moveNode}
          />
        </div>
      </main>
    </div>
  )
}
