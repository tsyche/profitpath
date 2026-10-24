import type { Offering } from '../types';
import { sanitizeRangeBound } from './ranges';
import { sanitizeNote } from './offeringMeta';
import type { RankStatus } from './offeringRanking';

/**
 * Optional market low / high / average per offering (same units as Price / mo),
 * with a green / yellow / red badge: green inside the range and clearing the
 * floor, yellow near an edge or with a thin floor, red outside the range or
 * below cost. The arrow says which way to fix it. Display only, never used by calc.
 */

const MAX_MARKET = 1e9;
/** Within this share of a range edge counts as "near" it. */
export const EDGE_BAND = 0.1;

export type MarketLevel = 'green' | 'yellow' | 'red';
export type MarketDirection = 'below' | 'above';

export interface MarketBadge {
  level: MarketLevel;
  /** below = underpriced, above = overcharging; only set when the badge is not green. */
  direction?: MarketDirection;
}

type MarketFields = Pick<Offering, 'marketLow' | 'marketHigh' | 'marketAvg' | 'marketNote'>;

/** Allowlisted market fields for an untrusted offering; only those present appear. */
export function sanitizeOfferingMarket(o: Record<string, unknown>): MarketFields {
  const out: MarketFields = {};
  const low = sanitizeRangeBound(o.marketLow, 0, MAX_MARKET);
  const high = sanitizeRangeBound(o.marketHigh, 0, MAX_MARKET);
  const avg = sanitizeRangeBound(o.marketAvg, 0, MAX_MARKET);
  const note = sanitizeNote(o.marketNote);
  if (low !== undefined) out.marketLow = low;
  if (high !== undefined) out.marketHigh = high;
  if (avg !== undefined) out.marketAvg = avg;
  if (note !== undefined) out.marketNote = note;
  return out;
}

/** The four market columns for CSV export; blank cells mean absent. */
export function marketCsvCells(o: Offering): string[] {
  return [o.marketLow, o.marketHigh, o.marketAvg].map((v) => (v === undefined || v === null ? '' : String(v)));
}

/**
 * Badge for a list price against the market, or null when no range or average
 * is entered. A swapped low/high is read as the range between them.
 */
export function marketBadge(price: number, m: MarketFields, floor: RankStatus = 'ok'): MarketBadge | null {
  const { marketLow, marketHigh, marketAvg } = m;
  if (marketLow === undefined && marketHigh === undefined && marketAvg === undefined) return null;
  const both = marketLow !== undefined && marketHigh !== undefined;
  const low = both ? Math.min(marketLow, marketHigh) : marketLow;
  const high = both ? Math.max(marketLow, marketHigh) : marketHigh;

  let level: MarketLevel = 'green';
  if ((low !== undefined && price < low) || (high !== undefined && price > high)) level = 'red';
  else if ((low !== undefined && price - low < low * EDGE_BAND) || (high !== undefined && high - price < high * EDGE_BAND)) level = 'yellow';
  if (floor === 'loss') level = 'red';
  else if (floor === 'thin' && level === 'green') level = 'yellow';

  if (level === 'green') return { level };
  // Direction: against the average if given, else the nearest range edge, else the midpoint
  const mid = marketAvg ?? (low !== undefined && high !== undefined ? (low + high) / 2 : undefined);
  const edge = low !== undefined && price < low ? 'below' : high !== undefined && price > high ? 'above' : undefined;
  const direction = edge ?? (mid === undefined ? undefined : price < mid ? 'below' : price > mid ? 'above' : undefined);
  return direction ? { level, direction } : { level };
}
