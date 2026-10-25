import { describe, it, expect, beforeEach } from 'vitest';
import { calc, calculateTax, clearCalculationCache } from '../calculations/index';
import { ReverseCalculator, getReverseCalculation, getRecommendedStrategy } from './reverseCalculator';

// Real calc engine, no mocked metrics: the answers must hold when fed back through calc().
const offerings = [
  { name: 'Coaching', priceMonthly: 300, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 5, mixPct: 60, currentClients: 20 },
  { name: 'Audit', priceMonthly: 900, sessionsPerYear: 4, hoursPerSession: 6, variableCostPerSession: 20, mixPct: 40, currentClients: 5 }
];
const makeState = (mode: string, extra = {}): any => ({
  employees: 2, employeePay: 50000, monthlyCosts: 1000, productiveUtilizationPct: 80, targetUtilizationPct: 60,
  mode, offerings, ...extra
});

describe('Reverse Calculator - "What Would It Take?"', () => {
  beforeEach(() => clearCalculationCache());

  describe.each(['current', 'forecast'])('%s mode', (mode) => {
    let state: any;
    let metrics: any;
    let calculator: ReverseCalculator;
    let target: number;

    beforeEach(() => {
      state = makeState(mode);
      metrics = calc(state);
      calculator = new ReverseCalculator(state, metrics);
      target = metrics.takeHome + 5000;
    });

    it('pricing: suggested prices reach the target when fed back through calc', () => {
      const r: any = calculator.calculateRequiredPricing(target);
      expect(r.requiresChange).toBe(true);
      expect(r.priceIncreasePct).toBeGreaterThan(0);
      expect(Number.isFinite(r.priceIncreasePct)).toBe(true);
      const repriced = state.offerings.map((o: any, i: number) => ({ ...o, priceMonthly: r.offerings[i].suggestedPrice }));
      expect(calc({ ...state, offerings: repriced }).takeHome).toBeGreaterThanOrEqual(target);
      expect(r.offerings[0].suggestedPrice).toBeGreaterThan(r.offerings[0].currentPrice);
    });

    it('clients and utilization: volume grows and the message has no NaN/Infinity', () => {
      const c: any = calculator.calculateRequiredClients(target);
      const u: any = calculator.calculateRequiredUtilization(target);
      expect(c.targetClients).toBeGreaterThan(metrics.clients);
      expect(c.additionalClientsNeeded).toBeGreaterThan(0);
      expect(u.targetUtilization).toBeGreaterThan(metrics.capacityPct);
      for (const r of [c, u]) expect(r.message).not.toMatch(/NaN|Infinity|undefined|null/);
    });

    it('a bigger target needs more clients', () => {
      const small: any = calculator.calculateRequiredClients(metrics.takeHome + 2000);
      const big: any = calculator.calculateRequiredClients(metrics.takeHome + 8000);
      expect(big.targetClients).toBeGreaterThanOrEqual(small.targetClients);
    });

    it('costs: the cut, added to profit, reaches the target after tax and not much less', () => {
      const r: any = calculator.calculateRequiredCostReduction(target);
      expect(r.costReductionNeeded).toBeGreaterThan(0);
      expect(calculateTax(metrics.income + r.costReductionNeeded + 1).takeHome).toBeGreaterThanOrEqual(target);
      expect(calculateTax(metrics.income + r.costReductionNeeded - 500).takeHome).toBeLessThan(target);
      expect(r.fixedCostReduction + r.variableCostReduction).toBeCloseTo(r.costReductionNeeded, -1);
    });

    it('combined: needs a smaller price rise than pricing alone, and the volume lever moves too', () => {
      const alone: any = calculator.calculateRequiredPricing(target);
      const r: any = calculator.calculateRequiredCombined(target);
      expect(r.requiresChange).toBe(true);
      expect(r.priceIncreasePct).toBeGreaterThan(0);
      expect(r.priceIncreasePct).toBeLessThan(alone.priceIncreasePct);
      expect(r.targetClients).toBeGreaterThanOrEqual(metrics.clients);
      expect(r.message).not.toMatch(/NaN|Infinity/);
      expect(r.message).toContain(mode === 'forecast' ? 'utilization' : 'clients');
    });

    it('returns "no change needed" when the target is already met', () => {
      for (const r of Object.values(calculator.getAllResults(1)) as any[]) {
        expect(r.requiresChange).toBe(false);
        expect(r.message).toContain('already exceed');
      }
    });

    it('rejects blank or non-positive targets', () => {
      expect(calculator.calculateRequiredPricing(0)).toBeNull();
      expect(calculator.calculateRequiredClients(-5)).toBeNull();
      expect(calculator.calculateRequiredUtilization(undefined)).toBeNull();
      expect(calculator.calculateRequiredCostReduction(NaN)).toBeNull();
    });
  });

  it('an unreachable target is infeasible with a plain message, never Infinity', () => {
    const state = makeState('current');
    const r: any = new ReverseCalculator(state, calc(state)).getAllResults(50_000_000);
    expect(r.pricing.feasible).toBe(false);
    expect(r.costs.feasible).toBe(false);
    for (const x of Object.values(r) as any[]) expect(x.message).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('formats money in the scenario currency', () => {
    const state = makeState('current', { currency: 'EUR' });
    const r: any = new ReverseCalculator(state, calc(state)).calculateRequiredPricing(calc(state).takeHome + 5000);
    expect(r.message).toContain('€');
    expect(r.message).not.toContain('$');
  });

  it('recommends pricing first when it is feasible', () => {
    const state = makeState('current');
    const m = calc(state);
    expect((getRecommendedStrategy(state, m, m.takeHome + 5000) as any).name).toBe('pricing');
  });

  describe('getReverseCalculation', () => {
    const state = makeState('current');
    const m = calc(state);
    const target = m.takeHome + 5000;

    it('routes by strategy name, including aliases', () => {
      expect((getReverseCalculation(state, m, target, 'pricing') as any).strategy).toBe('pricing');
      expect((getReverseCalculation(state, m, target, 'growth') as any).strategy).toBe('growth');
      expect((getReverseCalculation(state, m, target, 'costReduction') as any).strategy).toBe('costReduction');
    });

    it('returns all five strategies without a type', () => {
      expect(Object.keys(getReverseCalculation(state, m, target) as any).sort()).toEqual(['clients', 'combined', 'costs', 'pricing', 'utilization']);
    });
  });
});
