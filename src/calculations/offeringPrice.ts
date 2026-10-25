// Per-session pricing is an entry lens over priceMonthly, the one canonical price: calc, what-ifs,
// exports and every price-scaling lever keep reading and scaling priceMonthly unchanged.
// A per-session row shows and edits price per visit; visits per year stays a separate assumption.
import type { OfferingType } from '../types';

type PriceFields = { type?: OfferingType | string; priceMonthly: number; sessionsPerYear: number };

export function isPerSession(o: { type?: unknown }): boolean {
  return o.type === 'per-session';
}

/** One-time rows sell once (sessions fixed at 1, no staff hours); price is per sale. */
export function isOneTime(o: { type?: unknown }): boolean {
  return o.type === 'one-time';
}

/** Price per visit implied by the canonical monthly price and the visit count; 0 when there are no visits. */
export function pricePerSession(o: Pick<PriceFields, 'priceMonthly' | 'sessionsPerYear'>): number {
  return o.sessionsPerYear > 0 ? (o.priceMonthly * 12) / o.sessionsPerYear : 0;
}

/** Monthly-equivalent price for a given per-visit price and visit count. */
export function monthlyFromPerSession(perSession: number, sessionsPerYear: number): number {
  return (perSession * sessionsPerYear) / 12;
}

/** Price shown in the "Price" cell: per visit (per-session) or per sale (one-time), else per month. */
export function displayPrice(o: PriceFields): number {
  if (isOneTime(o)) return o.priceMonthly * 12;
  return isPerSession(o) ? pricePerSession(o) : o.priceMonthly;
}

/** New priceMonthly when a per-session row's visit count changes: the per-visit price stays fixed. */
export function priceMonthlyForNewVisits(o: Pick<PriceFields, 'priceMonthly' | 'sessionsPerYear'>, newSessions: number): number {
  const perSession = pricePerSession(o);
  return perSession > 0 ? monthlyFromPerSession(perSession, newSessions) : o.priceMonthly;
}
