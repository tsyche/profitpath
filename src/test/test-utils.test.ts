import { describe, expect, it } from 'vitest';
import { appStateFixture, calcResultFixture, required } from './test-utils';
import { calc } from '../calculations/index';

describe('Typed test fixtures', () => {
  it('rejects absent fixtures while retaining valid falsy values', () => {
    expect(() => required(null)).toThrow('Required test fixture');
    expect(() => required(undefined)).toThrow('Required test fixture');
    expect(required(0)).toBe(0);
    expect(required(false)).toBe(false);
  });

  it('normalizes legacy scenarios and supplies complete app fields', () => {
    const state = appStateFixture({
      employees: 2, employeePay: 50000,
      offerings: [{ name: 'Service', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1 }]
    });
    expect(state.fullTimeEmployees).toBe(2);
    expect(state.fullTimeEmployeePay).toBe(50000);
    expect(state.offerings[0].id).toBeTruthy();
    expect(state.processingFeePerTransaction).toBe(0);
    expect(calc(state).annualPayroll).toBe(100000);
  });

  it('fills metric fixtures from a real calculation and retains explicit overrides', () => {
    const metrics = calcResultFixture({ revenue: 123, income: -45 });
    expect(metrics.revenue).toBe(123);
    expect(metrics.income).toBe(-45);
    expect(metrics.offerings).toEqual([]);
    expect(metrics.annualServiceHours).toBe(0);
  });
});
