import { useRef, useState } from 'react'
import { PNG_SCALES, SIZES } from '../lib/constants'
import { PRESETS } from '../lib/presets'
import type { Mode, Size, Theme } from '../lib/types'
import { ColorField } from './ColorField'
import { Section } from './Section'
import { Slider } from './Slider'

export interface ToolbarProps {
  mode: Mode
  onModeChange: (mode: Mode) => void

  // selected node
  selectedSize: Size | null
  onSizeChange: (size: Size) => void
  selectedRadius: number | null
  radiusOverridden: boolean
  onRadiusChange: (value: number) => void
  onRadiusCommit: () => void
  onRadiusReset: () => void
  radiusMin: number
  radiusMax: number
  onDeleteSelected: () => void

  // colors
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onThemeCommit: () => void

  // canvas
  showGrid: boolean
  onShowGridChange: (value: boolean) => void
  fullGrid: boolean
  onFullGridChange: (value: boolean) => void

  // global style
  gooStd: number
  onGooStdChange: (value: number) => void
  onGooStdCommit: () => void
  gooThreshold: number
  onGooThresholdChange: (value: number) => void
  onGooThresholdCommit: () => void
  tubeFactor: number
  onTubeFactorChange: (value: number) => void
  onTubeFactorCommit: () => void
  inwardPull: number
  onInwardPullChange: (value: number) => void
  onInwardPullCommit: () => void

  // flatten export
  flattenEpsilon: number
  onFlattenEpsilonChange: (value: number) => void
  onFlattenEpsilonCommit: () => void
  flattenResolution: number
  onFlattenResolutionChange: (value: number) => void
  onFlattenResolutionCommit: () => void
  showExportPreview: boolean
  onShowExportPreviewChange: (value: boolean) => void

  // selected connection
  selectedEdge: string | null
  edgeFactor: number | null
  edgeFactorOverridden: boolean
  onEdgeFactorChange: (value: number) => void
  onEdgeFactorCommit: () => void
  onEdgeFactorReset: () => void
  edgePull: number | null
  edgePullOverridden: boolean
  onEdgePullChange: (value: number) => void
  onEdgePullCommit: () => void
  onEdgePullReset: () => void
  onEnableEdgeStyle: () => void
  onDisableEdgeStyle: () => void
  onRemoveEdge: () => void

  // export
  markOnly: boolean
  onMarkOnlyChange: (value: boolean) => void
  pngScale: number
  onPngScaleChange: (value: number) => void

  // history
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void

  // actions
  onApplyPreset: (id: string) => void
  onClear: () => void
  onExportSvg: () => void
  onExportPng: () => void
  /** Resolves false when the clipboard is unavailable. */
  onCopySvg: () => Promise<boolean>
  onExportJson: () => void
  onImportJsonClick: () => void
}

