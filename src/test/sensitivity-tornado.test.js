import { describe, it, expect } from 'vitest';
import { calc } from '../../src/calculations/index.js';

describe('Sensitivity Analysis - Tornado Chart Impact Calculations', () => {
  it('should calculate impact for individual factor changes', () => {
    // Base state
    const baseState = {
      mode: 'forecast',
      employees: 3,
      fullTimeEmployees: 3,
      fullTimeEmployeePay: 60000,
      partTimeEmployees: 0,
      partTimeEmployeePay: 0,
      hoursPerWeek: 40,
      monthlyCosts: 3000,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80,
      offerings: [{
        name: 'Consulting',
        priceMonthly: 2000,
        costMonthly: 200,
        sessionsPerYear: 12,
        hoursPerSession: 15,
        variableCostPerSession: 20,
        mixPct: 100,
        currentClients: 0
      }]
    };

    const baseline = calc(baseState);

    // Test price impact (+10%)
    const priceUp = JSON.parse(JSON.stringify(baseState));
    priceUp.offerings = priceUp.offerings.map(o => ({ ...o, priceMonthly: o.priceMonthly * 1.1 }));
    const priceMetrics = calc(priceUp);
    const priceImpact = Math.abs(priceMetrics.income - baseline.income);

    // Test overhead impact (+10%)
    const overheadUp = JSON.parse(JSON.stringify(baseState));
    overheadUp.monthlyCosts = overheadUp.monthlyCosts * 1.1;
    const overheadMetrics = calc(overheadUp);
    const overheadImpact = Math.abs(baseline.income - overheadMetrics.income);

    // Test employee impact (+2 employees)
    const empUp = JSON.parse(JSON.stringify(baseState));
    empUp.employees = 5;
    empUp.fullTimeEmployees = 5;
    const empMetrics = calc(empUp);
    const empImpact = Math.abs(empMetrics.income - baseline.income);

    // Verify impacts are calculated and different
    expect(priceImpact).toBeGreaterThan(0);
    expect(overheadImpact).toBeGreaterThan(0);
    expect(empImpact).toBeGreaterThan(0);

    // Price and overhead should have different impacts
    expect(priceImpact).not.toBe(overheadImpact);
  });

  it('should calculate utilization impact correctly', () => {
    const baseState = {
      mode: 'forecast',
      employees: 3,
      fullTimeEmployees: 3,
      fullTimeEmployeePay: 60000,
      partTimeEmployees: 0,
      partTimeEmployeePay: 0,
      hoursPerWeek: 40,
      monthlyCosts: 2500,
      productiveUtilizationPct: 70,
      targetUtilizationPct: 75,
      offerings: [{
        name: 'Service',
        priceMonthly: 1500,
        costMonthly: 150,
        sessionsPerYear: 12,
        hoursPerSession: 10,
        variableCostPerSession: 15,
        mixPct: 100,
        currentClients: 0
      }]
    };

    const baseline = calc(baseState);

    // Utilization impact (+10 percentage points)
    const utilUp = JSON.parse(JSON.stringify(baseState));
    utilUp.productiveUtilizationPct = 80;
    const utilMetrics = calc(utilUp);
    const utilImpact = Math.abs(utilMetrics.income - baseline.income);

    expect(utilImpact).toBeGreaterThan(0);
  });
});
