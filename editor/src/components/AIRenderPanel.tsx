import { useState } from 'react';

import { Hint, SelectField } from './toolbar/fields';
import { SliderField } from './toolbar/slider-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    <div className="flex flex-col gap-3">
      <Hint>
        Image 1 locks the current shape and camera. An optional Image 2 supplies any material —
        nacre, coral, moss, grass, fur or something entirely new.
      </Hint>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-normal text-muted-foreground">Material direction</Label>
        <Textarea
          rows={4}
          className="min-h-20 font-mono text-xs"
          value={params.materialDescription}
          onChange={(event) => patch('materialDescription', event.target.value)}
        />
      </div>

      <SliderField
        label="Shape fidelity"
        value={params.geometryFidelity}
        min={0}
        max={100}
        step={1}
        onChange={(value) => patch('geometryFidelity', value)}
      />
      <SliderField
        label="Material influence"
        value={params.materialInfluence}
        min={0}
        max={100}
        step={1}
        onChange={(value) => patch('materialInfluence', value)}
      />

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-normal text-muted-foreground">Lighting</Label>
        <Textarea
          rows={2}
          className="min-h-14 font-mono text-xs"
          value={params.lightingDescription}
          onChange={(event) => patch('lightingDescription', event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-normal text-muted-foreground">Background</Label>
        <Textarea
          rows={2}
          className="min-h-14 font-mono text-xs"
          disabled={params.background === 'transparent'}
          value={params.backgroundDescription}
          onChange={(event) => patch('backgroundDescription', event.target.value)}
        />
      </div>

      <SelectField
        label="Quality"
        value={params.quality}
        onValueChange={(value) => patch('quality', value as AIRenderParams['quality'])}
        options={AI_RENDER_QUALITIES.map((quality) => ({ value: quality, label: quality }))}
      />
      <SelectField
        label="Size"
        value={params.size}
        onValueChange={(value) => patch('size', value as AIRenderParams['size'])}
        options={AI_RENDER_SIZES.map((size) => ({ value: size, label: size.replace('x', ' × ') }))}
      />
      <SelectField
        label="Canvas"
        value={params.background}
        onValueChange={(value) => patch('background', value as AIRenderParams['background'])}
        options={AI_RENDER_BACKGROUNDS.map((background) => ({
          value: background,
          label: background,
        }))}
      />

      <Hint>
        {referenceName ? `Material reference: ${referenceName}` : 'No material image attached.'}
      </Hint>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onAttachReference}>
          {referenceName ? 'Replace reference' : 'Attach material image'}
        </Button>
        <Button variant="outline" size="sm" disabled={!referenceName} onClick={onClearReference}>
          Clear
        </Button>
      </div>

      <Button
        className="w-full"
        disabled={!canRender || status === 'rendering'}
        onClick={() => void render()}
      >
        {status === 'rendering' ? 'Rendering…' : 'Render with AI'}
      </Button>
      {!canRender && <Hint>Open the 3D view and wait for the shape.</Hint>}
      {error && (
        <p className="text-xs leading-snug text-destructive" role="alert">
          {error}
        </p>
      )}

      {result && (
        <Card size="sm" className="gap-0 py-0">
          <CardContent className="px-0">
            <img
              src={result.image}
              alt="AI-rendered metaball material study"
              className="block aspect-square w-full bg-muted object-contain"
            />
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-2 border-t px-3 py-2">
            <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
              {result.model}
            </span>
            <Button variant="outline" size="xs" onClick={() => downloadAIRender(result)}>
              Download PNG
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
