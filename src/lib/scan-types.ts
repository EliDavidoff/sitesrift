/** Shared contract between scan API and UI */

export type RiskBand = 'low' | 'medium' | 'high'

export type RiskLens = 'visibility' | 'defense'

export type Severity = 'good' | 'info' | 'warn' | 'bad'

export type ScanFinding = {
  id: string
  category: 'seo' | 'security'
  /** Short headline shown in the row */
  title: string
  /** Plain explanation (expandable body main text) */
  detail: string
  severity: Severity
  riskBand: RiskBand
  /** One-line “what could go wrong” */
  riskWhy: string
  /** Friendly next step */
  remedy: string
  /** Optional deeper technical note */
  detailTechnical?: string
  lens: RiskLens
}

export type ScanMeta = {
  statusCode: number
  serverBanner: string
  tlsNote: string
  contentType: string
  finalUrl: string
  redirectCount: number
}

export type ScanReport = {
  canonicalUrl: string
  seoScore: number
  securityScore: number
  findings: ScanFinding[]
  meta: ScanMeta
}

export type ScanErrorBody = {
  error: string
  code?: 'blocked' | 'timeout' | 'bad_input' | 'not_html' | 'fetch_failed'
}
