import { createServer } from 'node:http';
import { enableMemoryLoginRateLimitFallback } from '../lib/login-rate-limit.js';
import { createRequestListener } from './app.js';

// A single long-lived process, so a per-process sliding window is a real
// limit; without this the login path fails closed when Upstash is absent.
enableMemoryLoginRateLimitFallback();

const port = Number(process.env.PORT) || 8080;
const server = createServer(createRequestListener());

server.listen(port, () => {
  console.log(`metaball-editor server listening on port ${port}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
