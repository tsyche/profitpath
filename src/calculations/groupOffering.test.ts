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

  it('fillPct opens extra cohorts: 77 clients, 8 seats, 80% fill needs 13 runs, not 10', () => {
    // Roadmap 35: seats are only (seats * fillPct/100) actually filled, so runs =
    // ceil(enrolled / filled seats) = ceil(77 / 6.4) = 13, not ceil(77 / 8) = 10.
    const r = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 77, seats: 8, fillPct: 80 }] } as any)
    expect(r.serviceHours).toBe(13 * 50)
  })

  it('fill 100 is unchanged: ceil(enrolled / seats)', () => {
    const r = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 77, seats: 8, fillPct: 100 }] } as any)
    expect(r.serviceHours).toBe(10 * 50)
  })

  it('fill divides cohorts for run cost too', () => {
    const withRun = { ...group, costPerRun: 400, currentClients: 77, seats: 8, fillPct: 80 }
    const base80 = calc({ ...base, mode: 'current', offerings: [withRun] } as any)
    const full = calc({ ...base, mode: 'current', offerings: [{ ...withRun, fillPct: 100 }] } as any)
    // 13 runs at 80% fill vs 10 at full: 3 more run costs
    expect(base80.variableCosts - full.variableCosts).toBe(3 * 400)
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

// Roadmap 24b: fixed cost per run and break-even fill
describe('group offering, cost per run', () => {
  beforeEach(() => clearCalculationCache())
  const withRun = { ...group, costPerRun: 400 }

  it('current mode charges one run cost per cohort', () => {
    const one = calc({ ...base, mode: 'current', offerings: [{ ...withRun, currentClients: 8 }] } as any)
    const two = calc({ ...base, mode: 'current', offerings: [{ ...withRun, currentClients: 9 }] } as any)
    const none = calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 8 }] } as any)
    expect(one.variableCosts - none.variableCosts).toBe(400)
    expect(two.variableCosts - calc({ ...base, mode: 'current', offerings: [{ ...group, currentClients: 9 }] } as any).variableCosts).toBe(800)
  })

  it('forecast spreads the run cost over filled seats, so under-fill costs more per client', () => {
    const full = calc({ ...base, mode: 'forecast', offerings: [{ ...withRun, fillPct: 100 }] } as any)
    const half = calc({ ...base, mode: 'forecast', offerings: [{ ...withRun, fillPct: 50 }] } as any)
    const perClient = (r: any) => r.offeringMetrics[0].contributionPerClientMonthly
    // 400 / 8 seats = 50 per client per year at full; 400 / 4 = 100 at half
    expect(perClient(full)).toBeCloseTo(100 - 50 / 12, 6)
    expect(perClient(half)).toBeCloseTo(100 - 100 / 12, 6)
  })

  it('reports break-even seats and fill from the run cost', () => {
    // 1200 revenue per seat per year, 400 run cost: one seat covers it
    const m = calc({ ...base, mode: 'current', offerings: [withRun] } as any).offeringMetrics[0]
    expect(m.breakEvenSeats).toBe(1)
    expect(m.breakEvenFillPct).toBeCloseTo(12.5, 6)
    const pricey = calc({ ...base, mode: 'current', offerings: [{ ...withRun, costPerRun: 3000 }] } as any).offeringMetrics[0]
    expect(pricey.breakEvenSeats).toBe(3)
  })

  it('break-even is unreachable when a seat contributes nothing', () => {
    const m = calc({ ...base, mode: 'current', offerings: [{ ...withRun, variableCostPerSession: 24 }] } as any).offeringMetrics[0]
    expect(m.breakEvenSeats).toBe(Infinity)
  })

  it('omits break-even without a run cost and for non-group rows', () => {
    expect(calc({ ...base, mode: 'current', offerings: [group] } as any).offeringMetrics[0].breakEvenSeats).toBeUndefined()
    const sub = { ...withRun, type: 'subscription' }
    const r = calc({ ...base, mode: 'current', offerings: [sub] } as any)
    expect(r.offeringMetrics[0].breakEvenSeats).toBeUndefined()
    expect(r.variableCosts).toBe(0)
  })

  it('sanitizes garbage cost per run to 0', () => {
    for (const bad of [undefined, null, 'abc', -5, NaN, Infinity]) {
      const r = calc({ ...base, mode: 'current', offerings: [{ ...group, costPerRun: bad }] } as any)
      expect(r.variableCosts).toBe(0)
    }
  })

  it('round-trips through scenario sanitizing', () => {
    const s = sanitizeScenarioState({ ...base, mode: 'current', offerings: [withRun] } as any)
    expect(s.offerings[0].costPerRun).toBe(400)
    expect(sanitizeScenarioState({ ...base, mode: 'current', offerings: [{ ...withRun, costPerRun: -9 }] } as any).offerings[0].costPerRun).toBe(0)
  })

  it('imports column 24 and defaults older CSVs to 0', () => {
    const parse = (row: string) => (importFromCSV(`Offerings\nName,Monthly Price,Sessions/Year,Hours/Session,Variable Cost,Mix %,Current Clients\n${row}`) as any).data.offerings[0]
    expect(parse('Yoga,100,12,1,0,100,0,0,group,10,60' + ','.repeat(13) + '250').costPerRun).toBe(250)
    expect(parse('Yoga,100,12,1,0,100,0,0,group,10,60').costPerRun).toBe(0)
  })
})
