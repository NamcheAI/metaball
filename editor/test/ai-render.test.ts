import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AI_METAMORPH_PARAMS,
  DEFAULT_AI_RENDER_PARAMS,
  buildAIRenderPrompt,
  normalizeAIMetamorphParams,
  normalizeAIRenderParams,
} from '../lib/ai-render-contract';
import { runOpenAIMaterialSuggest } from '../lib/openai-material-suggest';
import { AIRenderError, runOpenAIImageRender } from '../lib/openai-image-render';

const TINY_PNG = 'data:image/png;base64,aGVsbG8=';
const TINY_JPEG = 'data:image/jpeg;base64,d29ybGQ=';

test('AI render parameters normalize untrusted input', () => {
  const params = normalizeAIRenderParams({
    materialDescription: '  soft   moss  ',
    geometryFidelity: 150,
    materialInfluence: -4,
    quality: 'impossible',
    size: '1536x1024',
    background: 'transparent',
  });

  assert.equal(params.materialDescription, 'soft moss');
  assert.equal(params.geometryFidelity, 100);
  assert.equal(params.materialInfluence, 0);
  assert.equal(params.quality, DEFAULT_AI_RENDER_PARAMS.quality);
  assert.equal(params.size, '1536x1024');
  assert.equal(params.background, 'transparent');
});

test('AI render prompt assigns stable roles to shape and material images', () => {
  const prompt = buildAIRenderPrompt(
    { ...DEFAULT_AI_RENDER_PARAMS, materialDescription: 'dense green moss' },
    true,
  );

  assert.match(prompt, /Image 1 is the canonical shape/);
  assert.match(prompt, /Image 2 is the material reference/);
  assert.match(prompt, /dense green moss/);
  assert.match(prompt, /Do not add or remove lobes, holes, limbs or separate objects/);
});

test('AI render adapter fails clearly when no server key is configured', async () => {
  await assert.rejects(
    runOpenAIImageRender(
      { shapeImage: TINY_PNG, params: DEFAULT_AI_RENDER_PARAMS },
      { apiKey: '' },
    ),
    (error: unknown) => error instanceof AIRenderError && error.status === 503,
  );
});

test('AI render adapter rejects a malformed body before calling the provider', async () => {
  await assert.rejects(
    runOpenAIImageRender(undefined as never, { apiKey: 'test-key' }),
    (error: unknown) => error instanceof AIRenderError && error.status === 400,
  );
});

test('AI render adapter sends shape first and optional material second', async () => {
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), 'https://api.openai.com/v1/images/edits');
    assert.equal(init?.method, 'POST');
    assert.deepEqual(init?.headers, { Authorization: 'Bearer test-key' });
    assert.ok(init?.body instanceof FormData);
    const form = init.body;
    assert.equal(form.get('model'), 'gpt-image-2');
    assert.equal(form.get('quality'), 'medium');
    assert.equal(form.get('size'), '1024x1024');
    assert.equal(form.get('background'), 'opaque');
    assert.equal(form.get('output_format'), 'png');
    assert.equal(form.getAll('image[]').length, 2);
    assert.match(String(form.get('prompt')), /Image 2 is the material reference/);
    return new Response(JSON.stringify({ data: [{ b64_json: 'cmVuZGVy' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'request-123' },
    });
  };

  const result = await runOpenAIImageRender(
    {
      shapeImage: TINY_PNG,
      materialImage: TINY_JPEG,
      params: DEFAULT_AI_RENDER_PARAMS,
    },
    { apiKey: 'test-key', fetchImpl },
  );

  assert.equal(result.image, 'data:image/png;base64,cmVuZGVy');
  assert.equal(result.model, 'gpt-image-2');
  assert.equal(result.requestId, 'request-123');
});

test('metamorph params normalize and clamp; junk shapes drop to null', () => {
  const params = normalizeAIMetamorphParams({
    deformAmount: 150,
    nubDensity: -5,
    porosityAmount: 'sixty',
    poreSize: 2,
    heightVariation: 60.4,
  });
  assert.deepEqual(params, {
    deformAmount: 100,
    nubDensity: 0,
    porosityAmount: DEFAULT_AI_METAMORPH_PARAMS.porosityAmount,
    poreSize: 2,
    heightVariation: 60,
  });
  assert.equal(normalizeAIMetamorphParams(null), null);
  assert.equal(normalizeAIMetamorphParams('metamorph'), null);
});

test('metamorph template takes over when set with a material image, not without one', () => {
  const params = normalizeAIRenderParams({
    ...DEFAULT_AI_RENDER_PARAMS,
    metamorph: { deformAmount: 10, nubDensity: 33, porosityAmount: 100, poreSize: 2, heightVariation: 70 },
  });
  const withImage = buildAIRenderPrompt(params, true);
  assert.match(withImage, /surface deformation at 10% intensity/);
  assert.match(withImage, /Grow 33% organic, finger-like nubs/);
  assert.match(withImage, /Thread 100% porosity/);
  assert.match(withImage, /with 2% holes/);
  assert.match(withImage, /relief at 70%/);
  assert.match(withImage, /No text, captions, watermark/);
  // without a material reference the standard prompt still applies
  const withoutImage = buildAIRenderPrompt(params, false);
  assert.match(withoutImage, /Image 1 is the canonical shape/);
  assert.doesNotMatch(withoutImage, /finger-like nubs/);
});

test('suggest adapter parses a Responses payload into clamped params', async () => {
  let requestedUrl = '';
  let requestBody: Record<string, unknown> = {};
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  deformAmount: 120,
                  nubDensity: 55,
                  porosityAmount: 90,
                  poreSize: 8,
                  heightVariation: 65,
                  materialDescription: '  Porous bleached coral with waxy sheen.  ',
                }),
              },
            ],
          },
        ],
      }),
      { status: 200 },
    );
  };

  const result = await runOpenAIMaterialSuggest(
    { materialImage: TINY_JPEG },
    { apiKey: 'test-key', fetchImpl },
  );
  assert.equal(requestedUrl, 'https://api.openai.com/v1/responses');
  assert.equal(result.params.deformAmount, 100);
  assert.equal(result.params.poreSize, 8);
  assert.equal(result.materialDescription, 'Porous bleached coral with waxy sheen.');
  const input = requestBody.input as Array<{ content: Array<{ type: string }> }>;
  assert.equal(input[0]!.content[1]!.type, 'input_image');
});

test('suggest adapter fails closed on unusable provider output and missing key', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ output: [] }), { status: 200 });
  await assert.rejects(
    runOpenAIMaterialSuggest({ materialImage: TINY_JPEG }, { apiKey: 'k', fetchImpl }),
    (error: unknown) => error instanceof AIRenderError && error.status === 502,
  );
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(
      runOpenAIMaterialSuggest({ materialImage: TINY_JPEG }, {}),
      (error: unknown) => error instanceof AIRenderError && error.status === 503,
    );
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  }
});
