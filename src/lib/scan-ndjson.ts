import type { ScanReport } from './scan-types.ts'
import type { ScanStageId } from './scan-stages.ts'

export type NdjsonScanMessage =
  | { type: 'stage'; stage: ScanStageId }
  | { type: 'done'; report: ScanReport }
  | { type: 'error'; error: string; code?: string }

/**
 * Reads a scan NDJSON response until `done` or `error`.
 */
export async function parseScanNdjsonStream(
  res: Response,
  onStage: (stage: ScanStageId) => void,
): Promise<ScanReport> {
  if (!res.body) {
    throw new Error('Empty response body.')
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      const msg = JSON.parse(line) as NdjsonScanMessage
      if (msg.type === 'stage') onStage(msg.stage)
      if (msg.type === 'error') {
        const e = new Error(msg.error || 'Scan failed.')
        ;(e as Error & { code?: string }).code = msg.code
        throw e
      }
      if (msg.type === 'done' && msg.report) return msg.report
    }
    if (done) break
  }
  if (buffer.trim()) {
    const msg = JSON.parse(buffer) as NdjsonScanMessage
    if (msg.type === 'done' && msg.report) return msg.report
    if (msg.type === 'error') {
      const e = new Error(msg.error || 'Scan failed.')
      ;(e as Error & { code?: string }).code = msg.code
      throw e
    }
  }
  throw new Error('Scan stream ended without a result.')
}
