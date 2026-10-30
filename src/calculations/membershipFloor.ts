import type { MemberProfile, MembershipPlan } from '../types';
import { calcMembership, type CatalogOffering } from './membership';
import { isOneTime, pricePerSession } from './offeringPrice';

export interface MembershipFloor {
  price: number;
  discountPct: number;
  planName: string | null;
  basis: 'list' | 'full-redemption' | 'cash-discount';
}

/** Single-service stress price: all fee charged to this service, no breakage, fractional visits.
 * Also tests the limit as cash visits grow. Included visits from other services are not valued.
 * This is a floor check, not membership revenue fed into calc().
 */
export function membershipFloor(offering: CatalogOffering, plans: MembershipPlan[]): MembershipFloor {
  const list = isOneTime(offering) ? offering.priceMonthly * 12 : pricePerSession(offering);
  let floor: MembershipFloor = { price: list, discountPct: 0, planName: null, basis: 'list' };
  if (list <= 0 || !offering.id) return floor;
  for (const plan of plans) {
    const eligible = plan.eligible.includes(offering.id);
    const memberPrice = eligible ? list * (1 - plan.memberDiscountPct / 100) : list;
    const included = plan.includedVisits?.[offering.id] || 0;
    const creditPrice = plan.creditsAtMemberPrice ? memberPrice : list;
    const visits = included + (eligible && creditPrice > 0 ? plan.creditsPerMonth / creditPrice : 0);
    const fullRedemption = visits > 0 ? plan.monthlyFee / visits : list;
    for (const [price, basis] of [[fullRedemption, 'full-redemption'], [memberPrice, 'cash-discount']] as const) {
      if (price < floor.price) floor = { price, discountPct: (1 - price / list) * 100, planName: plan.name, basis };
    }
  }
  return floor;
}

/** Same member, same visits: a lower-fee plan costs no more than a higher-fee plan. */
export function membershipValueWarnings(plans: MembershipPlan[], profiles: MemberProfile[], offerings: CatalogOffering[]) {
  return profiles.flatMap(profile => plans.flatMap(higher => plans.flatMap(lower => {
    if (lower.monthlyFee >= higher.monthlyFee) return [];
    const low = calcMembership(lower, profile, offerings);
    const high = calcMembership(higher, profile, offerings);
    if (low.regularSpend <= 0 || low.memberSpend > high.memberSpend + 0.005) return [];
    return [{ profileName: profile.name, lowerName: lower.name, higherName: higher.name, monthlyDifference: Math.max(0, high.memberSpend - low.memberSpend) }];
  })));
}
