import type { OfferingMetric } from '../types';

export type RankStatus = 'ok' | 'thin' | 'loss';

export interface RankedOffering {
  name: string;
  marginPerHour: number;
  maxDiscountPct: number;
  /** Best-case discount entered for the offering (0 when none). */
  discountPct: number;
  /** Contribution per staff hour at the best-case discounted price. */
  discountedMarginPerHour: number;
  status: RankStatus;
}

/** Below this much discount headroom an offering is flagged as thin. */
export const THIN_DISCOUNT_HEADROOM_PCT = 15;

type RankInput = Pick<OfferingMetric, 'name' | 'marginPerHour' | 'maxDiscountPct'> & Partial<Pick<OfferingMetric, 'discountPct' | 'discountedMarginPerHour'>>;

/** Floor status from max-discount headroom after the best-case discount (percentage points of list price). */
export function floorStatus(maxDiscountPct: number, discountPct = 0): RankStatus {
  const headroom = maxDiscountPct - discountPct;
  return headroom <= 0 ? 'loss' : headroom < THIN_DISCOUNT_HEADROOM_PCT ? 'thin' : 'ok';
}

/**
 * Offerings ranked by list-price contribution per staff hour. The floor status
 * tests the headroom left after the best-case discount, so with no discount it
 * is the plain max-discount check.
 */
export function rankOfferings(metrics: RankInput[]): RankedOffering[] {
  return metrics
    .map((m) => {
      const discountPct = m.discountPct ?? 0;
      return {
        name: m.name,
        marginPerHour: m.marginPerHour,
        maxDiscountPct: m.maxDiscountPct,
        discountPct,
        discountedMarginPerHour: m.discountedMarginPerHour ?? m.marginPerHour,
        status: floorStatus(m.maxDiscountPct, discountPct),
      };
    })
    .sort((a, b) => b.marginPerHour - a.marginPerHour);
}
