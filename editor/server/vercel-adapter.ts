import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VercelRequest, VercelResponse } from '../lib/vercel-types.js';

const MAX_BODY_BYTES = 12 * 1024 * 1024;

/** Mirrors Vercel's header shape: single string, repeated headers as an array. */
function toHeaderRecord(
  headers: IncomingMessage['headers'],
): Record<string, string | string[] | undefined> {
  const record: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) record[key] = value;
  return record;
}

function parseQuery(url: string): Record<string, string | string[] | undefined> {
  const query: Record<string, string | string[] | undefined> = {};
  const search = new URL(url, 'http://internal.invalid').searchParams;
  for (const key of search.keys()) {
    const values = search.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }
  return query;
}

/**
 * Read the raw request body. Vercel's Node runtime auto-parses JSON bodies
 * into an object and leaves other content types (including the login form's
 * default `application/x-www-form-urlencoded`) as a raw string -- the
 * `api/*.ts` handlers were written against exactly that split, so this
 * adapter reproduces it instead of inventing a new body shape for them.
 */
export async function readRequestBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(bytes);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
}

export function toVercelRequest(req: IncomingMessage, body: unknown): VercelRequest {
  return {
    method: req.method,
    body,
    query: parseQuery(req.url ?? '/'),
    headers: toHeaderRecord(req.headers),
  };
}

/** Thin wrapper so `api/*.ts` handlers can write to a Node `ServerResponse` unmodified. */
export function toVercelResponse(res: ServerResponse): VercelResponse {
  const vercelResponse: VercelResponse = {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      res.statusCode = code;
      return vercelResponse;
    },
    end(body) {
      res.end(body);
      return vercelResponse;
    },
    redirect(code, location) {
      res.statusCode = code;
      res.setHeader('Location', location);
      res.end();
      return vercelResponse;
    },
  };
  return vercelResponse;
}
