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

/** True when any offering carries at least one bound. */
export function hasRanges(offerings: Offering[] | undefined): boolean {
  return (offerings || []).some(
    (o) => o && [o.fillPctLow, o.fillPctHigh, o.currentClientsLow, o.currentClientsHigh].some(
      (b) => b !== undefined && b !== null && (b as unknown) !== ''
    )
  );
}

/** Replaces each offering's fill and clients with its low or high bound, never crossing the base value. */
export function withBounds(offerings: Offering[], side: 'low' | 'high'): Offering[] {
  const pick = (base: number, bound: number | undefined) => {
    if (bound === undefined) return base;
    return side === 'low' ? Math.min(base, bound) : Math.max(base, bound);
  };
  return offerings.filter((o) => o && typeof o === 'object').map((o) => {
    const baseFill = clampFill(o.fillPct) ?? 100;
    const baseClients = clampClients(o.currentClients) ?? 0;
    const { fillPctLow, fillPctHigh, currentClientsLow, currentClientsHigh, ...rest } = o;
    return {
      ...rest,
      fillPct: pick(baseFill, clampFill(side === 'low' ? fillPctLow : fillPctHigh)),
      currentClients: pick(baseClients, clampClients(side === 'low' ? currentClientsLow : currentClientsHigh))
    };
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
