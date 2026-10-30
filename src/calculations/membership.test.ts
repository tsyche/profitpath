import { describe, it, expect } from 'vitest'
import { calcMembership, calcMembershipRange, hasVisitRange, maxMembers, recommendCredits, recommendDiscount, recommendFee, pruneMembership, sanitizePlans, sanitizeProfiles } from './membership'
import type { MembershipPlan, MemberProfile } from '../types'

// Roadmap 24a: all figures hand-computed. Studio lists at $60 per session
// (priceMonthly 60 x 12 / sessionsPerYear 12).
const studio = { id: 'studio', name: 'Studio hour', type: 'per-session' as const, priceMonthly: 60, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 10, laborPctOfPrice: 0 }
const mixing = { id: 'mixing', name: 'Mixing', type: 'per-session' as const, priceMonthly: 30, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 0, laborPctOfPrice: 0 }
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

  it('uses service-specific included visits before shared credits', () => {
    const p = plan({ monthlyFee: 0, creditsPerMonth: 60, eligible: ['studio'], includedVisits: { studio: 1 } });
    const m = calcMembership(p, profile({ studio: 2 }), offerings);
    expect(m.includedVisitsUsed).toBe(1);
    expect(m.creditsUsed).toBe(60);
    expect(m.memberSpend).toBe(0);
    expect(m.regularSpend).toBe(120);
    expect(m.deliveryCost).toBe(20);
    expect(m.staffHours).toBe(2);
  });

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
    const sale = { id: 'sale', name: 'Sale', type: 'one-time' as const, priceMonthly: 10, sessionsPerYear: 1, hoursPerSession: 3, variableCostPerSession: 0, laborPctOfPrice: 0 }
    const r = calcMembership(plan({ eligible: ['sale'] }), profile({ sale: 1 }), [sale])
    expect(r.regularSpend).toBe(120)
    expect(r.staffHours).toBe(0)
  })
})

