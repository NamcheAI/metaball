import { useRef, useState, type ReactNode } from 'react';
import {
  FLATTEN_EPSILON_MIN,
  FLATTEN_EPSILON_MAX,
  FLATTEN_RESOLUTION_MIN,
  FLATTEN_RESOLUTION_MAX,
  GOO_STD_MIN,
  GOO_STD_MAX,
  GOO_THRESHOLD_MIN,
  GOO_THRESHOLD_MAX,
  INWARD_PULL_MIN,
  INWARD_PULL_MAX,
  PNG_SCALES,
  PRESETS,
  SURFACE_SAMPLER_COUNT_MAX,
  SURFACE_SAMPLER_COUNT_MIN,
  SURFACE_SAMPLER_POINT_SIZE_MAX,
  SURFACE_SAMPLER_POINT_SIZE_MIN,
  SURFACE_SAMPLER_SPHERE_SIZE_MAX,
  SURFACE_SAMPLER_SPHERE_SIZE_MIN,
  THEME_PRESETS,
  TUBE_FACTOR_MIN,
  TUBE_FACTOR_MAX,
  type Mode,
  type PngScale,
  type Size,
  type SurfaceSamplerMode,
  type Theme,
  type LookMode,
  type LiquidParams,
} from '../lib/model';
import { MATERIAL_PRESETS } from '../lib/materialPresets';
import { LIQUID_IOR_MAX, LIQUID_IOR_MIN, LIQUID_PRESETS } from '../lib/liquidPresets';
import { LIQUID_BACKDROPS } from '../lib/liquidBackdrops';
import { allLoopMotions, type LoopMotionId } from '../lib/motion';
import type { CausticDance } from '../lib/liquidPresets';

type ViewMode = '2d' | '3d';

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  materialPreset: string;
  onMaterialPresetChange: (id: string) => void;
  lookMode: LookMode;
  onLookModeChange: (mode: LookMode) => void;
  liquidPreset: string;
  onLiquidPresetChange: (id: string) => void;
  liquidBackdrop: string;
  onLiquidBackdropChange: (id: string) => void;
  liquidParams: LiquidParams;
  onLiquidParamsChange: (patch: Partial<LiquidParams>) => void;
  onLiquidParamsCommit: () => void;
  surfaceSamplerEnabled: boolean;
  onSurfaceSamplerEnabledChange: (value: boolean) => void;
  surfaceSamplerMode: SurfaceSamplerMode;
  onSurfaceSamplerModeChange: (mode: SurfaceSamplerMode) => void;
  surfaceSamplerCount: number;
  onSurfaceSamplerCountChange: (value: number) => void;
  onSurfaceSamplerCountCommit: () => void;
  surfaceSamplerPointSize: number;
  onSurfaceSamplerPointSizeChange: (value: number) => void;
  onSurfaceSamplerPointSizeCommit: () => void;
  surfaceSamplerSphereSize: number;
  onSurfaceSamplerSphereSizeChange: (value: number) => void;
  onSurfaceSamplerSphereSizeCommit: () => void;
  surfaceSamplerShowMesh: boolean;
  onSurfaceSamplerShowMeshChange: (value: boolean) => void;
  surfaceSamplerAnimate: boolean;
  onSurfaceSamplerAnimateChange: (value: boolean) => void;
  selectedSize: Size | null;
  onSizeChange: (size: Size) => void;
  selectedRadius: number | null;
  radiusOverridden: boolean;
  onRadiusChange: (value: number) => void;
  onRadiusCommit: () => void;
  onRadiusReset: () => void;
  radiusMin: number;
  radiusMax: number;
  onDeleteSelected: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onThemeCommit: () => void;
  showGrid: boolean;
  onShowGridChange: (value: boolean) => void;
  fullGrid: boolean;
  onFullGridChange: (value: boolean) => void;
  gooStd: number;
  onGooStdChange: (value: number) => void;
  onGooStdCommit: () => void;
  gooThreshold: number;
  onGooThresholdChange: (value: number) => void;
  onGooThresholdCommit: () => void;
  tubeFactor: number;
  onTubeFactorChange: (value: number) => void;
  onTubeFactorCommit: () => void;
  inwardPull: number;
  onInwardPullChange: (value: number) => void;
  onInwardPullCommit: () => void;
  flattenEpsilon: number;
  onFlattenEpsilonChange: (value: number) => void;
  onFlattenEpsilonCommit: () => void;
  flattenResolution: number;
  onFlattenResolutionChange: (value: number) => void;
  onFlattenResolutionCommit: () => void;
  showExportPreview: boolean;
  onShowExportPreviewChange: (value: boolean) => void;
  selectedEdge: string | null;
  edgeFactor: number | null;
  edgeFactorOverridden: boolean;
  onEdgeFactorChange: (value: number) => void;
  onEdgeFactorCommit: () => void;
  onEdgeFactorReset: () => void;
  edgePull: number | null;
  edgePullOverridden: boolean;
  onEdgePullChange: (value: number) => void;
  onEdgePullCommit: () => void;
  onEdgePullReset: () => void;
  onEnableEdgeStyle: () => void;
  onDisableEdgeStyle: () => void;
  onRemoveEdge: () => void;
  markOnly: boolean;
  onMarkOnlyChange: (value: boolean) => void;
  pngScale: PngScale;
  onPngScaleChange: (value: PngScale) => void;
  canUndo: boolean;
  canRedo: boolean;
  activePresetId: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onApplyPreset: (id: string) => void;
  onClear: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onCopySvg: () => Promise<boolean>;
  onExportJson: () => void;
  onExportGlb: () => void;
  onExportBlenderHandoff: () => void;
  refImageName: string | null;
  onAttachRefImageClick: () => void;
  onClearRefImage: () => void;
  onImportJsonClick: () => void;
  growing: boolean;
  onGrowToggle: () => void;
  canGrow: boolean;
  activeMotion: LoopMotionId | null;
  onMotionToggle: (id: LoopMotionId) => void;
  canMotion: boolean;
  breakNecks: boolean;
  onBreakNecksChange: (value: boolean) => void;
};

