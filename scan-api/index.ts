import { analyzeEnvelope } from './analyze.ts'
import { fetchPageEnvelope } from './fetch-page.ts'
import type { ScanReport } from '../src/lib/scan-types.ts'

export async function runScan(rawUrl: string, signal: AbortSignal): Promise<ScanReport> {
  const trimmed = rawUrl.trim()
  if (!trimmed) throw new Error('Missing URL.')

  let normalized = trimmed
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`
  normalized = normalized.replace(/^http:\/\//i, 'https://')

  new URL(normalized)

  const page = await fetchPageEnvelope(normalized, signal)
  return analyzeEnvelope(normalized, page)
}
