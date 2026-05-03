import type { IncomingMessage } from 'node:http'

/**
 * Rate limiting keys must reflect the real visitor when behind a CDN/LB, but
 * blindly trusting client-supplied `X-Forwarded-For` allows trivial rate-limit bypass.
 *
 * - Default: use the TCP peer address only.
 * - When `SCAN_API_TRUST_PROXY=1|true|yes`: prefer `CF-Connecting-IP`, then
 *   `True-Client-IP` / `X-Real-IP`, then leftmost entry of sanitized `X-Forwarded-For`.
 *   Enable only if your edge strips or overwrites spoofed forwarded headers before Node.
 */

function envTrustProxyHeaders(): boolean {
  const v = process.env.SCAN_API_TRUST_PROXY?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function singleHeader(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()]
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t.length > 0 ? t : undefined
  }
  if (Array.isArray(raw)) {
    const t = raw[0]?.trim()
    return t && t.length > 0 ? t : undefined
  }
  return undefined
}

/** Strip IPv4-mapped IPv6 prefix for stable keys */
function normalizeSocketIp(addr: string | undefined): string {
  if (!addr) return 'unknown'
  return addr.startsWith('::ffff:') ? addr.slice(7) : addr
}

function firstForwardedSegment(value: string): string | undefined {
  const segment = value.split(',')[0]?.trim()
  return segment && segment.length > 0 ? segment : undefined
}

export function scanClientIp(req: IncomingMessage): string {
  const direct = normalizeSocketIp(req.socket?.remoteAddress)

  if (!envTrustProxyHeaders()) return direct

  const cf = singleHeader(req, 'cf-connecting-ip')
  if (cf) return cf

  const trueClient = singleHeader(req, 'true-client-ip')
  const tcFirst = trueClient ? firstForwardedSegment(trueClient) : undefined
  if (tcFirst) return tcFirst

  const xReal = singleHeader(req, 'x-real-ip')
  const xrFirst = xReal ? firstForwardedSegment(xReal) : undefined
  if (xrFirst) return xrFirst

  const xff = singleHeader(req, 'x-forwarded-for')
  const xffFirst = xff ? firstForwardedSegment(xff) : undefined
  return xffFirst ?? direct
}
