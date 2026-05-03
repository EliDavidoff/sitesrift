/**
 * Minimal structured logs for the dev server scan endpoint.
 * Logs hostname only — avoids storing full URLs with query strings in console output.
 */

export function hostnameOnly(rawUrl: string): string {
  try {
    const u = rawUrl.trim()
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`
    return new URL(withProto.replace(/^http:\/\//i, 'https://')).hostname
  } catch {
    return '(invalid)'
  }
}

export type ScanLogOutcome = 'ok' | 'client_error' | 'rate_limited' | 'scan_error'

export function logScanLine(payload: {
  outcome: ScanLogOutcome
  host: string
  ms?: number
  code?: string
  message?: string
}) {
  const parts = [
    '[sitesrift-scan]',
    payload.outcome,
    payload.host,
    payload.ms != null ? `${payload.ms}ms` : '',
    payload.code ?? '',
    payload.message ?? '',
  ].filter(Boolean)
  /* Dev-server telemetry only — not a structured logging pipeline */
  console.log(parts.join(' · '))
}
