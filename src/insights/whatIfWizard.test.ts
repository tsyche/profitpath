import { describe, it, expect, beforeEach } from 'vitest';
import { calc, clearCalculationCache } from '../calculations/index';
import { wizardScenarios, previewScenario } from './whatIfWizard';

// Real calc engine, no mocked metrics.
const offerings = [
  { name: 'Coaching', priceMonthly: 300, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 5, mixPct: 60, currentClients: 20 },
  { name: 'Audit', priceMonthly: 900, sessionsPerYear: 4, hoursPerSession: 6, variableCostPerSession: 20, mixPct: 40, currentClients: 5 }
];
const makeState = (mode: string): any => ({
  employees: 2, employeePay: 50000, monthlyCosts: 1000, productiveUtilizationPct: 80, targetUtilizationPct: 60, mode, offerings
});

describe('What-If wizard', () => {
  beforeEach(() => clearCalculationCache());

  describe.each(['current', 'forecast'])('%s mode', (mode) => {
    const state = makeState(mode);

    it('every scenario previews finite before/after numbers at its default value', () => {
      // Part-time and market scenarios need the app headcount fields and a market average to be buildable
      const full = {
        ...state, fullTimeEmployees: 2, partTimeEmployees: 0, fullTimeEmployeePay: 50000, partTimeEmployeePay: 20000,
        offerings: [{ ...offerings[0], marketAvg: 400 }, offerings[1]]
      };
      for (const s of wizardScenarios(full)) {
        const p = previewScenario(full, s.id, s.param.value);
        expect(p.changes, s.id).not.toBeNull();
        for (const m of [p.before, p.after!]) {
          for (const v of Object.values(m)) expect(Number.isFinite(v), `${s.id} ${v}`).toBe(true);
        }
      }
    });

    it('preview "after" equals calc() on the patched state', () => {
      const p = previewScenario(state, 'price', 15);
      expect(p.after!.takeHome).toBe(calc({ ...state, ...p.changes }).takeHome);
      expect(p.after!.takeHome).toBeGreaterThan(p.before.takeHome);
    });

    it('does not mutate the input state', () => {
      const snapshot = JSON.stringify(state);
      for (const s of wizardScenarios(state)) previewScenario(state, s.id, s.param.value);
      expect(JSON.stringify(state)).toBe(snapshot);
    });

    it('goal scenario reaches the requested take-home', () => {
      const target = calc(state).takeHome + 5000;
      const p = previewScenario(state, 'goal', target);
      expect(p.after!.takeHome).toBeGreaterThanOrEqual(target);
    });
  });

  it('hire patches the legacy employees field when the new headcount fields are absent', () => {
    expect(previewScenario(makeState('current'), 'hire', 2).changes).toEqual({ employees: 4 });
  });

  // Regression: the app stores fullTimeEmployees; patching `employees` was ignored by calc() and showed a $0 impact
  describe.each(['current', 'forecast'])('hire with the app headcount fields, %s mode', (mode) => {
    const state = { ...makeState(mode), fullTimeEmployees: 2, partTimeEmployees: 0, fullTimeEmployeePay: 50000, partTimeEmployeePay: 0 };
    it('adds a full-time employee and the payroll shows up in the preview', () => {
      const p = previewScenario(state, 'hire', 1);
      expect(p.changes).toEqual({ fullTimeEmployees: 3 });
      // Current mode: more payroll, same clients. Forecast mode: the new capacity is filled at the target utilization.
      if (mode === 'current') expect(p.after!.income).toBeLessThan(p.before.income);
      else expect(p.after!.income).toBeGreaterThan(p.before.income);
    });
  });

  it('forecast clients scales target utilization, current scales client counts', () => {
    expect(previewScenario(makeState('forecast'), 'clients', -50).changes).toEqual({ targetUtilizationPct: 30 });
    const cur: any = previewScenario(makeState('current'), 'clients', -50).changes;
    expect(cur.offerings.map((o: any) => o.currentClients)).toEqual([10, 3]);
  });

  it('goal below current take-home returns no changes with an explanation', () => {
    const state = makeState('current');
    const p = previewScenario(state, 'goal', 1);
    expect(p.changes).toBeNull();
    expect(p.note).toMatch(/already exceed/);
  });

  it('rejects non-finite input and unknown ids without throwing', () => {
    const state = makeState('current');
    expect(previewScenario(state, 'price', NaN).changes).toBeNull();
    expect(previewScenario(state, 'bogus', 5).changes).toBeNull();
  });

  it('survives an empty offerings list', () => {
    const state = { ...makeState('current'), offerings: [] };
    expect(() => wizardScenarios(state)).not.toThrow();
    expect(() => previewScenario(state, 'price', 10)).not.toThrow();
  });

  describe('combined, part-time and market scenarios', () => {
    const app = (mode: string, extra = {}): any => ({
      ...makeState(mode), fullTimeEmployees: 2, partTimeEmployees: 0, fullTimeEmployeePay: 50000, partTimeEmployeePay: 20000, ...extra
    });

    it('part-time hire adds to partTimeEmployees and costs payroll', () => {
      const p = previewScenario(app('current'), 'hirePart', 2);
      expect(p.changes).toEqual({ partTimeEmployees: 2 });
      expect(p.after!.income).toBeLessThan(p.before.income);
    });

    it('part-time hire warns when part-time pay is zero, and is unavailable on a legacy state', () => {
      expect(previewScenario(app('current', { partTimeEmployeePay: 0 }), 'hirePart', 1).note).toContain('pay is 0');
      const legacy = previewScenario(makeState('current'), 'hirePart', 1);
      expect(legacy.changes).toBeNull();
      expect(legacy.note).toContain('part-time');
    });

    it('price + hire changes both payroll headcount and prices', () => {
      const state = app('current');
      const p = previewScenario(state, 'priceHire', 10);
      expect(p.changes!.fullTimeEmployees).toBe(3);
      expect(p.changes!.offerings[0].priceMonthly).toBe(330);
      expect(p.after!.takeHome).toBe(calc({ ...state, ...p.changes }).takeHome);
    });

    it('price + volume scales both in Current mode and price + utilization in Forecast mode', () => {
      const cur = previewScenario(app('current'), 'priceVolume', 10);
      expect(cur.changes!.offerings[0]).toMatchObject({ priceMonthly: 330, currentClients: 22 });
      const fc = previewScenario(app('forecast'), 'priceVolume', 10);
      expect(fc.changes!.targetUtilizationPct).toBe(66);
      expect(fc.changes!.offerings[0].priceMonthly).toBe(330);
      expect(fc.note).toContain('Forecast');
    });

    it('market scenario moves only rows with an average, per display unit, and 0% leaves prices alone', () => {
      const rows = [
        { ...offerings[0], marketAvg: 400 },
        { ...offerings[1], type: 'per-session', marketAvg: 300 }, // 900/mo at 4 visits = 2700 per visit
        { name: 'No avg', priceMonthly: 50, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 0, currentClients: 1 }
      ];
      const state = app('current', { offerings: rows });
      const full = previewScenario(state, 'market', 100).changes!.offerings;
      expect(full[0].priceMonthly).toBe(400);
      expect(full[1].priceMonthly).toBe(100); // 300 per visit * 4 visits / 12
      expect(full[2].priceMonthly).toBe(50);
      expect(previewScenario(state, 'market', 50).changes!.offerings[0].priceMonthly).toBe(350);
      expect(previewScenario(state, 'market', 0).changes!.offerings[0].priceMonthly).toBe(300);
    });

    it('market scenario explains itself when no average is entered', () => {
      const p = previewScenario(app('current'), 'market', 100);
      expect(p.changes).toBeNull();
      expect(p.note).toContain('market average');
    });
  });
});
