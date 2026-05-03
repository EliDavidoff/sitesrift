import { assertSafePublicHostname } from './ssrf.ts'

const USER_AGENT = 'Sitesrift/0.1 (+https://sitesrift.app)'
const FETCH_TIMEOUT_MS = 8000
const MAX_ROBOTS_BYTES = 512 * 1024

/** Curated crawlers often discussed for AI / assistant surfaces — list is versioned in code, not exhaustive */
export const AI_CRAWLER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'Google-Extended',
  'anthropic-ai',
  'Claude-Web',
  'Bytespider',
  'PerplexityBot',
  'Applebot-Extended',
] as const

export type RobotsFetchResult =
  | { ok: true; statusCode: number; text: string }
  | { ok: false; statusCode?: number; text: string; reason: string }

export async function fetchRobotsTxt(origin: string, signal: AbortSignal): Promise<RobotsFetchResult> {
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return { ok: false, text: '', reason: 'bad_origin' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, text: '', reason: 'bad_origin' }
  }

  await assertSafePublicHostname(parsed.hostname)

  const robotsUrl = new URL('/robots.txt', `${parsed.origin}/`).href

  const ctrl = new AbortController()
  const onParent = () => ctrl.abort()
  signal.addEventListener('abort', onParent)
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(robotsUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/plain,text/*;q=0.9,*/*;q=0.1',
      },
      signal: ctrl.signal,
    })

    if (res.status === 404) {
      return { ok: false, statusCode: 404, text: '', reason: 'not_found' }
    }

    if (res.status >= 300 && res.status < 400) {
      return { ok: false, statusCode: res.status, text: '', reason: 'redirect' }
    }

    if (!res.ok || !res.body) {
      return { ok: false, statusCode: res.status, text: '', reason: 'http_error' }
    }

    const raw = await readLimitedText(res, MAX_ROBOTS_BYTES)
    return { ok: true, statusCode: res.status, text: raw }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'robots_too_large') {
      return { ok: false, text: '', reason: 'too_large' }
    }
    if (msg.includes('abort') || ctrl.signal.aborted) {
      return { ok: false, text: '', reason: 'timeout' }
    }
    return { ok: false, text: '', reason: 'fetch_failed' }
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', onParent)
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
        throw new Error('robots_too_large')
      }
      chunks.push(value)
    }
  }
  const { Buffer } = await import('node:buffer')
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)))
  return buf.toString('utf8')
}

type Rule = { type: 'allow' | 'disallow'; path: string }

type ParsedGroup = { agents: string[]; rules: Rule[] }

/** Minimal robots.txt grouping: blank line starts a new record */
export function parseRobotsTxt(raw: string): ParsedGroup[] {
  const groups: ParsedGroup[] = []
  let current: ParsedGroup = { agents: [], rules: [] }

  const flush = () => {
    if (current.agents.length > 0 || current.rules.length > 0) {
      groups.push({
        agents: [...current.agents],
        rules: [...current.rules],
      })
    }
    current = { agents: [], rules: [] }
  }

  for (const line of raw.split(/\r?\n/)) {
    const hash = line.indexOf('#')
    const clean = (hash >= 0 ? line.slice(0, hash) : line).trim()
    if (!clean) {
      flush()
      continue
    }

    const colon = clean.indexOf(':')
    if (colon < 0) continue
    const key = clean.slice(0, colon).trim().toLowerCase()
    const val = clean.slice(colon + 1).trim()

    if (key === 'user-agent') {
      if (current.rules.length > 0) flush()
      current.agents.push(val)
      continue
    }

    if (key === 'disallow') {
      current.rules.push({ type: 'disallow', path: val })
      continue
    }

    if (key === 'allow') {
      current.rules.push({ type: 'allow', path: val })
      continue
    }
  }
  flush()
  return groups
}

function normalizePath(pathname: string): string {
  const u = pathname.startsWith('/') ? pathname : `/${pathname}`
  return u.split('?')[0] ?? u
}

/** Longest-match wins among allow/disallow; empty Disallow field means “allow all” (per common parsers). */
export function pathAllowedByRules(pathname: string, rules: Rule[]): boolean {
  const path = normalizePath(pathname) || '/'

  let best: { type: 'allow' | 'disallow'; len: number } | null = null

  for (const r of rules) {
    if (r.type === 'disallow' && r.path === '') continue

    let applies = false
    let len = 0
    if (r.type === 'disallow') {
      const p = r.path
      if (p === '/') {
        applies = true
        len = 1
      } else if (p && path.startsWith(p)) {
        applies = true
        len = p.length
      }
    } else {
      const p = r.path
      if (!p || p === '/') {
        applies = true
        len = 1
      } else if (path.startsWith(p)) {
        applies = true
        len = p.length
      }
    }

    if (!applies) continue

    if (!best || len > best.len) {
      best = { type: r.type, len }
    } else if (best && len === best.len && r.type === 'allow' && best.type === 'disallow') {
      best = { type: 'allow', len }
    }
  }

  if (!best) return true
  return best.type === 'allow'
}

function matchesAgent(spec: string, target: string): boolean {
  const a = spec.trim().toLowerCase()
  const b = target.trim().toLowerCase()
  return a === '*' || a === b
}

export type CrawlerPathCheck = {
  agent: string
  blocked: boolean
  matchedWildcard: boolean
}

/** Evaluate whether `pathname` is allowed for each curated crawler + wildcard record */
export function checkAiCrawlers(raw: string, pathname: string): CrawlerPathCheck[] {
  const groups = parseRobotsTxt(raw)
  const path = normalizePath(pathname)
  const results: CrawlerPathCheck[] = []

  const wildcardRules: Rule[] = []
  for (const g of groups) {
    if (g.agents.some((a) => matchesAgent(a, '*'))) {
      wildcardRules.push(...g.rules)
    }
  }

  for (const agent of AI_CRAWLER_AGENTS) {
    const specific: Rule[] = []
    let sawAgentGroup = false
    for (const g of groups) {
      if (g.agents.some((a) => matchesAgent(a, agent))) {
        sawAgentGroup = true
        specific.push(...g.rules)
      }
    }

    const effective = sawAgentGroup ? specific : wildcardRules
    const blocked = effective.length === 0 ? false : !pathAllowedByRules(path, effective)
    results.push({
      agent,
      blocked,
      matchedWildcard: blocked && !sawAgentGroup && wildcardRules.length > 0,
    })
  }

  return results
}
