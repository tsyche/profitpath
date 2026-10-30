import { describe, expect, it } from 'vitest';
import { membershipFloor, membershipValueWarnings } from './membershipFloor';
import type { MembershipPlan } from '../types';

// Same hand-computed studio fixture as membership.test.ts; no customer data.
const studio = { id: 'studio', type: 'per-session', priceMonthly: 60, sessionsPerYear: 12, variableCostPerSession: 10, hoursPerSession: 1 };
const plan: MembershipPlan = { id: 'p', name: 'Member', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 25, eligible: ['studio'] };

describe('membership floor and value ladder', () => {
  it('tests both full redemption and cash, without implicitly stacking', () => {
    expect(membershipFloor(studio, [plan])).toMatchObject({ price: 45, discountPct: 25, basis: 'cash-discount' });
    expect(membershipFloor(studio, [{ ...plan, memberDiscountPct: 0 }]).price).toBe(50);
    expect(membershipFloor(studio, [{ ...plan, creditsAtMemberPrice: true }]).price).toBeCloseTo(37.5);
  });
  it('uses included service visits before credits, excluding other services and unused credits', () => {
    expect(membershipFloor(studio, [{ ...plan, includedVisits: { studio: 1, other: 100 } }]).price).toBeCloseTo(100 / 3);
    expect(membershipFloor(studio, [{ ...plan, eligible: [], includedVisits: { studio: 2 } }]).price).toBe(50);
    expect(membershipFloor(studio, [{ ...plan, eligible: [] }]).price).toBe(60);
  });
  it('handles free credits, 100% discounts, zero prices, one-time sales and no plans', () => {
    expect(membershipFloor(studio, [{ ...plan, monthlyFee: 0 }]).price).toBe(0);
    expect(membershipFloor(studio, [{ ...plan, memberDiscountPct: 100, creditsAtMemberPrice: true }]).price).toBe(0);
    expect(membershipFloor({ ...studio, priceMonthly: 0 }, [plan]).discountPct).toBe(0);
    expect(membershipFloor({ ...studio, type: 'one-time' }, []).price).toBe(720);
    expect(membershipFloor(studio, []).planName).toBeNull();
  });
  it('warns only for a lower-fee plan that costs no more on the same actual profile', () => {
    const high = { ...plan, id: 'high', name: 'Plus', monthlyFee: 120 };
    const warnings = membershipValueWarnings([plan, high], [{ id: 'm', name: 'Two visits', visits: { studio: 2 } }], [studio]);
    expect(warnings).toEqual([{ profileName: 'Two visits', lowerName: 'Member', higherName: 'Plus', monthlyDifference: 20 }]);
    expect(membershipValueWarnings([plan, { ...high, creditsPerMonth: 240 }], [{ id: 'm', name: 'Four visits', visits: { studio: 4 } }], [studio])).toEqual([]);
    expect(membershipValueWarnings([plan, high], [{ id: 'm', name: 'Empty', visits: {} }], [studio])).toEqual([]);
  });
});
