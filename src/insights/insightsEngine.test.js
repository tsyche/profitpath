import { describe, it, expect, beforeEach } from 'vitest';
import { InsightsEngine, generateInsights, generateWhatIfScenarios } from './insightsEngine.js';

describe('Insights Engine - Rules-Based Optimization', () => {
  let mockMetrics;
  let mockState;
  let engine;

  beforeEach(() => {
    mockMetrics = {
      clients: 5,
      revenue: 60000,
      income: 15000,
      annualPayroll: 50000,
      annualFixedCosts: 5000,
      capacityPct: 45,
      targetUtilizationPct: 80,
      serviceHours: 2080,
      breakEvenClients: 3,
      variableCosts: 5000
    };

    mockState = {
      fullTimeEmployees: 1,
      fullTimeEmployeePay: 50000,
      targetUtilizationPct: 80,
      offerings: [
        {
          name: 'Consulting',
          priceMonthly: 500,
          sessionsPerYear: 12,
          hoursPerSession: 2,
          variableCostPerSession: 50,
          marginPct: 45,
          currentClients: 3
        },
        {
          name: 'Support',
          priceMonthly: 300,
          sessionsPerYear: 24,
          hoursPerSession: 1,
          variableCostPerSession: 75,
          marginPct: 12,
          currentClients: 2
        }
      ]
    };

    engine = new InsightsEngine(mockMetrics, mockState);
  });

  describe('Underutilization Detection', () => {
    it('should detect significant underutilization', () => {
      mockMetrics.capacityPct = 30; // 30% utilization vs 80% target
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const alerts = engine.insights.filter(i => i.type === 'alert' && i.category === 'utilization');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('high');
    });

    it('should detect moderate underutilization', () => {
      mockMetrics.capacityPct = 70; // 70% utilization vs 80% target
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const suggestions = engine.insights.filter(i => i.type === 'suggestion' && i.category === 'utilization');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should not alert when utilization is above target', () => {
      mockMetrics.capacityPct = 90;
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const utilAlerts = engine.insights.filter(i => i.category === 'utilization');
      expect(utilAlerts.length).toBe(0);
    });
  });

  describe('Declining Margins Detection', () => {
    it('should detect low-margin services', () => {
      mockState.offerings[1].marginPct = 15; // Below 20% threshold
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const marginAlerts = engine.insights.filter(i => i.category === 'margin');
      expect(marginAlerts.length).toBeGreaterThan(0);
      expect(marginAlerts[0].severity).toBe('high');
    });

    it('should detect loss-making services', () => {
      mockState.offerings[1].marginPct = -5; // Negative margin
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const criticalAlerts = engine.insights.filter(i => i.category === 'margin' && i.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Optimization Suggestions', () => {
    it('should suggest payroll optimization when payroll > 50% of revenue', () => {
      mockMetrics.revenue = 60000;
      mockMetrics.annualPayroll = 40000; // 66% of revenue
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const payrollSuggestions = engine.insights.filter(i =>
        i.message && i.message.includes('Payroll')
      );
      expect(payrollSuggestions.length).toBeGreaterThan(0);
    });

    it('should suggest fixed cost optimization when > 30% of revenue', () => {
      mockMetrics.revenue = 60000;
      mockMetrics.annualFixedCosts = 25000; // 41% of revenue
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const costSuggestions = engine.insights.filter(i =>
        i.message && i.message.includes('Fixed costs')
      );
      expect(costSuggestions.length).toBeGreaterThan(0);
    });

    it('should suggest profit margin improvement when < 10% net', () => {
      mockMetrics.revenue = 60000;
      mockMetrics.income = 5000; // 8.3% net margin
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const profitSuggestions = engine.insights.filter(i =>
        i.title && i.title.includes('Low Profit')
      );
      expect(profitSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Pricing Recommendations', () => {
    it('should recommend price increase for below-average margin offerings', () => {
      mockState.offerings[1].marginPct = 15; // Below average
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const pricingSuggestions = engine.insights.filter(i =>
        i.category === 'pricing' && i.type === 'suggestion'
      );
      expect(pricingSuggestions.length).toBeGreaterThan(0);
    });

    it('should not recommend price changes for above-average margins', () => {
      mockState.offerings[0].marginPct = 60; // High margin
      mockState.offerings[1].marginPct = 50;
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const pricingSuggestions = engine.insights.filter(i => i.category === 'pricing');
      expect(pricingSuggestions.length).toBe(0);
    });
  });

  describe('Break-Even Detection', () => {
    it('should alert when operating at loss', () => {
      mockMetrics.clients = 2;
      mockMetrics.breakEvenClients = 5;
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const beAlerts = engine.insights.filter(i => i.category === 'breakeven');
      expect(beAlerts.length).toBeGreaterThan(0);
      expect(beAlerts[0].severity).toBe('critical');
    });

    it('should alert when close to break-even', () => {
      mockMetrics.clients = 4.5;
      mockMetrics.breakEvenClients = 5;
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const beAlerts = engine.insights.filter(i => i.category === 'breakeven');
      expect(beAlerts.length).toBeGreaterThan(0);
      expect(beAlerts[0].severity).toBe('high');
    });
  });

  describe('What-If Scenarios', () => {
    it('should generate price increase scenario', () => {
      const scenarios = engine.generateWhatIfScenarios();
      const priceScenario = scenarios.find(s => s.name === 'Price increase 10%');

      expect(priceScenario).toBeTruthy();
      expect(priceScenario.changes.offerings).toBeTruthy();
      expect(priceScenario.changes.offerings[0].priceMonthly).toBe(
        Math.round(mockState.offerings[0].priceMonthly * 1.1)
      );
    });

    it('should generate add employee scenario', () => {
      const scenarios = engine.generateWhatIfScenarios();
      const empScenario = scenarios.find(s => s.name === 'Add 1 employee');

      expect(empScenario).toBeTruthy();
      expect(empScenario.changes.fullTimeEmployees).toBe(2);
    });

    it('should generate cost reduction scenario', () => {
      const scenarios = engine.generateWhatIfScenarios();
      const costScenario = scenarios.find(s => s.name === 'Reduce variable costs 10%');

      expect(costScenario).toBeTruthy();
      expect(costScenario.changes.offerings).toBeTruthy();
    });

    it('should generate utilization improvement scenario', () => {
      const scenarios = engine.generateWhatIfScenarios();
      const utilScenario = scenarios.find(s => s.name === 'Reach target utilization');

      expect(utilScenario).toBeTruthy();
      expect(utilScenario.description).toContain('utilization');
    });
  });

  describe('Insights Summary', () => {
    it('should return insights sorted by severity', () => {
      mockMetrics.capacityPct = 30;
      mockMetrics.clients = 1;
      mockMetrics.breakEvenClients = 5;
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const summary = engine.getSummary();
      expect(summary.totalInsights).toBeGreaterThan(0);
      expect(summary.bySeverity).toHaveProperty('critical');
      expect(summary.bySeverity).toHaveProperty('high');
      expect(summary.insights[0].severity).toBe('critical');
    });

    it('should filter insights by severity', () => {
      mockMetrics.capacityPct = 30;
      engine = new InsightsEngine(mockMetrics, mockState);
      engine.generateInsights();

      const highSeverity = engine.getInsightsBySeverity('high');
      highSeverity.forEach(insight => {
        expect(insight.severity).toBe('high');
      });
    });
  });

  describe('Public API Functions', () => {
    it('should generate insights via public function', () => {
      const insights = generateInsights(mockMetrics, mockState);
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should generate what-if scenarios via public function', () => {
      const scenarios = generateWhatIfScenarios(mockMetrics, mockState);
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-margin offerings', () => {
      mockState.offerings[1].marginPct = 0;
      engine = new InsightsEngine(mockMetrics, mockState);
      const insights = engine.generateInsights();

      expect(insights).toBeTruthy();
    });

    it('should handle high-performance scenarios', () => {
      mockMetrics.capacityPct = 95;
      mockMetrics.income = 100000;
      mockState.offerings.forEach(o => o.marginPct = 60);
      engine = new InsightsEngine(mockMetrics, mockState);
      const insights = engine.generateInsights();

      // Should have minimal alerts for healthy scenario
      const alerts = insights.filter(i => i.severity === 'high' || i.severity === 'critical');
      expect(alerts.length).toBeLessThan(3);
    });
  });
});
