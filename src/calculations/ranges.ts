import { calc } from './index';
import { BOUND_SANITIZERS, RANGE_BOUND_KEYS, clampClients, clampFill, hasRanges, sanitizeRangeBound, withBounds } from './rangeCase';
import type { OfferingRange } from './rangeCase';
import type { CalcResult, CalcState, Confidence, Offering } from '../types';

/**
 * Low/high bounds for the two guessable per-offering inputs: forecast fill %
 * and current client count. A bound that is absent means "no range": the band
 * collapses to the base value.
 */

export { hasRanges, sanitizeRangeBound };

/** The band is always measured from the true base, whatever case the app is viewing. */
const RAW = { ignoreCase: true };

export type RangeMetric = 'revenue' | 'income' | 'clients' | 'capacityPct' | 'breakEvenClients';

export interface RangeBand {
  min: number;
  base: number;
  max: number;
}

export type RangeResult = Record<RangeMetric, RangeBand>;

const RANGE_METRICS: readonly RangeMetric[] = ['revenue', 'income', 'clients', 'capacityPct', 'breakEvenClients'];

/** Allowlisted, clamped range fields for an untrusted offering; only bounds that are present appear. */
export function sanitizeOfferingRange(o: Record<string, unknown>): OfferingRange {
  const out: Record<string, number> = {};
  for (const k of RANGE_BOUND_KEYS) {
    const v = BOUND_SANITIZERS[k](o[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const csvCells = (o: Offering, keys: readonly (typeof RANGE_BOUND_KEYS)[number][]) =>
  keys.map((k) => (o[k] === undefined || o[k] === null ? '' : String(o[k]))).join(',');

/** The fill and client range columns for CSV export; blank cells mean no bound. */
export const rangeCsvCells = (o: Offering) => csvCells(o, RANGE_BOUND_KEYS.slice(0, 4));

/** The frequency range columns, appended at the end of the CSV row so older files still import. */
export const frequencyCsvCells = (o: Offering) => csvCells(o, RANGE_BOUND_KEYS.slice(4));

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

  const base = calc(state, RAW);
  const runs: CalcResult[] = [
    calc({ ...state, offerings: withBounds(offerings, 'low') }, RAW),
    base,
    calc({ ...state, offerings: withBounds(offerings, 'high') }, RAW)
  ];

  const out = {} as RangeResult;
  for (const m of RANGE_METRICS) {
    const values = runs.map((r) => r[m]);
    out[m] = { min: Math.min(...values), base: base[m], max: Math.max(...values) };
  }
  return out;
}

/** True when some bound actually moves a headline number (e.g. client bounds in Forecast mode do nothing). */
export function bandMoves(r: RangeResult | null): r is RangeResult {
  return r !== null && RANGE_METRICS.some((m) => r[m].min !== r[m].max);
}

/** Spread applied around the base value for each confidence tag; verified and untagged get no bounds. */
export const CONFIDENCE_SPREAD_PCT: Partial<Record<Confidence, number>> = { estimated: 15, guess: 30 };

export type ConfidenceSpreads = Partial<Record<Confidence, number>>;

/** Untrusted spreads to 0-100 whole percents; anything unusable falls back to the default for that tag. */
export function sanitizeSpreads(v: unknown): ConfidenceSpreads {
  const src = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const out: ConfidenceSpreads = {};
  for (const k of ['estimated', 'guess'] as const) {
    const n = sanitizeRangeBound(src[k], 0, 100);
    out[k] = n === undefined ? CONFIDENCE_SPREAD_PCT[k] : Math.round(n);
  }
  return out;
}

/**
 * Suggested bounds from the offering's confidence tag, for the inputs the mode actually uses
 * (fill % for group offerings in Forecast, current clients in Current). Only empty bounds are filled,
 * so typed values are never overwritten.
 */
export function suggestRanges(o: Offering, mode: string, spreads: ConfidenceSpreads = CONFIDENCE_SPREAD_PCT): OfferingRange {
  const spread = o.confidence ? spreads[o.confidence] : undefined;
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
  /** Net profit with only this offering's bounds low / high (others at base); either can sit on the base side. */
  min: number;
  max: number;
}

/** Net-profit swing caused by each offering's bounds alone (others held at base), biggest first. */
export function calcRangeDrivers(state: CalcState): RangeDriver[] {
  const offerings = Array.isArray(state.offerings) ? state.offerings : [];
  if (!hasRanges(offerings)) return [];
  const base = calc(state, RAW).income;
  const drivers: RangeDriver[] = [];
  offerings.forEach((o, i) => {
    if (!o || !hasRanges([o])) return;
    const only = offerings.map((p, j) => {
      if (j === i || !p) return p;
      const copy = { ...p };
      for (const k of RANGE_BOUND_KEYS) delete copy[k];
      return copy;
    });
    const incomes = [calc({ ...state, offerings: withBounds(only, 'low') }, RAW).income, base, calc({ ...state, offerings: withBounds(only, 'high') }, RAW).income];
    const min = Math.min(...incomes);
    const max = Math.max(...incomes);
    if (max - min > 0) drivers.push({ name: String(o.name), confidence: o.confidence, swing: max - min, min, max });
  });
  return drivers.sort((a, b) => b.swing - a.swing);
}
