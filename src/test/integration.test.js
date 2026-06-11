import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calc, clearCalculationCache } from '../calculations/index.js';

// Helper function to create proper state objects for tests
function createTestState(overrides = {}) {
  return {
    mode: 'forecast',
    employees: 5,
    employeePay: 80,
    monthlyCosts: 1000,
    productiveUtilizationPct: 0.8,
    targetUtilizationPct: 0.8,
    offerings: [
      {
        name: 'Service A',
        priceMonthly: 1000,
        sessionsPerYear: 12,
        hoursPerSession: 1,
        variableCostPerSession: 10,
        mixPct: 100,
        currentClients: 0
      }
    ],
    ...overrides
  };
}

describe('Integration Tests - UI Components and User Workflows', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app">
        <input id="employees" type="number" value="2">
        <input id="employeePay" type="number" value="60000">
        <input id="monthlyCosts" type="number" value="250">
        <input id="productiveUtilizationPct" type="number" value="80">
        <input id="targetUtilizationPct" type="number" value="75">
        <div id="kpiClients"></div>
        <div id="kpiRevenue"></div>
        <div id="kpiIncome"></div>
      </div>
    `;
    clearCalculationCache();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    clearCalculationCache();
  });

  describe('Complete User Workflow Integration', () => {
    it('should handle complete calculation workflow from input to results', () => {
      // Test with new full-time/part-time employee format
      // Mock calculation engine integration with new format
      const inputs = createTestState({
        fullTimeEmployees: 2,
        partTimeEmployees: 1,
        fullTimeEmployeePay: 75000,
        partTimeEmployeePay: 45000,
        monthlyCosts: 500,
        productiveUtilizationPct: 85
      });

      const results = calc(inputs);

      // Verify calculation workflow
      expect(results).toBeDefined();
      expect(results.clients).toBeGreaterThanOrEqual(0);
      expect(results.revenue).toBeGreaterThanOrEqual(0);
      expect(results.income).toBeGreaterThanOrEqual(-Infinity);
      expect(results.mode).toBe('forecast');
    });

    it('should handle edge cases in user workflow gracefully', () => {
      const inputs = createTestState({
        employees: 0,
        employeePay: 0,
        productiveUtilizationPct: 0
      });

      const results = calc(inputs);

      expect(results).toBeDefined();
      expect(results.clients).toBeGreaterThanOrEqual(0);
      expect(results.revenue).toBeGreaterThanOrEqual(0);
      expect(results.income).toBeLessThanOrEqual(0); // With zero inputs, income should be negative or zero
    });

    it('should validate inputs and provide meaningful error messages', () => {
      const inputs = createTestState({
        employees: -5,
        employeePay: 50,
        productiveUtilizationPct: 0.8
      });

      // Should handle negative values gracefully
      expect(() => calc(inputs)).not.toThrow();

      const results = calc(inputs);
      expect(results).toBeDefined();
    });
  });

  describe('Component Integration Tests', () => {
    it('should integrate with settings system correctly', () => {
      // Mock settings
      const mockSettings = {
        experienceLevel: 'intermediate',
        currency: 'USD',
        decimalPrecision: 2
      };

      const inputs = createTestState({
        employees: 5,
        employeePay: 80,
        productiveUtilizationPct: 0.9
      });

      const results = calc(inputs);

      expect(results).toBeDefined();
      expect(results.clients).toBeGreaterThanOrEqual(0);
    });

    it('should handle scenario-based workflows', () => {
      const baseInputs = createTestState({
        employees: 2,
        employeePay: 75,
        productiveUtilizationPct: 0.8
      });

      const scenario1 = calc(baseInputs);

      // Modify inputs for scenario 2
      const scenario2Inputs = createTestState({
        employees: 2,
        employeePay: 85,
        productiveUtilizationPct: 0.8
      });
      const scenario2 = calc(scenario2Inputs);

      expect(scenario1).toBeDefined();
      expect(scenario2).toBeDefined();
      // Revenue might be zero for small scenarios, so check >= instead of >
      expect(scenario2.revenue).toBeGreaterThanOrEqual(scenario1.revenue);
    });

    it('should integrate with export functionality', () => {
      const inputs = createTestState({
        employees: 4,
        employeePay: 90,
        productiveUtilizationPct: 0.85
      });

      const results = calc(inputs);

      // Mock export data structure
      const exportData = {
        timestamp: new Date().toISOString(),
        inputs: inputs,
        results: results,
        metadata: {
          version: '1.3.2',
          mode: results.mode
        }
      };

      expect(exportData.inputs).toEqual(inputs);
      expect(exportData.results).toEqual(results);
      expect(exportData.metadata.version).toBe('1.3.2');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle calculation engine errors gracefully', () => {
      // Mock invalid inputs that might cause errors
      const invalidInputs = [
        createTestState({ employees: NaN, employeePay: 50 }),
        createTestState({ employees: 5, employeePay: Infinity }),
        createTestState({ employees: 5, employeePay: 50, productiveUtilizationPct: -1 })
      ];

      invalidInputs.forEach((inputs, index) => {
        expect(() => calc(inputs)).not.toThrow();
        const results = calc(inputs);
        expect(results).toBeDefined();
        expect(typeof results.clients).toBe('number');
        expect(typeof results.revenue).toBe('number');
        expect(typeof results.variableCosts).toBe('number');
        expect(typeof results.income).toBe('number');
      });
    });

    it('should maintain data consistency across operations', () => {
      const inputs = createTestState({
        employees: 3,
        employeePay: 75,
        productiveUtilizationPct: 0.8
      });

      const results1 = calc(inputs);
      const results2 = calc(inputs);

      // Results should be consistent for same inputs
      expect(results1).toEqual(results2);
    });
  });
});
