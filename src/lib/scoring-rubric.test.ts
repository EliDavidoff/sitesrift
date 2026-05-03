import { describe, expect, it } from 'vitest'
import type { ScanFinding } from './scan-types.ts'
import {
  DEDUCTION_BY_BAND,
  SCORE_START,
  deductionForFinding,
  scoreBucketForCategory,
} from './scoring-rubric.ts'

function f(partial: Partial<ScanFinding> & Pick<ScanFinding, 'id' | 'category'>): ScanFinding {
  return {
    title: 't',
    detail: 'd',
    severity: 'info',
    riskBand: 'low',
    riskWhy: 'w',
    remedy: 'r',
    lens: 'visibility',
    ...partial,
  }
}

describe('scoring-rubric', () => {
  it('does not deduct good findings', () => {
    expect(deductionForFinding(f({ id: 'x', category: 'seo', severity: 'good', riskBand: 'high' }))).toBe(0)
  })

  it('deducts by risk band', () => {
    expect(deductionForFinding(f({ id: 'a', category: 'seo', severity: 'warn', riskBand: 'high' }))).toBe(
      DEDUCTION_BY_BAND.high,
    )
    expect(deductionForFinding(f({ id: 'b', category: 'seo', severity: 'warn', riskBand: 'medium' }))).toBe(
      DEDUCTION_BY_BAND.medium,
    )
    expect(deductionForFinding(f({ id: 'c', category: 'seo', severity: 'info', riskBand: 'low' }))).toBe(
      DEDUCTION_BY_BAND.low,
    )
  })

  it('aggregates per pillar', () => {
    const findings: ScanFinding[] = [
      f({ id: '1', category: 'seo', severity: 'warn', riskBand: 'medium' }),
      f({ id: '2', category: 'seo', severity: 'good', riskBand: 'low' }),
      f({ id: '3', category: 'security', severity: 'bad', riskBand: 'high' }),
    ]
    expect(scoreBucketForCategory(findings, 'seo')).toBe(SCORE_START - DEDUCTION_BY_BAND.medium)
    expect(scoreBucketForCategory(findings, 'security')).toBe(SCORE_START - DEDUCTION_BY_BAND.high)
    expect(scoreBucketForCategory(findings, 'ai')).toBe(SCORE_START)
  })
})
