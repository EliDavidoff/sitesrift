import { describe, expect, it } from 'vitest'
import type { ScanFinding, ScanReport } from './scan-types.ts'
import { buildScanSnapshotModel } from './scan-summary.ts'

function baseReport(over: Partial<ScanReport> & { findings?: ScanFinding[] }): ScanReport {
  const defaults: ScanReport = {
    canonicalUrl: 'https://example.com/',
    seoScore: 88,
    securityScore: 90,
    aiScore: 92,
    findings: [],
    meta: {
      statusCode: 200,
      serverBanner: 'nginx',
      tlsNote: 'HTTPS ok',
      contentType: 'text/html',
      finalUrl: 'https://example.com/',
      redirectCount: 0,
    },
  }
  return { ...defaults, ...over, findings: over.findings ?? defaults.findings }
}

function mockFinding(p: Partial<ScanFinding> & Pick<ScanFinding, 'id' | 'category' | 'title'>): ScanFinding {
  return {
    detail: 'd',
    severity: 'warn',
    riskBand: 'medium',
    riskWhy: 'because',
    remedy: 'fix',
    lens: 'visibility',
    ...p,
  }
}

describe('buildScanSnapshotModel', () => {
  it('prioritizes medium+ findings over pillar scores', () => {
    const model = buildScanSnapshotModel(
      baseReport({
        findings: [
          mockFinding({
            id: 'z',
            category: 'seo',
            title: 'Short title',
            riskBand: 'medium',
            severity: 'warn',
          }),
        ],
      }),
    )
    expect(model.headline).toContain('Short title')
    expect(model.jump).toEqual({ type: 'finding', id: 'z' })
    expect(model.priority?.label).toBe('Start here')
  })

  it('when only low-risk issues, focuses weakest pillar', () => {
    const model = buildScanSnapshotModel(
      baseReport({
        seoScore: 70,
        securityScore: 95,
        aiScore: 95,
        findings: [
          mockFinding({
            id: 'low1',
            category: 'seo',
            title: 'Minor nit',
            riskBand: 'low',
            severity: 'info',
          }),
        ],
      }),
    )
    expect(model.headline).toContain('SEO')
    expect(model.jump).toEqual({ type: 'pillar', pillar: 'seo' })
  })

  it('upbeat when scores high and no medium+', () => {
    const model = buildScanSnapshotModel(
      baseReport({
        seoScore: 95,
        securityScore: 96,
        aiScore: 94,
        findings: [
          mockFinding({
            id: 'low1',
            category: 'security',
            title: 'Banner',
            riskBand: 'low',
            severity: 'info',
          }),
        ],
      }),
    )
    expect(model.headline).toContain('good shape')
  })
})
