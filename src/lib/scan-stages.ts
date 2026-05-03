/** Pipeline stages emitted during a scan (server + client aligned) */

export type ScanStageId = 'normalize' | 'fetch_html' | 'fetch_robots' | 'analyze'

export const SCAN_STAGE_ORDER: ScanStageId[] = ['normalize', 'fetch_html', 'fetch_robots', 'analyze']

export function scanStageIndex(stage: ScanStageId): number {
  const i = SCAN_STAGE_ORDER.indexOf(stage)
  return i >= 0 ? i : 0
}
