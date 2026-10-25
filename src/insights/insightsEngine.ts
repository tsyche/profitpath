/**
 * AI / Rules-Based Insights Engine
 * Provides optimization suggestions, automated alerts, and what-if scenarios
 */

import { calc } from '../calculations/index';
import { formatMoney0 } from '../calculations/currency';

/**
 * State patch that adds full-time hires. calc() reads fullTimeEmployees when the app's
 * new headcount fields are present and only falls back to the legacy `employees`.
 */
export function hirePatch(state: any, count: number): Record<string, number> {
  if ('fullTimeEmployees' in state && 'partTimeEmployees' in state) {
    return { fullTimeEmployees: (Number(state.fullTimeEmployees) || 0) + count };
  }
  return { employees: (Number(state.employees) || 0) + count };
}

/**
 * State patch that adds part-time hires, or null for a legacy state with only `employees`
 * (no part-time field to put them in).
 */
export function partTimeHirePatch(state: any, count: number): Record<string, number> | null {
  if ('fullTimeEmployees' in state && 'partTimeEmployees' in state) {
    return { partTimeEmployees: (Number(state.partTimeEmployees) || 0) + count };
  }
  return null;
}

export class InsightsEngine {
  metrics: any;
  state: any;
  insights: any[];

  constructor(metrics: any, state: any) {
    this.metrics = metrics;
    this.state = state;
    this.insights = [];
  }

  money(n: number) {
    return formatMoney0(n, this.state.currency);
  }

  /**
   * Per-offering unit margin (% of price left after variable and labor cost per client).
   * Taken from the calc engine so it holds in both modes, even when an offering has 0 clients.
   */
  offeringMargins(): { name: string; marginPct: number; priceMonthly: number }[] {
    const offerings = Array.isArray(this.state.offerings) ? this.state.offerings : [];
    return (this.metrics.offeringMetrics || []).map((m: any, i: number) => ({
      name: m.name,
      marginPct: m.maxDiscountPct,
      priceMonthly: Number(offerings.find((o: any) => o && o.name === m.name)?.priceMonthly ?? offerings[i]?.priceMonthly) || 0
    }));
  }

  /**
   * Generate all insights for the current scenario
   */
  generateInsights() {
    this.insights = [];
    this.detectUnderutilization();
    this.detectDecliningMargins();
    this.generateOptimizationSuggestions();
    this.generatePricingRecommendations();
    this.detectBreakEvenRisk();
    return this.insights;
  }

