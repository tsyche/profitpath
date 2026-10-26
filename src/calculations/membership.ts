import type { MemberProfile, MembershipPlan } from '../types';
import { isOneTime, pricePerSession } from './offeringPrice';
import { sanitizeRangeBound } from './ranges';

/**
 * Membership / prepaid-credit what-if: one plan against one typical member, priced from
 * the scenario's own offerings. Revenue is fee + cash only; redeeming credits adds delivery
 * cost and staff hours, never revenue. Display only, never fed into calc().
 *
 * Credits are list-price dollars. By default they draw down at list and the member discount
 * applies only to cash beyond them; plan.creditsAtMemberPrice opts in to stacking. An
 * offering's own discountPct is never read, so discounts cannot stack implicitly.
 */

export const MAX_PLANS = 3;
export const MAX_PROFILES = 3;
const MAX_MONEY = 1e9;
const MAX_VISITS = 1000;
const MAX_NAME_LENGTH = 100;
const MAX_ID_LENGTH = 64;
const MAX_ELIGIBLE = 100;

/** The offering fields membership reads; a structural subset of the app's offering rows. */
export interface CatalogOffering {
  id?: string;
  type?: string;
  priceMonthly: number;
  sessionsPerYear: number;
  hoursPerSession?: number;
  variableCostPerSession?: number;
  laborPctOfPrice?: number;
}

export interface MembershipResult {
  /** creditsPerMonth - monthlyFee: what the marketing line promises. */
  headlineSaving: number;
  /** Same visits, all at list price. */
  regularSpend: number;
  /** fee + cash. */
  memberSpend: number;
  savings: number;
  /** Savings as % of regular spend; null when regular spend is 0. */
  savingsPct: number | null;
  creditsUsed: number;
  creditsUnused: number;
  /** Unused credits as % of credits granted; null when none are granted. */
  breakagePct: number | null;
  /** fee + cash; credit redemptions are not revenue. */
  revenue: number;
  /** Delivery cost of every visit, redeemed or paid. */
  deliveryCost: number;
  margin: number;
  /** Margin as % of revenue; null when revenue is 0. */
  marginPct: number | null;
  staffHours: number;
}

const money = (v: unknown) => sanitizeRangeBound(v, 0, MAX_MONEY) ?? 0;
const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : null);

function cleanId(v: unknown, makeId: () => string): string {
  return typeof v === 'string' && v ? v.slice(0, MAX_ID_LENGTH) : makeId();
}

function cleanName(v: unknown): string {
  return (typeof v === 'string' ? v : '').trim().slice(0, MAX_NAME_LENGTH);
}

/** Sanitizes untrusted plan rows: capped, clamped, allowlisted fields only. */
export function sanitizePlans(raw: unknown, makeId: () => string = () => ''): MembershipPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === 'object')
    .slice(0, MAX_PLANS)
    .map((p: Record<string, unknown>) => ({
      id: cleanId(p.id, makeId),
      name: cleanName(p.name),
      monthlyFee: money(p.monthlyFee),
      creditsPerMonth: money(p.creditsPerMonth),
      memberDiscountPct: sanitizeRangeBound(p.memberDiscountPct, 0, 100) ?? 0,
      creditsAtMemberPrice: p.creditsAtMemberPrice === true,
      eligible: Array.isArray(p.eligible)
        ? p.eligible.filter((id): id is string => typeof id === 'string' && id !== '').slice(0, MAX_ELIGIBLE).map((id) => id.slice(0, MAX_ID_LENGTH))
        : [],
    }));
}

/** Visits per offering id, clamped to 0-1000 (fractions allowed). Bounds drop unusable entries; base visits default them to 0. */
function cleanVisits(raw: unknown, isBound: boolean): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [id, v] of Object.entries(raw).slice(0, MAX_ELIGIBLE)) {
      const n = sanitizeRangeBound(v, 0, MAX_VISITS);
      if (n !== undefined || !isBound) out[id.slice(0, MAX_ID_LENGTH)] = n ?? 0;
    }
  }
  return out;
}

/** Sanitizes untrusted profile rows: capped, visits (and optional low/high bounds) clamped to 0-1000 per month. */
export function sanitizeProfiles(raw: unknown, makeId: () => string = () => ''): MemberProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === 'object')
    .slice(0, MAX_PROFILES)
    .map((p: Record<string, unknown>) => {
      const out: MemberProfile = { id: cleanId(p.id, makeId), name: cleanName(p.name), visits: cleanVisits(p.visits, false) };
      const low = cleanVisits(p.visitsLow, true);
      const high = cleanVisits(p.visitsHigh, true);
      if (Object.keys(low).length) out.visitsLow = low;
      if (Object.keys(high).length) out.visitsHigh = high;
      return out;
    });
}

