/** Simple sliding-window rate limiter per key (e.g. client IP) */

type Bucket = number[]

const buckets = new Map<string, Bucket>()

export function rateLimitAllow(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const prev = buckets.get(key) ?? []
  const fresh = prev.filter((t) => now - t < windowMs)
  if (fresh.length >= maxRequests) {
    buckets.set(key, fresh)
    return false
  }
  fresh.push(now)
  buckets.set(key, fresh)
  return true
}
