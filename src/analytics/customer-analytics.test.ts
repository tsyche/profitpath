import { describe, it, expect } from 'vitest';
import { calc } from '../calculations/index';
import { calculateLTV } from './customer-analytics';

const base = {
  mode: 'forecast' as const,
  employees: 1,
  employeePay: 60000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 75,
  offerings: [
    { name: 'A', priceMonthly: 200, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 10, mixPct: 60, currentClients: 4 },
    { name: 'B', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 5, mixPct: 40, currentClients: 6 }
  ]
};

describe('calculateLTV on real calc output (roadmap 12h)', () => {
  it('is non-zero and tracks per-client contribution, not zero', () => {
    const ltv = calculateLTV(calc(base as any) as any, 24, 100);
    // A: (2400 - 120) / 12 = 190/mo, B: (1200 - 60) / 12 = 95/mo; 24 months, no churn
    expect(ltv.byOffering[0].estimatedLTV).toBe(190 * 24);
    expect(ltv.byOffering[1].estimatedLTV).toBe(95 * 24);
    expect(ltv.averageLTV).toBe(Math.round((190 * 24 + 95 * 24) / 2));
  });

  it('works in current mode and for offerings that get zero forecast clients', () => {
    expect(calculateLTV(calc({ ...base, mode: 'current' } as any) as any).averageLTV).toBeGreaterThan(0);
    const tiny = calc({ ...base, offerings: [{ ...base.offerings[0], mixPct: 100 }, { ...base.offerings[1], mixPct: 0 }] } as any);
    expect(calculateLTV(tiny as any).byOffering[1].estimatedLTV).toBeGreaterThan(0);
  });

  it('never goes negative for an offering that loses money per client', () => {
    const losing = calc({ ...base, offerings: [{ ...base.offerings[0], variableCostPerSession: 500 }] } as any);
    expect(calculateLTV(losing as any).byOffering[0].estimatedLTV).toBe(0);
  });
});
