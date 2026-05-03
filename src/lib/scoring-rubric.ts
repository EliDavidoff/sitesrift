/**
 * Single source of truth for pillar scores (matches [`scan-api/analyze.ts`](../../scan-api/analyze.ts) logic).
 * Documented deductions — not keyword rankings or external APIs.
 */
import type { RiskBand, ScanFinding } from './scan-types.ts'

export type ScoreCategory = 'seo' | 'security' | 'ai'

/** Starting score before deductions */
export const SCORE_START = 100

/** Points subtracted per non-good finding, by risk band */
export const DEDUCTION_BY_BAND: Record<RiskBand, number> = {
  high: 14,
  medium: 7,
  low: 3,
}

/**
 * Deduction for one finding. `good` severity never subtracts (positive signal rows stay at 0).
 */
export function deductionForFinding(f: ScanFinding): number {
  if (f.severity === 'good') return 0
  return DEDUCTION_BY_BAND[f.riskBand]
}

/** Aggregate score for one pillar from emitted findings */
export function scoreBucketForCategory(findings: ScanFinding[], category: ScoreCategory): number {
  let score = SCORE_START
  for (const f of findings) {
    if (f.category !== category) continue
    score -= deductionForFinding(f)
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}
