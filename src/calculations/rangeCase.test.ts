import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { calcRange, calcRangeDrivers } from './ranges'
import { buildCSV, importFromCSV } from '../../assets/services/miscService'
import { applyRangeCase, getRangeCase, rangeCaseTag, setRangeCase } from './rangeCase'

const offering = (extra: Record<string, unknown> = {}) => ({
  name: 'Coaching',
  priceMonthly: 200,
  sessionsPerYear: 12,
  hoursPerSession: 1,
  variableCostPerSession: 0,
  mixPct: 100,
  currentClients: 10,
  ...extra
})
const state = (extra: Record<string, unknown> = {}) => ({
  mode: 'current' as const,
  employees: 1,
  employeePay: 40000,
  monthlyCosts: 500,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 100,
  offerings: [offering(extra)]
}) as any

describe('range case lens', () => {
  beforeEach(() => clearCalculationCache())

  it('defaults to base and rejects junk', () => {
    expect(getRangeCase()).toBe('base')
    expect(setRangeCase('nonsense')).toBe('base')
    expect(setRangeCase(undefined)).toBe('base')
  })

  it('calc() follows the case: conservative <= base <= optimistic on revenue', () => {
    const s = state({ currentClientsLow: 5, currentClientsHigh: 15 })
    const b = calc(s)
    setRangeCase('conservative')
    const lo = calc(s)
    setRangeCase('optimistic')
    const hi = calc(s)
    expect(lo.clients).toBe(5)
    expect(b.clients).toBe(10)
    expect(hi.clients).toBe(15)
    expect(lo.revenue).toBeLessThan(b.revenue)
    expect(hi.revenue).toBeGreaterThan(b.revenue)
  })

  it('back to base returns the base result (cache is not poisoned by the case)', () => {
    const s = state({ currentClientsLow: 5, currentClientsHigh: 15 })
    const b = calc(s)
    setRangeCase('conservative')
    calc(s)
    setRangeCase('base')
    expect(calc(s)).toEqual(b)
  })

  it('is a no-op when no offering has bounds', () => {
    const s = state()
    const b = calc(s)
    setRangeCase('optimistic')
    expect(applyRangeCase(s)).toBe(s)
    expect(calc(s)).toEqual(b)
  })

  it('the range band and drivers always measure from the true base', () => {
    const s = state({ currentClientsLow: 5, currentClientsHigh: 15, confidence: 'guess' })
    const band = calcRange(s)!
    const drivers = calcRangeDrivers(s)
    setRangeCase('conservative')
    expect(calcRange(s)).toEqual(band)
    expect(calcRangeDrivers(s)).toEqual(drivers)
    expect(band.clients.base).toBe(10)
  })

  it('ignoreCase calculates the base while a case is active', () => {
    const s = state({ currentClientsLow: 5, currentClientsHigh: 15 })
    setRangeCase('optimistic')
    expect(calc(s, { ignoreCase: true }).clients).toBe(10)
  })

  it('does not mutate the caller state', () => {
    const s = state({ currentClientsLow: 5, currentClientsHigh: 15 })
    setRangeCase('conservative')
    calc(s)
    expect(s.offerings[0].currentClients).toBe(10)
    expect(s.offerings[0].currentClientsLow).toBe(5)
  })

  it('tags exports only off the base case', () => {
    expect(rangeCaseTag()).toBe('')
    expect(rangeCaseTag('conservative')).toBe('Conservative case')
    expect(rangeCaseTag('optimistic')).toBe('Optimistic case')
  })

  it('CSV export names the case, and the file still imports', () => {
    const s = { ...state({ currentClientsLow: 5, currentClientsHigh: 15 }), fullTimeEmployees: 1, partTimeEmployees: 0, fullTimeEmployeePay: 40000, partTimeEmployeePay: 0 }
    expect(buildCSV(s, calc(s))).not.toContain('Range case')
    setRangeCase('conservative')
    const csv = buildCSV(s, calc(s))
    expect(csv).toContain('Range case: Conservative case')
    expect(() => importFromCSV(csv)).not.toThrow()
  })
})
