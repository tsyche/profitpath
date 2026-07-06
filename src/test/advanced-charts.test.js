import { describe, it, expect } from 'vitest';
import {
  computeHeatmapData,
  renderSensitivityHeatmap,
  computeScorecardData,
  renderScorecardRadar,
  computeFunnelData,
  renderClientFunnel
} from '../../assets/services/advancedChartsService.js';

const baseState = {
  mode: 'forecast',
  fullTimeEmployees: 2,
  fullTimeEmployeePay: 50000,
  partTimeEmployees: 0,
  partTimeEmployeePay: 0,
  monthlyCosts: 1000,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 85,
  offerings: [
    {
      name: 'Consulting',
      priceMonthly: 500,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 50,
      mixPct: 60,
      currentClients: 10
    },
    {
      name: 'Support',
      priceMonthly: 150,
      sessionsPerYear: 24,
      hoursPerSession: 1,
      variableCostPerSession: 20,
      mixPct: 40,
      currentClients: 15
    }
  ]
};

describe('Sensitivity Heat Map', () => {
  it('computes a 5x5 grid of income values', () => {
    const { priceSteps, utilSteps, cells } = computeHeatmapData(baseState);
    expect(priceSteps).toHaveLength(5);
    expect(utilSteps).toHaveLength(5);
    expect(cells).toHaveLength(5);
    cells.forEach((row) => expect(row).toHaveLength(5));
  });

  it('increases income as price adjustment increases, holding utilization fixed', () => {
    const { cells } = computeHeatmapData(baseState);
    const middleUtilCol = 2; // 0% utilization adjustment
    const incomes = cells.map((row) => row[middleUtilCol].income);
    expect(incomes[incomes.length - 1]).toBeGreaterThan(incomes[0]);
  });

  it('renders an HTML table with colored cells', () => {
    const html = renderSensitivityHeatmap(baseState);
    expect(html).toContain('<table class="heatmap-table">');
    expect(html).toContain('background:rgba(');
  });

  it('handles offerings with zero price gracefully', () => {
    const zeroState = { ...baseState, offerings: baseState.offerings.map((o) => ({ ...o, priceMonthly: 0 })) };
    expect(() => computeHeatmapData(zeroState)).not.toThrow();
  });
});

describe('Balanced Scorecard Radar', () => {
  it('computes five normalized 0-100 scores', () => {
    const metrics = {
      revenue: 100000,
      income: 20000,
      capacityPct: 75,
      contributionMarginRatio: 0.4,
      offeringMetrics: [
        { revenue: 60000 },
        { revenue: 40000 }
      ]
    };
    const scores = computeScorecardData(metrics);
    expect(Object.keys(scores)).toEqual([
      'profitability', 'utilization', 'growthHeadroom', 'costEfficiency', 'diversification'
    ]);
    Object.values(scores).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it('gives diversification score of 0 for a single offering', () => {
    const metrics = {
      revenue: 100000,
      income: 20000,
      capacityPct: 75,
      contributionMarginRatio: 0.4,
      offeringMetrics: [{ revenue: 100000 }]
    };
    expect(computeScorecardData(metrics).diversification).toBe(0);
  });

  it('handles zero revenue without throwing or producing NaN', () => {
    const metrics = { revenue: 0, income: 0, capacityPct: 0, contributionMarginRatio: 0, offeringMetrics: [] };
    const scores = computeScorecardData(metrics);
    Object.values(scores).forEach((v) => expect(Number.isFinite(v)).toBe(true));
  });

  it('renders an SVG radar chart with all five axis labels', () => {
    const metrics = {
      revenue: 100000,
      income: 20000,
      capacityPct: 75,
      contributionMarginRatio: 0.4,
      offeringMetrics: [{ revenue: 60000 }, { revenue: 40000 }]
    };
    const html = renderScorecardRadar(metrics);
    expect(html).toContain('<svg');
    expect(html).toContain('Profitability');
    expect(html).toContain('Utilization');
    expect(html).toContain('Growth Headroom');
    expect(html).toContain('Cost Efficiency');
    expect(html).toContain('Diversification');
  });
});

describe('Client Capacity Funnel', () => {
  it('computes three descending-or-equal stages', () => {
    const metrics = {
      serviceHoursPerClient: 20,
      annualServiceHours: 2000,
      clients: 50,
      breakEvenClients: 30
    };
    const stages = computeFunnelData(metrics);
    expect(stages).toHaveLength(3);
    expect(stages[0].value).toBeGreaterThanOrEqual(stages[1].value);
  });

  it('handles Infinity break-even clients (unprofitable scenario)', () => {
    const metrics = {
      serviceHoursPerClient: 20,
      annualServiceHours: 2000,
      clients: 50,
      breakEvenClients: Infinity
    };
    const stages = computeFunnelData(metrics);
    const breakEvenStage = stages.find((s) => s.label === 'Break-even Clients');
    expect(breakEvenStage.value).toBe(0);
  });

  it('handles zero service hours per client without dividing by zero', () => {
    const metrics = { serviceHoursPerClient: 0, annualServiceHours: 2000, clients: 0, breakEvenClients: 0 };
    expect(() => computeFunnelData(metrics)).not.toThrow();
  });

  it('renders proportionally-scaled bars', () => {
    const metrics = { serviceHoursPerClient: 20, annualServiceHours: 2000, clients: 50, breakEvenClients: 30 };
    const html = renderClientFunnel(metrics);
    expect(html).toContain('client-funnel');
    expect(html).toContain('funnel-bar-fill');
    expect(html).toContain('width:100.0%');
  });
});
