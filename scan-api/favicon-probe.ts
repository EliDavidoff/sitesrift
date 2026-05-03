import type { CheerioAPI } from 'cheerio'
import { assertSafePublicHostname } from './ssrf.ts'

const USER_AGENT = 'Sitesrift/0.1 (+https://sitesrift.app)'
const FETCH_TIMEOUT_MS = 8000
const MAX_BYTES = 32 * 1024
const MAX_REDIRECTS = 8
/** Max declared-icon GET attempts before trying /favicon.ico */
const MAX_LINK_PROBES = 5

export type FaviconProbeSummary = {
  workingUrl?: string
  /** How workingUrl was chosen */
  source?: 'declared-tab' | 'declared-touch' | 'favicon.ico'
  hasDataUrlTabIcon: boolean
  declaredTabCandidates: string[]
  failedDeclaredTabUrls: string[]
  triedDefaultIco: boolean
}

function relTokens(rel: string): string[] {
  return rel
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Tab / branded icons (excluding apple-touch, which browsers use differently). */
function classifyTabIconRel(tokens: string[]): boolean {
  if (tokens.includes('apple-touch-icon') || tokens.includes('apple-touch-icon-precomposed'))
    return false
  return (
    tokens.includes('mask-icon') ||
    tokens.includes('fluid-icon') ||
    (tokens.includes('icon') && !tokens.includes('apple-touch-icon'))
  )
}

function classifyTouchRel(tokens: string[]): boolean {
  return (
    tokens.includes('apple-touch-icon') || tokens.includes('apple-touch-icon-precomposed')
  )
}

/** Collect `<link>` icon candidates in DOM order — tab icons first segment, touch second. */
export function collectDeclaredCandidates(
  $: CheerioAPI,
  documentUrl: string,
): { tab: string[]; touch: string[]; hasDataUrlTabIcon: boolean } {
  const tab: string[] = []
  const touch: string[] = []
  const seenTab = new Set<string>()
  const seenTouch = new Set<string>()
  let hasDataUrlTabIcon = false

  $('link[href]').each((_, el) => {
    const rel = ($(el).attr('rel') ?? '').trim()
    const hrefRaw = ($(el).attr('href') ?? '').trim()
    if (!hrefRaw || !rel) return

    const tokens = relTokens(rel)
    if (tokens.includes('manifest')) return

    if (hrefRaw.toLowerCase().startsWith('data:')) {
      if (classifyTabIconRel(tokens)) hasDataUrlTabIcon = true
      return
    }

    try {
      const resolved = new URL(hrefRaw, documentUrl).href
      if (classifyTabIconRel(tokens)) {
        if (!seenTab.has(resolved)) {
          seenTab.add(resolved)
          tab.push(resolved)
        }
      } else if (classifyTouchRel(tokens)) {
        if (!seenTouch.has(resolved)) {
          seenTouch.add(resolved)
          touch.push(resolved)
        }
      }
    } catch {
      /* ignore bad href */
    }
  })

  return { tab, touch, hasDataUrlTabIcon }
}

function looksLikeImage(contentType: string, bytes: Uint8Array): boolean {
  const ct = contentType.toLowerCase()
  if (/^\s*image\//.test(ct)) return true

  if (bytes.length < 12) return false

  const b = bytes

  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true

  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true

  // GIF
  if (
    (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && b[4] === 0x39) ||
    (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && b[4] === 0x37)
  )
    return true

  // ICO
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return true

  // WEBP — RIFF....WEBP
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b.length >= 12 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return true

  try {
    const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 512)))
    const trimmed = head.trimStart()
    if (/^<\?xml/i.test(trimmed) && /<svg[\s>/]/i.test(head)) return true
    if (/^<svg[\s>/]/i.test(trimmed)) return true
  } catch {
    /* ignore */
  }

  return false
}

async function readLimitedBytes(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array()
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
        throw new Error('favicon_body_too_large')
      }
      chunks.push(value)
    }
  }
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.byteLength
  }
  return out
}

/**
 * GET a URL (follow redirects manually, max MAX_REDIRECTS) with SSRF checks.
 * Returns body bytes (capped) + final status + content-type when response is ok.
 */
