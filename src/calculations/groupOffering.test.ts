import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { sanitizeScenarioState, importFromCSV } from '../../assets/services/miscService'

// Roadmap 24b: group offerings. An under-filled class must cost more staff time per client.
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
  fillPct: 100,
  currentClients: 8
}

describe('group offering, current mode (cohorts)', () => {
  beforeEach(() => clearCalculationCache())

  it('8 seats: enrolling 8 vs 4 gives the same staff hours and double hours per client', () => {
    const full = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 8 }] } as any)
    const half = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 4 }] } as any)
    expect(full.serviceHours).toBe(50)
    expect(half.serviceHours).toBe(full.serviceHours)
    expect(half.serviceHours / half.clients).toBe(2 * (full.serviceHours / full.clients))
  })

  it('opens a second cohort when enrollment exceeds seats', () => {
    const r = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 9 }] } as any)
    expect(r.serviceHours).toBe(100)
  })

  it('zero enrolled needs zero staff hours', () => {
    const r = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 0 }] } as any)
    expect(r.serviceHours).toBe(0)
  })

  it('attendance sessions and revenue stay per enrolled client', () => {
    const r = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 4 }] } as any)
    expect(r.totalSessions).toBe(4 * 50)
    expect(r.revenue).toBe(4 * 1200)
  })

  it('seats and fill do not affect a subscription row', () => {
    const sub = { ...group, type: 'subscription' }
    const a = calc({ ...base, mode: 'current', offerings: [sub] } as any)
    clearCalculationCache()
    const b = calc({ ...base, mode: 'current', offerings: [{ ...sub, seats: 1, fillPct: 10 }] } as any)
    expect(a.serviceHours).toBe(8 * 50)
    expect(b.serviceHours).toBe(a.serviceHours)
  })
})

describe('group offering, forecast mode', () => {
  beforeEach(() => clearCalculationCache())

  it('fill 100 vs 50 doubles hours per client and halves clients', () => {
    const full = calc({ ...base, mode: 'forecast', offerings: [{ ...group, fillPct: 100 }] } as any)
    const half = calc({ ...base, mode: 'forecast', offerings: [{ ...group, fillPct: 50 }] } as any)
    expect(full.serviceHoursPerClient).toBeCloseTo(50 / 8, 9)
    expect(half.serviceHoursPerClient).toBeCloseTo(2 * full.serviceHoursPerClient!, 9)
    expect(half.clients).toBeLessThan(full.clients)
  })

  it('a group row without seats/fill behaves like a single-seat subscription', () => {
    const { seats, fillPct, ...bare } = group
    void seats; void fillPct
    const g = calc({ ...base, mode: 'forecast', offerings: [bare] } as any)
    clearCalculationCache()
    const s = calc({ ...base, mode: 'forecast', offerings: [{ ...bare, type: 'subscription' }] } as any)
    expect(g.clients).toBe(s.clients)
  })

  it('cache key includes seats and fill', () => {
    const a = calc({ ...base, mode: 'forecast', offerings: [{ ...group, seats: 4 }] } as any)
    const b = calc({ ...base, mode: 'forecast', offerings: [{ ...group, seats: 16 }] } as any)
    expect(b.clients).toBeGreaterThan(a.clients)
  })
})

describe('group guards', () => {
  beforeEach(() => clearCalculationCache())

  it.each([0, -3, 'abc', null, NaN, Infinity])('seats=%s stays finite and at least 1', (seats) => {
    const r = calc({ ...base, mode: 'current', offerings: [{ ...group, seats, currentClients: 3 }] } as any)
    expect(Number.isFinite(r.serviceHours)).toBe(true)
    expect(r.serviceHours).toBeGreaterThanOrEqual(0)
    expect(r.serviceHours).toBeLessThanOrEqual(3 * 50)
  })

  it('seats below 1 clamp to 1 seat (one cohort per enrolled client)', () => {
    const r = calc({ ...base, mode: 'current', offerings: [{ ...group, seats: 0, currentClients: 3 }] } as any)
    expect(r.serviceHours).toBe(3 * 50)
  })

  it.each([0, -10, 'abc', null, NaN])('fillPct=%s never explodes forecast hours', (fillPct) => {
    const r = calc({ ...base, mode: 'forecast', offerings: [{ ...group, fillPct }] } as any)
    expect(Number.isFinite(r.serviceHoursPerClient)).toBe(true)
    expect(r.serviceHoursPerClient!).toBeLessThanOrEqual(50 / 8 * 100)
  })

  it('fill above 100 clamps to 100', () => {
    const hi = calc({ ...base, mode: 'forecast', offerings: [{ ...group, fillPct: 500 }] } as any)
    const full = calc({ ...base, mode: 'forecast', offerings: [{ ...group, fillPct: 100 }] } as any)
    expect(hi.serviceHoursPerClient).toBe(full.serviceHoursPerClient)
  })
})

describe('sanitizeScenarioState seats/fill', () => {
  const o = (extra: object) => sanitizeScenarioState({ offerings: [{ name: 'A', priceMonthly: 100, type: 'group', ...extra }] })!.offerings[0]

  it('round-trips valid values', () => {
    expect(o({ seats: 12, fillPct: 75 })).toMatchObject({ seats: 12, fillPct: 75 })
  })

  it('defaults absent to 1 seat / 100% and clamps garbage', () => {
    expect(o({})).toMatchObject({ seats: 1, fillPct: 100 })
    expect(o({ seats: 0, fillPct: 0 })).toMatchObject({ seats: 1, fillPct: 1 })
    expect(o({ seats: 'x', fillPct: 'x' })).toMatchObject({ seats: 1, fillPct: 100 })
    expect(o({ seats: 3.9, fillPct: 900 })).toMatchObject({ seats: 3, fillPct: 100 })
  })
})

describe('importFromCSV seats/fill columns', () => {
  const head = 'Offerings\nName,Monthly Price,Sessions/Year,Hours/Session,Variable Cost,Mix %,Current Clients,Labor % of Price,Type,Seats,Fill %'
  const parse = (row: string) => (importFromCSV(`${head}\n${row}`) as any).data.offerings[0]

  it('reads seats and fill', () => {
    expect(parse('Yoga,100,12,1,0,100,0,0,group,10,60')).toMatchObject({ type: 'group', seats: 10, fillPct: 60 })
  })

  it('legacy rows get 1 seat / 100%', () => {
    expect(parse('Yoga,100,12,1,0,100,0,0,group')).toMatchObject({ seats: 1, fillPct: 100 })
    expect(parse('Yoga,100,12,1,0,100,0')).toMatchObject({ seats: 1, fillPct: 100 })
  })
})
