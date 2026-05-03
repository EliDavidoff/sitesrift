import type { RiskBand, ScanReport } from './scan-types.ts'

export type PillarKey = 'seo' | 'security' | 'ai'

export type ScanSnapshotJump =
  | { type: 'finding'; id: string }
  | { type: 'pillar'; pillar: PillarKey }

export type ScanSnapshotModel = {
  displayHost: string
  headline: string
  sub: string
  /** When null, no strong priority (everything looks light) */
  priority: {
    label: string
    detail: string
  } | null
  jump: ScanSnapshotJump | null
}

const PILLAR_LABEL: Record<PillarKey, string> = {
  seo: 'SEO',
  security: 'Security',
  ai: 'Assistant readiness',
}

function displayHostname(report: ScanReport): string {
  try {
    return new URL(report.canonicalUrl).hostname
  } catch {
    try {
      return new URL(report.meta.finalUrl).hostname
    } catch {
      return 'this site'
    }
  }
}

function riskOrder(b: RiskBand): number {
  if (b === 'high') return 3
  if (b === 'medium') return 2
  return 1
}

/**
 * Per-scan copy for the report hero: plain language, points to the first useful action.
 */
export function buildScanSnapshotModel(report: ScanReport): ScanSnapshotModel {
  const host = displayHostname(report)
  const { seoScore, securityScore, aiScore, findings } = report

  const scoreLine = `SEO ${seoScore}/100 · Security ${securityScore}/100 · Assistants ${aiScore}/100.`

  const pillars: { key: PillarKey; score: number }[] = [
    { key: 'seo', score: seoScore },
    { key: 'security', score: securityScore },
    { key: 'ai', score: aiScore },
  ]
  pillars.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    const order: Record<PillarKey, number> = { seo: 0, security: 1, ai: 2 }
    return order[a.key] - order[b.key]
  })
  const weakest = pillars[0]!

  const nonGood = findings.filter((f) => f.severity !== 'good')
  const sortedByRisk = [...nonGood].sort((a, b) => {
    const d = riskOrder(b.riskBand) - riskOrder(a.riskBand)
    if (d !== 0) return d
    return a.id.localeCompare(b.id)
  })
  const top = sortedByRisk[0]

  if (top && (top.riskBand === 'high' || top.riskBand === 'medium')) {
    return {
      displayHost: host,
      headline: `${host} — start with “${top.title}”`,
      sub: `${scoreLine} Heuristic checks from one page load — not a verdict from any search or AI company.`,
      priority: {
        label: 'Start here',
        detail: `${top.riskBand === 'high' ? 'High' : 'Medium'} risk · ${top.riskWhy}`,
      },
      jump: { type: 'finding', id: top.id },
    }
  }

  if (weakest.score < 92) {
    return {
      displayHost: host,
      headline: `${host} — tune ${PILLAR_LABEL[weakest.key]} first (${weakest.score}/100)`,
      sub: `${scoreLine} Compare pillars below and dig into that column when you have five minutes.`,
      priority: {
        label: 'Focus area',
        detail: `${PILLAR_LABEL[weakest.key]} has the lowest checklist score this run — still a rough signal, not a grade from Google.`,
      },
      jump: { type: 'pillar', pillar: weakest.key },
    }
  }

  return {
    displayHost: host,
    headline: `${host} — basics look in good shape this pass`,
    sub: `${scoreLine} Skim findings for nits; nothing urgent jumped out at medium or high risk.`,
    priority:
      nonGood.length > 0
        ? {
            label: 'Optional polish',
            detail: sortedByRisk[0]
              ? `Low-impact: ${sortedByRisk[0].title}`
              : 'Review green rows for confirmations.',
          }
        : null,
    jump:
      nonGood.length > 0 && sortedByRisk[0]
        ? { type: 'finding', id: sortedByRisk[0].id }
        : { type: 'pillar', pillar: 'seo' },
  }
}
