/**
 * Customer Acquisition & Growth Analytics
 * Calculates CAC, LTV, churn rate, and growth projections
 */

/**
 * Calculate Customer Acquisition Cost (CAC)
 * CAC = Total marketing spend / Number of new customers acquired
 *
 * @param {number} marketingSpend - Total marketing/sales spend (monthly or annual)
 * @param {number} newCustomers - Number of new customers acquired in same period
 * @returns {number} CAC in the spend currency
 */
export function calculateCAC(marketingSpend, newCustomers) {
  if (newCustomers <= 0) return 0;
  return marketingSpend / newCustomers;
}

/**
 * Calculate Customer Lifetime Value (LTV)
 * LTV = Average customer lifetime contribution
 *
 * @param {object} metrics - Calculation metrics from ProfitPath
 * @param {number} averageCustomerLifespanMonths - Expected customer lifetime
 * @param {number} clientRetentionRate - % of clients retained year-to-year (0-100)
 * @returns {object} LTV metrics
 */
export function calculateLTV(metrics, averageCustomerLifespanMonths = 24, clientRetentionRate = 80) {
  const retentionRate = Math.max(0, Math.min(100, clientRetentionRate)) / 100;

  if (!metrics || !metrics.offeringMetrics) {
    return {
      averageLTV: 0,
      byOffering: [],
      assumptions: {
        avgLifespanMonths: averageCustomerLifespanMonths,
        retentionRate: clientRetentionRate
      }
    };
  }

  // Calculate LTV per offering
  const byOffering = metrics.offeringMetrics.map((offering, idx) => {
    if (!offering || offering.sessionsPerYear === 0) {
      return {
        offeringIndex: idx,
        monthlyValue: 0,
        estimatedLTV: 0
      };
    }

    // Monthly client value = monthly price
    const monthlyValue = offering.priceMonthly || 0;

    // LTV accounting for retention: sum of monthly payments over lifespan, accounting for churn
    let ltv = 0;
    let remainingRetention = 1.0;

    for (let month = 0; month < averageCustomerLifespanMonths; month++) {
      ltv += monthlyValue * remainingRetention;
      remainingRetention *= retentionRate;
    }

    return {
      offeringIndex: idx,
      monthlyValue,
      estimatedLTV: Math.round(ltv),
      retentionAdjusted: true
    };
  });

  // Average LTV across all offerings
  const totalLTV = byOffering.reduce((sum, o) => sum + o.estimatedLTV, 0);
  const validOfferings = byOffering.filter(o => o.estimatedLTV > 0).length;
  const averageLTV = validOfferings > 0 ? Math.round(totalLTV / validOfferings) : 0;

  return {
    averageLTV,
    byOffering,
    totalLTV,
    validOfferingCount: validOfferings,
    assumptions: {
      avgLifespanMonths: averageCustomerLifespanMonths,
      retentionRate: clientRetentionRate
    }
  };
}

/**
 * Calculate LTV:CAC Ratio
 * Healthy ratio is 3:1 or higher (for every $1 spent on CAC, get $3+ in lifetime value)
 *
 * @param {number} ltv - Customer lifetime value
 * @param {number} cac - Customer acquisition cost
 * @returns {object} LTV:CAC ratio and health assessment
 */
export function calculateLTVtoCACRatio(ltv, cac) {
  if (cac <= 0) {
    return {
      ratio: 0,
      ratioText: 'N/A',
      health: 'unknown',
      recommendation: 'Enter marketing spend to calculate LTV:CAC ratio'
    };
  }

  const ratio = ltv / cac;
  let health, recommendation;

  if (ratio >= 3) {
    health = 'healthy';
    recommendation = 'Excellent LTV:CAC ratio. Consider increasing marketing investment.';
  } else if (ratio >= 1.5) {
    health = 'fair';
    recommendation = 'Good ratio, but room for improvement. Focus on customer retention.';
  } else if (ratio >= 1) {
    health = 'poor';
    recommendation = 'Low ratio. Reduce CAC or increase customer lifetime value.';
  } else {
    health = 'critical';
    recommendation = 'Critical: LTV < CAC. Business model is unsustainable at current metrics.';
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    ratioText: `${ratio.toFixed(2)}:1`,
    health,
    recommendation
  };
}

/**
 * Calculate payback period (months until CAC is recovered)
 * Payback Period = CAC / Monthly Gross Profit Per Customer
 *
 * @param {number} cac - Customer acquisition cost
 * @param {number} monthlyProfitPerCustomer - Monthly contribution margin per customer
 * @returns {object} Payback period metrics
 */
