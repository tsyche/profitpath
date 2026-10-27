import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { rankOfferings } from './offeringRanking'

// Roadmap 24d: contribution per staff hour and the deepest discount an offering survives.
const base = {
  mode: 'current',
  employees: 2,
  employeePay: 50000,
  monthlyCosts: 1000,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 100
}
const sub = {
  name: 'Coaching',
  priceMonthly: 100,
  sessionsPerYear: 12,
  hoursPerSession: 1,
  variableCostPerSession: 10,
  mixPct: 100,
  currentClients: 0
}
const metric = (o: object) => calc({ ...base, offerings: [{ ...sub, ...o }] } as any).offeringMetrics[0] as any

describe('marginPerHour and maxDiscountPct', () => {
  beforeEach(() => clearCalculationCache())

  it('subscription: (price*12 - cost) / staff hours per client, even with zero clients', () => {
    const m = metric({})
    expect(m.marginPerHour).toBeCloseTo(90) // (1200 - 120) / 12h
    expect(m.maxDiscountPct).toBeCloseTo(90)
  })

  it('labor % of price counts as cost', () => {
    const m = metric({ laborPctOfPrice: 50, variableCostPerSession: 0 })
    expect(m.maxDiscountPct).toBeCloseTo(50)
    expect(m.marginPerHour).toBeCloseTo(50) // 600 / 12h
  })

  it('group: under-filled class spreads the same hours over fewer seats', () => {
    const full = metric({ type: 'group', seats: 8, fillPct: 100 })
    const half = metric({ type: 'group', seats: 8, fillPct: 50 })
    expect(half.marginPerHour).toBeCloseTo(full.marginPerHour / 2)
  })

  it('cost above price: negative per hour, zero discount headroom', () => {
    const m = metric({ priceMonthly: 10, variableCostPerSession: 50 })
    expect(m.marginPerHour).toBeLessThan(0)
    expect(m.maxDiscountPct).toBe(0)
  })

  it('zero price gives zero headroom, not NaN', () => {
    const m = metric({ priceMonthly: 0 })
    expect(Number.isFinite(m.marginPerHour)).toBe(true)
    expect(m.maxDiscountPct).toBe(0)
  })
})

describe('one-time offerings in the ranking', () => {
  beforeEach(() => clearCalculationCache())

  it('flags hour-free rows and ranks them after rows with staff hours, even negative ones', () => {
    const oneTime = { name: 'Ebook', type: 'one-time', priceMonthly: 20, variableCostPerSession: 2, mixPct: 0, currentClients: 5 }
    const losing = { ...sub, name: 'Loss', priceMonthly: 10, variableCostPerSession: 50 }
    const rows = rankOfferings(calc({ ...base, offerings: [oneTime, losing] } as any).offeringMetrics as any)
    expect(rows.map(r => r.name)).toEqual(['Loss', 'Ebook'])
    expect(rows[1].hourFree).toBe(true)
    expect(rows[0].hourFree).toBe(false)
  })
})

describe('rankOfferings', () => {
  const m = (name: string, marginPerHour: number, maxDiscountPct: number) => ({ name, marginPerHour, maxDiscountPct }) as any

  it('sorts by margin per hour and flags headroom', () => {
    const rows = rankOfferings([m('A', 10, 5), m('B', 90, 90), m('C', -5, 0), m('D', 40, 15)])
    expect(rows.map((r) => [r.name, r.status])).toEqual([
      ['B', 'ok'], ['D', 'ok'], ['A', 'thin'], ['C', 'loss'],
    ])
  })
})

describe('best-case discount (roadmap 24d)', () => {
  beforeEach(() => clearCalculationCache())

  // price 100/mo, no variable cost beyond 50% labor: max discount is exactly 50%
  const half = { variableCostPerSession: 0, laborPctOfPrice: 50 }
  const row = (o: object) => rankOfferings([metric({ ...half, ...o })])[0]

  it('absent or zero discount reproduces the plain headroom check', () => {
    expect(row({}).status).toBe('ok')
    expect(row({ discountPct: 0 })).toMatchObject({ status: 'ok', discountedMarginPerHour: 50 })
  })

  it('status flips as the discount eats the headroom, exactly at break-even', () => {
    expect(row({ discountPct: 30 }).status).toBe('ok') // 20 points left
    expect(row({ discountPct: 40 }).status).toBe('thin') // 10 points left
    expect(row({ discountPct: 50 }).status).toBe('loss') // price == cost
    expect(row({ discountPct: 60 }).status).toBe('loss')
  })

  it('discounted margin per hour drops by the discount on price only', () => {
    expect(row({ discountPct: 20 }).discountedMarginPerHour).toBeCloseTo(30) // (960 - 600) / 12h
    expect(row({ discountPct: 20 }).marginPerHour).toBeCloseTo(50) // list ranking unchanged
  })

  it('discount never changes revenue, income or break-even', () => {
    const run = (discountPct: number) => calc({ ...base, offerings: [{ ...sub, ...half, discountPct, currentClients: 20 }] } as any)
    const a = run(0)
    const b = run(40)
    expect(b.revenue).toBe(a.revenue)
    expect(b.income).toBe(a.income)
    expect(b.breakEvenClients).toBe(a.breakEvenClients)
  })

  it('edits bypass the calc cache', () => {
    expect(row({ discountPct: 10 }).discountPct).toBe(10)
    expect(row({ discountPct: 20 }).discountPct).toBe(20)
  })

  it('junk or out-of-range discounts are clamped', () => {
    expect(row({ discountPct: 'abc' }).discountPct).toBe(0)
    expect(row({ discountPct: -5 }).discountPct).toBe(0)
    expect(row({ discountPct: 500 }).discountPct).toBe(100)
  })
})

describe('staff-free offerings in the ranking (roadmap 35)', () => {
  beforeEach(() => clearCalculationCache())

  it('a staff-free resource row is hour-free and ranks after rows with staff hours', () => {
    const staffFreeResource = { id: 'booth', name: 'Booth', hoursPerWeek: 10, weeksPerYear: 52, staffFree: true }
    const freeRow = { ...sub, name: 'Rehearsal', resource: 'booth', priceMonthly: 100 }
    const staffed = { ...sub, name: 'Lesson' }
    const r = calc({ ...base, resources: [staffFreeResource], offerings: [freeRow, staffed] } as any)
    const rows = rankOfferings(r.offeringMetrics as any)
    expect(rows.find((x: any) => x.name === 'Rehearsal')!.hourFree).toBe(true)
    expect(rows[rows.length - 1].name).toBe('Rehearsal')
  })
})
