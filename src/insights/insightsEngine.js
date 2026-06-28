/**
 * AI / Rules-Based Insights Engine
 * Provides optimization suggestions, automated alerts, and what-if scenarios
 */

export class InsightsEngine {
  constructor(metrics, state) {
    this.metrics = metrics;
    this.state = state;
    this.insights = [];
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
    const utilDelta = targetUtilizationPct - capacityPct;

    if (capacityPct < targetUtilizationPct * 0.8) {
      // Significantly underutilized
      const clientsNeeded = Math.ceil(
        (targetUtilizationPct * this.metrics.serviceHours / 2080) - this.metrics.clients
      );

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
    const { offerings } = this.state;
    const lowMarginThreshold = 20; // 20% margin

    offerings.forEach((offering) => {
      if (!offering) return;
      const marginPct = offering.marginPct || 0;

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
    const { offerings } = this.state;
    const avgMargin = offerings.reduce((sum, o) => sum + (o.marginPct || 0), 0) / offerings.length;

    offerings.forEach((offering) => {
      if (!offering) return;
      const marginPct = offering.marginPct || 0;
      const marginDiff = marginPct - avgMargin;

      if (marginDiff < -5 && offering.priceMonthly > 0) {
        const recommendedPrice = Math.round(offering.priceMonthly * 1.15);
        this.insights.push({
          type: 'suggestion',
          severity: 'medium',
          category: 'pricing',
          title: `Raise Price for "${offering.name}"`,
          message: `Margin ${marginDiff.toFixed(1)}% below average. Consider raising price from $${offering.priceMonthly} to $${recommendedPrice}.`,
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
    const { clients, breakEvenClients, capacityPct, targetUtilizationPct } = this.metrics;

    if (breakEvenClients > 0) {
      const clientsFromBE = clients - breakEvenClients;
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
          message: `Only ${(breakEvenClients - clients).toFixed(0)} clients from break-even. Small changes significantly impact profitability.`,
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
    const scenarios = [];
    const { offerings, fullTimeEmployees, fullTimeEmployeePay, targetUtilizationPct } = this.state;
    const { capacityPct, income } = this.metrics;

    // Scenario 1: Price increase (10%)
    scenarios.push({
      name: 'Price increase 10%',
      description: 'Increase all service prices by 10%',
      changes: {
        offerings: offerings.map(o => ({
          ...o,
          priceMonthly: Math.round(o.priceMonthly * 1.1)
        }))
      },
      estimatedImpact: `+${((income * 0.1 * 0.85).toFixed(0))} to income (accounting for potential client loss)`
    });

    // Scenario 2: Hire one more employee
    scenarios.push({
      name: 'Add 1 employee',
      description: 'Increase capacity by adding one full-time employee',
      changes: {
        fullTimeEmployees: fullTimeEmployees + 1
      },
      estimatedImpact: `Increases capacity to ${(capacityPct * fullTimeEmployees / (fullTimeEmployees + 1)).toFixed(1)}%`
    });

    // Scenario 3: Cost reduction (10% reduction in variable costs)
    scenarios.push({
      name: 'Reduce variable costs 10%',
      description: 'Reduce variable costs through efficiency gains',
      changes: {
        offerings: offerings.map(o => ({
          ...o,
          variableCostPerSession: Math.round(o.variableCostPerSession * 0.9)
        }))
      },
      estimatedImpact: 'Improves margin on all offerings'
    });

    // Scenario 4: Improve utilization
    const targetClients = Math.ceil((targetUtilizationPct / 100) * 2080 / (offerings[0]?.hoursPerSession || 1));
    scenarios.push({
      name: 'Reach target utilization',
      description: `Increase clients to achieve ${targetUtilizationPct}% utilization`,
      changes: {
        offerings: offerings.map(o => ({
          ...o,
          currentClients: Math.ceil(o.currentClients * (targetUtilizationPct / capacityPct))
        }))
      },
      estimatedImpact: `+${Math.round(income * 0.25)} to income estimate`
    });

    return scenarios;
  }

  /**
   * Get insights sorted by severity
   */
  getInsightsBySeverity(severity) {
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
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    };
  }
}

/**
 * Generate insights for the current state
 */
export function generateInsights(metrics, state) {
  const engine = new InsightsEngine(metrics, state);
  return engine.generateInsights();
}

/**
 * Generate what-if scenarios
 */
export function generateWhatIfScenarios(metrics, state) {
  const engine = new InsightsEngine(metrics, state);
  return engine.generateWhatIfScenarios();
}
