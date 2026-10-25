import { describe, it, expect } from 'vitest'
import { calcMembership, sanitizePlans, sanitizeProfiles } from './membership'
import type { MembershipPlan, MemberProfile } from '../types'

// Roadmap 24a: all figures hand-computed. Studio lists at $60 per session
// (priceMonthly 60 x 12 / sessionsPerYear 12).
const studio = { id: 'studio', name: 'Studio hour', type: 'per-session', priceMonthly: 60, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 10, laborPctOfPrice: 0 }
const mixing = { id: 'mixing', name: 'Mixing', type: 'per-session', priceMonthly: 30, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 0, laborPctOfPrice: 0 }
const offerings = [studio, mixing]

const plan = (over: Partial<MembershipPlan> = {}): MembershipPlan => ({
  id: 'p1', name: 'Plan', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 0, eligible: ['studio'], ...over,
})
const profile = (visits: Record<string, number>): MemberProfile => ({ id: 'm1', name: 'Member', visits })

describe('calcMembership', () => {
  it('worked example: headline +$20, actual -$40, half the credits unused', () => {
    const r = calcMembership(plan(), profile({ studio: 1 }), offerings)
    expect(r.headlineSaving).toBe(20)
    expect(r.regularSpend).toBe(60)
    expect(r.memberSpend).toBe(100)
    expect(r.savings).toBe(-40)
    expect(r.savingsPct).toBeCloseTo(-66.667, 2)
    expect(r.creditsUsed).toBe(60)
    expect(r.creditsUnused).toBe(60)
    expect(r.breakagePct).toBe(50)
    expect(r.revenue).toBe(100)
    expect(r.deliveryCost).toBe(10)
    expect(r.margin).toBe(90)
    expect(r.marginPct).toBe(90)
    expect(r.staffHours).toBe(1)
  })

  it('ineligible service is cash at list and uses no credits', () => {
    const r = calcMembership(plan(), profile({ studio: 1, mixing: 2 }), offerings)
    expect(r.regularSpend).toBe(120)
    expect(r.memberSpend).toBe(160)
    expect(r.savings).toBe(-40)
    expect(r.savingsPct).toBeCloseTo(-33.333, 2)
    expect(r.creditsUsed).toBe(60)
    expect(r.staffHours).toBe(5)
  })

  it('discount-only plan applies the member price once', () => {
    const r = calcMembership(plan({ monthlyFee: 20, creditsPerMonth: 0, memberDiscountPct: 20 }), profile({ studio: 4 }), offerings)
    expect(r.regularSpend).toBe(240)
    expect(r.memberSpend).toBe(212)
    expect(r.savings).toBe(28)
    expect(r.savingsPct).toBeCloseTo(11.667, 2)
    expect(r.breakagePct).toBeNull()
  })

  it('credits and discount together: credits at list, discount only on cash beyond', () => {
    const r = calcMembership(plan({ memberDiscountPct: 25 }), profile({ studio: 4 }), offerings)
    expect(r.creditsUsed).toBe(120)
    expect(r.creditsUnused).toBe(0)
    expect(r.memberSpend).toBe(190)
    expect(r.savings).toBe(50)
    expect(r.savingsPct).toBeCloseTo(20.833, 2)
  })

  it('creditsAtMemberPrice opts in to stacking: credits stretch further', () => {
    const r = calcMembership(plan({ memberDiscountPct: 25, creditsAtMemberPrice: true }), profile({ studio: 4 }), offerings)
    expect(r.creditsUsed).toBe(120)
    expect(r.memberSpend).toBe(160)
    expect(r.savings).toBe(80)
    expect(r.savingsPct).toBeCloseTo(33.333, 2)
  })

  it("never reads the offering's own discountPct", () => {
    const withDiscount = offerings.map((o) => ({ ...o, discountPct: 50 }))
    const base = calcMembership(plan({ monthlyFee: 20, creditsPerMonth: 0, memberDiscountPct: 20 }), profile({ studio: 4 }), offerings)
    expect(calcMembership(plan({ monthlyFee: 20, creditsPerMonth: 0, memberDiscountPct: 20 }), profile({ studio: 4 }), withDiscount)).toEqual(base)
  })

  it('zero-fee plan: credits are a straight gift', () => {
    const r = calcMembership(plan({ monthlyFee: 0, creditsPerMonth: 30 }), profile({ studio: 1 }), offerings)
    expect(r.memberSpend).toBe(30)
    expect(r.savings).toBe(30)
    expect(r.savingsPct).toBe(50)
    expect(r.headlineSaving).toBe(30)
  })

  it('empty profile: the fee is all revenue and every credit is breakage', () => {
    const r = calcMembership(plan(), profile({}), offerings)
    expect(r.regularSpend).toBe(0)
    expect(r.savingsPct).toBeNull()
    expect(r.memberSpend).toBe(100)
    expect(r.creditsUnused).toBe(120)
    expect(r.breakagePct).toBe(100)
    expect(r.revenue).toBe(100)
    expect(r.deliveryCost).toBe(0)
    expect(r.marginPct).toBe(100)
  })

  it('delivery cost is variable $ plus labor % of list price, billed for redeemed visits too', () => {
    const labor = { ...studio, variableCostPerSession: 5, laborPctOfPrice: 10 }
    const r = calcMembership(plan(), profile({ studio: 2 }), [labor])
    expect(r.deliveryCost).toBe(22)
    expect(r.revenue).toBe(100)
    expect(r.margin).toBe(78)
  })

  it('ignores visits to offerings that no longer exist', () => {
    const r = calcMembership(plan(), profile({ gone: 5, studio: 1 }), offerings)
    expect(r.regularSpend).toBe(60)
  })

  it('one-time offerings price per sale and use no staff hours', () => {
    const sale = { id: 'sale', name: 'Sale', type: 'one-time', priceMonthly: 10, sessionsPerYear: 1, hoursPerSession: 3, variableCostPerSession: 0, laborPctOfPrice: 0 }
    const r = calcMembership(plan({ eligible: ['sale'] }), profile({ sale: 1 }), [sale])
    expect(r.regularSpend).toBe(120)
    expect(r.staffHours).toBe(0)
  })
})

describe('sanitizePlans / sanitizeProfiles', () => {
  it('non-arrays give empty lists', () => {
    expect(sanitizePlans(null)).toEqual([])
    expect(sanitizeProfiles('x')).toEqual([])
  })

  it('caps at 3, drops junk rows, clamps numbers, fills ids', () => {
    const rows = [null, 7, { name: ' A ', monthlyFee: -5, creditsPerMonth: 'abc', memberDiscountPct: 150, eligible: ['a', 3, 'b'] }, {}, {}, {}]
    const out = sanitizePlans(rows, () => 'gen')
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ id: 'gen', name: 'A', monthlyFee: 0, creditsPerMonth: 0, memberDiscountPct: 100, creditsAtMemberPrice: false, eligible: ['a', 'b'] })
  })

  it('keeps the stacking flag only when strictly true', () => {
    expect(sanitizePlans([{ creditsAtMemberPrice: true }])[0].creditsAtMemberPrice).toBe(true)
    expect(sanitizePlans([{ creditsAtMemberPrice: 'true' }])[0].creditsAtMemberPrice).toBe(false)
  })

  it('profile visits: clamps negatives and non-numbers, keeps fractions', () => {
    const out = sanitizeProfiles([{ name: 'M', visits: { a: -2, b: 'x', c: 1.5, d: 1e9 } }], () => 'gen')
    expect(out[0].visits).toEqual({ a: 0, b: 0, c: 1.5, d: 1000 })
  })
})
