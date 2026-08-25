import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Matches `editor/vercel.json`'s rewrites so the same URLs work self-hosted. */
const REWRITES: Record<string, string> = {
  '/login': '/login.html',
  '/impressum': '/impressum.html',
  '/datenschutz': '/datenschutz.html',
};

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
};

function contentTypeFor(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/** Hashed Vite bundle output is immutable; everything else must revalidate. */
function cacheControlFor(servedPath: string): string {
  return servedPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store';
}

async function sendFile(
  res: ServerResponse,
  filePath: string,
  servedPath: string,
  method: string | undefined,
  size: number,
): Promise<void> {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentTypeFor(filePath));
  res.setHeader('Content-Length', String(size));
  res.setHeader('Cache-Control', cacheControlFor(servedPath));
  if (method === 'HEAD') {
    res.end();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('close', resolve);
    stream.pipe(res);
  });
}

function notFound(res: ServerResponse): void {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not found');
}

/**
 * Serves `editor/dist/` (the Vite build output): applies the same rewrites
 * as `vercel.json`, falls back to `index.html` for client-side routes, and
 * always writes a response (a real 404 for missing assets or API-like
 * paths, so the SPA fallback never masks a broken asset URL).
 */
export async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  distDir: string,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    notFound(res);
    return;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(REWRITES[pathname] ?? pathname);
  } catch {
    res.statusCode = 400;
    res.end();
    return;
  }
  const normalized = path.posix.normalize(decoded);
  if (normalized.includes('..')) {
    res.statusCode = 400;
    res.end();
    return;
  }

  const relative = normalized === '/' ? 'index.html' : normalized.replace(/^\/+/, '');
  const filePath = path.join(distDir, relative);
  if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
    res.statusCode = 400;
    res.end();
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isFile()) {
      await sendFile(res, filePath, normalized, req.method, info.size);
      return;
    }
  } catch {
    // Not a real file -- fall through to the SPA fallback below.
  }

  // Client-side routes have no file extension (e.g. `/studio`); a request
  // for something that looks like an asset (`/missing.js`) should 404
  // instead of silently returning the app shell.
  if (path.extname(pathname) === '') {
    try {
      const indexPath = path.join(distDir, 'index.html');
      const info = await stat(indexPath);
      await sendFile(res, indexPath, '/index.html', req.method, info.size);
      return;
    } catch {
      // dist/ was not built -- fall through to 404 below.
    }
  }

  notFound(res);
}
