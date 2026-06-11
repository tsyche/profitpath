import { describe, it, expect } from 'vitest';
import { calc } from '../../src/calculations/index.js';

describe('Sensitivity Analysis - Employee Count Impact', () => {
  it('should calculate different results when employee count changes', () => {
    // Base state for testing - must include all required fields
    const baseState = {
      mode: 'forecast',
      employees: 1,
      employeePay: 50000,
      hoursPerWeek: 40,
      monthlyCosts: 2000,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80,
      fullTimeEmployees: 1,
      fullTimeEmployeePay: 50000,
      partTimeEmployees: 0,
      partTimeEmployeePay: 0,
      offerings: [{
        name: 'Consulting',
        priceMonthly: 2000,
        costMonthly: 200,
        frequency: 12,
        mixPct: 100,
        hoursPerClient: 15
      }]
    };

    // Calculate with 1 employee
    const result1 = calc(baseState);

    // Calculate with 5 employees
    const result5 = calc({
      ...baseState,
      employees: 5,
      fullTimeEmployees: 5
    });

    // Verify employee-dependent metrics change
    expect(result5.annualPaidHours).toBeGreaterThan(result1.annualPaidHours);
    expect(result5.annualServiceHours).toBeGreaterThan(result1.annualServiceHours);
    expect(result5.annualPayroll).toBeGreaterThan(result1.annualPayroll);
    expect(result5.totalFixedCosts).toBeGreaterThan(result1.totalFixedCosts);

    // Income should be different with different employee counts
    expect(result5.income).not.toBe(result1.income);
  });

  it('should show capacity changes with employee count', () => {
    const baseState = {
      mode: 'forecast',
      employees: 2,
      fullTimeEmployees: 2,
      fullTimeEmployeePay: 60000,
      partTimeEmployees: 0,
      partTimeEmployeePay: 0,
      hoursPerWeek: 40,
      monthlyCosts: 3000,
      productiveUtilizationPct: 70,
      targetUtilizationPct: 75,
      offerings: [{
        name: 'Service',
        priceMonthly: 1500,
        costMonthly: 150,
        frequency: 12,
        mixPct: 100,
        hoursPerClient: 12
      }]
    };

    const result2 = calc(baseState);
    const result10 = calc({ ...baseState, employees: 10, fullTimeEmployees: 10 });

    // More employees = more capacity
    expect(result10.annualPaidHours).toBeGreaterThan(result2.annualPaidHours);
    expect(result10.annualServiceHours).toBeGreaterThan(result2.annualServiceHours);
  });
});
