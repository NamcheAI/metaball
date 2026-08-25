import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AIRenderRequest } from './lib/ai-render-contract.js'
import { AIRenderError, runOpenAIImageRender } from './lib/openai-image-render.js'

const DEV_RENDER_BODY_LIMIT = 12 * 1024 * 1024

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.byteLength
    if (size > DEV_RENDER_BODY_LIMIT) throw new AIRenderError(413, 'Render request is too large.')
    chunks.push(bytes)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new AIRenderError(400, 'Render request must be valid JSON.')
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

function localAIRenderApi(options: { apiKey?: string; model?: string }): Plugin {
  return {
    name: 'namche-local-ai-render-api',
    configureServer(server) {
      server.middlewares.use('/api/render', async (request: IncomingMessage, response: ServerResponse) => {
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }
        try {
          const body = (await readJsonBody(request)) as AIRenderRequest
          sendJson(response, 200, await runOpenAIImageRender(body, options))
        } catch (error) {
          if (error instanceof AIRenderError) {
            sendJson(response, error.status, { error: error.message })
            return
          }
          console.error('Local AI material render failed', error)
          sendJson(response, 500, { error: 'AI material render failed.' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      localAIRenderApi({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_IMAGE_MODEL }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
