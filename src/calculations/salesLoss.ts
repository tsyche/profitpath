import type { Offering } from '../types';

/** Expected percentage of sales lost after changing this offering's price. */
export function sanitizeSalesLossPct(value: unknown): number {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
}

/** The retained share of sales after the assumption is applied. */
export function retainedSalesShare(offering: Offering): number {
  return 1 - sanitizeSalesLossPct(offering.salesLossPct) / 100;
}

/** Optional loss bounds stay absent until supplied, unlike the base assumption. */
export function sanitizeSalesLossBounds(offering: Record<string, unknown>): Pick<Offering, 'salesLossPctLow' | 'salesLossPctHigh'> {
  const bound = (value: unknown) => {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return typeof number === 'number' && Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : undefined;
  };
  const low = bound(offering.salesLossPctLow);
  const high = bound(offering.salesLossPctHigh);
  return {
    ...(low === undefined ? {} : { salesLossPctLow: low }),
    ...(high === undefined ? {} : { salesLossPctHigh: high })
  };
}
