import type {
  AIEnhanceRequest,
  AIEnhanceResult,
  AIRenderParams,
  AIRenderRequest,
  AIRenderResult,
  AISuggestResult,
} from '../../lib/ai-render-contract';
import type { RefImageBytes } from './exportBlenderHandoff';

const MAX_REFERENCE_SIDE = 1_536;
const MAX_SHAPE_SIDE = 1_280;
// Stay comfortably under the server's 4 MB per-image cap and the edge's
// body limit; beyond this a JPEG re-encode loses nothing that matters for
// an opaque studio capture.
const MAX_SHAPE_PNG_BYTES = 2_500_000;
const RENDER_POLL_INTERVAL_MS = 2_500;
// 4K quality-high renders run ~2 minutes; leave generous headroom.
const RENDER_POLL_TIMEOUT_MS = 8 * 60_000;

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not encode image.'));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image.'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode the material reference.'));
    };
    image.src = url;
  });
}

async function optimizedReferenceDataUrl(reference: RefImageBytes): Promise<string> {
  const bytes = new Uint8Array(reference.bytes.byteLength);
  bytes.set(reference.bytes);
  const sourceBlob = new Blob([bytes.buffer]);
  const image = await loadImage(sourceBlob);
  const scale = Math.min(1, MAX_REFERENCE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return readBlobAsDataUrl(sourceBlob);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function captureShapeDataUrl(source: HTMLCanvasElement): string {
  const scale = Math.min(1, MAX_SHAPE_SIDE / Math.max(source.width, source.height));
  let canvas = source;
  if (scale < 1) {
    const scaled = document.createElement('canvas');
    scaled.width = Math.max(1, Math.round(source.width * scale));
    scaled.height = Math.max(1, Math.round(source.height * scale));
    const context = scaled.getContext('2d');
    if (context) {
      context.drawImage(source, 0, 0, scaled.width, scaled.height);
      canvas = scaled;
    }
  }
  const png = canvas.toDataURL('image/png');
  // Data-URL length ~= bytes * 4/3; re-encode as JPEG when the PNG would
  // push the request body toward the server's per-image limit.
  if (png.length > (MAX_SHAPE_PNG_BYTES * 4) / 3) {
    return canvas.toDataURL('image/jpeg', 0.92);
  }
  return png;
}

export async function renderAIMaterial(options: {
  canvas: HTMLCanvasElement;
  params: AIRenderParams;
  materialReference?: RefImageBytes | null;
  invalidate?: () => void;
}): Promise<AIRenderResult> {
  if (options.invalidate) {
    for (let i = 0; i < 4; i++) options.invalidate();
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  let shapeImage: string;
  try {
    shapeImage = captureShapeDataUrl(options.canvas);
  } catch {
    throw new Error('The 3D preview could not be captured. Reload the view and try again.');
  }
  if (shapeImage === 'data:,') throw new Error('The 3D shape preview could not be captured.');

  const body: AIRenderRequest = {
    shapeImage,
    materialImage: options.materialReference
      ? await optimizedReferenceDataUrl(options.materialReference)
      : null,
    params: options.params,
  };
  // Submit-and-poll: a high-resolution render takes minutes, and every proxy
  // in front of the app enforces a response deadline (Cloudflare's proxy
  // read timeout is 125s). Each of these requests completes in well under a
  // second, so no layer's timeout is ever in play.
  const submit = await fetch('/api/render/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const submitted = (await submit.json().catch(() => null)) as
    | { jobId?: unknown; error?: unknown }
    | null;
  if (!submit.ok || typeof submitted?.jobId !== 'string') {
    const message =
      typeof submitted?.error === 'string' ? submitted.error : 'AI material render failed.';
    throw new Error(message);
  }
  const deadline = Date.now() + RENDER_POLL_TIMEOUT_MS;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, RENDER_POLL_INTERVAL_MS));
    const response = await fetch(`/api/render/jobs/${submitted.jobId}`);
    const payload = (await response.json().catch(() => null)) as
      | (Partial<AIRenderResult> & { status?: unknown; error?: unknown })
      | null;
    if (!response.ok) {
      const message =
        typeof payload?.error === 'string' ? payload.error : 'AI material render failed.';
      throw new Error(message);
    }
    if (payload?.status === 'running') {
      if (Date.now() > deadline) {
        throw new Error('The render is taking unusually long. Try again or lower the size.');
      }
      continue;
    }
    if (
      payload?.status === 'done' &&
      typeof payload.image === 'string' &&
      typeof payload.model === 'string' &&
      typeof payload.prompt === 'string'
    ) {
      return payload as AIRenderResult;
    }
    throw new Error('AI material render returned an invalid response.');
  }
}

/** Fetch a CDN texture into the same byte shape the panel uses for uploads. */
export async function fetchTextureReference(url: string, name: string): Promise<RefImageBytes> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('The surface texture could not be loaded.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, fileName: name };
}

/** First call of the metamorph flow: the model proposes the five template
 *  parameters (and a material direction) from the texture photo. */
export async function suggestMetamorphParams(reference: RefImageBytes): Promise<AISuggestResult> {
  const materialImage = await optimizedReferenceDataUrl(reference);
  const response = await fetch('/api/render/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ materialImage }),
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<AISuggestResult> & { error?: unknown })
    | null;
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string' ? payload.error : 'AI suggestion failed.';
    throw new Error(message);
  }
  if (
    !payload?.params ||
    typeof payload.materialDescription !== 'string' ||
    typeof payload.structureDescription !== 'string'
  ) {
    throw new Error('AI suggestion returned an invalid response.');
  }
  return payload as AISuggestResult;
}

/** The enhance stage: submit the composed render, poll the async job. */
export async function enhanceAIRender(request: AIEnhanceRequest): Promise<AIEnhanceResult> {
  const submit = await fetch('/api/enhance/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const submitted = (await submit.json().catch(() => null)) as
    | { jobId?: string; error?: unknown }
    | null;
  if (!submit.ok || typeof submitted?.jobId !== 'string') {
    const message =
      typeof submitted?.error === 'string' ? submitted.error : 'Detail enhancement failed.';
    throw new Error(message);
  }
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    const response = await fetch(`/api/enhance/jobs/${submitted.jobId}`);
    const payload = (await response.json().catch(() => null)) as
      | (Partial<AIEnhanceResult> & { status?: string; error?: unknown })
      | null;
    if (payload?.status === 'running') continue;
    if (!response.ok || typeof payload?.image !== 'string') {
      const message =
        typeof payload?.error === 'string' ? payload.error : 'Detail enhancement failed.';
      throw new Error(message);
    }
    return payload as AIEnhanceResult;
  }
}

export function downloadAIRender(result: AIRenderResult): void {
  const anchor = document.createElement('a');
  anchor.href = result.image;
  anchor.download = 'namche-metaball-ai-render.png';
  anchor.click();
}
