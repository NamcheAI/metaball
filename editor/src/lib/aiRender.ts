import type {
  AIRenderParams,
  AIRenderRequest,
  AIRenderResult,
} from '../../lib/ai-render-contract';
import type { RefImageBytes } from './exportBlenderHandoff';

const MAX_REFERENCE_SIDE = 1_536;

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

async function parseResponse(response: Response): Promise<AIRenderResult> {
  const payload = (await response.json().catch(() => null)) as
    | (Partial<AIRenderResult> & { error?: unknown })
    | null;
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'AI material render failed.';
    throw new Error(message);
  }
  if (
    typeof payload?.image !== 'string' ||
    typeof payload.model !== 'string' ||
    typeof payload.prompt !== 'string'
  ) {
    throw new Error('AI material render returned an invalid response.');
  }
  return payload as AIRenderResult;
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
    shapeImage = options.canvas.toDataURL('image/png');
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
  const response = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

export function downloadAIRender(result: AIRenderResult): void {
  const anchor = document.createElement('a');
  anchor.href = result.image;
  anchor.download = 'namche-metaball-ai-render.png';
  anchor.click();
}
