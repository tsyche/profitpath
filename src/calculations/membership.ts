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

/** Sanitizes untrusted profile rows: capped, visits clamped to 0-1000 per month (fractions allowed). */
export function sanitizeProfiles(raw: unknown, makeId: () => string = () => ''): MemberProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === 'object')
    .slice(0, MAX_PROFILES)
    .map((p: Record<string, unknown>) => {
      const visits: Record<string, number> = {};
      if (p.visits && typeof p.visits === 'object' && !Array.isArray(p.visits)) {
        for (const [id, v] of Object.entries(p.visits).slice(0, MAX_ELIGIBLE)) {
          visits[id.slice(0, MAX_ID_LENGTH)] = sanitizeRangeBound(v, 0, MAX_VISITS) ?? 0;
        }
      }
      return { id: cleanId(p.id, makeId), name: cleanName(p.name), visits };
    });
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
