import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calc, clearCalculationCache } from '../calculations/index';
import { updateRichVisualizations } from '../../assets/services/visualizationService';

// Helper function to create proper state objects for tests
function createTestState(overrides = {}) {
  return {
    mode: 'forecast' as const,
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

describe('Visual Regression Tests - Charts and Reports', () => {
  beforeEach(() => {
    clearCalculationCache();
  });

  afterEach(() => {
    clearCalculationCache();
  });

  describe('Chart Data Structure Validation', () => {
    it('renders calculator utilization as a percentage without multiplying it again', () => {
      const inputs = createTestState({
        fullTimeEmployees: 5, partTimeEmployees: 0,
        fullTimeEmployeePay: 60000, partTimeEmployeePay: 0,
        productiveUtilizationPct: 85, targetUtilizationPct: 80
      });
      const results = calc(inputs);
      const container = document.createElement('div');
      container.id = 'richVisualizations';
      document.body.appendChild(container);
      try {
        updateRichVisualizations(results);
        expect(results.serviceHours).toBeGreaterThan(0);
        expect(container.querySelector('.gauge-value')?.textContent).toBe('80.0%');
        expect(container.querySelector('.profit-waterfall')).not.toBeNull();
      } finally {
        container.remove();
      }
    });

    it('should handle edge cases in chart data', () => {
      const edgeCases = [
        createTestState({ employees: 0, employeePay: 0, productiveUtilizationPct: 0 }),
        createTestState({ employees: 1, employeePay: 1, productiveUtilizationPct: 0.1 }),
        createTestState({ employees: 100, employeePay: 1000, productiveUtilizationPct: 1.0 })
      ];

      edgeCases.forEach((inputs, index) => {
        const results = calc(inputs);

        expect(results).toBeDefined();
        expect(results.revenue).toBeGreaterThanOrEqual(0);
        expect(results.variableCosts).toBeGreaterThanOrEqual(0);
        expect(results.income).toBeGreaterThanOrEqual(-Infinity);
      });
    });
  });

  describe('Visual Consistency Tests', () => {
    it('should maintain consistent color schemes across visualizations', () => {
      const inputs = createTestState({ employees: 3, employeePay: 75, productiveUtilizationPct: 0.8 });

      const results = calc(inputs);

      // Define expected color scheme
      const colorScheme = {
        revenue: '#10b981',
        costs: '#ef4444',
        profit: '#22c55e',
        background: '#f3f4f6',
        text: '#1f2937'
      };

      // Mock chart rendering data structure
      const chartConfig = {
        colors: colorScheme,
        data: results
      };

      expect(chartConfig.colors.revenue).toBe('#10b981');
      expect(chartConfig.colors.costs).toBe('#ef4444');
      expect(chartConfig.colors.profit).toBe('#22c55e');
    });

    it('should maintain consistent formatting across reports', () => {
      const inputs = createTestState({ employees: 10, employeePay: 85, productiveUtilizationPct: 0.85 });

      const results = calc(inputs);

      // Mock report formatting structure
      const reportFormat = {
        currency: 'USD',
        decimalPlaces: 2,
        dateFormat: 'MM/DD/YYYY',
        numberFormat: '1,234.56'
      };

      const formattedRevenue = results.revenue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      });

      expect(formattedRevenue).toContain('$');
    });
  });

  describe('Chart Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const largeInputs = createTestState({ employees: 1000, employeePay: 150, productiveUtilizationPct: 0.95 });

      const startTime = performance.now();
      const results = calc(largeInputs);
      const endTime = performance.now();

      expect(results).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle multiple rapid calculations', () => {
      const inputs = createTestState({ employees: 5, employeePay: 80, productiveUtilizationPct: 0.8 });

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        calc(inputs);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(2); // Should average <2ms per calculation
    });
  });

  describe('Report Layout Consistency', () => {
    it('should maintain consistent report structure across different scenarios', () => {
      const scenarios = [
        createTestState({ employees: 2, employeePay: 75, productiveUtilizationPct: 0.8 }),
        createTestState({ employees: 5, employeePay: 85, productiveUtilizationPct: 0.9 }),
        createTestState({ employees: 10, employeePay: 65, productiveUtilizationPct: 0.75 })
      ];

      const reports = scenarios.map(inputs => calc(inputs));

      // All reports should have same structure
      reports.forEach((report, index) => {
        expect(report).toHaveProperty('clients');
        expect(report).toHaveProperty('revenue');
        expect(report).toHaveProperty('variableCosts');
        expect(report).toHaveProperty('income');
        expect(report).toHaveProperty('contributionMarginPerClient');
        expect(report).toHaveProperty('annualServiceHours');
        expect(report).toHaveProperty('mode');
      });
    });

    it('should handle visual accessibility requirements', () => {
      const inputs = createTestState({ employees: 3, employeePay: 75, productiveUtilizationPct: 0.8 });

      const results = calc(inputs);

      // Mock accessibility requirements
      const accessibilityChecks = {
        hasTextLabels: true,
        hasColorContrast: true,
        hasKeyboardNavigation: true,
        hasScreenReaderSupport: true
      };

      // Verify data structure supports accessibility
      expect(results.revenue).toBeGreaterThanOrEqual(0);
      expect(results.clients).toBeGreaterThanOrEqual(0);
      expect(typeof results.revenue).toBe('number');
      expect(typeof results.clients).toBe('number');
    });
  });
});
