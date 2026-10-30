import { appStateFixture, calcResultFixture } from '../test/test-utils';
import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache, normalizeOfferingType } from './index'
import { displayPrice, isOneTime } from './offeringPrice'
import { sanitizeScenarioState, importFromCSV, buildCSV } from '../../assets/services/miscService'

const base = { employees: 2, employeePay: 50000, monthlyCosts: 0, productiveUtilizationPct: 80, targetUtilizationPct: 100, mode: 'current' as const }
// $240 per sale, 10 sold a year. Stale session/hour values must be ignored for a one-time row.
const sale = { name: 'Gift card', type: 'one-time' as const, priceMonthly: 20, sessionsPerYear: 12, hoursPerSession: 3, variableCostPerSession: 30, mixPct: 100, currentClients: 10 }

describe('one-time offering type (roadmap 19)', () => {
  beforeEach(() => clearCalculationCache())

  it('is a known type and reads its price per sale', () => {
    expect(normalizeOfferingType('one-time')).toBe('one-time')
    expect(isOneTime(sale)).toBe(true)
    expect(displayPrice(sale as any)).toBe(240)
  })

  it('adds revenue and unit cost but zero staff hours', () => {
    const r = calc({ ...base, offerings: [sale] } as any)
    expect(r.revenue).toBeCloseTo(2400, 6)
    expect(r.variableCosts).toBeCloseTo(300, 6)
    expect(r.serviceHours).toBe(0)
    expect(r.capacityPct).toBe(0)
  })

  it('does not change utilization of other offerings', () => {
    const hourly = { ...sale, name: 'Coaching', type: 'subscription' as const, priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0 }
    const alone = calc({ ...base, offerings: [hourly] } as any)
    clearCalculationCache()
    const both = calc({ ...base, offerings: [hourly, sale] } as any)
    expect(both.serviceHours).toBe(alone.serviceHours)
    expect(both.revenue).toBeCloseTo(alone.revenue + 2400, 6)
  })

  it('survives the share-URL sanitizer and a CSV round trip', () => {
    expect(sanitizeScenarioState({ offerings: [sale] })!.offerings[0].type).toBe('one-time')
    const st = { ...base, offerings: [sale], expenses: [] }
    const back = (importFromCSV(buildCSV(appStateFixture(st), calcResultFixture({ revenue: 0, variableCosts: 0, income: 0, capacityPct: 0 }))) as any).data.offerings[0]
    expect(back.type).toBe('one-time')
    expect(back.priceMonthly).toBe(20)
  })
})
