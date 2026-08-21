import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AI_RENDER_PARAMS,
  buildAIRenderPrompt,
  normalizeAIRenderParams,
} from '../lib/ai-render-contract';
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
