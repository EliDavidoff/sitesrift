import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { runScan } from './scan-api/index.ts'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 12_000) {
        reject(new Error('Request body too large.'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export function scanApiPlugin(): Plugin {
  return {
    name: 'sitesrift-scan-api',
    configureServer(server) {
      server.middlewares.use(scanMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(scanMiddleware)
    },
  }
}

async function scanMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  if (!req.url?.startsWith('/api/scan')) {
    next()
    return
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    next()
    return
  }

  let bodyJson: { url?: unknown }
  try {
    const raw = await readBody(req)
    bodyJson = JSON.parse(raw || '{}') as { url?: unknown }
  } catch {
    sendJson(res, 400, {
      error: 'Body must be JSON with a url field.',
      code: 'bad_input',
    })
    return
  }

  if (!bodyJson.url || typeof bodyJson.url !== 'string') {
    sendJson(res, 400, {
      error: 'Send JSON like { "url": "example.com" }.',
      code: 'bad_input',
    })
    return
  }

  const controller = new AbortController()
  const kill = setTimeout(() => controller.abort(), 28_000)

  try {
    const report = await runScan(bodyJson.url, controller.signal)
    sendJson(res, 200, report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed.'
    const lower = message.toLowerCase()
    let code: 'blocked' | 'timeout' | 'bad_input' | 'not_html' | 'fetch_failed' = 'fetch_failed'
    if (lower.includes('private network') || lower.includes('cannot be scanned')) code = 'blocked'
    else if (lower.includes('too long') || lower.includes('abort')) code = 'timeout'
    else if (lower.includes('normal html')) code = 'not_html'
    else if (lower.includes('only http')) code = 'bad_input'
    sendJson(res, 400, { error: message, code })
  } finally {
    clearTimeout(kill)
  }
}
