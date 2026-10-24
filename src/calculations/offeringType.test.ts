import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache, normalizeOfferingType } from './index'
import { sanitizeScenarioState, importFromCSV } from '../../assets/services/miscService'

// Scaffold for roadmap 24b: optional per-offering `type`. Unknown or missing = subscription.
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

describe('normalizeOfferingType', () => {
  it('keeps known types', () => {
    expect(normalizeOfferingType('subscription')).toBe('subscription')
    expect(normalizeOfferingType('group')).toBe('group')
  })

  it('falls back to subscription for missing or garbage values', () => {
    for (const v of [undefined, null, '', 'bogus', 'GROUP', 42, {}, []]) {
      expect(normalizeOfferingType(v)).toBe('subscription')
    }
  })
})

describe('offering type is behavior-neutral for now', () => {
  beforeEach(() => clearCalculationCache())

  it.each(['current', 'forecast'] as const)('%s mode: legacy payload equals explicit subscription', (mode) => {
    const legacy = calc({ ...base, mode, offerings: [offering] } as any)
    clearCalculationCache()
    const typed = calc({ ...base, mode, offerings: [{ ...offering, type: 'subscription' }] } as any)
    expect(typed.income).toBe(legacy.income)
    expect(typed.variableCosts).toBe(legacy.variableCosts)
    expect(typed.capacityPct).toBe(legacy.capacityPct)
  })

  it('unknown type calc matches subscription', () => {
    const a = calc({ ...base, mode: 'current', offerings: [offering] } as any)
    clearCalculationCache()
    const b = calc({ ...base, mode: 'current', offerings: [{ ...offering, type: 'bogus' }] } as any)
    expect(b.income).toBe(a.income)
  })
})

describe('sanitizeScenarioState type', () => {
  const state = (type: unknown) => ({ offerings: [{ name: 'A', priceMonthly: 100, type }] })

  it('round-trips group', () => {
    expect(sanitizeScenarioState(state('group'))!.offerings[0].type).toBe('group')
  })

  it('missing or unknown falls back to subscription', () => {
    expect(sanitizeScenarioState(state(undefined))!.offerings[0].type).toBe('subscription')
    expect(sanitizeScenarioState(state('bogus'))!.offerings[0].type).toBe('subscription')
    expect(sanitizeScenarioState(state(7))!.offerings[0].type).toBe('subscription')
  })
})

describe('importFromCSV type column', () => {
  const head = 'Offerings\nName,Monthly Price,Sessions/Year,Hours/Session,Variable Cost,Mix %,Current Clients,Labor % of Price,Type'
  const typeOf = (row: string) => (importFromCSV(`${head}\n${row}`) as any).data.offerings[0].type

  it('reads the optional 9th column', () => {
    expect(typeOf('Yoga,100,12,1,0,100,0,0,group')).toBe('group')
  })

  it('legacy 7- and 8-column rows import as subscription', () => {
    expect(typeOf('Yoga,100,12,1,0,100,0')).toBe('subscription')
    expect(typeOf('Yoga,100,12,1,0,100,0,0')).toBe('subscription')
  })

  it('unknown type falls back to subscription', () => {
    expect(typeOf('Yoga,100,12,1,0,100,0,0,bogus')).toBe('subscription')
  })
})
