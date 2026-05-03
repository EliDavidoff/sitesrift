import { analyzeEnvelope } from './analyze.ts'
import { fetchPageEnvelope } from './fetch-page.ts'
import { fetchRobotsTxt } from './robots.ts'
import type { ScanReport } from '../src/lib/scan-types.ts'
import type { ScanStageId } from '../src/lib/scan-stages.ts'

export type { ScanStageId }

export async function runScan(
  rawUrl: string,
  signal: AbortSignal,
  onStage?: (stage: ScanStageId) => void,
): Promise<ScanReport> {
  const t0 = Date.now()
  const trimmed = rawUrl.trim()
  if (!trimmed) throw new Error('Missing URL.')

  let normalized = trimmed
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`
  normalized = normalized.replace(/^http:\/\//i, 'https://')

  new URL(normalized)

  onStage?.('normalize')

  onStage?.('fetch_html')
  const page = await fetchPageEnvelope(normalized, signal)
  const origin = new URL(page.finalUrl).origin

  onStage?.('fetch_robots')
  const robotsResult = await fetchRobotsTxt(origin, signal)

  onStage?.('analyze')
  const report = analyzeEnvelope(normalized, page, robotsResult)

  return {
    ...report,
    meta: {
      ...report.meta,
      scanDurationMs: Date.now() - t0,
    },
  }
}
