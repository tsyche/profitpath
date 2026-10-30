import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { sanitizeScenarioState } from '../../assets/services/miscService'

// Item 21: per-offering contractor pay as a % of list price. Added to Var $/session.
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

describe('laborPctOfPrice', () => {
  beforeEach(() => clearCalculationCache())

  it('current mode: adds pct of annual list price per client to variable cost', () => {
    const r = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: 40 }] } as any)
    // per client: 12 sessions * $10 + 40% * ($200 * 12) = 120 + 960
    expect(r.variableCosts).toBe(5 * (120 + 960))
    expect(r.offeringMetrics[0].variableCosts).toBe(5 * (120 + 960))
    expect(r.offeringMetrics[0].margin).toBe(5 * 2400 - 5 * 1080)
  })

  it('forecast mode: same per-client cost via the mix path', () => {
    const r = calc({ ...base, mode: 'forecast' as const, offerings: [{ ...offering, laborPctOfPrice: 40 }] } as any)
    expect(r.clients).toBeGreaterThan(0)
    expect(r.variableCosts).toBeCloseTo(r.clients * 1080, 6)
    expect(r.offeringMetrics[0].variableCosts).toBeCloseTo(r.offeringMetrics[0].clients * 1080, 6)
  })

  it('equals typing price*12/sessions*pct into Var $/session (the TSS workaround)', () => {
    const viaPct = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: 40 }] } as any)
    const perSession = (200 * 12 / 12) * 0.4
    const viaTyped = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, variableCostPerSession: 10 + perSession }] } as any)
    expect(viaPct.variableCosts).toBeCloseTo(viaTyped.variableCosts, 6)
    expect(viaPct.income).toBeCloseTo(viaTyped.income, 6)
  })

  it('works when sessionsPerYear is 0 (no division by sessions)', () => {
    const r = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, sessionsPerYear: 0, laborPctOfPrice: 50 }] } as any)
    expect(Number.isFinite(r.variableCosts)).toBe(true)
    expect(r.variableCosts).toBe(5 * 0.5 * 200 * 12)
  })

  it('cache key includes it: changing only the pct changes the result', () => {
    const a = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: 10 }] } as any)
    const b = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: 60 }] } as any)
    expect(b.variableCosts).toBeGreaterThan(a.variableCosts)
  })

  it('legacy offerings without the field are unchanged', () => {
    const r = calc({ ...base, mode: 'current' as const, offerings: [offering] } as any)
    expect(r.variableCosts).toBe(5 * 12 * 10)
  })

  it('garbage and out-of-range values clamp to 0..100', () => {
    const hi = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: 500 }] } as any)
    const full = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: 100 }] } as any)
    const bad = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: 'abc' }] } as any)
    const neg = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, laborPctOfPrice: -5 }] } as any)
    expect(hi.variableCosts).toBe(full.variableCosts)
    expect(bad.variableCosts).toBe(neg.variableCosts)
    expect(bad.variableCosts).toBe(5 * 120)
  })
})

describe('sanitizeScenarioState laborPctOfPrice', () => {
  const state = (pct: unknown) => ({ offerings: [{ name: 'A', priceMonthly: 100, laborPctOfPrice: pct }] })

  it('keeps a valid value (share links / localStorage round trip)', () => {
    expect(sanitizeScenarioState(state(35))!.offerings[0].laborPctOfPrice).toBe(35)
  })
  it('clamps and defaults', () => {
    expect(sanitizeScenarioState(state(999))!.offerings[0].laborPctOfPrice).toBe(100)
    expect(sanitizeScenarioState(state('x'))!.offerings[0].laborPctOfPrice).toBe(0)
    expect(sanitizeScenarioState({ offerings: [{ name: 'A' }] })!.offerings[0].laborPctOfPrice).toBe(0)
  })
})
