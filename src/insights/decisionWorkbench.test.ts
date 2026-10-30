import { describe, expect, it } from 'vitest';
import { buildDecision, breakEvenSalesLoss } from './decisionWorkbench';
import { calc } from '../calculations';
import { setRangeCase } from '../calculations/rangeCase';
import type { CalcState } from '../types';

const base: CalcState = {
  mode: 'current' as const, currency: 'USD', fullTimeEmployees: 1, productiveUtilizationPct: 100,
  fullTimeEmployeePay: 0, monthlyCosts: 100,
  offerings: [{ id: 'a', name: 'Studio', type: 'per-session' as const, priceMonthly: 60, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 10, currentClients: 100, mixPct: 100, confidence: 'verified' }]
};
const option: CalcState = { ...base, offerings: [{ ...base.offerings![0], priceMonthly: 75, salesLossPct: 10, salesLossPctHigh: 30, confidence: 'guess' }] };

describe('decision workbench', () => {
  it('compares three options with annual goals and guessed revenue under an explicit case without changing state', () => {
    setRangeCase('optimistic');
    const inputs = [{ name: 'Today', state: base }, { name: 'Raise', state: option }, { name: 'Other', state: { ...base, monthlyCosts: 200 } }];
    const before = JSON.stringify(inputs);
    const result = buildDecision(inputs, 'conservative', 60000);
    expect(result.results[1].metrics.clients).toBe(70);
    expect(result.results[1].metrics.income).toBe(53400);
    expect(result.results[1].goalGap).toBe(-6600);
    expect(result.results[1].guessRevenuePct).toBe(100);
    expect(result.offeringRows[0].inputs[1]?.salesLossPct).toBe(30);
    expect(result.winner.name).toBe('Today');
    expect(JSON.stringify(inputs)).toBe(before);
    setRangeCase('base');
  });

  it('finds a safe total loss on raised services, using the real discrete-client calculator', () => {
    const threshold = breakEvenSalesLoss(base, option, 'base');
    expect(threshold.pct).toBeCloseTo(23, 0);
    const at = { ...option, offerings: [{ ...option.offerings![0], salesLossPct: threshold.pct! }] };
    expect(calc(at, { ignoreCase: true }).income).toBeGreaterThanOrEqual(calc(base, { ignoreCase: true }).income);
    expect(calc({ ...at, offerings: [{ ...at.offerings[0], salesLossPct: threshold.pct! + 0.1 }] }, { ignoreCase: true }).income).toBeLessThan(calc(base, { ignoreCase: true }).income);
  });

  it('supports forecast and retains losses on services without a raise', () => {
    const forecast = { ...base, mode: 'forecast' as const };
    const raised = { ...option, mode: 'forecast' as const };
    expect(breakEvenSalesLoss(forecast, raised, 'base').pct).toBeGreaterThan(0);
    expect(breakEvenSalesLoss(base, base, 'base').reason).toContain('No matched');
    expect(breakEvenSalesLoss(base, { ...option, monthlyCosts: 100000 }, 'base').reason).toContain('Below baseline');
    const unchanged = { ...base.offerings![0], id: 'unchanged', name: 'Other', priceMonthly: 40 };
    const withOther = { ...base, offerings: [...base.offerings!, unchanged] };
    const alternative = { ...option, offerings: [...option.offerings!, { ...unchanged, salesLossPct: 60 }] };
    // Most of the unraised service's contribution is lost; the solver must retain that loss.
    expect(breakEvenSalesLoss(withOther, alternative, 'base').reason).toContain('Below baseline');
  });

  it('bounds stepwise group costs conservatively and explains options below baseline at zero loss', () => {
    const group = { ...option, offerings: [{ ...option.offerings![0], type: 'group' as const, costPerRun: 100 }] };
    const groupBase = { ...base, offerings: [{ ...base.offerings![0], type: 'group' as const }] };
    const threshold = breakEvenSalesLoss(groupBase, group, 'base');
    expect(threshold.conservative).toBe(true);
    expect(threshold.pct).toBeGreaterThan(0);
    for (let loss = 0; loss <= threshold.pct!; loss += 0.1) {
      const actual = { ...group, offerings: [{ ...group.offerings[0], salesLossPct: loss }] };
      expect(calc(actual, { ignoreCase: true }).income).toBeGreaterThanOrEqual(calc(groupBase, { ignoreCase: true }).income);
    }
    expect(breakEvenSalesLoss(base, { ...option, offerings: [{ ...option.offerings![0], variableCostPerSession: 1000 }] }, 'base').reason).toContain('Below baseline');
    expect(buildDecision([{ name: 'a', state: base }, { name: 'b', state: base }], 'base', NaN).goal).toBeNull();
  });

  it('aligns reordered and added offerings without merging ambiguous duplicate names', () => {
    const other = { ...base, offerings: [{ ...base.offerings![0], id: 'b', name: 'New' }, { ...base.offerings![0], id: 'a' }] };
    const result = buildDecision([{ name: 'Base', state: base }, { name: 'Other', state: other }], 'base');
    expect(result.offeringRows.map(r => r.name)).toEqual(['Studio', 'New']);
    expect(result.offeringRows[1].values[0]).toBeNull();
    const duplicates = { ...base, offerings: [{ ...base.offerings![0], id: undefined }, { ...base.offerings![0], id: undefined }] };
    expect(buildDecision([{ name: 'a', state: duplicates }, { name: 'b', state: duplicates }], 'base').offeringRows).toHaveLength(4);
  });

  it('rejects incomparable currencies, modes, and invalid option counts', () => {
    expect(() => buildDecision([{ name: 'a', state: base }], 'base')).toThrow('two to four');
    for (const state of [{ ...base, currency: 'EUR' }, { ...base, mode: 'forecast' as const }]) {
      expect(() => buildDecision([{ name: 'a', state: base }, { name: 'b', state }], 'base')).toThrow('same currency');
    }
  });
});
