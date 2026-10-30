import { required } from '../test/test-utils';
import { describe, it, expect, beforeEach } from 'vitest';
import { MixOptimizer, optimizeMix } from './mixOptimizer';
import { calc } from '../calculations/index';

describe('Client Mix Optimizer', () => {
  let mockState: import('../types').CalcState & { offerings: import('../types').Offering[] };
  let mockMetrics: import('../types').CalcResult;

  beforeEach(() => {
    mockState = {
      mode: 'forecast' as const,
      fullTimeEmployees: 2,
      fullTimeEmployeePay: 50000,
      partTimeEmployees: 0,
      partTimeEmployeePay: 0,
      monthlyCosts: 1000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [
        {
          name: 'High Margin',
          priceMonthly: 500,
          sessionsPerYear: 12,
          hoursPerSession: 1,
          variableCostPerSession: 10,
          mixPct: 10,
          currentClients: 5
        },
        {
          name: 'Low Margin',
          priceMonthly: 100,
          sessionsPerYear: 52,
          hoursPerSession: 1,
          variableCostPerSession: 80,
          mixPct: 90,
          currentClients: 20
        }
      ]
    };

    mockMetrics = calc(mockState, { enableCache: false });
  });

  describe('optimize() - profit objective', () => {
    it('suggests a mix that improves projected income over a lopsided starting mix', () => {
      const optimizer = new MixOptimizer(mockState, mockMetrics);
      const result = optimizer.optimize('profit');

      expect(result).toBeTruthy();
      expect(required(result).objective).toBe('profit');
      expect(required(result).suggestedMix).toHaveLength(2);
      expect(required(result).projectedIncome).toBeGreaterThanOrEqual(required(result).currentIncome);
      expect(required(result).improved).toBe(true);
    });

    it('shifts mix toward the higher-margin offering', () => {
      const optimizer = new MixOptimizer(mockState, mockMetrics);
      const result = optimizer.optimize('profit');

      const highMargin = required(result).suggestedMix.find((o) => o.name === 'High Margin');
      expect(required(highMargin).mixPct).toBeGreaterThan(10);
    });

    it('leaves mix percentages summing to 100', () => {
      const optimizer = new MixOptimizer(mockState, mockMetrics);
      const result = optimizer.optimize('profit');

      const sum = required(result).suggestedMix.reduce((acc, o) => acc + o.mixPct, 0);
      expect(sum).toBeCloseTo(100, 0);
    });
  });

  describe('optimize() - utilization objective', () => {
    it('returns a capacity projection', () => {
      const optimizer = new MixOptimizer(mockState, mockMetrics);
      const result = optimizer.optimize('utilization');

      expect(required(result).objective).toBe('utilization');
      expect(typeof required(result).projectedCapacityPct).toBe('number');
      expect(typeof required(result).currentCapacityPct).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('returns null with fewer than 2 offerings', () => {
      const singleOfferingState = { ...mockState, offerings: [mockState.offerings[0]] };
      const optimizer = new MixOptimizer(singleOfferingState, mockMetrics);
      expect(optimizer.optimize('profit')).toBeNull();
    });

    it('returns null with no offerings', () => {
      const emptyState = { ...mockState, offerings: [] };
      const optimizer = new MixOptimizer(emptyState, mockMetrics);
      expect(optimizer.optimize('profit')).toBeNull();
    });

    it('handles many offerings without combinatorial blowup', () => {
      const manyOfferings = Array.from({ length: 8 }, (_, i) => ({
        name: `Offering ${i}`,
        priceMonthly: 100 + i * 20,
        sessionsPerYear: 12,
        hoursPerSession: 1,
        variableCostPerSession: 10 + i,
        mixPct: 100 / 8,
        currentClients: 5
      }));
      const manyState = { ...mockState, offerings: manyOfferings };
      const manyMetrics = calc(manyState, { enableCache: false });
      const optimizer = new MixOptimizer(manyState, manyMetrics);

      const result = optimizer.optimize('profit');
      expect(result).toBeTruthy();
      expect(required(result).suggestedMix).toHaveLength(8);
    });
  });

  describe('one-time offerings', () => {
    const withOneTime = (state: typeof mockState) => ({
      ...state,
      offerings: [
        { ...state.offerings[0], mixPct: 35 },
        { ...state.offerings[1], mixPct: 35 },
        { name: 'Ebook', type: 'one-time' as const, priceMonthly: 20, sessionsPerYear: 1, hoursPerSession: 0, variableCostPerSession: 2, mixPct: 30, currentClients: 10 }
      ]
    });

    it('keeps the one-time share fixed instead of piling mix into hour-free sales', () => {
      const state = withOneTime(mockState);
      const result = optimizeMix(state, calc(state, { enableCache: false }), 'profit');
      const mix = Object.fromEntries(required(result).suggestedMix.map((o) => [o.name, o.mixPct]));
      expect(mix.Ebook).toBe(30);
      expect(mix['High Margin'] + mix['Low Margin']).toBeCloseTo(70, 5);
    });

    it('returns null when fewer than two recurring offerings can move', () => {
      const state = withOneTime(mockState);
      state.offerings = [state.offerings[0], state.offerings[2]];
      expect(optimizeMix(state, calc(state, { enableCache: false }), 'profit')).toBeNull();
    });
  });

  describe('optimizeMix() public API', () => {
    it('returns the same shape as MixOptimizer.optimize()', () => {
      const result = optimizeMix(mockState, mockMetrics, 'profit');
      expect(result).toBeTruthy();
      expect(required(result).objective).toBe('profit');
    });

    it('defaults to profit objective when none given', () => {
      const result = optimizeMix(mockState, mockMetrics);
      expect(required(result).objective).toBe('profit');
    });
  });
});
