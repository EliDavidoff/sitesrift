import { scanEnvInt } from './scan-env.ts'

/**
 * Limits concurrent runScan work per Node process so many parallel POSTs cannot peg CPU,
 * memory (HTML parse), or outbound sockets simultaneously.
 */

const MAX_CONCURRENT_SCANS = scanEnvInt('SCAN_API_MAX_CONCURRENT', 6, 1, 64)
/** Reject when this many requests are already waiting for a slot — avoids unbounded waiters. */
const MAX_WAITING_FOR_SLOT = scanEnvInt('SCAN_API_MAX_WAIT_QUEUE', 96, 0, 512)

let active = 0
const waitQueue: Array<() => void> = []

/**
 * Acquire a slot before starting a scan. Returns false if the wait queue is saturated (503).
 */
export async function acquireScanSlot(): Promise<boolean> {
  if (active < MAX_CONCURRENT_SCANS) {
    active++
    return true
  }
  if (waitQueue.length >= MAX_WAITING_FOR_SLOT) return false
  await new Promise<void>((resolve) => {
    waitQueue.push(() => {
      active++
      resolve()
    })
  })
  return true
}

export function releaseScanSlot(): void {
  active--
  const next = waitQueue.shift()
  if (next) next()
}
