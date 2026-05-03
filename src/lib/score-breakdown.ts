import type { RiskBand, ScanFinding } from './scan-types.ts'
import {
  type ScoreCategory,
  deductionForFinding,
  scoreBucketForCategory,
} from './scoring-rubric.ts'

export type { ScoreCategory }

export { deductionForFinding, scoreBucketForCategory as scoreFromFindings }

export function deductionsList(findings: ScanFinding[], category: ScoreCategory) {
  return findings
    .filter((f) => f.category === category && f.severity !== 'good')
    .map((f) => ({
      id: f.id,
      title: f.title,
      riskBand: f.riskBand as RiskBand,
      points: deductionForFinding(f),
    }))
}
