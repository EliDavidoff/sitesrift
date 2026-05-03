import { assertSafePublicHostname } from './ssrf.ts'

const USER_AGENT = 'Sitesrift/0.1 (+https://sitesrift.app)'

const MAX_REDIRECTS = 8
const MAX_BYTES = 1_800_000
const FETCH_TIMEOUT_MS = 12_000

export type FetchPageResult = {
  finalUrl: string
  statusCode: number
  contentType: string
  bodyText: string
  redirectCount: number
  responseHeaders: Headers
  chain: { url: string; status: number }[]
}

export async function fetchPageEnvelope(startUrl: string, signal: AbortSignal): Promise<FetchPageResult> {
  const parsed = new URL(startUrl)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs can be scanned.')
  }

  await assertSafePublicHostname(parsed.hostname)

  let current = parsed.href
  let redirectCount = 0
  const chain: { url: string; status: number }[] = []

  for (;;) {
    const u = new URL(current)
    await assertSafePublicHostname(u.hostname)

    const ctrl = new AbortController()
    const onParent = () => ctrl.abort()
    signal.addEventListener('abort', onParent)
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
        },
        signal: ctrl.signal,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('abort') || ctrl.signal.aborted) {
        throw new Error('That site took too long to respond — try again or pick another URL.', {
          cause: e,
        })
      }
      throw new Error('Could not reach that URL over the network.', { cause: e })
    } finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', onParent)
    }

    chain.push({ url: current, status: res.status })

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc || redirectCount >= MAX_REDIRECTS) {
        throw new Error('Too many redirects — stopping for safety.')
      }
      redirectCount += 1
      current = new URL(loc, current).href
      continue
    }

    const contentType = res.headers.get('content-type') ?? ''
    const raw = await readLimitedText(res, MAX_BYTES)

    return {
      finalUrl: current,
      statusCode: res.status,
      contentType,
      bodyText: raw,
      redirectCount,
      responseHeaders: res.headers,
      chain,
    }
  }
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      total += value.byteLength
      if (total > maxBytes) {
        reader.cancel().catch(() => {})
        throw new Error('That page is larger than we can safely read in one pass.')
      }
      chunks.push(value)
    }
  }
  const { Buffer } = await import('node:buffer')
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)))
  return buf.toString('utf8')
}