export function Toolbar(props: ToolbarProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)

  const edgeStyleOpen = props.edgeFactorOverridden || props.edgePullOverridden

  return (
    <aside className="toolbar">
      <header className="toolbar-header">
        <div className="brand">
          <strong>Metaball</strong>
          <span>Brandmark Editor</span>
        </div>
        <div className="button-grid">
          <button className="chip" disabled={!props.canUndo} onClick={props.onUndo}>
            Undo
          </button>
          <button className="chip" disabled={!props.canRedo} onClick={props.onRedo}>
            Redo
          </button>
        </div>
        <div className="segmented">
          <button
            className={props.mode === 'graph' ? 'active' : ''}
            onClick={() => props.onModeChange('graph')}
          >
            Graph
          </button>
          <button
            className={props.mode === 'metaball' ? 'active' : ''}
            onClick={() => props.onModeChange('metaball')}
          >
            Metaball
          </button>
        </div>
      </header>

      <div className="toolbar-panels">
        <Section title="Presets">
          <div className="button-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                className="chip"
                onClick={() => props.onApplyPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Section>

        {props.mode === 'graph' && (
          <Section title="Selected connection">
            {props.selectedEdge ? (
              <button className="danger" onClick={props.onRemoveEdge}>
                Remove connection
              </button>
            ) : (
              <p className="hint tight">Click a connection between two nodes to select it.</p>
            )}
          </Section>
        )}

        <Section title="Selected node">
          <div className="segmented">
            {SIZES.map((size) => (
              <button
                key={size}
                disabled={props.selectedSize === null}
                className={props.selectedSize === size ? 'active' : ''}
                onClick={() => props.onSizeChange(size)}
              >
                {size}
              </button>
            ))}
          </div>
          {props.selectedRadius !== null && (
            <div className="slider-group">
              <Slider
                label="Radius"
                value={props.selectedRadius}
                min={props.radiusMin}
                max={props.radiusMax}
                step={1}
                onChange={props.onRadiusChange}
                onCommit={props.onRadiusCommit}
              />
              <p className="hint tight">
                {props.radiusOverridden
                  ? 'Custom radius active. Size presets reset it.'
                  : 'Using preset size radius.'}
              </p>
              <button
                className="chip"
                disabled={!props.radiusOverridden}
                onClick={props.onRadiusReset}
              >
                Use preset radius
              </button>
            </div>
          )}
          <button
            className="danger"
            disabled={props.selectedSize === null}
            onClick={props.onDeleteSelected}
          >
            Delete node
          </button>
          <p className="hint tight">
            Arrow keys nudge (1 px). Shift+arrow nudges 5 px. Alt/Shift+drag moves a node to
            another cell.
          </p>
        </Section>

        <Section title="Colors">
          <ColorField
            label="Outer"
            value={props.theme.pink}
            onChange={(pink) => props.onThemeChange({ ...props.theme, pink })}
            onCommit={props.onThemeCommit}
          />
          <ColorField
            label="Inner"
            value={props.theme.blue}
            onChange={(blue) => props.onThemeChange({ ...props.theme, blue })}
            onCommit={props.onThemeCommit}
          />
          <ColorField
            label="Mark"
            value={props.theme.ink}
            onChange={(ink) => props.onThemeChange({ ...props.theme, ink })}
            onCommit={props.onThemeCommit}
          />
          <ColorField
            label="Background"
            value={props.theme.bg}
            onChange={(bg) => props.onThemeChange({ ...props.theme, bg })}
            onCommit={props.onThemeCommit}
          />
        </Section>

        <Section title="Canvas">
          <label className="check-row">
            <input
              type="checkbox"
              checked={props.showGrid}
              onChange={(e) => props.onShowGridChange(e.target.checked)}
            />
            <span>Show grid background</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={props.fullGrid}
              onChange={(e) => props.onFullGridChange(e.target.checked)}
            />
            <span>Full grid (overflow into outer cells)</span>
          </label>
        </Section>

        {props.mode === 'metaball' && (
          <Section title="Style">
            <div className="slider-group">
              <Slider
                label="Neck width"
                value={props.tubeFactor}
                min={0.1}
                max={1}
                step={0.01}
                onChange={props.onTubeFactorChange}
                onCommit={props.onTubeFactorCommit}
              />
              <p className="hint tight">Capsule thickness before blur.</p>
              <Slider
                label="Blur"
                value={props.gooStd}
                min={2}
                max={18}
                step={0.5}
                onChange={props.onGooStdChange}
                onCommit={props.onGooStdCommit}
              />
              <p className="hint tight">Spread of the merge — softer, wider joins.</p>
              <Slider
                label="Contrast"
                value={props.gooThreshold}
                min={6}
                max={44}
                step={0.5}
                onChange={props.onGooThresholdChange}
                onCommit={props.onGooThresholdCommit}
              />
              <p className="hint tight">Alpha cutoff — higher = sharper waist, tighter neck.</p>
              <Slider
                label="Pinch / merge"
                value={props.inwardPull}
                min={0}
                max={1}
                step={0.01}
                onChange={props.onInwardPullChange}
                onCommit={props.onInwardPullCommit}
              />
              <p className="hint tight">
                Barbell tubes at 0 → pinched metaball at 1. Also boosts effective blur as tubes
                fade.
              </p>
            </div>

            <div className="style-connection">
              {props.selectedEdge && props.edgeFactor !== null && props.edgePull !== null ? (
                <>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={edgeStyleOpen}
                      onChange={(e) =>
                        e.target.checked ? props.onEnableEdgeStyle() : props.onDisableEdgeStyle()
                      }
                    />
                    <span>Customize selected connection</span>
                  </label>
                  {edgeStyleOpen ? (
                    <div className="slider-group">
                      <Slider
                        label="Neck width"
                        value={props.edgeFactor}
                        min={0.1}
                        max={1}
                        step={0.01}
                        onChange={props.onEdgeFactorChange}
                        onCommit={props.onEdgeFactorCommit}
                      />
                      <p className="hint tight">
                        Capsule thickness for this connection before blur.
                      </p>
                      <Slider
                        label="Pinch"
                        value={props.edgePull}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={props.onEdgePullChange}
                        onCommit={props.onEdgePullCommit}
                      />
                      <p className="hint tight">
                        How much tube remains on this join — 0 keeps a barbell, 1 fades the tube.
                      </p>
                      <div className="button-grid">
                        <button
                          className="chip"
                          disabled={!props.edgeFactorOverridden}
                          onClick={props.onEdgeFactorReset}
                        >
                          Reset neck
                        </button>
                        <button
                          className="chip"
                          disabled={!props.edgePullOverridden}
                          onClick={props.onEdgePullReset}
                        >
                          Reset pinch
                        </button>
                        <button className="danger" onClick={props.onRemoveEdge}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="hint tight">
                      Turn on to override global Neck and Pinch for this join only. Blur and
                      Contrast stay global.
                    </p>
                  )}
                </>
              ) : (
                <p className="hint tight">
                  Select a connection on the canvas to customize its neck and pinch.
                </p>
              )}
            </div>
          </Section>
        )}

        <Section title="Export">
          <label className="check-row">
            <input
              type="checkbox"
              checked={props.markOnly}
              onChange={(e) => props.onMarkOnlyChange(e.target.checked)}
            />
            <span>Mark only (transparent)</span>
          </label>
          <label className="select-row">
            <span>PNG scale</span>
            <select
              value={props.pngScale}
              onChange={(e) => props.onPngScaleChange(Number(e.target.value))}
            >
              {PNG_SCALES.map((scale) => (
                <option key={scale} value={scale}>
                  {scale}×
                </option>
              ))}
            </select>
          </label>
          <div className="button-grid">
            <button className="chip" onClick={props.onExportSvg}>
              Export SVG
            </button>
            <button className="chip" onClick={props.onExportPng}>
              Export PNG
            </button>
            <button
              className={`chip${copied ? ' is-copied' : ''}`}
              aria-live="polite"
              onClick={async () => {
                const ok = await props.onCopySvg()
                if (!ok) {
                  window.alert('Could not copy to the clipboard. Use Export SVG instead.')
                  return
                }
                setCopied(true)
                if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
                copiedTimer.current = window.setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? 'Copied!' : 'Copy SVG'}
            </button>
            <button className="chip" onClick={props.onExportJson}>
              Export JSON
            </button>
            <button className="chip" onClick={props.onImportJsonClick}>
              Import JSON
            </button>
          </div>
          {props.mode === 'metaball' && (
            <details className="advanced-export">
              <summary>Advanced export</summary>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={props.showExportPreview}
                  onChange={(e) => props.onShowExportPreviewChange(e.target.checked)}
                />
                <span>Show export preview overlay</span>
              </label>
              <div className="slider-group">
                <Slider
                  label="Flatten detail"
                  value={props.flattenEpsilon}
                  min={0.1}
                  max={3}
                  step={0.1}
                  onChange={props.onFlattenEpsilonChange}
                  onCommit={props.onFlattenEpsilonCommit}
                />
                <Slider
                  label="Flatten res."
                  value={props.flattenResolution}
                  min={1}
                  max={3}
                  step={1}
                  onChange={props.onFlattenResolutionChange}
                  onCommit={props.onFlattenResolutionCommit}
                />
              </div>
            </details>
          )}
        </Section>

        <Section title="Reset">
          <button className="danger" onClick={props.onClear}>
            Clear canvas
          </button>
        </Section>
      </div>
    </aside>
  )
}
