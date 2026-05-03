import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { runScan, type ScanStageId } from './scan-api/index.ts'
import { rateLimitAllow } from './scan-api/rate-limit.ts'
import { hostnameOnly, logScanLine } from './scan-api/scan-log.ts'
import type { ScanErrorBody } from './src/lib/scan-types.ts'

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

function clientIp(req: IncomingMessage): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0]?.trim() ?? 'unknown'
  }
  return req.socket?.remoteAddress ?? 'unknown'
}

function wantsNdjson(req: IncomingMessage): boolean {
  const a = req.headers.accept ?? ''
  return a.includes('application/x-ndjson') || a.includes('application/ndjson')
}

function writeNdjson(res: ServerResponse, obj: unknown) {
  res.write(`${JSON.stringify(obj)}\n`)
}

function classifyScanError(message: string): NonNullable<ScanErrorBody['code']> {
  const lower = message.toLowerCase()
  if (lower.includes('private network') || lower.includes('cannot be scanned')) return 'blocked'
  if (lower.includes('too long') || lower.includes('abort')) return 'timeout'
  if (lower.includes('normal html')) return 'not_html'
  if (lower.includes('only http')) return 'bad_input'
  return 'fetch_failed'
}

/** Tunable abuse guard for dev/preview servers */
const RATE_LIMIT_MAX = 45
const RATE_LIMIT_WINDOW_MS = 60_000

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

  const ip = clientIp(req)
  const rateKey = `scan:${ip}`
  if (!rateLimitAllow(rateKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    const host = hostnameOnly(bodyJson.url)
    logScanLine({ outcome: 'rate_limited', host, code: 'rate_limited' })
    sendJson(res, 429, {
      error: 'Too many scans from this address — try again in about a minute.',
      code: 'rate_limited',
    })
    return
  }

  const urlStr = bodyJson.url
  const host = hostnameOnly(urlStr)
  const stream = wantsNdjson(req)
  const tStart = Date.now()

  const controller = new AbortController()
  const kill = setTimeout(() => controller.abort(), 28_000)

  if (stream) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    try {
      const report = await runScan(urlStr, controller.signal, (stage: ScanStageId) => {
        writeNdjson(res, { type: 'stage', stage })
      })
      writeNdjson(res, { type: 'done', report })
      logScanLine({ outcome: 'ok', host, ms: Date.now() - tStart })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed.'
      const code = classifyScanError(message)
      writeNdjson(res, { type: 'error', error: message, code })
      logScanLine({
        outcome: 'scan_error',
        host,
        ms: Date.now() - tStart,
        code,
        message,
      })
    } finally {
      clearTimeout(kill)
      res.end()
    }
    return
  }

  try {
    const report = await runScan(urlStr, controller.signal)
    sendJson(res, 200, report)
    logScanLine({ outcome: 'ok', host, ms: Date.now() - tStart })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed.'
    const code = classifyScanError(message)
    sendJson(res, 400, { error: message, code })
    logScanLine({
      outcome: 'scan_error',
      host,
      ms: Date.now() - tStart,
      code,
      message,
    })
  } finally {
    clearTimeout(kill)
  }
}