export function calculatePaybackPeriod(cac, monthlyProfitPerCustomer) {
  if (monthlyProfitPerCustomer <= 0) {
    return {
      months: null,
      monthsText: 'N/A',
      days: null,
      healthAssessment: 'Cannot calculate without positive monthly profit'
    };
  }

  const months = cac / monthlyProfitPerCustomer;
  const days = Math.round((months % 1) * 30);
  const wholeMonths = Math.floor(months);

  let assessment;
  if (months <= 3) {
    assessment = 'Excellent - Fast payback period';
  } else if (months <= 6) {
    assessment = 'Good - Reasonable payback period';
  } else if (months <= 12) {
    assessment = 'Fair - Long payback period';
  } else {
    assessment = 'Poor - Very long payback period, may indicate pricing or cost issues';
  }

  return {
    months: Math.round(months * 100) / 100,
    wholeMonths,
    days,
    monthsText: wholeMonths > 0 ? `${wholeMonths}m ${days}d` : `${days}d`,
    healthAssessment: assessment
  };
}

/**
 * Calculate churn rate and its impact
 * Churn = % of customers lost per period
 *
 * @param {number} startingCustomers - Customers at period start
 * @param {number} endingCustomers - Customers at period end
 * @param {number} newCustomersAdded - New customers added during period
 * @returns {object} Churn metrics
 */
export function calculateChurnRate(startingCustomers, endingCustomers, newCustomersAdded = 0) {
  if (startingCustomers <= 0) {
    return {
      monthlyChurnRate: 0,
      churnedCustomers: 0,
      retentionRate: 100,
      annualizedRetention: 100,
      impact: 'Insufficient data - no starting customers'
    };
  }

  const churnedCustomers = Math.max(0, startingCustomers + newCustomersAdded - endingCustomers);
  const monthlyChurnRate = (churnedCustomers / startingCustomers) * 100;
  const monthlyRetentionRate = 100 - monthlyChurnRate;

  // Annualize: (retention_rate)^12
  const annualizedRetention = Math.pow(monthlyRetentionRate / 100, 12) * 100;

  let impact, recommendation;
  if (monthlyChurnRate < 5) {
    impact = 'Excellent - Very low churn';
    recommendation = 'Customer base is stable and growing.';
  } else if (monthlyChurnRate < 10) {
    impact = 'Good - Acceptable churn';
    recommendation = 'Focus on customer success and satisfaction.';
  } else if (monthlyChurnRate < 15) {
    impact = 'Fair - Moderate churn';
    recommendation = 'Investigate why customers are leaving. Improve onboarding or support.';
  } else {
    impact = 'Poor - High churn';
    recommendation = 'Critical issue: Losing customers faster than you can acquire them.';
  }

  return {
    churnedCustomers: Math.round(churnedCustomers),
    monthlyChurnRate: Math.round(monthlyChurnRate * 100) / 100,
    monthlyRetentionRate: Math.round(monthlyRetentionRate * 100) / 100,
    annualizedRetention: Math.round(annualizedRetention * 100) / 100,
    impact,
    recommendation
  };
}

/**
 * Project customer growth over time
 * Models compound growth with acquisition, retention, and churn
 *
 * @param {object} params - Projection parameters
 * @returns {object} Growth projections
 */
export function projectCustomerGrowth(params) {
  const {
    currentCustomers = 0,
    monthlyAcquisition = 0,
    monthlyChurnRate = 0,
    projectionMonths = 12
  } = params;

  const monthlyRetentionRate = 1 - (monthlyChurnRate / 100);
  const projections = [];

  let customers = currentCustomers;

  for (let month = 0; month <= projectionMonths; month++) {
    projections.push({
      month,
      customers: Math.round(customers),
      newCustomers: Math.round(monthlyAcquisition),
      churned: Math.round(customers * (1 - monthlyRetentionRate))
    });

    // Next month calculation
    customers = customers * monthlyRetentionRate + monthlyAcquisition;
  }

  const endingCustomers = Math.round(customers);
  const growth = currentCustomers > 0
    ? Math.round(((endingCustomers - currentCustomers) / currentCustomers) * 100)
    : 0;

  return {
    projections,
    currentCustomers,
    projectedCustomers: endingCustomers,
    totalGrowth: growth,
    growthRate: projectionMonths > 0 ? growth / projectionMonths : 0,
    breakEvenMonth: calculateBreakEvenMonth(projections)
  };
}

/**
 * Find the month when customer base stops declining (if applicable)
 */
function calculateBreakEvenMonth(projections) {
  for (let i = 1; i < projections.length; i++) {
    if (projections[i].customers >= projections[i - 1].customers) {
      return i;
    }
  }
  return null;
}

/**
 * Calculate Revenue Impact metrics
 * Shows how CAC, LTV, and churn impact monthly/annual revenue
 *
 * @param {object} metrics - Full ProfitPath metrics
 * @param {number} monthlyNewCustomers - New customers acquired per month
 * @param {number} monthlyChurnRate - Monthly churn %
 * @param {number} marketingSpendPerMonth - Monthly marketing budget
 * @returns {object} Revenue impact metrics
 */
