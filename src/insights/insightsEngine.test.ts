import { describe, it, expect, beforeEach } from 'vitest';
import { calc, clearCalculationCache } from '../calculations/index';
import { InsightsEngine, generateInsights, generateWhatIfScenarios } from './insightsEngine';

// Real calc engine: the engine must read the same numbers the app shows.
const healthy = [
  { name: 'Coaching', priceMonthly: 300, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 5, mixPct: 60, currentClients: 20 },
  { name: 'Audit', priceMonthly: 900, sessionsPerYear: 4, hoursPerSession: 6, variableCostPerSession: 20, mixPct: 40, currentClients: 5 }
];
const makeState = (mode: string, offerings = healthy, extra = {}): any => ({
  employees: 2, employeePay: 50000, monthlyCosts: 1000, productiveUtilizationPct: 80, targetUtilizationPct: 60,
  mode, offerings, ...extra
});
const insightsFor = (state: any) => generateInsights(calc(state), state);

describe('Insights Engine', () => {
  beforeEach(() => clearCalculationCache());

  it('flags under-utilization against the state target (metrics carry no target)', () => {
    const idle = [{ ...healthy[0], currentClients: 1 }];
    const hit = insightsFor(makeState('current', idle)).find((i: any) => i.category === 'utilization');
    expect(hit).toMatchObject({ severity: 'high', target: 60 });
  });

  describe.each(['current', 'forecast'])('%s mode', (mode) => {
    it('does not call profitable offerings loss-making', () => {
      const titles = insightsFor(makeState(mode)).map((i: any) => i.title);
      expect(titles.some((t: string) => t.startsWith('Loss-Making'))).toBe(false);
    });

    it('flags an offering priced under its cost as loss-making', () => {
      const bad = [healthy[0], { ...healthy[1], priceMonthly: 1 }];
      const hit = insightsFor(makeState(mode, bad)).find((i: any) => i.category === 'margin' && i.offering === 'Audit');
      expect(hit).toMatchObject({ severity: 'critical' });
      expect(insightsFor(makeState(mode, bad)).some((i: any) => i.offering === 'Coaching' && i.severity === 'critical')).toBe(false);
    });

    it('recommends a price rise for the thinnest-margin offering only', () => {
      const thin = [{ ...healthy[0], priceMonthly: 120, variableCostPerSession: 60 }, healthy[1]];
      const rec = insightsFor(makeState(mode, thin)).filter((i: any) => i.category === 'pricing');
      expect(rec.map((i: any) => i.offering)).toEqual(['Coaching']);
      const recommendation = rec[0].recommendation;
      if (!recommendation || typeof recommendation !== 'object' ||
          !('suggested' in recommendation) || !('current' in recommendation)) throw new Error('Missing pricing recommendation');
      expect(Number(recommendation.suggested)).toBeGreaterThan(Number(recommendation.current));
    });
  });

  it('tolerates zero revenue without NaN', () => {
    const state = makeState('current', healthy.map((o) => ({ ...o, currentClients: 0 })));
    const all = insightsFor(state);
    for (const i of all) expect(`${i.title} ${i.message}`).not.toMatch(/NaN|Infinity/);
  });

  it('describes being above break-even as above, never as a negative gap', () => {
    const state = makeState('current');
    const m = calc(state);
    // Put the break-even point just under the client count
    const engine = new InsightsEngine({ ...m, breakEvenClients: m.clients - 1 }, state);
    const be = engine.generateInsights().find((i: any) => i.category === 'breakeven');
    expect(be?.message).toContain('above break-even');
    expect(be?.message).not.toMatch(/-\d/);
  });

  it('uses the scenario currency in price advice', () => {
    const thin = [{ ...healthy[0], priceMonthly: 120, variableCostPerSession: 60 }, healthy[1]];
    const rec = insightsFor(makeState('current', thin, { currency: 'GBP' })).find((i: any) => i.category === 'pricing');
    expect(rec?.message).toContain('£');
  });

  describe('what-if scenarios', () => {
    it.each(['current', 'forecast'])('%s: impact matches re-running calc, with no NaN', (mode) => {
      const state = makeState(mode);
      const m = calc(state);
      const scenarios = generateWhatIfScenarios(m, state);
      expect(scenarios).toHaveLength(4);
      for (const s of scenarios) {
        expect(s.estimatedImpact).not.toMatch(/NaN|undefined/);
        const delta = calc({ ...state, ...s.changes }).income - m.income;
        expect(s.estimatedImpact.startsWith(delta >= 0 ? '+' : '-')).toBe(true);
      }
      expect(scenarios[0].estimatedImpact.startsWith('+')).toBe(true);
    });

    it('adding an employee costs money in current mode (no phantom capacity gain)', () => {
      const state = makeState('current');
      const hire = generateWhatIfScenarios(calc(state), state).find((s: any) => s.name === 'Add 1 employee')!;
      expect(hire.estimatedImpact.startsWith('-')).toBe(true);
    });

    // Regression: the app stores fullTimeEmployees; patching legacy `employees` showed "+$0/yr" for a hire
    it('adding an employee costs money when state uses the app headcount fields', () => {
      const state = makeState('current', healthy, { fullTimeEmployees: 2, partTimeEmployees: 0, fullTimeEmployeePay: 50000, partTimeEmployeePay: 0 });
      const hire = generateWhatIfScenarios(calc(state), state).find((s: any) => s.name === 'Add 1 employee')!;
      expect(hire.estimatedImpact.startsWith('-')).toBe(true);
      expect(hire.estimatedImpact).not.toMatch(/\$0\//);
    });
  });
});
