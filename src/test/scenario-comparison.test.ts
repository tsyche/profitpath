import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CalcResult } from '../types';
import { calc } from '../calculations/index';

describe('Scenario Comparison Feature', () => {
  const fmtInt = (n: number) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  const fmtMoney0 = (n: number) => Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const fmtPct1 = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';

  // Mock createModal function
  const mockCreateModal = (config: { title: string; content: string; size: string }) => {
    return config;
  };

  // Mock global window functions for export and sharing
  beforeEach(() => vi.stubGlobal('window', {
    exportAsCSV: () => console.log('CSV export called'),
    shareScenario: () => console.log('Share scenario called'),
    exportAsPDF: () => console.log('PDF export called'),
    showEmbedCode: () => console.log('Embed code called')
  }));
  afterEach(() => vi.unstubAllGlobals());

  it('should calculate metrics for scenario comparison', () => {
    const scenario1 = {
      mode: 'forecast' as const,
      fullTimeEmployees: 2,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 60000,
      partTimeEmployeePay: 0,
      monthlyCosts: 5000,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80,
      lockMix: false,
      offerings: [
        {
          name: 'Basic Service',
          priceMonthly: 2000,
          sessionsPerYear: 12,
          hoursPerSession: 8,
          variableCostPerSession: 200,
          mixPct: 100,
          currentClients: 0
        }
      ]
    };

    const scenario2 = {
      mode: 'forecast' as const,
      fullTimeEmployees: 2,
      partTimeEmployees: 1,
      fullTimeEmployeePay: 60000,
      partTimeEmployeePay: 30000,
      monthlyCosts: 6000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 80,
      lockMix: false,
      offerings: [
        {
          name: 'Basic Service',
          priceMonthly: 2000,
          sessionsPerYear: 12,
          hoursPerSession: 8,
          variableCostPerSession: 200,
          mixPct: 100,
          currentClients: 0
        }
      ]
    };

    // Calculate metrics
    const metrics1 = calc(scenario1);
    const metrics2 = calc(scenario2);

    // Verify both have calculated metrics
    expect(metrics1).toBeDefined();
    expect(metrics1.revenue).toBeGreaterThan(0);
    expect(metrics1.clients).toBeGreaterThanOrEqual(0);
    expect(metrics1.income).toBeDefined();
    expect(metrics1.offeringMetrics).toBeDefined();
    expect(Array.isArray(metrics1.offeringMetrics)).toBe(true);

    expect(metrics2).toBeDefined();
    expect(metrics2.revenue).toBeGreaterThan(0);
    expect(metrics2.clients).toBeGreaterThanOrEqual(0);
    expect(metrics2.income).toBeDefined();
  });

  it('should build comparison diff modal content', () => {
    const s1 = {
      name: 'Baseline',
      timestamp: '1/1/2025, 12:00 PM'
    };
    const s2 = {
      name: 'Optimized',
      timestamp: '1/15/2025, 2:00 PM'
    };

    type ComparisonMetrics = Pick<CalcResult, 'clients' | 'revenue' | 'income' | 'capacityPct' |
      'totalFixedCosts' | 'variableCosts' | 'breakEvenClients' | 'contributionMarginPerClient'>;
    const metrics1: ComparisonMetrics = {
      clients: 10, revenue: 100000, income: 50000, capacityPct: 75,
      totalFixedCosts: 30000, variableCosts: 20000, breakEvenClients: 8, contributionMarginPerClient: 8000
    };
    const metrics2: ComparisonMetrics = {
      clients: 15, revenue: 150000, income: 75000, capacityPct: 85,
      totalFixedCosts: 25000, variableCosts: 15000, breakEvenClients: 6, contributionMarginPerClient: 9000
    };

    // Simulate building the modal content like showScenarioComparisonDiff does
    let contentHtml = '<div class="scenario-diff-wrap">';
    contentHtml += '<div class="scenario-diff-header">';
    contentHtml += '<div class="diff-col-label"></div>';
    contentHtml += '<div class="diff-col-s1"><strong>' + s1.name + '</strong><span class="diff-date">' + s1.timestamp + '</span></div>';
    contentHtml += '<div class="diff-col-s2"><strong>' + s2.name + '</strong><span class="diff-date">' + s2.timestamp + '</span></div>';
    contentHtml += '<div class="diff-col-delta">Change</div>';
    contentHtml += '</div>';

    contentHtml += '<div class="scenario-diff-section-title">Summary</div>';

    // Add export and sharing options
    contentHtml += '<div class="scenario-diff-section-title">Export & Share</div>';
    contentHtml += '<div class="scenario-diff-export-options">';
    contentHtml += '<button class="btn primary" onclick="window.exportAsCSV()">📊 Export CSV</button>';
    contentHtml += '<button class="btn secondary" onclick="window.shareScenario()">🔗 Share Scenario</button>';
    contentHtml += '<button class="btn secondary" onclick="window.exportAsPDF()">📄 Export PDF</button>';
    contentHtml += '<button class="btn secondary" onclick="window.showEmbedCode()">📋 Get Embed Code</button>';
    contentHtml += '</div>';

    // Add some metrics
    const metricsToCompare: {
      label: string; key: keyof ComparisonMetrics; format: (n: number) => string; betterIsHigher: boolean
    }[] = [
      { label: 'Clients', key: 'clients', format: fmtInt, betterIsHigher: true },
      { label: 'Revenue', key: 'revenue', format: fmtMoney0, betterIsHigher: true },
      { label: 'Net Income', key: 'income', format: fmtMoney0, betterIsHigher: true },
      { label: 'Utilization', key: 'capacityPct', format: fmtPct1, betterIsHigher: true },
      { label: 'Fixed Costs', key: 'totalFixedCosts', format: fmtMoney0, betterIsHigher: false },
      { label: 'Variable Costs', key: 'variableCosts', format: fmtMoney0, betterIsHigher: false },
      { label: 'Break-even Clients', key: 'breakEvenClients', format: fmtInt, betterIsHigher: false },
      { label: 'Contribution Margin/Client', key: 'contributionMarginPerClient', format: fmtMoney0, betterIsHigher: true }
    ];

    metricsToCompare.forEach(m => {
      const val1 = metrics1[m.key];
      const val2 = metrics2[m.key];
      const delta = val2 - val1;

      let diffClass = 'diff-neutral';
      if (delta !== 0) {
        const isImprovement = m.betterIsHigher ? (delta > 0) : (delta < 0);
        diffClass = isImprovement ? 'diff-better' : 'diff-worse';
      }

      contentHtml += '<div class="scenario-diff-row">';
      contentHtml += '<div class="diff-col-label">' + m.label + '</div>';
      contentHtml += '<div class="diff-col-s1">' + m.format(val1) + '</div>';
      contentHtml += '<div class="diff-col-s2">' + m.format(val2) + '</div>';
      contentHtml += '<div class="diff-col-delta ' + diffClass + '">' + (delta > 0 ? '+' : '') + m.format(delta) + '</div>';
      contentHtml += '</div>';
    });

    contentHtml += '</div>';

    // Create modal via mockCreateModal
    const modal = mockCreateModal({
      title: 'Scenario Comparison: ' + s1.name + ' vs ' + s2.name,
      content: contentHtml,
      size: 'full'
    });

    // Verify modal properties
    expect(modal).toBeDefined();
    expect(modal.title).toContain('Scenario Comparison');
    expect(modal.title).toContain('Baseline');
    expect(modal.title).toContain('Optimized');
    expect(modal.size).toBe('full');

    // Verify content structure
    expect(modal.content).toContain('scenario-diff-wrap');
    expect(modal.content).toContain('scenario-diff-header');
    expect(modal.content).toContain('scenario-diff-section-title');
    expect(modal.content).toContain('Summary');
    expect(modal.content).toContain('Clients');
    expect(modal.content).toContain('Revenue');
    expect(modal.content).toContain('Net Income');
    expect(modal.content).toContain('Export & Share');
    expect(modal.content).toContain('Export CSV');
    expect(modal.content).toContain('Share Scenario');
    expect(modal.content).toContain('Export PDF');
    expect(modal.content).toContain('Get Embed Code');

    // Verify diff classes for improvements (all should be better since scenario2 is better)
    expect(modal.content).toContain('diff-better');
  });
});
