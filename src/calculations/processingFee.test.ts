import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { buildCSV, importFromCSV, sanitizeScenarioState } from '../../assets/services/miscService'

// Item 29: global card/payment processing fee as a % of revenue, a variable cost on every offering.
const base = {
  employees: 2,
  employeePay: 50000,
  monthlyCosts: 1000,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 100
}
const offering = {
  name: 'Lesson',
  priceMonthly: 200,
  sessionsPerYear: 12,
  hoursPerSession: 2,
  variableCostPerSession: 10,
  mixPct: 100,
  currentClients: 5
}

describe('processingFeePct', () => {
  beforeEach(() => clearCalculationCache())

  it('adds fee % of revenue to variable costs and cuts income by the same amount (current mode)', () => {
    const none = calc({ ...base, mode: 'current', offerings: [offering] } as any)
    const fee = calc({ ...base, mode: 'current', processingFeePct: 3, offerings: [offering] } as any)
    const expected = none.revenue * 0.03
    expect(fee.revenue).toBe(none.revenue)
    expect(fee.variableCosts - none.variableCosts).toBeCloseTo(expected)
    expect(none.income - fee.income).toBeCloseTo(expected)
    expect(fee.offeringMetrics[0].variableCosts - none.offeringMetrics[0].variableCosts).toBeCloseTo(expected)
  })

  it('applies in forecast mode and lowers the contribution margin ratio', () => {
    const none = calc({ ...base, mode: 'forecast', offerings: [offering] } as any)
    const fee = calc({ ...base, mode: 'forecast', processingFeePct: 3, offerings: [offering] } as any)
    expect(none.income - fee.income).toBeCloseTo(none.revenue * 0.03)
    expect(none.contributionMarginRatio - fee.contributionMarginRatio).toBeCloseTo(0.03)
  })

  it('clamps garbage and negative values to 0..20', () => {
    const none = calc({ ...base, mode: 'current', offerings: [offering] } as any)
    expect(calc({ ...base, mode: 'current', processingFeePct: -5, offerings: [offering] } as any).income).toBe(none.income)
    expect(calc({ ...base, mode: 'current', processingFeePct: NaN, offerings: [offering] } as any).income).toBe(none.income)
    const capped = calc({ ...base, mode: 'current', processingFeePct: 500, offerings: [offering] } as any)
    expect(none.income - capped.income).toBeCloseTo(none.revenue * 0.2)
  })

  it('is part of the cache key', () => {
    const a = calc({ ...base, mode: 'current', processingFeePct: 0, offerings: [offering] } as any)
    const b = calc({ ...base, mode: 'current', processingFeePct: 3, offerings: [offering] } as any)
    expect(b.income).toBeLessThan(a.income)
  })

  it('survives scenario sanitizing and a CSV round trip', () => {
    const st = sanitizeScenarioState({ ...base, mode: 'current', processingFeePct: 2.9, offerings: [offering] })
    expect(st?.processingFeePct).toBe(2.9)
    expect(sanitizeScenarioState({ ...base, processingFeePct: 99, offerings: [offering] })?.processingFeePct).toBe(20)
    const csv = buildCSV(st, calc({ ...base, mode: 'current', processingFeePct: 2.9, offerings: [offering] } as any))
    const parsed: any = importFromCSV(csv)
    expect(parsed.data.settings.processingFeePct).toBe(2.9)
  })
})
