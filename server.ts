import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { runScan, type ScanStageId } from './scan-api/index.ts'
import { scanClientIp } from './scan-api/client-ip.ts'
import { rateLimitAllow } from './scan-api/rate-limit.ts'
import { scanEnvInt } from './scan-api/scan-env.ts'
import { acquireScanSlot, releaseScanSlot } from './scan-api/scan-slot.ts'
import { hostnameOnly, logScanLine } from './scan-api/scan-log.ts'
import type { ScanErrorBody } from './src/lib/scan-types.ts'

const DIST_DIR = path.join(process.cwd(), 'dist')
const INDEX_PATH = path.join(DIST_DIR, 'index.html')

const RATE_LIMIT_MAX = scanEnvInt('SCAN_API_RATE_LIMIT_MAX', 45, 1, 500)
const RATE_LIMIT_WINDOW_MS = scanEnvInt('SCAN_API_RATE_LIMIT_WINDOW_MS', 60_000, 5_000, 3_600_000)
const SCAN_ABORT_MS = scanEnvInt('SCAN_API_ABORT_MS', 28_000, 5_000, 180_000)

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
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

function safeUrlPath(url: string): string {
  try {
    return new URL(url, 'http://local').pathname || '/'
  } catch {
    return '/'
  }
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'application/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.ico':
      return 'image/x-icon'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    case '.json':
      return 'application/json; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
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

async function handleScanApi(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST, OPTIONS')
    res.end()
    return
  }

  let bodyJson: { url?: unknown }
  try {
    const raw = await readBody(req)
    bodyJson = JSON.parse(raw || '{}') as { url?: unknown }
  } catch {
    sendJson(res, 400, { error: 'Body must be JSON with a url field.', code: 'bad_input' })
    return
  }

  if (!bodyJson.url || typeof bodyJson.url !== 'string') {
    sendJson(res, 400, { error: 'Send JSON like { "url": "example.com" }.', code: 'bad_input' })
    return
  }

  const ip = scanClientIp(req)
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

  const acquired = await acquireScanSlot()
  if (!acquired) {
    logScanLine({ outcome: 'overloaded', host, code: 'overloaded' })
    sendJson(res, 503, {
      error: 'Scanner is briefly at capacity — try again in a few seconds.',
      code: 'overloaded',
    })
    return
  }

  const tStart = Date.now()
  const controller = new AbortController()
  const kill = setTimeout(() => controller.abort(), SCAN_ABORT_MS)

  try {
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
    }
  } finally {
    clearTimeout(kill)
    releaseScanSlot()
  }
}

async function serveFile(res: ServerResponse, filePath: string) {
  const data = await readFile(filePath)
  res.statusCode = 200
  res.setHeader('Content-Type', contentTypeFor(filePath))
  if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store')
  else res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.end(data)
}

const server = createServer(async (req, res) => {
  const urlPath = safeUrlPath(req.url || '/')

  try {
    if (urlPath.startsWith('/api/scan')) {
      await handleScanApi(req, res)
      return
    }

    const normalized = path.posix.normalize(urlPath)
    const rel = normalized.replace(/^\/+/, '')
    const hasExt = path.posix.basename(rel).includes('.')

    if (hasExt) {
      const candidate = path.join(DIST_DIR, rel)
      if (!candidate.startsWith(DIST_DIR)) {
        res.statusCode = 400
        res.end('Bad path')
        return
      }
      try {
        const s = await stat(candidate)
        if (s.isFile()) {
          await serveFile(res, candidate)
          return
        }
      } catch {
        /* fall through to index */
      }
    }

    await serveFile(res, INDEX_PATH)
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Internal server error')
    console.error(e)
  }
})

const port = Number.parseInt(process.env.PORT ?? '3000', 10)
server.listen(port, '0.0.0.0', () => {
  console.log(`[sitesrift] server listening on :${port}`)
})

