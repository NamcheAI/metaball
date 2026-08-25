import type { IncomingMessage, ServerResponse } from 'node:http';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import authHandler from '../api/auth.js';
import logoutHandler from '../api/logout.js';
import renderHandler from '../api/render.js';
import { applyAuthGate } from './auth-gate.js';
import { serveStatic } from './static.js';
import { readRequestBody, toVercelRequest, toVercelResponse } from './vercel-adapter.js';

// Compiled to dist-server/server/app.js; editor/dist/ (the Vite build) is a
// sibling of dist-server/ one level up from there.
const DEFAULT_DIST_DIR = fileURLToPath(new URL('../../dist', import.meta.url));

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export type AppOptions = { distDir?: string };

export type RequestListener = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * Builds the self-hosted server's request pipeline: the health check first
 * (always exempt), then the `middleware.ts`-equivalent auth gate, then the
 * three API routes (thin adapters over the unmodified `api/*.ts` Vercel
 * handlers), then the static file server as the catch-all.
 */
export function createRequestListener(options: AppOptions = {}): RequestListener {
  const distDir = options.distDir ?? DEFAULT_DIST_DIR;

  return async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Canonicalize ONCE, before any routing decision: the auth gate, the
      // API routes and the static server must all judge the same string.
      // Deciding exemptions on the encoded path and decoding later would let
      // `/assets/%2E%2E/index.html` pass the gate as an asset and then
      // normalize into the protected app shell.
      const rawPathname = new URL(req.url ?? '/', 'http://internal.invalid').pathname;
      let decodedPathname: string;
      try {
        decodedPathname = decodeURIComponent(rawPathname);
      } catch {
        res.statusCode = 400;
        res.end();
        return;
      }
      // Reject dot-dot segments before normalize would resolve them away.
      if (decodedPathname.split('/').some((segment) => segment === '..' || segment === '.')) {
        res.statusCode = 400;
        res.end();
        return;
      }
      const pathname = posix.normalize(decodedPathname);

      if (pathname === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
        sendJson(res, 200, { ok: true });
        return;
      }

      const gateResult = await applyAuthGate(req, res, pathname);
      if (gateResult === 'handled') return;

      // Method validation (POST-only for auth/render) lives in the handlers
      // themselves, exactly as it does on Vercel -- routing here only
      // matches the path so that behavior isn't duplicated.
      if (pathname === '/api/auth') {
        const body = await readRequestBody(req);
        await authHandler(toVercelRequest(req, body), toVercelResponse(res));
        return;
      }

      if (pathname === '/api/logout') {
        await logoutHandler(toVercelRequest(req, undefined), toVercelResponse(res));
        return;
      }

      if (pathname === '/api/render') {
        const body = await readRequestBody(req);
        await renderHandler(toVercelRequest(req, body), toVercelResponse(res));
        return;
      }

      await serveStatic(req, res, pathname, distDir);
    } catch (error) {
      console.error('Unhandled server error', error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
      else res.end();
    }
  };
}