const SIZES: Size[] = ['S', 'M', 'L', 'XL'];
const LOOP_MOTIONS = allLoopMotions();

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="toolbar-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
  disabled?: boolean;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const decimals = step < 0.01 ? 3 : step < 1 ? 2 : 0;
  const safe = Number.isFinite(value) ? value : min;
  // Keep partially typed values (for example "4" on the way to "40") out of
  // the clamping path until the edit is committed.
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);

  const updateDraft = (next: string | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  const applyDraft = () => {
    const pending = draftRef.current;
    if (pending !== null) {
      const next = Number(pending);
      if (pending.trim() !== '' && !Number.isNaN(next)) onChange(clamp(next));
      updateDraft(null);
    }
    onCommit?.();
  };

  return (
    <div className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={safe}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onPointerCancel={onCommit}
        onBlur={onCommit}
        onKeyUp={(e) => {
          if (
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown' ||
            e.key === 'PageUp' ||
            e.key === 'PageDown' ||
            e.key === 'Home' ||
            e.key === 'End'
          ) {
            onCommit?.();
          }
        }}
      />
      <input
        type="number"
        aria-label={`${label} value`}
        className="num"
        min={min}
        max={max}
        step={step}
        value={draft ?? Number(safe.toFixed(decimals))}
        disabled={disabled}
        onChange={(e) => updateDraft(e.target.value)}
        onBlur={applyDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') applyDraft();
        }}
      />
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="color-row">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPointerUp={onCommit}
        onBlur={onCommit}
      />
    </label>
  );
}

