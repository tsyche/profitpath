import { describe, it, expect, beforeEach } from 'vitest'
import { clearCalculationCache } from './index'
import { calcRange, calcRangeDrivers, suggestRanges, hasRanges, sanitizeRangeBound, sanitizeOfferingRange, rangeCsvCells } from './ranges'
import { sanitizeScenarioState, importFromCSV, buildCSV } from '../../assets/services/miscService'

// Roadmap 24c: low/base/high bounds on fill % and current clients.
const base = {
  employees: 2,
  employeePay: 50000,
  monthlyCosts: 1000,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 100
}
const group = {
  name: 'Class',
  type: 'group',
  priceMonthly: 100,
  sessionsPerYear: 50,
  hoursPerSession: 1,
  variableCostPerSession: 0,
  mixPct: 100,
  seats: 8,
  fillPct: 75,
  currentClients: 8
}

describe('calcRange', () => {
  beforeEach(() => clearCalculationCache())

  it('returns null when no offering has a bound', () => {
    expect(calcRange({ ...base, mode: 'forecast', offerings: [group] } as any)).toBeNull()
  })

  it('forecast: fill bounds widen the band around base, min <= base <= max', () => {
    const r = calcRange({ ...base, mode: 'forecast', offerings: [{ ...group, fillPctLow: 50, fillPctHigh: 100 }] } as any)!
    expect(r.income.min).toBeLessThan(r.income.base)
    expect(r.income.max).toBeGreaterThan(r.income.base)
    for (const b of Object.values(r)) {
      expect(b.min).toBeLessThanOrEqual(b.base)
      expect(b.base).toBeLessThanOrEqual(b.max)
    }
  })

  it('current: client bounds move revenue and utilization', () => {
    const r = calcRange({ ...base, mode: 'current', offerings: [{ ...group, currentClientsLow: 4, currentClientsHigh: 16 }] } as any)!
    expect(r.revenue).toEqual({ min: 4 * 1200, base: 8 * 1200, max: 16 * 1200 })
    expect(r.clients).toEqual({ min: 4, base: 8, max: 16 })
  })

  it('a bound on the wrong side of base never crosses it', () => {
    const r = calcRange({ ...base, mode: 'current', offerings: [{ ...group, currentClientsLow: 20, currentClientsHigh: 2 }] } as any)!
    expect(r.clients).toEqual({ min: 8, base: 8, max: 8 })
  })

  it('one-sided range collapses the other side to base', () => {
    const r = calcRange({ ...base, mode: 'current', offerings: [{ ...group, currentClientsHigh: 12 }] } as any)!
    expect(r.clients).toEqual({ min: 8, base: 8, max: 12 })
  })

  it('shows the real spread when more clients means more loss', () => {
    const losing = { ...group, type: 'subscription', variableCostPerSession: 100, currentClientsLow: 2, currentClientsHigh: 20 }
    const r = calcRange({ ...base, mode: 'current', offerings: [losing] } as any)!
    expect(r.income.min).toBeLessThan(r.income.base)
    expect(r.income.min).toBeLessThanOrEqual(r.income.max)
  })

  it.each([NaN, Infinity, 'abc', null, {}, -5, 1e12])('hostile bound %s never yields NaN', (bad) => {
    const r = calcRange({ ...base, mode: 'forecast', offerings: [{ ...group, fillPctLow: bad, fillPctHigh: bad, currentClientsLow: bad }] } as any)
    if (r) for (const b of Object.values(r)) expect([b.min, b.max].every((v) => !Number.isNaN(v))).toBe(true)
  })
})

describe('range sanitizers', () => {
  it('sanitizeRangeBound: blank and junk are absent, numbers clamp', () => {
    expect(sanitizeRangeBound('', 1, 100)).toBeUndefined()
    expect(sanitizeRangeBound('  ', 1, 100)).toBeUndefined()
    expect(sanitizeRangeBound('x', 1, 100)).toBeUndefined()
    expect(sanitizeRangeBound(null, 1, 100)).toBeUndefined()
    expect(sanitizeRangeBound('40', 1, 100)).toBe(40)
    expect(sanitizeRangeBound(0, 1, 100)).toBe(1)
    expect(sanitizeRangeBound(900, 1, 100)).toBe(100)
  })

  it('sanitizeOfferingRange keeps only present bounds and floors client counts', () => {
    expect(sanitizeOfferingRange({})).toEqual({})
    expect(sanitizeOfferingRange({ fillPctLow: '40', currentClientsHigh: 9.9, evil: 1 })).toEqual({ fillPctLow: 40, currentClientsHigh: 9 })
  })

  it('hasRanges', () => {
    expect(hasRanges([{}, { fillPctLow: 10 }])).toBe(true)
    expect(hasRanges([{}, { fillPctLow: undefined }])).toBe(false)
    expect(hasRanges(undefined)).toBe(false)
  })

  it('rangeCsvCells leaves absent bounds blank', () => {
    expect(rangeCsvCells({ fillPctLow: 40, currentClientsHigh: 9 })).toBe('40,,,9')
  })
})

