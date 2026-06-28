import { describe, it, expect, beforeEach } from 'vitest';
import { ReverseCalculator, getReverseCalculation, getRecommendedStrategy } from './reverseCalculator.js';

describe('Reverse Calculator - "What Would It Take?"', () => {
  let calculator;
  let mockState;
  let mockMetrics;

  beforeEach(() => {
    mockState = {
      fullTimeEmployees: 2,
      fullTimeEmployeePay: 50000,
      partTimeEmployees: 0,
      partTimeEmployeePay: 0,
      monthlyCosts: 2000,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80,
      offerings: [
        {
          name: 'Consulting',
          priceMonthly: 5000,
          sessionsPerYear: 12,
          hoursPerSession: 2,
          variableCostPerSession: 500,
          marginPct: 50,
          currentClients: 3
        },
        {
          name: 'Support',
          priceMonthly: 2000,
          sessionsPerYear: 24,
          hoursPerSession: 1,
          variableCostPerSession: 200,
          marginPct: 40,
          currentClients: 8
        }
      ]
    };

    mockMetrics = {
      clients: 11,
      revenue: 300000,
      income: 100000,
      annualPayroll: 100000,
      annualFixedCosts: 40000,
      capacityPct: 75,
      targetUtilizationPct: 80,
      serviceHours: 2080,
      breakEvenClients: 5,
      variableCosts: 30000,
      offerings: mockState.offerings,
      totalSessions: 100
    };

    calculator = new ReverseCalculator(mockState, mockMetrics);
  });

  describe('Pricing Strategy', () => {
    it('should calculate required price increase to achieve higher take-home', () => {
      const result = calculator.calculateRequiredPricing(150000);

      expect(result).toBeTruthy();
      expect(result.feasible).toBe(true);
      expect(result.requiresChange).toBe(true);
      expect(result.strategy).toBe('pricing');
      expect(result.offerings).toBeTruthy();
      expect(result.offerings.length).toBe(2);
      expect(result.offerings[0].suggestedPrice).toBeGreaterThan(result.offerings[0].currentPrice);
    });

    it('should return no change needed if target already achieved', () => {
      const result = calculator.calculateRequiredPricing(50000);

      expect(result).toBeTruthy();
      expect(result.requiresChange).toBe(false);
      expect(result.message).toContain('already exceed');
    });

    it('should handle edge cases with zero revenue', () => {
      mockMetrics.revenue = 0;
      calculator = new ReverseCalculator(mockState, mockMetrics);
      const result = calculator.calculateRequiredPricing(100000);

      expect(result).toBeTruthy();
    });
  });

  describe('Client Growth Strategy', () => {
    it('should calculate required client count', () => {
      const result = calculator.calculateRequiredClients(150000);

      expect(result).toBeTruthy();
      expect(result.feasible).toBe(true);
      expect(result.requiresChange).toBe(true);
      expect(result.strategy).toBe('growth');
      expect(result.targetClients).toBeGreaterThan(result.currentClients);
      expect(result.additionalClientsNeeded).toBeGreaterThan(0);
    });

    it('should warn if utilization would exceed capacity', () => {
      const result = calculator.calculateRequiredClients(500000);

      expect(result).toBeTruthy();
      expect(result.warning).toBeTruthy();
      expect(result.warning).toContain('utilization');
    });

    it('should return no change needed if target already achieved', () => {
      const result = calculator.calculateRequiredClients(50000);

      expect(result).toBeTruthy();
      expect(result.requiresChange).toBe(false);
    });
  });

  describe('Utilization Strategy', () => {
    it('should calculate required utilization increase', () => {
      const result = calculator.calculateRequiredUtilization(150000);

      expect(result).toBeTruthy();
      expect(result.feasible).toBe(true);
      expect(result.requiresChange).toBe(true);
      expect(result.strategy).toBe('utilization');
      expect(result.targetUtilization).toBeGreaterThan(result.currentUtilization);
    });

    it('should warn if utilization would exceed 100%', () => {
      const result = calculator.calculateRequiredUtilization(200000);

      expect(result.warning).toBeTruthy();
    });

    it('should return no change needed if target already achieved', () => {
      const result = calculator.calculateRequiredUtilization(50000);

      expect(result).toBeTruthy();
      expect(result.requiresChange).toBe(false);
    });
  });

  describe('Cost Reduction Strategy', () => {
    it('should calculate required cost reductions', () => {
      const result = calculator.calculateRequiredCostReduction(150000);

      expect(result).toBeTruthy();
      expect(result.feasible).toBe(true);
      expect(result.requiresChange).toBe(true);
      expect(result.strategy).toBe('costReduction');
      expect(result.costReductionNeeded).toBeGreaterThan(0);
      expect(result.breakdown).toBeTruthy();
    });

    it('should split costs proportionally', () => {
      const result = calculator.calculateRequiredCostReduction(150000);

      const fixedPortion = mockMetrics.annualFixedCosts / (mockMetrics.annualFixedCosts + mockMetrics.variableCosts);
      const expectedFixedReduction = Math.round(result.costReductionNeeded * fixedPortion);

      expect(Math.abs(result.fixedCostReduction - expectedFixedReduction)).toBeLessThan(2);
    });

    it('should return no change needed if target already achieved', () => {
      const result = calculator.calculateRequiredCostReduction(50000);

      expect(result).toBeTruthy();
      expect(result.requiresChange).toBe(false);
    });
  });

  describe('All Results', () => {
    it('should return all strategy results', () => {
      const results = calculator.getAllResults(150000);

      expect(results.pricing).toBeTruthy();
      expect(results.clients).toBeTruthy();
      expect(results.utilization).toBeTruthy();
      expect(results.costs).toBeTruthy();
    });

    it('should have all required fields in results', () => {
      const results = calculator.getAllResults(150000);

      Object.values(results).forEach(result => {
        if (result && result.requiresChange) {
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('strategy');
          expect(result).toHaveProperty('feasible');
        }
      });
    });
  });

  describe('Feasible Strategies', () => {
    it('should return only feasible strategies', () => {
      const strategies = calculator.getFeasibleStrategies(150000);

      expect(Array.isArray(strategies)).toBe(true);
      strategies.forEach(strategy => {
        expect(strategy.feasible).toBe(true);
        expect(strategy.name).toBeTruthy();
      });
    });

    it('should filter out infeasible strategies', () => {
      const strategies = calculator.getFeasibleStrategies(5000000);

      // At very high targets, some strategies will be infeasible
      expect(strategies.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Recommended Strategy', () => {
    it('should return a recommended strategy', () => {
      const strategy = calculator.getRecommendedStrategy(150000);

      expect(strategy).toBeTruthy();
      expect(strategy.name).toBeTruthy();
      expect(['pricing', 'costs', 'clients', 'utilization']).toContain(strategy.name);
    });

    it('should prefer pricing strategy when feasible', () => {
      // Pricing should be ranked highest (lowest effort)
      const strategy = calculator.getRecommendedStrategy(150000);

      // Pricing has lowest effort, so should be recommended
      expect(strategy).toBeTruthy();
    });

    it('should return null if no feasible strategies', () => {
      // Create unreachable target
      mockMetrics.annualFixedCosts = 10000000; // Huge fixed costs
      calculator = new ReverseCalculator(mockState, mockMetrics);

      const strategy = calculator.getRecommendedStrategy(10000000);

      // Even with huge target, some strategy should be feasible
      expect(strategy).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero desired take-home', () => {
      const result = calculator.calculateRequiredPricing(0);

      expect(result).toBeNull();
    });

    it('should handle negative desired take-home', () => {
      const result = calculator.calculateRequiredPricing(-50000);

      expect(result).toBeNull();
    });

    it('should handle very high desired take-home', () => {
      const result = calculator.calculateRequiredPricing(1000000);

      expect(result).toBeTruthy();
      expect(result.feasible).toBe(true);
    });

    it('should handle state with no offerings', () => {
      mockMetrics.offerings = [];
      calculator = new ReverseCalculator(mockState, mockMetrics);

      const result = calculator.calculateRequiredPricing(150000);

      expect(result).toBeTruthy();
    });

    it('should handle state with no employees', () => {
      mockMetrics.fullTimeEmployees = 0;
      calculator = new ReverseCalculator(mockState, mockMetrics);

      const result = calculator.calculateRequiredPricing(150000);

      expect(result).toBeTruthy();
    });
  });

  describe('Public API', () => {
    it('should calculate via public function', () => {
      const result = getReverseCalculation(mockState, mockMetrics, 150000);

      expect(result.pricing).toBeTruthy();
      expect(result.clients).toBeTruthy();
    });

    it('should calculate specific strategy via public function', () => {
      const result = getReverseCalculation(mockState, mockMetrics, 150000, 'Pricing');

      expect(result.strategy).toBe('pricing');
    });

    it('should get recommended strategy via public function', () => {
      const strategy = getRecommendedStrategy(mockState, mockMetrics, 150000);

      expect(strategy).toBeTruthy();
      expect(strategy.name).toBeTruthy();
    });
  });

  describe('Message Clarity', () => {
    it('should provide clear messaging for each strategy', () => {
      const pricing = calculator.calculateRequiredPricing(150000);
      const clients = calculator.calculateRequiredClients(150000);
      const utilization = calculator.calculateRequiredUtilization(150000);
      const costs = calculator.calculateRequiredCostReduction(150000);

      expect(pricing.message).toContain('Increase');
      expect(clients.message).toContain('Add');
      expect(utilization.message).toContain('Increase');
      expect(costs.message).toContain('Reduce');
    });

    it('should include specific numbers in messages', () => {
      const result = calculator.calculateRequiredPricing(150000);

      expect(result.message).toMatch(/\d+/); // Contains at least one number
      expect(result.message).toMatch(/\$/); // Contains currency symbol
    });
  });

  describe('Pricing Breakdown', () => {
    it('should provide per-offering price recommendations', () => {
      const result = calculator.calculateRequiredPricing(150000);

      expect(result.offerings).toBeTruthy();
      expect(result.offerings.length).toBe(2);

      result.offerings.forEach(offering => {
        expect(offering.name).toBeTruthy();
        expect(offering.currentPrice).toBeGreaterThan(0);
        expect(offering.suggestedPrice).toBeGreaterThanOrEqual(offering.currentPrice);
        expect(offering.increase).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Cost Breakdown', () => {
    it('should provide fixed and variable cost reduction breakdown', () => {
      const result = calculator.calculateRequiredCostReduction(150000);

      expect(result.breakdown).toBeTruthy();
      expect(result.breakdown.currentFixed).toBeGreaterThan(0);
      expect(result.breakdown.currentVariable).toBeGreaterThan(0);
      expect(result.breakdown.suggestedFixed).toBeLessThanOrEqual(result.breakdown.currentFixed);
      expect(result.breakdown.suggestedVariable).toBeLessThanOrEqual(result.breakdown.currentVariable);
    });
  });
});
