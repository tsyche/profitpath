import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache, normalizeOfferingType } from './index'
import { displayPrice, isPerSession, monthlyFromPerSession, pricePerSession, priceMonthlyForNewVisits } from './offeringPrice'
import { sanitizeScenarioState, importFromCSV, buildCSV } from '../../assets/services/miscService'

const base = { employees: 2, employeePay: 50000, monthlyCosts: 0, productiveUtilizationPct: 80, targetUtilizationPct: 100, mode: 'current' }
const row = { name: 'Podcast', priceMonthly: 160, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 0, mixPct: 100, currentClients: 1 }

describe('per-session pricing lens (roadmap 18)', () => {
  it('is a known type, and still falls back for garbage', () => {
    expect(normalizeOfferingType('per-session')).toBe('per-session')
    expect(normalizeOfferingType('per_session')).toBe('subscription')
  })

  it('converts between per-visit and monthly-equivalent price', () => {
    expect(pricePerSession({ priceMonthly: 160, sessionsPerYear: 12 })).toBe(160)
    expect(monthlyFromPerSession(80, 24)).toBe(160)
    expect(pricePerSession({ priceMonthly: 160, sessionsPerYear: 0 })).toBe(0)
  })

  it('changing visits keeps the per-visit price fixed', () => {
    const o = { priceMonthly: 80, sessionsPerYear: 12 }
    const next = priceMonthlyForNewVisits(o, 24)
    expect(pricePerSession({ priceMonthly: next, sessionsPerYear: 24 })).toBeCloseTo(80, 10)
    expect(next).toBe(160)
  })

  it('leaves the price alone when there is no per-visit price to preserve', () => {
    expect(priceMonthlyForNewVisits({ priceMonthly: 0, sessionsPerYear: 12 }, 6)).toBe(0)
    expect(priceMonthlyForNewVisits({ priceMonthly: 50, sessionsPerYear: 0 }, 6)).toBe(50)
  })

  it('displays per-visit price only for per-session rows', () => {
    expect(displayPrice({ type: 'per-session', priceMonthly: 100, sessionsPerYear: 24 })).toBe(50)
    expect(displayPrice({ type: 'subscription', priceMonthly: 100, sessionsPerYear: 24 })).toBe(100)
    expect(isPerSession({ type: 'group' })).toBe(false)
  })
})

describe('per-session rows in calc and persistence', () => {
  beforeEach(() => clearCalculationCache())

  it('annual revenue per client is price per visit x visits', () => {
    // $80 a visit, 10 visits a year => $800 per client
    const o = { ...row, type: 'per-session', priceMonthly: monthlyFromPerSession(80, 10), sessionsPerYear: 10 }
    expect(calc({ ...base, offerings: [o] } as any).revenue).toBeCloseTo(800, 6)
  })

  it('survives the share-URL sanitizer and a CSV round trip', () => {
    const o = { ...row, type: 'per-session' }
    expect(sanitizeScenarioState({ offerings: [o] })!.offerings[0].type).toBe('per-session')
    const st = { ...base, offerings: [o], expenses: [] }
    const back = (importFromCSV(buildCSV(st, { revenue: 0, variableCosts: 0, income: 0, capacityPct: 0 })) as any).data.offerings[0]
    expect(back.type).toBe('per-session')
    expect(back.priceMonthly).toBe(160)
  })
})