describe('range persistence', () => {
  const ranged = { ...group, fillPctLow: 40, fillPctHigh: 90, currentClientsLow: 4, currentClientsHigh: 12 }

  it('share-URL sanitizer keeps bounds and omits absent ones', () => {
    const o = sanitizeScenarioState({ offerings: [ranged, { ...group, name: 'Plain' }] })!.offerings
    expect(o[0]).toMatchObject({ fillPctLow: 40, fillPctHigh: 90, currentClientsLow: 4, currentClientsHigh: 12 })
    expect(Object.keys(o[1])).not.toContain('fillPctLow')
  })

  it('share-URL sanitizer clamps hostile bounds', () => {
    const o = sanitizeScenarioState({ offerings: [{ ...group, fillPctLow: -9, fillPctHigh: 'x', currentClientsHigh: 1e99 }] })!.offerings[0]
    expect(o.fillPctLow).toBe(1)
    expect(o.fillPctHigh).toBeUndefined()
    expect(o.currentClientsHigh).toBe(1e6)
  })

  it('CSV round-trips bounds', () => {
    const st = { ...base, mode: 'forecast', offerings: [ranged, { ...group, name: 'Plain' }], expenses: [] }
    const r: any = importFromCSV(buildCSV(st, { revenue: 0, variableCosts: 0, income: 0, capacityPct: 0 }))
    expect(r.data.offerings[0]).toMatchObject({ fillPctLow: 40, fillPctHigh: 90, currentClientsLow: 4, currentClientsHigh: 12 })
    expect(Object.keys(r.data.offerings[1])).not.toContain('fillPctLow')
  })

  it('legacy 11-column CSV rows import with no bounds', () => {
    const csv = 'Offerings\nName,P,S,H,V,M,C,L,T,Seats,Fill\nYoga,100,12,1,0,100,0,0,group,10,60'
    const o = (importFromCSV(csv) as any).data.offerings[0]
    expect(Object.keys(o)).not.toContain('fillPctLow')
    expect(o.fillPct).toBe(60)
  })
})

describe('best-case discount persistence (roadmap 24d)', () => {
  it('share-URL sanitizer keeps and clamps discountPct', () => {
    const o = sanitizeScenarioState({ offerings: [{ ...group, discountPct: 25 }, { ...group, discountPct: 999 }, { ...group, discountPct: 'x' }, group] })!.offerings
    expect(o.map((x) => x.discountPct)).toEqual([25, 100, 0, 0])
  })

  it('CSV round-trips discountPct as column 16', () => {
    const st = { ...base, mode: 'forecast', offerings: [{ ...group, discountPct: 30 }, { ...group, name: 'Plain' }], expenses: [] }
    const csv = buildCSV(st, { revenue: 0, variableCosts: 0, income: 0, capacityPct: 0 })
    expect(csv).toContain('Best Discount %')
    const o = (importFromCSV(csv) as any).data.offerings
    expect(o.map((x: any) => x.discountPct)).toEqual([30, 0])
  })

  it('legacy 15-column CSV rows import with no discount', () => {
    const csv = 'Offerings\nName,P,S,H,V,M,C,L,T,Seats,Fill,a,b,c,d\nYoga,100,12,1,0,100,0,0,group,10,60,,,,'
    expect((importFromCSV(csv) as any).data.offerings[0].discountPct).toBe(0)
  })
})

describe('suggestRanges (roadmap 22 / 24c)', () => {
  it('forecast: group fill gets ±15% for estimated and ±30% for guess', () => {
    expect(suggestRanges({ ...group, confidence: 'estimated' } as any, 'forecast')).toEqual({ fillPctLow: 64, fillPctHigh: 86 })
    expect(suggestRanges({ ...group, confidence: 'guess' } as any, 'forecast')).toEqual({ fillPctLow: 53, fillPctHigh: 98 })
  })

  it('clamps fill to 1-100', () => {
    expect(suggestRanges({ ...group, fillPct: 95, confidence: 'guess' } as any, 'forecast').fillPctHigh).toBe(100)
  })

  it('current: client bounds widen outward, floor/ceil', () => {
    expect(suggestRanges({ ...group, currentClients: 10, confidence: 'guess' } as any, 'current'))
      .toEqual({ currentClientsLow: 7, currentClientsHigh: 13 })
  })

  it('leaves verified, untagged and non-group forecast rows alone', () => {
    expect(suggestRanges({ ...group, confidence: 'verified' } as any, 'forecast')).toEqual({})
    expect(suggestRanges({ ...group } as any, 'forecast')).toEqual({})
    expect(suggestRanges({ ...group, type: 'subscription', confidence: 'guess' } as any, 'forecast')).toEqual({})
  })

  it('never overwrites a typed bound', () => {
    expect(suggestRanges({ ...group, confidence: 'guess', fillPctLow: 10 } as any, 'forecast')).toEqual({ fillPctHigh: 98 })
  })
})

describe('calcRangeDrivers', () => {
  beforeEach(() => clearCalculationCache())

  it('is empty without bounds', () => {
    expect(calcRangeDrivers({ ...base, mode: 'forecast', offerings: [group] } as any)).toEqual([])
  })

  it('ranks by profit swing and isolates each offering', () => {
    const small = { ...group, name: 'Small', mixPct: 50, fillPctLow: 70, fillPctHigh: 80, confidence: 'estimated' }
    const big = { ...group, name: 'Big', mixPct: 50, fillPctLow: 20, fillPctHigh: 100, confidence: 'guess' }
    const state = { ...base, mode: 'forecast', offerings: [small, big] } as any
    const d = calcRangeDrivers(state)
    expect(d.map(x => x.name)).toEqual(['Big', 'Small'])
    expect(d[0].confidence).toBe('guess')
    // Big alone moves profit more than Small alone, and each is smaller than the combined envelope
    const full = calcRange(state)!.income
    expect(d[0].swing).toBeLessThanOrEqual(full.max - full.min + 1e-6)
    expect(d[0].swing).toBeGreaterThan(d[1].swing)
  })
})
