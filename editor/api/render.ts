import type { VercelRequest, VercelResponse } from '../lib/vercel-types.js';
import { AIRenderError, runOpenAIImageRender } from '../lib/openai-image-render.js';
import type { AIRenderRequest } from '../lib/ai-render-contract.js';

function json(res: VercelResponse, status: number, body: unknown): VercelResponse {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const result = await runOpenAIImageRender(req.body as AIRenderRequest);
    return json(res, 200, result);
  } catch (error) {
    if (error instanceof AIRenderError) return json(res, error.status, { error: error.message });
    console.error('AI material render failed', error);
    return json(res, 500, { error: 'AI material render failed.' });
  }
}
