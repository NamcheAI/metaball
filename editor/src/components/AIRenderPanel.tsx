import { useState } from 'react';

import { Hint, SelectField, SwitchField } from './toolbar/fields';
import { SliderField } from './toolbar/slider-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AI_RENDER_BACKGROUNDS,
  AI_RENDER_QUALITIES,
  AI_RENDER_SIZES,
  DEFAULT_AI_METAMORPH_PARAMS,
  DEFAULT_AI_RENDER_PARAMS,
  type AIMetamorphParams,
  type AIRenderParams,
  type AIRenderResult,
  type AISuggestResult,
} from '../../lib/ai-render-contract';
import { downloadAIRender } from '../lib/aiRender';

type Props = {
  canRender: boolean;
  referenceName: string | null;
  textureSlug: string | null;
  onAttachReference: () => void;
  onClearReference: () => void;
  onRender: (params: AIRenderParams) => Promise<AIRenderResult>;
  onSuggestMetamorph: () => Promise<AISuggestResult>;
};

const METAMORPH_SLIDERS: Array<{ key: keyof AIMetamorphParams; label: string }> = [
  { key: 'deformAmount', label: 'Deform amount' },
  { key: 'nubDensity', label: 'Nub density' },
  { key: 'porosityAmount', label: 'Porosity' },
  { key: 'poreSize', label: 'Pore size' },
  { key: 'heightVariation', label: 'Height variation' },
];

export default function AIRenderPanel({
  canRender,
  referenceName,
  textureSlug,
  onAttachReference,
  onClearReference,
  onRender,
  onSuggestMetamorph,
}: Props) {
  const [params, setParams] = useState<AIRenderParams>(DEFAULT_AI_RENDER_PARAMS);
  const [status, setStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIRenderResult | null>(null);

  const patch = <K extends keyof AIRenderParams>(key: K, value: AIRenderParams[K]) =>
    setParams((current) => ({ ...current, [key]: value }));

  const patchMetamorph = (key: keyof AIMetamorphParams, value: number) =>
    setParams((current) => ({
      ...current,
      metamorph: { ...(current.metamorph ?? DEFAULT_AI_METAMORPH_PARAMS), [key]: value },
    }));

  const suggest = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const suggestion = await onSuggestMetamorph();
      setParams((current) => ({
        ...current,
        metamorph: suggestion.params,
        materialDescription: suggestion.materialDescription,
      }));
    } catch (suggestError) {
      setError(suggestError instanceof Error ? suggestError.message : 'AI suggestion failed.');
    } finally {
      setSuggesting(false);
    }
  };

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


      {textureSlug && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <SwitchField
            label="Metamorph with surface texture"
            checked={params.metamorph != null}
            onCheckedChange={(on) => patch('metamorph', on ? DEFAULT_AI_METAMORPH_PARAMS : null)}
          />
          {params.metamorph && (
            <>
              <Hint>
                Image 2 is the surface texture selected above — nothing to upload. The metamorph
                template lets that material reshape the form: deformation, budding nubs, porosity.
              </Hint>
              <Button
                variant="outline"
                size="sm"
                disabled={suggesting}
                onClick={() => void suggest()}
              >
                {suggesting ? 'Analyzing texture…' : 'Suggest parameters from texture'}
              </Button>
              {METAMORPH_SLIDERS.map(({ key, label }) => (
                <SliderField
                  key={key}
                  label={label}
                  value={params.metamorph?.[key] ?? DEFAULT_AI_METAMORPH_PARAMS[key]}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(value) => patchMetamorph(key, value)}
                />
              ))}
            </>
          )}
        </div>
      )}

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

      {params.metamorph && textureSlug ? (
        <Hint>Material reference: surface texture {textureSlug} (selected above).</Hint>
      ) : (
        <>
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
        </>
      )}

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
