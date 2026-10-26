import type { CalcState, Offering } from '../types';

/**
 * Optimistic / base / conservative lens over the low/high bounds. calc() applies the
 * active case itself, so every consumer (KPIs, charts, exports, insights, comparisons)
 * follows it with no per-call-site wiring. Range maths that needs the true base runs
 * calc() with `ignoreCase`. Session-only on purpose: it is never persisted, so a reload
 * or a shared link always opens on the base case.
 */
export type RangeCase = 'conservative' | 'base' | 'optimistic';

export const RANGE_CASES: readonly RangeCase[] = ['conservative', 'base', 'optimistic'];
export const RANGE_CASE_LABELS: Record<RangeCase, string> = { conservative: 'Conservative', base: 'Base', optimistic: 'Optimistic' };

const MAX_CLIENTS = 1e6;

/** Sanitizes one untrusted bound. Absent, blank or non-numeric input means "no bound" (undefined). */
export function sanitizeRangeBound(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

export const clampFill = (v: unknown) => sanitizeRangeBound(v, 1, 100);
export const clampClients = (v: unknown) => {
  const n = sanitizeRangeBound(v, 0, MAX_CLIENTS);
  return n === undefined ? undefined : Math.floor(n);
};

/** Frequency bounds are whole sessions per year; the ceiling matches the scenario sanitizer's sessionsPerYear. */
export const clampSessions = (v: unknown) => {
  const n = sanitizeRangeBound(v, 1, 100000);
  return n === undefined ? undefined : Math.floor(n);
};

/**
 * Every optional low/high bound an offering can carry, in CSV order (the first four are the original
 * columns, the last two were appended). Each layer (sanitizer, CSV, hasRanges, withBounds, drivers)
 * derives from this one list, so a new bound is added here and in BOUND_SANITIZERS only.
 */
export const RANGE_BOUND_KEYS = [
  'fillPctLow', 'fillPctHigh', 'currentClientsLow', 'currentClientsHigh', 'sessionsPerYearLow', 'sessionsPerYearHigh'
] as const;
export type RangeBoundKey = (typeof RANGE_BOUND_KEYS)[number];
export type OfferingRange = Partial<Pick<Offering, RangeBoundKey>>;

export const BOUND_SANITIZERS: Record<RangeBoundKey, (v: unknown) => number | undefined> = {
  fillPctLow: clampFill,
  fillPctHigh: clampFill,
  currentClientsLow: clampClients,
  currentClientsHigh: clampClients,
  sessionsPerYearLow: clampSessions,
  sessionsPerYearHigh: clampSessions
};

/** A one-time sale is always one delivery, so its frequency bounds can never move a number. */
const boundApplies = (o: Offering, k: RangeBoundKey) => !(k.startsWith('sessionsPerYear') && o.type === 'one-time');

/** True when any offering carries at least one bound that applies to its type. */
export function hasRanges(offerings: Offering[] | undefined): boolean {
  return (offerings || []).some(
    (o) => o && RANGE_BOUND_KEYS.some((k) => {
      const b = o[k];
      return boundApplies(o, k) && b !== undefined && b !== null && (b as unknown) !== '';
    })
  );
}

/**
 * Replaces each offering's fill, clients and sessions with its low or high bound, never crossing the base value.
 * Frequency is a cost driver (more sessions is more hours and variable cost for the same monthly price), so
 * the 'low' side, which feeds the Conservative case, takes the HIGH sessions bound and 'high' takes the low one.
 */
export function withBounds(offerings: Offering[], side: 'low' | 'high'): Offering[] {
  const pick = (base: number, bound: number | undefined, s: 'low' | 'high') => {
    if (bound === undefined) return base;
    return s === 'low' ? Math.min(base, bound) : Math.max(base, bound);
  };
  const flip = side === 'low' ? 'high' : 'low';
  return offerings.filter((o) => o && typeof o === 'object').map((o) => {
    const baseFill = clampFill(o.fillPct) ?? 100;
    const baseClients = clampClients(o.currentClients) ?? 0;
    const rest: Offering = { ...o };
    for (const k of RANGE_BOUND_KEYS) delete rest[k];
    const out: Offering = {
      ...rest,
      fillPct: pick(baseFill, clampFill(side === 'low' ? o.fillPctLow : o.fillPctHigh), side),
      currentClients: pick(baseClients, clampClients(side === 'low' ? o.currentClientsLow : o.currentClientsHigh), side)
    };
    if (o.type !== 'one-time') {
      const bound = clampSessions(side === 'low' ? o.sessionsPerYearHigh : o.sessionsPerYearLow);
      if (bound !== undefined) out.sessionsPerYear = pick(Number(o.sessionsPerYear) || 0, bound, flip);
    }
    return out;
  });
}

let activeCase: RangeCase = 'base';

export function getRangeCase(): RangeCase {
  return activeCase;
}

export function setRangeCase(c: unknown): RangeCase {
  activeCase = RANGE_CASES.includes(c as RangeCase) ? (c as RangeCase) : 'base';
  return activeCase;
}

/** State with the case's bounds applied. Base, or a state with no bounds, comes back untouched. */
export function applyRangeCase<T extends CalcState>(state: T, c: RangeCase = activeCase): T {
  const offerings = Array.isArray(state.offerings) ? state.offerings : [];
  if (c === 'base' || !hasRanges(offerings)) return state;
  return { ...state, offerings: withBounds(offerings, c === 'conservative' ? 'low' : 'high') };
}

/** Short tag for exports and chips; empty on the base case. */
export function rangeCaseTag(c: RangeCase = activeCase): string {
  return c === 'base' ? '' : RANGE_CASE_LABELS[c] + ' case';
}
