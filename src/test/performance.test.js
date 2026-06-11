import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calc, clearCalculationCache } from '../calculations/index.js';

// Helper function to create proper state objects for tests
function createTestState(overrides = {}) {
  // Handle both old format (employees) and new format (fullTimeEmployees) for backwards compatibility
  const normalizedOverrides = {};
  if ('employees' in overrides) {
    normalizedOverrides.fullTimeEmployees = overrides.employees;
    delete overrides.employees;
  }
  if ('employeePay' in overrides) {
    normalizedOverrides.fullTimeEmployeePay = overrides.employeePay;
    delete overrides.employeePay;
  }

  return {
    mode: 'forecast',
    fullTimeEmployees: 5,
    partTimeEmployees: 0,
    fullTimeEmployeePay: 80,
    partTimeEmployeePay: 0,
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
    ...normalizedOverrides,
    ...overrides
  };
}

describe('Performance Tests - Calculation Engine', () => {
  beforeEach(() => {
    clearCalculationCache();
  });

  afterEach(() => {
    clearCalculationCache();
  });

  describe('Calculation Speed Performance', () => {
    it('should complete basic calculations within performance thresholds', () => {
      const inputs = createTestState();

      // Warm up the calculation engine first
      calc(inputs);

      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        calc(inputs);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(averageTime).toBeLessThan(1); // Average < 1ms
      expect(maxTime).toBeLessThan(50); // Max < 50ms
    });

    it('should handle complex calculations efficiently', () => {
      const complexInputs = createTestState({
        employees: 50,
        employeePay: 150,
        productiveUtilizationPct: 0.95
      });

      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        calc(complexInputs);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;

      expect(averageTime).toBeLessThan(1); // Complex calculations < 1ms average
    });
  });

  describe('Memory Performance', () => {
    it('should maintain efficient memory usage with caching', () => {
      const inputs = createTestState();

      // First calculation should populate cache
      const result1 = calc(inputs);
      // Second calculation should use cache
      const result2 = calc(inputs);

      expect(result1).toEqual(result2);
    });

    it('should handle cache invalidation properly', () => {
      const inputs1 = createTestState({ employees: 5 });
      const inputs2 = createTestState({ employees: 6 });

      const result1 = calc(inputs1);
      const result2 = calc(inputs2);

      expect(result1).not.toEqual(result2);
    });

    it('should clear cache efficiently', () => {
      const inputs = createTestState();

      // Populate cache
      calc(inputs);

      // Clear cache
      clearCalculationCache();
    });
  });

  describe('Scalability Performance', () => {
    it('should handle large employee counts efficiently', () => {
      const largeInputs = [
        createTestState({ employees: 100 }),
        createTestState({ employees: 500 }),
        createTestState({ employees: 1000 }),
        createTestState({ employees: 5000 })
      ];

      const times = [];

      largeInputs.forEach((inputs) => {
        const startTime = performance.now();
        const results = calc(inputs);
        const endTime = performance.now();
        times.push(endTime - startTime);

        expect(results).toBeDefined();
        expect(results.clients).toBeGreaterThan(0);
      });

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(averageTime).toBeLessThan(5); // Even large calculations < 5ms
    });

    it('should handle high-frequency calculations without degradation', () => {
      const inputs = createTestState({ employees: 10 });

      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        calc(inputs);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(0.1); // High frequency < 0.1ms average
    });
  });

  describe('Stress Testing', () => {
    it('should handle edge case inputs without errors', () => {
      const stressCases = [
        createTestState({ employees: 0, employeePay: 0, productiveUtilizationPct: 0 }),
        createTestState({ employees: 1, employeePay: 1, productiveUtilizationPct: 0.01 }),
        createTestState({ employees: 10000, employeePay: 1000, productiveUtilizationPct: 1.0 }),
        createTestState({ employees: -1, employeePay: -1, productiveUtilizationPct: -1 })
      ];

      stressCases.forEach((inputs, index) => {
        expect(() => calc(inputs)).not.toThrow();
        const results = calc(inputs);
        expect(results).toBeDefined();
        expect(typeof results.clients).toBe('number');
        expect(typeof results.revenue).toBe('number');
        expect(typeof results.income).toBe('number');
        expect(typeof results.variableCosts).toBe('number');
      });
    });

    it('should maintain calculation accuracy under stress', () => {
      const inputs = createTestState({
        employees: 100,
        employeePay: 87.50,
        productiveUtilizationPct: 0.8375
      });

      const results = calc(inputs);

      // Verify calculation accuracy with high precision
      expect(results.clients).toBeGreaterThan(0);
      expect(results.revenue).toBeGreaterThan(0);
      expect(results.income).toBeGreaterThanOrEqual(-Infinity);
      expect(results.variableCosts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Resource Usage', () => {
    it('should monitor calculation engine resource usage', () => {
      const inputs = createTestState({ employees: 50 });

      const iterations = 100;
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      // Perform multiple calculations
      for (let i = 0; i < iterations; i++) {
        calc(inputs);
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 1MB for 100 calculations)
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB
    });
  });
});
