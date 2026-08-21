import { useState } from 'react';
import {
  AI_RENDER_BACKGROUNDS,
  AI_RENDER_QUALITIES,
  AI_RENDER_SIZES,
  DEFAULT_AI_RENDER_PARAMS,
  type AIRenderParams,
  type AIRenderResult,
} from '../../lib/ai-render-contract';
import { downloadAIRender } from '../lib/aiRender';

type Props = {
  canRender: boolean;
  referenceName: string | null;
  onAttachReference: () => void;
  onClearReference: () => void;
  onRender: (params: AIRenderParams) => Promise<AIRenderResult>;
};

function percentageLabel(value: number): string {
  return `${Math.round(value)}%`;
}

export default function AIRenderPanel({
  canRender,
  referenceName,
  onAttachReference,
  onClearReference,
  onRender,
}: Props) {
  const [params, setParams] = useState<AIRenderParams>(DEFAULT_AI_RENDER_PARAMS);
  const [status, setStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIRenderResult | null>(null);

  const patch = <K extends keyof AIRenderParams>(key: K, value: AIRenderParams[K]) =>
    setParams((current) => ({ ...current, [key]: value }));

  const render = async () => {
    setStatus('rendering');
    setError(null);
    try {
      const next = await onRender(params);
      setResult(next);
      setStatus('done');
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : 'AI material render failed.');
      setStatus('error');
    }
  };

  return (
    <div className="ai-render-panel">
      <p className="hint tight">
        Image 1 locks the current shape and camera. An optional Image 2 supplies any material —
        nacre, coral, moss, grass, fur or something entirely new.
      </p>

      <label className="ai-field">
        <span>Material direction</span>
        <textarea
          rows={4}
          value={params.materialDescription}
          onChange={(event) => patch('materialDescription', event.target.value)}
        />
      </label>

      <div className="ai-range">
        <label htmlFor="ai-shape-fidelity">Shape fidelity</label>
        <output>{percentageLabel(params.geometryFidelity)}</output>
        <input
          id="ai-shape-fidelity"
          type="range"
          min={0}
          max={100}
          value={params.geometryFidelity}
          onChange={(event) => patch('geometryFidelity', Number(event.target.value))}
        />
      </div>
      <div className="ai-range">
        <label htmlFor="ai-material-influence">Material influence</label>
        <output>{percentageLabel(params.materialInfluence)}</output>
        <input
          id="ai-material-influence"
          type="range"
          min={0}
          max={100}
          value={params.materialInfluence}
          onChange={(event) => patch('materialInfluence', Number(event.target.value))}
        />
      </div>

      <label className="ai-field">
        <span>Lighting</span>
        <textarea
          rows={2}
          value={params.lightingDescription}
          onChange={(event) => patch('lightingDescription', event.target.value)}
        />
      </label>
      <label className="ai-field">
        <span>Background</span>
        <textarea
          rows={2}
          value={params.backgroundDescription}
          disabled={params.background === 'transparent'}
          onChange={(event) => patch('backgroundDescription', event.target.value)}
        />
      </label>

      <div className="ai-render-options">
        <label className="select-row">
          <span>Quality</span>
          <select
            value={params.quality}
            onChange={(event) => patch('quality', event.target.value as AIRenderParams['quality'])}
          >
            {AI_RENDER_QUALITIES.map((quality) => (
              <option key={quality} value={quality}>
                {quality}
              </option>
            ))}
          </select>
        </label>
        <label className="select-row">
          <span>Size</span>
          <select
            value={params.size}
            onChange={(event) => patch('size', event.target.value as AIRenderParams['size'])}
          >
            {AI_RENDER_SIZES.map((size) => (
              <option key={size} value={size}>
                {size.replace('x', ' × ')}
              </option>
            ))}
          </select>
        </label>
        <label className="select-row">
          <span>Canvas</span>
          <select
            value={params.background}
            onChange={(event) =>
              patch('background', event.target.value as AIRenderParams['background'])
            }
          >
            {AI_RENDER_BACKGROUNDS.map((background) => (
              <option key={background} value={background}>
                {background}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ai-reference">
        <p className="hint tight">
          {referenceName ? `Material reference: ${referenceName}` : 'No material image attached.'}
        </p>
        <div className="button-grid">
          <button className="chip" onClick={onAttachReference}>
            {referenceName ? 'Replace reference' : 'Attach material image'}
          </button>
          <button className="chip" disabled={!referenceName} onClick={onClearReference}>
            Clear
          </button>
        </div>
      </div>

      <button
        className="ai-render-action"
        disabled={!canRender || status === 'rendering'}
        onClick={() => void render()}
      >
        {status === 'rendering' ? 'Rendering…' : 'Render with AI'}
      </button>
      {!canRender && <p className="ai-message">Open the 3D view and wait for the shape.</p>}
      {error && (
        <p className="ai-message error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <figure className="ai-render-result">
          <img src={result.image} alt="AI-rendered metaball material study" />
          <figcaption>
            <span>{result.model}</span>
            <button className="chip" onClick={() => downloadAIRender(result)}>
              Download PNG
            </button>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