  /**
   * Detect underutilization (below target or optimal range)
   */
  detectUnderutilization() {
    const { capacityPct, targetUtilizationPct } = this.metrics;

    if (capacityPct < targetUtilizationPct * 0.8) {
      // Significantly underutilized
      const clientsNeeded = capacityPct > 0
        ? Math.ceil(this.metrics.clients * (targetUtilizationPct / capacityPct) - this.metrics.clients)
        : 0;

      this.insights.push({
        type: 'alert',
        severity: 'high',
        category: 'utilization',
        title: 'Significant Under-utilization Detected',
        message: `Your utilization is ${capacityPct.toFixed(1)}% vs ${targetUtilizationPct}% target. You need ~${clientsNeeded} more clients to reach target capacity.`,
        metric: capacityPct,
        target: targetUtilizationPct,
        actionable: true
      });
    } else if (capacityPct < targetUtilizationPct * 0.95) {
      // Moderately underutilized
      this.insights.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'utilization',
        title: 'Consider Increasing Utilization',
        message: `Current utilization is ${capacityPct.toFixed(1)}%. Reaching ${targetUtilizationPct}% would improve profitability.`,
        metric: capacityPct,
        target: targetUtilizationPct,
        actionable: true
      });
    }
  }

  /**
   * Detect declining margins
   */
  detectDecliningMargins() {
    const lowMarginThreshold = 20; // 20% margin

    this.offeringMargins().forEach((offering) => {
      const marginPct = offering.marginPct;

      if (marginPct < lowMarginThreshold && marginPct > 0) {
        this.insights.push({
          type: 'alert',
          severity: 'high',
          category: 'margin',
          title: `Low Margin on "${offering.name}"`,
          message: `${offering.name} has a ${marginPct.toFixed(1)}% margin. Consider raising prices or reducing variable costs.`,
          metric: marginPct,
          offering: offering.name,
          actionable: true
        });
      } else if (marginPct <= 0) {
        this.insights.push({
          type: 'alert',
          severity: 'critical',
          category: 'margin',
          title: `Loss-Making Service: "${offering.name}"`,
          message: `${offering.name} is unprofitable. Immediately increase price or reduce costs.`,
          metric: marginPct,
          offering: offering.name,
          actionable: true
        });
      }
    });
  }

  /**
   * Generate optimization suggestions based on business rules
   */
  generateOptimizationSuggestions() {
    const { income, revenue, annualPayroll, annualFixedCosts } = this.metrics;
    if (!(revenue > 0)) return;
    const payrollPct = annualPayroll / revenue * 100;
    const fixedCostPct = annualFixedCosts / revenue * 100;

    // Payroll optimization
    if (payrollPct > 50) {
      this.insights.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'optimization',
        title: 'Payroll is High Relative to Revenue',
        message: `Payroll is ${payrollPct.toFixed(1)}% of revenue. Consider automation, outsourcing, or price increases to improve profitability.`,
        metric: payrollPct,
        actionable: true
      });
    }

    // Fixed cost optimization
    if (fixedCostPct > 30) {
      this.insights.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'optimization',
        title: 'High Fixed Costs Relative to Revenue',
        message: `Fixed costs are ${fixedCostPct.toFixed(1)}% of revenue. Review overhead and consider reducing fixed expenses.`,
        metric: fixedCostPct,
        actionable: true
      });
    }

    // Profitability improvement
    if (income > 0 && income < revenue * 0.1) {
      this.insights.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'optimization',
        title: 'Low Profit Margin Overall',
        message: `Net income is ${((income / revenue) * 100).toFixed(1)}% of revenue. Focus on raising prices or reducing costs.`,
        metric: (income / revenue) * 100,
        actionable: true
      });
    }
  }

  /**
   * Generate pricing recommendations
   */
  generatePricingRecommendations() {
    const offerings = this.offeringMargins();
    if (offerings.length < 2) return;
    const avgMargin = offerings.reduce((sum, o) => sum + o.marginPct, 0) / offerings.length;

    offerings.forEach((offering) => {
      const marginPct = offering.marginPct;
      const marginDiff = marginPct - avgMargin;

      if (marginDiff < -5 && offering.priceMonthly > 0) {
        const recommendedPrice = Math.round(offering.priceMonthly * 1.15);
        this.insights.push({
          type: 'suggestion',
          severity: 'medium',
          category: 'pricing',
          title: `Raise Price for "${offering.name}"`,
          message: `Margin ${marginDiff.toFixed(1)}% below average. Consider raising price from ${this.money(offering.priceMonthly)} to ${this.money(recommendedPrice)}.`,
          metric: marginPct,
          offering: offering.name,
          recommendation: { current: offering.priceMonthly, suggested: recommendedPrice },
          actionable: true
        });
      }
    });
  }

  /**
   * Detect break-even risk
   */
  detectBreakEvenRisk() {
    const { clients, breakEvenClients } = this.metrics;

    if (breakEvenClients === Infinity) {
      this.insights.push({
        type: 'alert',
        severity: 'critical',
        category: 'breakeven',
        title: 'Cannot Break Even',
        message: 'No offering earns a positive margin per client, so no client count covers your fixed costs. Raise prices or cut per-client costs.',
        metric: clients,
        actionable: true
      });
    } else if (breakEvenClients > 0) {
      const percentToBE = (clients / breakEvenClients) * 100;

      if (percentToBE < 80 && clients < breakEvenClients) {
        this.insights.push({
          type: 'alert',
          severity: 'critical',
          category: 'breakeven',
          title: 'Operating at Loss',
          message: `You need ${breakEvenClients - clients} more clients to break even.`,
          metric: clients,
          target: breakEvenClients,
          actionable: true
        });
      } else if (percentToBE < 110 && percentToBE >= 80) {
        this.insights.push({
          type: 'alert',
          severity: 'high',
          category: 'breakeven',
          title: 'Close to Break-Even',
          message: clients >= breakEvenClients
            ? `Only ${clients - breakEvenClients} clients above break-even. Small changes significantly impact profitability.`
            : `Only ${breakEvenClients - clients} clients from break-even. Small changes significantly impact profitability.`,
          metric: clients,
          target: breakEvenClients,
          actionable: true
        });
      }
    }
  }

  /**
   * Generate auto what-if scenarios based on current state
   */
  generateWhatIfScenarios() {
    const { offerings, employees, targetUtilizationPct } = this.state;
    const baseIncome = this.metrics.income;
    const list = Array.isArray(offerings) ? offerings : [];

    // Impact comes from re-running the calc engine on the changed state, not from rules of thumb
    const impact = (changes: Record<string, any>) => {
      const delta = calc({ ...this.state, ...changes }).income - baseIncome;
      return `${delta >= 0 ? '+' : '-'}${this.money(Math.abs(Math.round(delta)))}/yr net profit`;
    };

    const priceChanges = { offerings: list.map((o: any) => ({ ...o, priceMonthly: Math.round(o.priceMonthly * 1.1) })) };
    const costChanges = { offerings: list.map((o: any) => ({ ...o, variableCostPerSession: Math.round(o.variableCostPerSession * 0.9) })) };
    const hireChanges = hirePatch(this.state, 1);
    const utilChanges = this.state.mode === 'forecast'
      ? { productiveUtilizationPct: Math.min(100, (Number(this.state.productiveUtilizationPct) || 0) + 10) }
      : { offerings: list.map((o: any) => ({ ...o, currentClients: Math.ceil((o.currentClients || 0) * 1.1) })) };

    return [
      { name: 'Price increase 10%', description: 'Increase all service prices by 10%', changes: priceChanges, estimatedImpact: impact(priceChanges) },
      { name: 'Add 1 employee', description: 'Increase capacity by adding one full-time employee', changes: hireChanges, estimatedImpact: impact(hireChanges) },
      { name: 'Reduce variable costs 10%', description: 'Reduce variable costs through efficiency gains', changes: costChanges, estimatedImpact: impact(costChanges) },
      this.state.mode === 'forecast'
        ? { name: 'Productive time +10 points', description: 'Raise productive utilization by 10 points', changes: utilChanges, estimatedImpact: impact(utilChanges) }
        : { name: 'Grow clients 10%', description: `Add ~10% more clients (target utilization ${targetUtilizationPct}%)`, changes: utilChanges, estimatedImpact: impact(utilChanges) }
    ];
  }

  /**
   * Get insights sorted by severity
   */
  getInsightsBySeverity(severity: any) {
    return this.insights.filter(i => i.severity === severity);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const bySeverity = {
      critical: this.getInsightsBySeverity('critical').length,
      high: this.getInsightsBySeverity('high').length,
      medium: this.getInsightsBySeverity('medium').length,
      low: this.getInsightsBySeverity('low').length
    };

    return {
      totalInsights: this.insights.length,
      bySeverity,
      insights: this.insights.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder as any)[a.severity] - (severityOrder as any)[b.severity];
      })
    };
  }
}

/**
 * Generate insights for the current state
 */
export function generateInsights(metrics: any, state: any) {
  const engine = new InsightsEngine(metrics, state);
  return engine.generateInsights();
}

/**
 * Generate what-if scenarios
 */
export function generateWhatIfScenarios(metrics: any, state: any) {
  const engine = new InsightsEngine(metrics, state);
  return engine.generateWhatIfScenarios();
}
