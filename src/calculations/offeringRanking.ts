import type { OfferingMetric } from '../types';

export type RankStatus = 'ok' | 'thin' | 'loss';

export interface RankedOffering {
  name: string;
  marginPerHour: number;
  maxDiscountPct: number;
  status: RankStatus;
}

/** Below this much discount headroom an offering is flagged as thin. */
export const THIN_DISCOUNT_HEADROOM_PCT = 15;

/** Offerings ranked by contribution per staff hour, with a discount-floor status. */
export function rankOfferings(metrics: Pick<OfferingMetric, 'name' | 'marginPerHour' | 'maxDiscountPct'>[]): RankedOffering[] {
  return metrics
    .map((m) => ({
      name: m.name,
      marginPerHour: m.marginPerHour,
      maxDiscountPct: m.maxDiscountPct,
      status: (m.maxDiscountPct <= 0 ? 'loss' : m.maxDiscountPct < THIN_DISCOUNT_HEADROOM_PCT ? 'thin' : 'ok') as RankStatus,
    }))
    .sort((a, b) => b.marginPerHour - a.marginPerHour);
}