async function fetchIconCandidate(
  startUrl: string,
  signal: AbortSignal,
): Promise<
  | { ok: true; finalUrl: string; status: number; contentType: string; bytes: Uint8Array }
  | { ok: false; reason: string }
> {
  let current = startUrl
  let redirectCount = 0

  for (;;) {
    let parsed: URL
    try {
      parsed = new URL(current)
    } catch {
      return { ok: false, reason: 'bad_url' }
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: 'bad_protocol' }
    }

    try {
      await assertSafePublicHostname(parsed.hostname)
    } catch {
      return { ok: false, reason: 'blocked_host' }
    }

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
          accept: 'image/*,*/*;q=0.1',
        },
        signal: ctrl.signal,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('abort') || ctrl.signal.aborted) {
        return { ok: false, reason: 'timeout' }
      }
      return { ok: false, reason: 'fetch_failed' }
    } finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', onParent)
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc || redirectCount >= MAX_REDIRECTS) return { ok: false, reason: 'redirect_abort' }
      redirectCount++
      try {
        current = new URL(loc, current).href
      } catch {
        return { ok: false, reason: 'bad_redirect' }
      }
      continue
    }

    if (!res.ok || !res.body) return { ok: false, reason: `http_${res.status}` }

    let bytes: Uint8Array
    try {
      bytes = await readLimitedBytes(res, MAX_BYTES)
    } catch {
      return { ok: false, reason: 'too_large' }
    }

    const contentType = res.headers.get('content-type') ?? ''
    return {
      ok: true,
      finalUrl: current,
      status: res.status,
      contentType,
      bytes,
    }
  }
}

async function probeUrlList(
  urls: string[],
  signal: AbortSignal,
): Promise<
  | { hit: string; verifiedUrl: string; reason?: never }
  | { hit?: undefined; verifiedUrl?: undefined; reason: string; lastTried?: string }
> {
  for (const u of urls) {
    const raw = await fetchIconCandidate(u, signal)
    if (!raw.ok) continue
    if (looksLikeImage(raw.contentType, raw.bytes))
      return { hit: u, verifiedUrl: raw.finalUrl ?? u }
  }
  const last = urls[urls.length - 1]
  return { reason: 'no_candidate_ok', lastTried: last }
}

/**
 * Probe tab icon, declared touch fallback, then /favicon.ico on the HTML document origin.
 */
export async function probeFaviconForPage(
  $: CheerioAPI,
  documentUrl: string,
  signal: AbortSignal,
): Promise<FaviconProbeSummary> {
  const { tab, touch, hasDataUrlTabIcon } = collectDeclaredCandidates($, documentUrl)

  let workingUrl: string | undefined
  let source: FaviconProbeSummary['source']
  const failedDeclaredTabUrls: string[] = []

  const tabSlice = tab.slice(0, MAX_LINK_PROBES)
  const touchSlice = touch.slice(
    0,
    Math.max(0, MAX_LINK_PROBES - tabSlice.length),
  )

  let tryIndex = 0
  const tryTab = tabSlice.slice()
  while (tryIndex < tryTab.length && !workingUrl) {
    const u = tryTab[tryIndex++]!
    const raw = await fetchIconCandidate(u, signal)
    if (raw.ok && looksLikeImage(raw.contentType, raw.bytes)) {
      workingUrl = raw.finalUrl ?? u
      source = 'declared-tab'
      break
    }
    failedDeclaredTabUrls.push(u)
  }

  if (!workingUrl && touchSlice.length > 0) {
    const t = await probeUrlList(touchSlice, signal)
    if (t.hit) {
      workingUrl = t.verifiedUrl
      source = 'declared-touch'
    }
  }

  let triedDefaultIco = false
  const fallbackIco = new URL('/favicon.ico', new URL(documentUrl).origin).href

  if (!workingUrl) {
    triedDefaultIco = true
    const raw = await fetchIconCandidate(fallbackIco, signal)
    if (raw.ok && looksLikeImage(raw.contentType, raw.bytes)) {
      workingUrl = raw.finalUrl ?? fallbackIco
      source = 'favicon.ico'
    }
  }

  return {
    workingUrl,
    source,
    hasDataUrlTabIcon,
    declaredTabCandidates: tab,
    failedDeclaredTabUrls,
    triedDefaultIco,
  }
}