/** Drops eligibility and visits that point at offerings that no longer exist. */
export function pruneMembership(
  plans: MembershipPlan[],
  profiles: MemberProfile[],
  offeringIds: Set<string>
): { plans: MembershipPlan[]; profiles: MemberProfile[] } {
  return {
    plans: plans.map((p) => ({ ...p, eligible: p.eligible.filter((id) => offeringIds.has(id)) })),
    profiles: profiles.map((p) => {
      const keep = (v: Record<string, number>) => Object.fromEntries(Object.entries(v).filter(([id]) => offeringIds.has(id)));
      const out: MemberProfile = { ...p, visits: keep(p.visits) };
      for (const k of ['visitsLow', 'visitsHigh'] as const) {
        const kept = p[k] ? keep(p[k]) : {};
        if (Object.keys(kept).length) out[k] = kept;
        else delete out[k];
      }
      return out;
    })
  };
}

/** List price of one visit: per session, or per sale for one-time rows. */
function visitPrice(o: CatalogOffering): number {
  return isOneTime(o) ? o.priceMonthly * 12 : pricePerSession(o);
}

/** One plan against one profile, per month. Offerings missing from the catalog are ignored. */
export function calcMembership(plan: MembershipPlan, profile: MemberProfile, offerings: CatalogOffering[]): MembershipResult {
  const discount = plan.memberDiscountPct / 100;
  let balance = plan.creditsPerMonth;
  let regularSpend = 0;
  let cash = 0;
  let deliveryCost = 0;
  let staffHours = 0;

  for (const o of offerings) {
    const visits = o.id ? profile.visits[o.id] || 0 : 0;
    if (visits <= 0) continue;
    const price = visitPrice(o);
    regularSpend += visits * price;
    deliveryCost += visits * ((o.variableCostPerSession || 0) + ((o.laborPctOfPrice || 0) / 100) * price);
    if (!isOneTime(o)) staffHours += visits * (o.hoursPerSession || 0);

    if (!o.id || !plan.eligible.includes(o.id)) {
      cash += visits * price;
      continue;
    }
    const memberPrice = price * (1 - discount);
    const creditPrice = plan.creditsAtMemberPrice ? memberPrice : price;
    const lineCredits = visits * creditPrice;
    const covered = Math.min(balance, lineCredits);
    balance -= covered;
    const overflowVisits = creditPrice > 0 ? (lineCredits - covered) / creditPrice : 0;
    cash += overflowVisits * memberPrice;
  }

  const memberSpend = plan.monthlyFee + cash;
  const revenue = memberSpend;
  const margin = revenue - deliveryCost;
  return {
    headlineSaving: plan.creditsPerMonth - plan.monthlyFee,
    regularSpend,
    memberSpend,
    savings: regularSpend - memberSpend,
    savingsPct: pct(regularSpend - memberSpend, regularSpend),
    creditsUsed: plan.creditsPerMonth - balance,
    creditsUnused: balance,
    breakagePct: pct(balance, plan.creditsPerMonth),
    revenue,
    deliveryCost,
    margin,
    marginPct: pct(margin, revenue),
    staffHours,
  };
}

export type MembershipMetric = 'memberSpend' | 'savings' | 'margin' | 'staffHours' | 'creditsUnused';

export const MEMBERSHIP_RANGE_METRICS: readonly MembershipMetric[] = ['memberSpend', 'savings', 'margin', 'staffHours', 'creditsUnused'];

export type MembershipRange = Record<MembershipMetric, { min: number; base: number; max: number }>;

/** True when the profile carries at least one visit bound. */
export const hasVisitRange = (p: MemberProfile) => Object.keys(p.visitsLow || {}).length + Object.keys(p.visitsHigh || {}).length > 0;

/** The profile with each bounded offering moved to its low or high visits, never crossing the base. */
function profileAt(p: MemberProfile, side: 'low' | 'high'): MemberProfile {
  const bounds = (side === 'low' ? p.visitsLow : p.visitsHigh) || {};
  const visits = { ...p.visits };
  for (const [id, bound] of Object.entries(bounds)) {
    const base = visits[id] || 0;
    visits[id] = side === 'low' ? Math.min(base, bound) : Math.max(base, bound);
  }
  return { id: p.id, name: p.name, visits };
}

/**
 * Runs the plan at the profile's low visits, base and high visits (all bounds together, like the main
 * range band) and reports min/base/max per metric. Taken across the runs, not assumed from the side:
 * more visits can lower margin when credits redeem on costly services. Null when the profile has no bounds.
 */
export function calcMembershipRange(plan: MembershipPlan, profile: MemberProfile, offerings: CatalogOffering[]): MembershipRange | null {
  if (!hasVisitRange(profile)) return null;
  const runs = [profileAt(profile, 'low'), profile, profileAt(profile, 'high')].map((p) => calcMembership(plan, p, offerings));
  const out = {} as MembershipRange;
  for (const m of MEMBERSHIP_RANGE_METRICS) {
    const values = runs.map((r) => r[m]);
    out[m] = { min: Math.min(...values), base: runs[1][m], max: Math.max(...values) };
  }
  return out;
}