export default function Toolbar({
  mode,
  onModeChange,
  view,
  onViewChange,
  materialPreset,
  onMaterialPresetChange,
  lookMode,
  onLookModeChange,
  liquidPreset,
  onLiquidPresetChange,
  liquidBackdrop,
  onLiquidBackdropChange,
  liquidParams,
  onLiquidParamsChange,
  onLiquidParamsCommit,
  surfaceSamplerEnabled,
  onSurfaceSamplerEnabledChange,
  surfaceSamplerMode,
  onSurfaceSamplerModeChange,
  surfaceSamplerCount,
  onSurfaceSamplerCountChange,
  onSurfaceSamplerCountCommit,
  surfaceSamplerPointSize,
  onSurfaceSamplerPointSizeChange,
  onSurfaceSamplerPointSizeCommit,
  surfaceSamplerSphereSize,
  onSurfaceSamplerSphereSizeChange,
  onSurfaceSamplerSphereSizeCommit,
  surfaceSamplerShowMesh,
  onSurfaceSamplerShowMeshChange,
  surfaceSamplerAnimate,
  onSurfaceSamplerAnimateChange,
  selectedSize,
  onSizeChange,
  selectedRadius,
  radiusOverridden,
  onRadiusChange,
  onRadiusCommit,
  onRadiusReset,
  radiusMin,
  radiusMax,
  onDeleteSelected,
  theme,
  onThemeChange,
  onThemeCommit,
  showGrid,
  onShowGridChange,
  fullGrid,
  onFullGridChange,
  gooStd,
  onGooStdChange,
  onGooStdCommit,
  gooThreshold,
  onGooThresholdChange,
  onGooThresholdCommit,
  tubeFactor,
  onTubeFactorChange,
  onTubeFactorCommit,
  inwardPull,
  onInwardPullChange,
  onInwardPullCommit,
  flattenEpsilon,
  onFlattenEpsilonChange,
  onFlattenEpsilonCommit,
  flattenResolution,
  onFlattenResolutionChange,
  onFlattenResolutionCommit,
  showExportPreview,
  onShowExportPreviewChange,
  selectedEdge,
  edgeFactor,
  edgeFactorOverridden,
  onEdgeFactorChange,
  onEdgeFactorCommit,
  onEdgeFactorReset,
  edgePull,
  edgePullOverridden,
  onEdgePullChange,
  onEdgePullCommit,
  onEdgePullReset,
  onEnableEdgeStyle,
  onDisableEdgeStyle,
  onRemoveEdge,
  markOnly,
  onMarkOnlyChange,
  pngScale,
  onPngScaleChange,
  canUndo,
  canRedo,
  activePresetId,
  onUndo,
  onRedo,
  onApplyPreset,
  onClear,
  onExportSvg,
  onExportPng,
  onCopySvg,
  onExportJson,
  onExportGlb,
  onExportBlenderHandoff,
  refImageName,
  onAttachRefImageClick,
  onClearRefImage,
  onImportJsonClick,
  growing,
  onGrowToggle,
  canGrow,
  activeMotion,
  onMotionToggle,
  canMotion,
  breakNecks,
  onBreakNecksChange,
}: Props) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimer = useRef<number | null>(null);

  const handleCopy = async () => {
    setCopyStatus((await onCopySvg()) ? 'copied' : 'failed');
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyStatus('idle'), 1500);
  };

  return (
    <aside className="toolbar">
      <header className="toolbar-header">
        <div className="brand">
          <img className="namche-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          <div className="namche-wordmark">
            <strong>NAMCHE</strong>
            <span>Frontier AI Initiative</span>
          </div>
          <p>Metaball Studio</p>
        </div>

        <div className="button-grid">
          <button className="chip" disabled={!canUndo} onClick={onUndo}>
            Undo
          </button>
          <button className="chip" disabled={!canRedo} onClick={onRedo}>
            Redo
          </button>
        </div>

        <div className="segmented" aria-label="View dimension">
          <button className={view === '2d' ? 'active' : ''} onClick={() => onViewChange('2d')}>
            2D
          </button>
          <button className={view === '3d' ? 'active' : ''} onClick={() => onViewChange('3d')}>
            3D
          </button>
        </div>

        {view === '2d' && (
          <div className="toolbar-mode-control">
            <div className="segmented" aria-label="2D canvas mode">
              <button
                className={mode === 'metaball' ? 'active' : ''}
                onClick={() => onModeChange('metaball')}
              >
                Form
              </button>
              <button
                className={mode === 'graph' ? 'active' : ''}
                onClick={() => onModeChange('graph')}
              >
                Graph
              </button>
            </div>
            <p>
              {mode === 'metaball' ? 'Style and export the mark.' : 'Inspect and edit its network.'}
            </p>
          </div>
        )}
      </header>

      <div className="toolbar-panels">
        <Section title="Shape">
          <div className="button-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`chip${activePresetId === preset.id ? ' active' : ''}`}
                onClick={() => onApplyPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Motion">
          <label className="select-row">
            <span>Loop</span>
            <select
              value={activeMotion ?? ''}
              disabled={!canMotion && activeMotion === null}
              onChange={(event) => {
                const next = event.target.value as LoopMotionId | '';
                if (next) onMotionToggle(next);
                else if (activeMotion) onMotionToggle(activeMotion);
              }}
            >
              <option value="">None</option>
              {LOOP_MOTIONS.map((motion) => (
                <option key={motion.id} value={motion.id}>
                  {motion.label}
                </option>
              ))}
            </select>
          </label>
          {activeMotion && (
            <p className="hint tight">
              {LOOP_MOTIONS.find((motion) => motion.id === activeMotion)?.hint}
            </p>
          )}
          <div className="button-grid">
            <button
              className={`chip${growing ? ' active' : ''}`}
              disabled={!canGrow && !growing}
              onClick={onGrowToggle}
            >
              {growing ? 'Stop growth' : 'Grow once'}
            </button>
            <button
              className="chip"
              disabled={!activeMotion}
              onClick={() => activeMotion && onMotionToggle(activeMotion)}
            >
              Stop loop
            </button>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={breakNecks}
              disabled={!activeMotion}
              onChange={(event) => onBreakNecksChange(event.target.checked)}
            />
            <span>Allow necks to break while moving</span>
          </label>
        </Section>

        {view === '2d' && mode === 'graph' && (
          <Section title="Selected connection">
            {selectedEdge ? (
              <button className="danger" onClick={onRemoveEdge}>
                Remove connection
              </button>
            ) : (
              <p className="hint tight">Click a connection between two nodes to select it.</p>
            )}
          </Section>
        )}

        {view === '2d' && selectedSize !== null && (
          <Section title="Selected node">
            <div className="segmented">
              {SIZES.map((size) => (
                <button
                  key={size}
                  disabled={selectedSize === null}
                  className={selectedSize === size ? 'active' : ''}
                  onClick={() => onSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            {selectedRadius !== null && (
              <div className="slider-group">
                <NumberSlider
                  label="Radius"
                  value={selectedRadius}
                  min={radiusMin}
                  max={radiusMax}
                  step={1}
                  onChange={onRadiusChange}
                  onCommit={onRadiusCommit}
                />
                <p className="hint tight">
                  {radiusOverridden
                    ? 'Custom radius active. Size presets reset it.'
                    : 'Using preset size radius.'}
                </p>
                <button className="chip" disabled={!radiusOverridden} onClick={onRadiusReset}>
                  Use preset radius
                </button>
              </div>
            )}
            <button className="danger" disabled={selectedSize === null} onClick={onDeleteSelected}>
              Delete node
            </button>
            <p className="hint tight">
              Arrow keys nudge (1 px). Shift+arrow nudges 5 px. Alt/Shift+drag moves a node to
              another cell.
            </p>
          </Section>
        )}

        {view === '2d' && (
          <Section title="Appearance">
            <ColorRow
              label="Mark"
              value={theme.ink}
              onChange={(v) => onThemeChange({ ...theme, ink: v })}
              onCommit={onThemeCommit}
            />
            <div className="toolbar-subsection">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(event) => onShowGridChange(event.target.checked)}
                />
                <span>Namche raster</span>
              </label>
              {showGrid && (
                <div className="subsection-controls">
                  <button
                    className="chip"
                    onClick={() => {
                      const preset = THEME_PRESETS[0];
                      if (!preset) return;
                      onThemeChange({ ...preset.theme, ink: theme.ink });
                      onThemeCommit();
                    }}
                  >
                    Reset raster colors
                  </button>
                  <ColorRow
                    label="Outer cells"
                    value={theme.pink}
                    onChange={(v) => onThemeChange({ ...theme, pink: v })}
                    onCommit={onThemeCommit}
                  />
                  <ColorRow
                    label="Inner cells"
                    value={theme.blue}
                    onChange={(v) => onThemeChange({ ...theme, blue: v })}
                    onCommit={onThemeCommit}
                  />
                  <ColorRow
                    label="Background"
                    value={theme.bg}
                    onChange={(v) => onThemeChange({ ...theme, bg: v })}
                    onCommit={onThemeCommit}
                  />
                </div>
              )}
            </div>
          </Section>
        )}

        {view === '3d' && (
          <Section title="Material">
            <div className="segmented">
              <button
                className={lookMode === 'material' ? 'active' : ''}
                onClick={() => onLookModeChange('material')}
              >
                Organic
              </button>
              <button
                className={lookMode === 'liquid' ? 'active' : ''}
                onClick={() => onLookModeChange('liquid')}
              >
                Liquid
              </button>
            </div>

            {lookMode === 'material' && (
              <>
                <div className="button-grid">
                  {MATERIAL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={`chip${materialPreset === preset.id ? ' active' : ''}`}
                      onClick={() => onMaterialPresetChange(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="hint tight">
                  {MATERIAL_PRESETS.find((p) => p.id === materialPreset)?.hint ?? ''}
                </p>
              </>
            )}

            {lookMode === 'liquid' && (
              <>
                <div className="button-grid">
                  {LIQUID_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={`chip${liquidPreset === preset.id ? ' active' : ''}`}
                      onClick={() => onLiquidPresetChange(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="hint tight">
                  {LIQUID_PRESETS.find((p) => p.id === liquidPreset)?.hint ?? ''}
                </p>
                <p className="hint tight">Environment</p>
                <div className="button-grid">
                  {LIQUID_BACKDROPS.map((backdrop) => (
                    <button
                      key={backdrop.id}
                      className={`chip${liquidBackdrop === backdrop.id ? ' active' : ''}`}
                      onClick={() => onLiquidBackdropChange(backdrop.id)}
                      title={backdrop.hint}
                    >
                      {backdrop.label}
                    </button>
                  ))}
                </div>
                <p className="hint tight">
                  {LIQUID_BACKDROPS.find((b) => b.id === liquidBackdrop)?.hint ?? ''}
                </p>
                <details className="advanced-export">
                  <summary>Fine tune liquid</summary>
                  <div className="slider-group">
                    <NumberSlider
                      label="Transmission"
                      value={liquidParams.transmission}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ transmission: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <p className="hint tight">
                      How much environment light passes through the body.
                    </p>
                    <NumberSlider
                      label="Glow"
                      value={liquidParams.bloom}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ bloom: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <NumberSlider
                      label="Caustics"
                      value={liquidParams.causticStrength}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ causticStrength: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <p className="hint tight">Light dance and caustic intensity.</p>
                    <div className="segmented tight">
                      {(['calm', 'lively', 'wild'] as CausticDance[]).map((id) => (
                        <button
                          key={id}
                          type="button"
                          className={liquidParams.causticDance === id ? 'active' : ''}
                          onClick={() => {
                            onLiquidParamsChange({ causticDance: id });
                            onLiquidParamsCommit();
                          }}
                        >
                          {id === 'calm' ? 'Calm' : id === 'lively' ? 'Lively' : 'Wild'}
                        </button>
                      ))}
                    </div>
                    <NumberSlider
                      label="Waves"
                      value={liquidParams.waveStrength}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ waveStrength: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <p className="hint tight">Surface distortion and wobble.</p>
                    <NumberSlider
                      label="Rim"
                      value={liquidParams.rimStrength}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ rimStrength: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <NumberSlider
                      label="Roughness"
                      value={liquidParams.roughness}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ roughness: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <NumberSlider
                      label="IOR"
                      value={liquidParams.ior}
                      min={LIQUID_IOR_MIN}
                      max={LIQUID_IOR_MAX}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ ior: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <NumberSlider
                      label="Dispersion"
                      value={liquidParams.dispersion}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ dispersion: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <NumberSlider
                      label="Opacity"
                      value={liquidParams.opacity}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => onLiquidParamsChange({ opacity: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <p className="hint tight">Residual body density, independent of tint.</p>
                    <ColorRow
                      label="Tint"
                      value={liquidParams.tint}
                      onChange={(v) => onLiquidParamsChange({ tint: v })}
                      onCommit={onLiquidParamsCommit}
                    />
                    <p className="hint tight">A light color wash rather than an opaque gel.</p>
                  </div>
                </details>
              </>
            )}
          </Section>
        )}

        {view === '3d' && (
          <Section title="Advanced 3D">
            <details className="advanced-export">
              <summary>Surface sampling</summary>
              <div className="subsection-controls">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={surfaceSamplerEnabled}
                    onChange={(e) => onSurfaceSamplerEnabledChange(e.target.checked)}
                  />
                  <span>Enable sampler</span>
                </label>
                <div className="segmented">
                  {(
                    [
                      ['points', 'Points'],
                      ['spheres', 'Spheres'],
                      ['both', 'Both'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      className={surfaceSamplerMode === id ? 'active' : ''}
                      disabled={!surfaceSamplerEnabled}
                      onClick={() => onSurfaceSamplerModeChange(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="slider-group">
                  <NumberSlider
                    label="Count"
                    value={surfaceSamplerCount}
                    min={SURFACE_SAMPLER_COUNT_MIN}
                    max={SURFACE_SAMPLER_COUNT_MAX}
                    step={100}
                    disabled={!surfaceSamplerEnabled}
                    onChange={onSurfaceSamplerCountChange}
                    onCommit={onSurfaceSamplerCountCommit}
                  />
                  <NumberSlider
                    label="Point size"
                    value={surfaceSamplerPointSize}
                    min={SURFACE_SAMPLER_POINT_SIZE_MIN}
                    max={SURFACE_SAMPLER_POINT_SIZE_MAX}
                    step={0.001}
                    disabled={!surfaceSamplerEnabled || surfaceSamplerMode === 'spheres'}
                    onChange={onSurfaceSamplerPointSizeChange}
                    onCommit={onSurfaceSamplerPointSizeCommit}
                  />
                  <NumberSlider
                    label="Sphere size"
                    value={surfaceSamplerSphereSize}
                    min={SURFACE_SAMPLER_SPHERE_SIZE_MIN}
                    max={SURFACE_SAMPLER_SPHERE_SIZE_MAX}
                    step={0.001}
                    disabled={!surfaceSamplerEnabled || surfaceSamplerMode === 'points'}
                    onChange={onSurfaceSamplerSphereSizeChange}
                    onCommit={onSurfaceSamplerSphereSizeCommit}
                  />
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={surfaceSamplerShowMesh}
                    disabled={!surfaceSamplerEnabled}
                    onChange={(e) => onSurfaceSamplerShowMeshChange(e.target.checked)}
                  />
                  <span>Show mesh</span>
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={surfaceSamplerAnimate}
                    disabled={!surfaceSamplerEnabled}
                    onChange={(e) => onSurfaceSamplerAnimateChange(e.target.checked)}
                  />
                  <span>Animate reveal</span>
                </label>
                <p className="hint tight">
                  {surfaceSamplerEnabled
                    ? 'Pink points / spheres bloom onto the whole isosurface.'
                    : 'Enable to scatter pink samples on the 3D mark.'}
                </p>
              </div>
            </details>
          </Section>
        )}

        {view === '2d' && (
          <Section title="Authoring">
            <label className="check-row">
              <input
                type="checkbox"
                checked={fullGrid}
                onChange={(e) => onFullGridChange(e.target.checked)}
              />
              <span>Allow nodes in outer cells</span>
            </label>
          </Section>
        )}

        {(mode === 'metaball' || view === '3d') && (
          <Section title="Style">
            <div className="slider-group">
              <NumberSlider
                label="Neck width"
                value={tubeFactor}
                min={TUBE_FACTOR_MIN}
                max={TUBE_FACTOR_MAX}
                step={0.01}
                onChange={onTubeFactorChange}
                onCommit={onTubeFactorCommit}
              />
              <p className="hint tight">Capsule thickness before blur.</p>
              <NumberSlider
                label="Blur"
                value={gooStd}
                min={GOO_STD_MIN}
                max={GOO_STD_MAX}
                step={0.5}
                onChange={onGooStdChange}
                onCommit={onGooStdCommit}
              />
              <p className="hint tight">Spread of the merge — softer, wider joins.</p>
              <NumberSlider
                label="Contrast"
                value={gooThreshold}
                min={GOO_THRESHOLD_MIN}
                max={GOO_THRESHOLD_MAX}
                step={0.5}
                onChange={onGooThresholdChange}
                onCommit={onGooThresholdCommit}
              />
              <p className="hint tight">Alpha cutoff — higher = sharper waist, tighter neck.</p>
              <NumberSlider
                label="Pinch / merge"
                value={inwardPull}
                min={INWARD_PULL_MIN}
                max={INWARD_PULL_MAX}
                step={0.01}
                onChange={onInwardPullChange}
                onCommit={onInwardPullCommit}
              />
              <p className="hint tight">
                Barbell tubes at 0 → pinched metaball at 1. Also boosts effective blur as tubes
                fade.
              </p>
            </div>

            {view === '2d' && (
              <div className="style-connection">
                {selectedEdge && edgeFactor !== null && edgePull !== null ? (
                  <>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={edgeFactorOverridden || edgePullOverridden}
                        onChange={(e) => {
                          if (e.target.checked) onEnableEdgeStyle();
                          else onDisableEdgeStyle();
                        }}
                      />
                      <span>Customize selected connection</span>
                    </label>
                    {(edgeFactorOverridden || edgePullOverridden) && (
                      <div className="slider-group">
                        <NumberSlider
                          label="Neck width"
                          value={edgeFactor}
                          min={TUBE_FACTOR_MIN}
                          max={TUBE_FACTOR_MAX}
                          step={0.01}
                          onChange={onEdgeFactorChange}
                          onCommit={onEdgeFactorCommit}
                        />
                        <p className="hint tight">
                          Capsule thickness for this connection before blur.
                        </p>
                        <NumberSlider
                          label="Pinch"
                          value={edgePull}
                          min={INWARD_PULL_MIN}
                          max={INWARD_PULL_MAX}
                          step={0.01}
                          onChange={onEdgePullChange}
                          onCommit={onEdgePullCommit}
                        />
                        <p className="hint tight">
                          How much tube remains on this join — 0 keeps a barbell, 1 fades the tube.
                        </p>
                        <div className="button-grid">
                          <button
                            className="chip"
                            disabled={!edgeFactorOverridden}
                            onClick={onEdgeFactorReset}
                          >
                            Reset neck
                          </button>
                          <button
                            className="chip"
                            disabled={!edgePullOverridden}
                            onClick={onEdgePullReset}
                          >
                            Reset pinch
                          </button>
                          <button className="danger" onClick={onRemoveEdge}>
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                    {!(edgeFactorOverridden || edgePullOverridden) && (
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
            )}
          </Section>
        )}

        <Section title="Export">
          {view === '2d' && mode === 'metaball' && (
            <>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={markOnly}
                  onChange={(e) => onMarkOnlyChange(e.target.checked)}
                />
                <span>Mark only (transparent)</span>
              </label>
              <label className="select-row">
                <span>PNG scale</span>
                <select
                  value={pngScale}
                  onChange={(e) => onPngScaleChange(Number(e.target.value) as PngScale)}
                >
                  {PNG_SCALES.map((s) => (
                    <option key={s} value={s}>
                      {s}×
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="button-grid">
            {view === '2d' && mode === 'metaball' && (
              <>
                <button className="chip" onClick={onExportSvg}>
                  Export SVG
                </button>
                <button className="chip" onClick={onExportPng}>
                  Export PNG
                </button>
                <button
                  className={`chip${copyStatus === 'copied' ? ' is-copied' : ''}`}
                  onClick={() => void handleCopy()}
                  aria-live="polite"
                >
                  {copyStatus === 'copied'
                    ? 'Copied!'
                    : copyStatus === 'failed'
                      ? 'Copy failed'
                      : 'Copy SVG'}
                </button>
              </>
            )}
            <button className="chip" onClick={onExportJson}>
              Export JSON
            </button>
            <button className="chip" onClick={onImportJsonClick}>
              Import JSON
            </button>
            {view === '3d' && (
              <>
                <button className="chip" onClick={onExportGlb}>
                  Export GLB
                </button>
                <button className="chip" onClick={onExportBlenderHandoff}>
                  Export for Blender
                </button>
              </>
            )}
          </div>
          {view === '2d' && mode === 'graph' && (
            <p className="hint tight">
              Switch to Form to export SVG or PNG. JSON remains available for editable graph data.
            </p>
          )}
          {view === '3d' && (
            <div className="slider-group">
              <p className="hint tight">
                {refImageName
                  ? `Reference image attached: ${refImageName}. Overrides the bundled default when exporting.`
                  : 'No reference image attached — Harz+Moos/Fels/Schaum pack a bundled ref; attach your own to steer any material.'}
              </p>
              <div className="button-grid">
                <button className="chip" onClick={onAttachRefImageClick}>
                  {refImageName ? 'Replace reference image' : 'Attach reference image'}
                </button>
                <button className="chip" disabled={!refImageName} onClick={onClearRefImage}>
                  Clear reference image
                </button>
              </div>
            </div>
          )}
          {view === '3d' && (
            <p className="hint tight">
              Export GLB = mesh only. Export for Blender = zip (mesh + preview + universal prompt)
              for Blender MCP — the reference image (attached or bundled) drives the SurfaceDriver +
              VERIFY LOOP workflow.
            </p>
          )}
          {view === '2d' && mode === 'metaball' && (
            <details className="advanced-export">
              <summary>Advanced export</summary>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showExportPreview}
                  onChange={(e) => onShowExportPreviewChange(e.target.checked)}
                />
                <span>Show export preview overlay</span>
              </label>
              <div className="slider-group">
                <NumberSlider
                  label="Flatten detail"
                  value={flattenEpsilon}
                  min={FLATTEN_EPSILON_MIN}
                  max={FLATTEN_EPSILON_MAX}
                  step={0.1}
                  onChange={onFlattenEpsilonChange}
                  onCommit={onFlattenEpsilonCommit}
                />
                <NumberSlider
                  label="Flatten res."
                  value={flattenResolution}
                  min={FLATTEN_RESOLUTION_MIN}
                  max={FLATTEN_RESOLUTION_MAX}
                  step={1}
                  onChange={onFlattenResolutionChange}
                  onCommit={onFlattenResolutionCommit}
                />
              </div>
            </details>
          )}
        </Section>

        <Section title="Reset">
          <button className="danger" onClick={onClear}>
            Clear canvas
          </button>
        </Section>
      </div>
    </aside>
  );
}