export function calculateRevenueImpact(metrics, monthlyNewCustomers = 0, monthlyChurnRate = 0, marketingSpendPerMonth = 0) {
  if (!metrics) return null;

  // Calculate average revenue per customer per month
  const totalMonthlyRevenue = metrics.monthlyRevenue || 0;
  const totalClients = metrics.totalClients || 1;
  const revenuePerCustomer = totalMonthlyRevenue / Math.max(1, totalClients);

  // Annual impact of new customer cohort
  const newCustomerMonthlyValue = monthlyNewCustomers * revenuePerCustomer;
  const newCustomerAnnualValue = newCustomerMonthlyValue * 12;

  // Cost per new customer (CAC)
  const cac = monthlyNewCustomers > 0
    ? marketingSpendPerMonth / monthlyNewCustomers
    : 0;

  // Annual cost of acquisition
  const annualAcquisitionCost = cac * (monthlyNewCustomers * 12);

  // Churn impact on existing base
  const monthlyChurn = totalClients * (monthlyChurnRate / 100);
  const lostMonthlyRevenue = monthlyChurn * revenuePerCustomer;
  const annualChurnImpact = lostMonthlyRevenue * 12;

  // Net growth impact
  const netAnnualRevenue = newCustomerAnnualValue - annualChurnImpact;
  const netAnnualProfit = netAnnualRevenue - annualAcquisitionCost;

  return {
    revenuePerCustomerPerMonth: Math.round(revenuePerCustomer),
    newCustomerAnnualValue: Math.round(newCustomerAnnualValue),
    annualAcquisitionCost: Math.round(annualAcquisitionCost),
    annualChurnImpact: Math.round(annualChurnImpact),
    netAnnualRevenue: Math.round(netAnnualRevenue),
    netAnnualProfit: Math.round(netAnnualProfit),
    roi: cac > 0 ? Math.round(((newCustomerAnnualValue - cac) / cac) * 100) : 0
  };
}

/**
 * Comprehensive customer acquisition summary
 * Combines all metrics into one view
 */
export function summarizeCustomerAcquisition(metrics, options = {}) {
  const {
    monthlyNewCustomers = 5,
    monthlyChurnRate = 5,
    marketingSpendPerMonth = 1000,
    avgCustomerLifespanMonths = 24,
    clientRetentionRate = 80
  } = options;

  const cac = calculateCAC(marketingSpendPerMonth, monthlyNewCustomers);
  const ltv = calculateLTV(metrics, avgCustomerLifespanMonths, clientRetentionRate);
  const ltvToCAC = calculateLTVtoCACRatio(ltv.averageLTV, cac);
  const churn = calculateChurnRate(
    metrics?.totalClients || 0,
    (metrics?.totalClients || 0) * (1 - (monthlyChurnRate / 100)),
    monthlyNewCustomers
  );
  const growth = projectCustomerGrowth({
    currentCustomers: metrics?.totalClients || 0,
    monthlyAcquisition: monthlyNewCustomers,
    monthlyChurnRate,
    projectionMonths: 12
  });
  const impact = calculateRevenueImpact(metrics, monthlyNewCustomers, monthlyChurnRate, marketingSpendPerMonth);

  return {
    cac: Math.round(cac),
    ltv: ltv.averageLTV,
    ltvToCAC,
    churnRate: churn.monthlyChurnRate,
    projectedAnnualCustomers: growth.projectedCustomers,
    annualRevenueImpact: impact?.netAnnualRevenue || 0,
    healthScore: calculateHealthScore(ltvToCAC.ratio, churn.monthlyChurnRate, cac, ltv.averageLTV)
  };
}

/**
 * Calculate overall business health score (0-100)
 */
function calculateHealthScore(ltvToCACRatio, churnRate, cac, ltv) {
  let score = 100;

  // LTV:CAC ratio scoring (target 3:1)
  if (ltvToCACRatio >= 3) score -= 0;
  else if (ltvToCACRatio >= 1.5) score -= 15;
  else if (ltvToCACRatio >= 1) score -= 30;
  else score -= 50;

  // Churn rate scoring (target <5%)
  if (churnRate < 5) score -= 0;
  else if (churnRate < 10) score -= 10;
  else if (churnRate < 15) score -= 20;
  else score -= 35;

  // CAC payback period (assume 10% monthly margin)
  const monthlyMargin = ltv / 24; // Rough estimate
  const paybackMonths = monthlyMargin > 0 ? cac / monthlyMargin : Infinity;
  if (paybackMonths <= 3) score -= 0;
  else if (paybackMonths <= 6) score -= 10;
  else if (paybackMonths <= 12) score -= 20;
  else score -= 35;

  return Math.max(0, Math.min(100, Math.round(score)));
}
