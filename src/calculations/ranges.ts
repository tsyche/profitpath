import { calc } from './index';
import type { CalcResult, CalcState, Confidence, Offering } from '../types';

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

/** Spread applied around the base value for each confidence tag; verified and untagged get no bounds. */
export const CONFIDENCE_SPREAD_PCT: Partial<Record<Confidence, number>> = { estimated: 15, guess: 30 };

/**
 * Suggested bounds from the offering's confidence tag, for the inputs the mode actually uses
 * (fill % for group offerings in Forecast, current clients in Current). Only empty bounds are filled,
 * so typed values are never overwritten.
 */
export function suggestRanges(o: Offering, mode: string): Partial<Pick<Offering, 'fillPctLow' | 'fillPctHigh' | 'currentClientsLow' | 'currentClientsHigh'>> {
  const spread = o.confidence ? CONFIDENCE_SPREAD_PCT[o.confidence] : undefined;
  if (!spread) return {};
  const lo = 1 - spread / 100;
  const hi = 1 + spread / 100;
  const out: ReturnType<typeof suggestRanges> = {};
  if (mode === 'forecast') {
    if (o.type !== 'group') return out;
    const base = clampFill(o.fillPct) ?? 100;
    if (o.fillPctLow === undefined) out.fillPctLow = clampFill(Math.round(base * lo));
    if (o.fillPctHigh === undefined) out.fillPctHigh = clampFill(Math.round(base * hi));
  } else {
    const base = clampClients(o.currentClients) ?? 0;
    if (o.currentClientsLow === undefined) out.currentClientsLow = clampClients(Math.floor(base * lo));
    if (o.currentClientsHigh === undefined) out.currentClientsHigh = clampClients(Math.ceil(base * hi));
  }
  return out;
}

export interface RangeDriver {
  name: string;
  confidence?: Confidence;
  swing: number;
}

/** Net-profit swing caused by each offering's bounds alone (others held at base), biggest first. */
export function calcRangeDrivers(state: CalcState): RangeDriver[] {
  const offerings = Array.isArray(state.offerings) ? state.offerings : [];
  if (!hasRanges(offerings)) return [];
  const boundKeys = ['fillPctLow', 'fillPctHigh', 'currentClientsLow', 'currentClientsHigh'] as const;
  const base = calc(state).income;
  const drivers: RangeDriver[] = [];
  offerings.forEach((o, i) => {
    if (!o || !hasRanges([o])) return;
    const only = offerings.map((p, j) => {
      if (j === i || !p) return p;
      const copy = { ...p };
      for (const k of boundKeys) delete copy[k];
      return copy;
    });
    const incomes = [calc({ ...state, offerings: withBounds(only, 'low') }).income, base, calc({ ...state, offerings: withBounds(only, 'high') }).income];
    const swing = Math.max(...incomes) - Math.min(...incomes);
    if (swing > 0) drivers.push({ name: String(o.name), confidence: o.confidence, swing });
  });
  return drivers.sort((a, b) => b.swing - a.swing);
}
