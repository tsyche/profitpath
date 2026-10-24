import { calc } from './index';
import type { CalcResult, CalcState, Offering } from '../types';

/**
 * Low/high bounds for the two guessable per-offering inputs: forecast fill %
 * and current client count. A bound that is absent means "no range": the band
 * collapses to the base value.
 */

const MAX_CLIENTS = 1e6;

export type RangeMetric = 'revenue' | 'income' | 'clients' | 'capacityPct' | 'breakEvenClients';

export interface RangeBand {
  min: number;
  base: number;
  max: number;
}

export type RangeResult = Record<RangeMetric, RangeBand>;

const RANGE_METRICS: readonly RangeMetric[] = ['revenue', 'income', 'clients', 'capacityPct', 'breakEvenClients'];

/** Sanitizes one untrusted bound. Absent, blank or non-numeric input means "no bound" (undefined). */
export function sanitizeRangeBound(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

const clampFill = (v: unknown) => sanitizeRangeBound(v, 1, 100);
const clampClients = (v: unknown) => {
  const n = sanitizeRangeBound(v, 0, MAX_CLIENTS);
  return n === undefined ? undefined : Math.floor(n);
};

/** Allowlisted, clamped range fields for an untrusted offering; only bounds that are present appear. */
export function sanitizeOfferingRange(o: Record<string, unknown>): Partial<Pick<Offering, 'fillPctLow' | 'fillPctHigh' | 'currentClientsLow' | 'currentClientsHigh'>> {
  const out: Partial<Pick<Offering, 'fillPctLow' | 'fillPctHigh' | 'currentClientsLow' | 'currentClientsHigh'>> = {};
  const fl = clampFill(o.fillPctLow);
  const fh = clampFill(o.fillPctHigh);
  const cl = clampClients(o.currentClientsLow);
  const ch = clampClients(o.currentClientsHigh);
  if (fl !== undefined) out.fillPctLow = fl;
  if (fh !== undefined) out.fillPctHigh = fh;
  if (cl !== undefined) out.currentClientsLow = cl;
  if (ch !== undefined) out.currentClientsHigh = ch;
  return out;
}

/** The four range columns for CSV export; blank cells mean no bound. */
export function rangeCsvCells(o: Offering): string {
  return [o.fillPctLow, o.fillPctHigh, o.currentClientsLow, o.currentClientsHigh]
    .map((v) => (v === undefined || v === null ? '' : String(v)))
    .join(',');
}

/** True when any offering carries at least one bound. */
export function hasRanges(offerings: Offering[] | undefined): boolean {
  return (offerings || []).some(
    (o) => o && [o.fillPctLow, o.fillPctHigh, o.currentClientsLow, o.currentClientsHigh].some(
      (b) => b !== undefined && b !== null && (b as unknown) !== ''
    )
  );
}

/** Replaces each offering's fill and clients with its low or high bound, never crossing the base value. */
function withBounds(offerings: Offering[], side: 'low' | 'high'): Offering[] {
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

/**
 * Runs calc() with every low bound, the base, and every high bound, and reports
 * min/base/max per headline metric. This is a scenario envelope (all guesses
 * low together, all high together), not a statistical interval. min/max are
 * taken across the runs rather than assuming low inputs mean low outputs.
 * Returns null when no offering has a bound set.
 */
export function calcRange(state: CalcState): RangeResult | null {
  const offerings = Array.isArray(state.offerings) ? state.offerings : [];
  if (!hasRanges(offerings)) return null;

  const base = calc(state);
  const runs: CalcResult[] = [
    calc({ ...state, offerings: withBounds(offerings, 'low') }),
    base,
    calc({ ...state, offerings: withBounds(offerings, 'high') })
  ];

  const out = {} as RangeResult;
  for (const m of RANGE_METRICS) {
    const values = runs.map((r) => r[m]);
    out[m] = { min: Math.min(...values), base: base[m], max: Math.max(...values) };
  }
  return out;
}