// Roadmap 35: the member's payment fee (processingFeePct) must hit the "you keep"
// figures, same as calc() applies it. Without it, "You keep" overstates by the
// fee share of fee + cash revenue.
describe('calcMembership processing fee', () => {
  const fee = (processingFeePct: number) =>
    calcMembership(plan({ monthlyFee: 100 }), profile({ studio: 1 }), offerings, processingFeePct)

  it('applies the fee to fee + cash revenue (the only revenue membership has)', () => {
    const r = fee(2.9)
    // revenue 100, fee 2.9, so the business keeps 97.1 of the 100
    expect(r.fees).toBeCloseTo(2.9, 6)
    expect(r.revenue).toBe(100)
    expect(r.keptRevenue).toBeCloseTo(97.1, 6)
  })

  it('"You keep" (margin) is measured against kept revenue, not gross', () => {
    const r = fee(2.9)
    // deliveryCost 10, keptRevenue 97.1 -> margin 87.1; gross-based margin would be 90
    expect(r.margin).toBeCloseTo(87.1, 6)
    expect(r.margin).not.toBeCloseTo(90, 6)
  })

  it('marginPct is off kept revenue', () => {
    const r = fee(2.9)
    expect(r.marginPct).toBeCloseTo((87.1 / 97.1) * 100, 4)
  })

  it('defaults to no fee', () => {
    const r = calcMembership(plan({ monthlyFee: 100 }), profile({ studio: 1 }), offerings)
    expect(r.fees).toBe(0)
    expect(r.keptRevenue).toBe(100)
    expect(r.margin).toBe(90)
  })

  it('the fee never changes what the member pays or saves', () => {
    const r = fee(5)
    // studio is eligible: fee 100 + cash 0; credits cover the visit entirely
    expect(r.memberSpend).toBe(100)
    expect(r.savings).toBe(-40)
  })

  it('clamps an out-of-range fee to 0-20', () => {
    expect(calcMembership(plan({ monthlyFee: 100 }), profile({ studio: 1 }), offerings, 1e9).fees).toBeCloseTo(20, 6)
    expect(calcMembership(plan({ monthlyFee: 100 }), profile({ studio: 1 }), offerings, -5).fees).toBe(0)
  })

  it('recommendFee targets the margin on kept revenue', () => {
    // revenue = fee + cash, kept = revenue*(1-0.02), margin = kept - delivery.
    // With cash 0 and delivery 10, 50% margin needs kept = 20 -> fee = 20/0.98 = 20.4081...
    const r = recommendFee(plan({ monthlyFee: 999, creditsPerMonth: 120 }), profile({ studio: 1 }), offerings, 50, 2)
    expect(r.feasible && r.fee).toBeCloseTo(20.41, 2)
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

// Roadmap 24e slice 2: optional low/high visits per offering, evaluated as a scenario envelope.
describe('calcMembershipRange', () => {
  const ranged = (over: Partial<MemberProfile> = {}): MemberProfile => ({ ...profile({ studio: 1 }), visitsLow: { studio: 0 }, visitsHigh: { studio: 3 }, ...over })

  it('is null without bounds', () => {
    expect(hasVisitRange(profile({ studio: 1 }))).toBe(false)
    expect(calcMembershipRange(plan(), profile({ studio: 1 }), offerings)).toBeNull()
  })

  it('worked example across 0 / 1 / 3 visits (hand-computed)', () => {
    const r = calcMembershipRange(plan(), ranged(), offerings)!
    expect(r.memberSpend).toEqual({ min: 100, base: 100, max: 160 })
    expect(r.savings).toEqual({ min: -100, base: -40, max: 20 })
    expect(r.staffHours).toEqual({ min: 0, base: 1, max: 3 })
    expect(r.creditsUnused).toEqual({ min: 0, base: 60, max: 120 })
  })

  it('margin takes min/max across runs: fewer visits can mean MORE margin', () => {
    const r = calcMembershipRange(plan(), ranged(), offerings)!
    // 0 visits keeps the fee with no delivery cost (100); 1 visit leaves 90; 3 visits earn 160 - 30 = 130
    expect(r.margin).toEqual({ min: 90, base: 90, max: 130 })
  })

  it('a bound on the wrong side of base never crosses it', () => {
    const r = calcMembershipRange(plan(), ranged({ visitsLow: { studio: 5 }, visitsHigh: { studio: 0 } }), offerings)!
    expect(r.savings).toEqual({ min: -40, base: -40, max: -40 })
  })

  it('a one-sided bound collapses the other side to base', () => {
    const r = calcMembershipRange(plan(), ranged({ visitsLow: undefined }), offerings)!
    expect(r.staffHours).toEqual({ min: 1, base: 1, max: 3 })
  })

  it('a bound on an offering with no base visits widens from zero', () => {
    const r = calcMembershipRange(plan(), { ...profile({ studio: 1 }), visitsHigh: { mixing: 2 } }, offerings)!
    expect(r.staffHours).toEqual({ min: 1, base: 1, max: 5 })
  })
})

describe('visit bounds persistence', () => {
  it('sanitizer clamps, drops junk and omits empty maps', () => {
    const out = sanitizeProfiles([{ name: 'M', visits: { a: 1 }, visitsLow: { a: -3, b: 'x', c: 0.5 }, visitsHigh: { a: 1e9 } }], () => 'gen')[0]
    expect(out.visitsLow).toEqual({ a: 0, c: 0.5 })
    expect(out.visitsHigh).toEqual({ a: 1000 })
    const plain = sanitizeProfiles([{ name: 'M', visits: { a: 1 }, visitsLow: { b: 'x' }, visitsHigh: 'nope' }], () => 'gen')[0]
    expect(Object.keys(plain)).not.toContain('visitsLow')
    expect(Object.keys(plain)).not.toContain('visitsHigh')
  })

  it('prune drops bounds on offerings that no longer exist', () => {
    const { profiles } = pruneMembership([], [{ id: 'p', name: 'P', visits: { a: 1 }, visitsLow: { a: 0, gone: 1 }, visitsHigh: { gone: 4 } }], new Set(['a']))
    expect(profiles[0].visitsLow).toEqual({ a: 0 })
    expect(Object.keys(profiles[0])).not.toContain('visitsHigh')
  })
})

// Roadmap 24e slice 3: members a profile fits before staff or a pool saturates (annual target hours).
describe('maxMembers', () => {
  const staff = { id: 'staff', name: 'Staff', hours: 1200 }
  const booth = { id: 'booth', name: 'Booth', hours: 52 }
  const inBooth = [{ ...studio, resource: 'booth' }, mixing]

  it('staff-bound: 1 studio visit a month is 12 h a year, so 100 members fit in 1200 h', () => {
    expect(maxMembers(profile({ studio: 1 }), offerings, [staff])).toEqual({ members: 100, binding: 'staff' })
  })

  it('a tagged pool can bind before staff: 52 h / 12 h = 4 members', () => {
    expect(maxMembers(profile({ studio: 1 }), inBooth, [staff, booth])).toEqual({ members: 4, binding: 'booth' })
  })

  it('a staff-free pool puts no hours on staff, so only the pool binds', () => {
    const r = maxMembers(profile({ studio: 1, mixing: 1 }), inBooth, [staff, { ...booth, staffFree: true, hours: 120 }])
    // booth: 12 h/yr per member -> 10; staff carries only mixing (24 h/yr) -> 50
    expect(r).toEqual({ members: 10, binding: 'booth' })
  })

  it('a tag pointing at a missing pool counts against staff only', () => {
    expect(maxMembers(profile({ studio: 1 }), inBooth, [staff])).toEqual({ members: 100, binding: 'staff' })
  })

  it('ties go to staff', () => {
    expect(maxMembers(profile({ studio: 1 }), inBooth, [staff, { ...booth, hours: 1200 }])).toEqual({ members: 100, binding: 'staff' })
  })

  it('no delivery hours is unbounded, and one-time rows add none', () => {
    expect(maxMembers(profile({}), offerings, [staff])).toEqual({ members: null, binding: null })
    const oneTime = { id: 'kit', type: 'one-time' as const, priceMonthly: 50, sessionsPerYear: 1, hoursPerSession: 5 }
    expect(maxMembers(profile({ kit: 3 }), [oneTime], [staff])).toEqual({ members: null, binding: null })
  })

  it('a pool with zero hours caps members at 0', () => {
    expect(maxMembers(profile({ studio: 1 }), inBooth, [staff, { ...booth, hours: 0 }])).toEqual({ members: 0, binding: 'booth' })
  })

  it('subtracts existing scenario load before counting additional members', () => {
    expect(maxMembers(profile({ studio: 1 }), inBooth, [
      { ...staff, usedHours: 64 },
      { ...booth, usedHours: 16 }
    ])).toEqual({ members: 3, binding: 'booth' })
  })
})

// Roadmap 24e slice 4: fee for a target margin with credits and discount fixed.
// Studio visit: list $60, cost $10, covered by credits (cash 0), so margin = 1 - 10 / fee.
describe('recommendFee', () => {
  it('solves fee = cost / (1 - margin) - cash: 50% target on $10 cost is $20', () => {
    const r = recommendFee(plan({ monthlyFee: 999 }), profile({ studio: 1 }), offerings, 50)
    expect(r).toEqual({ feasible: true, fee: 20, maxFee: 60 })
    const check = calcMembership(plan({ monthlyFee: 20 }), profile({ studio: 1 }), offerings)
    expect(check.marginPct).toBe(50)
    expect(check.savings).toBeGreaterThan(0)
  })

  it('0% target is break-even', () => {
    expect(recommendFee(plan(), profile({ studio: 1 }), offerings, 0)).toEqual({ feasible: true, fee: 10, maxFee: 60 })
  })

  it('infeasible when the fee needed would leave the member paying at least their regular spend', () => {
    // 90% needs a $100 fee; the member only saves below $60
    expect(recommendFee(plan(), profile({ studio: 1 }), offerings, 90)).toEqual({ feasible: false, reason: 'member-loses', fee: 100, maxFee: 60 })
  })

  it('cash already in the plan lowers the fee, floored at 0', () => {
    // mixing is ineligible: $60 cash, so the 50% target is met with no fee at all
    expect(recommendFee(plan(), profile({ studio: 1, mixing: 2 }), offerings, 50)).toEqual({ feasible: true, fee: 0, maxFee: 60 })
  })

  it('rounds the fee up to the cent so the target is never undershot', () => {
    const r = recommendFee(plan(), profile({ studio: 1 }), offerings, 33)
    expect(r.feasible && r.fee).toBe(14.93) // 10 / 0.67 = 14.925...
  })

  it('reports explicit failures for no visits and for an invalid target', () => {
    expect(recommendFee(plan(), profile({}), offerings, 50)).toEqual({ feasible: false, reason: 'no-visits' })
    expect(recommendFee(plan(), profile({ studio: 1 }), offerings, 100)).toEqual({ feasible: false, reason: 'invalid-target' })
    expect(recommendFee(plan(), profile({ studio: 1 }), offerings, NaN)).toEqual({ feasible: false, reason: 'invalid-target' })
  })
})

describe('recommendCredits and recommendDiscount', () => {
  const terms = plan({ monthlyFee: 0, creditsPerMonth: 0, memberDiscountPct: 0 });

  it('solves shared credits for a target margin while holding other terms fixed', () => {
    expect(recommendCredits(terms, profile({ studio: 1 }), offerings, 50)).toBe(40);
  });

  it('sanitizes and prunes included visits by offering', () => {
    const p = sanitizePlans([{ ...plan(), includedVisits: { studio: 1.5, gone: -1, junk: 'nope' } }])[0];
    expect(p.includedVisits).toEqual({ studio: 1.5, gone: 0, junk: 0 });
    const pruned = pruneMembership([p], [], new Set(['studio']));
    expect(pruned.plans[0].includedVisits).toEqual({ studio: 1.5 });
  });

  it('solves a discount in 0.1 point steps for a target margin', () => {
    expect(recommendDiscount(terms, profile({ studio: 1 }), offerings, 50)).toBe(66.7);
  });

  it('returns null when target is outside the achievable range or there are no visits', () => {
    expect(recommendCredits(terms, profile({ studio: 1 }), offerings, 95)).toBeNull();
    expect(recommendDiscount(terms, profile({}), offerings, 50)).toBeNull();
  });
});
