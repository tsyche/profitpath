import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildCSV, importFromCSV, sanitizeScenarioState } from '../../assets/services/miscService';
import { calc, clearCalculationCache } from './index';
import { setRangeCase } from './rangeCase';

const base = {
  employees: 1,
  employeePay: 40000,
  monthlyCosts: 500,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 100
};

const offering = {
  name: 'Coaching',
  priceMonthly: 200,
  sessionsPerYear: 12,
  hoursPerSession: 1,
  variableCostPerSession: 10,
  mixPct: 100,
  currentClients: 10
};

describe('sales lost after a price change', () => {
  beforeEach(() => {
    clearCalculationCache();
    setRangeCase('base');
  });
  afterEach(() => setRangeCase('base'));

  it('reduces current-mode volume, revenue, costs, and utilization', () => {
    const before = calc({ ...base, mode: 'current' as const, offerings: [offering] } as any);
    const after = calc({ ...base, mode: 'current' as const, offerings: [{ ...offering, salesLossPct: 30 }] } as any);

    expect(after.clients).toBe(7);
    expect(after.revenue).toBe(before.revenue * 0.7);
    expect(after.variableCosts).toBe(before.variableCosts * 0.7);
    expect(after.capacityPct).toBeCloseTo(before.capacityPct * 0.7, 10);
  });

  it('reduces forecast demand instead of renormalizing the lost mix away', () => {
    const before = calc({ ...base, mode: 'forecast' as const, offerings: [offering] } as any);
    const after = calc({ ...base, mode: 'forecast' as const, offerings: [{ ...offering, salesLossPct: 25 }] } as any);

    expect(after.clients).toBe(Math.floor(before.clients * 0.75));
    expect(after.revenue).toBe(after.clients * 200 * 12);
    expect(after.capacityPct).toBeLessThan(before.capacityPct);
  });

  it('uses the larger loss in the conservative case and smaller loss in the optimistic case', () => {
    const state = {
      ...base,
      mode: 'current' as const,
      offerings: [{ ...offering, salesLossPct: 20, salesLossPctLow: 5, salesLossPctHigh: 40 }]
    } as any;

    expect(calc(state).clients).toBe(8);
    setRangeCase('conservative');
    expect(calc(state).clients).toBe(6);
    setRangeCase('optimistic');
    expect(calc(state).clients).toBe(9);
  });

  it('round-trips bounded assumptions and clamps hostile input', () => {
    const sanitized = sanitizeScenarioState({
      offerings: [{ name: 'Coaching', salesLossPct: 20, salesLossPctLow: -1, salesLossPctHigh: 999 }]
    });

    expect(sanitized!.offerings[0]).toMatchObject({ salesLossPct: 20, salesLossPctLow: 0, salesLossPctHigh: 100 });
  });

  it('round-trips assumptions through CSV exports', () => {
    const csv = buildCSV(
      { ...base, mode: 'forecast' as const, offerings: [{ ...offering, salesLossPct: 20, salesLossPctLow: 5, salesLossPctHigh: 40 }] } as any,
      calc({ ...base, mode: 'forecast' as const, offerings: [offering] } as any)
    );

    expect((importFromCSV(csv) as any).data.offerings[0]).toMatchObject({
      salesLossPct: 20,
      salesLossPctLow: 5,
      salesLossPctHigh: 40
    });
  });
});
