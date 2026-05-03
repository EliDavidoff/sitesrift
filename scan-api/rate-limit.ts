/** Sliding-window rate limit per key (e.g. scan:IP). Prunes stale entries to bound memory growth. */

type Bucket = number[]

const buckets = new Map<string, Bucket>()
let operationCount = 0

const PRUNE_EVERY = 80
const MAX_KEYS = 8000
const EVICT_TARGET = 6000

function pruneStale(now: number, windowMs: number) {
  for (const [key, arr] of buckets) {
    const fresh = arr.filter((t) => now - t < windowMs)
    if (fresh.length === 0) buckets.delete(key)
    else buckets.set(key, fresh)
  }
}

function evictToTarget() {
  while (buckets.size > EVICT_TARGET) {
    const first = buckets.keys().next().value as string | undefined
    if (!first) break
    buckets.delete(first)
  }
}

export function rateLimitAllow(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()

  if (++operationCount % PRUNE_EVERY === 0) {
    pruneStale(now, windowMs)
    if (buckets.size > MAX_KEYS) evictToTarget()
  }

  const prev = buckets.get(key) ?? []
  const fresh = prev.filter((t) => now - t < windowMs)
  if (fresh.length >= maxRequests) {
    buckets.set(key, fresh)
    return false
  }
  fresh.push(now)
  buckets.set(key, fresh)

  if (buckets.size > MAX_KEYS) evictToTarget()

  return true
}
