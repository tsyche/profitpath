/**
 * Customer Analytics UI Component
 * Displays CAC, LTV, churn, and growth metrics in a dashboard
 */

import * as CA from './customer-analytics.js';

/**
 * Render customer analytics dashboard
 */
export function renderCustomerAnalyticsDashboard(metrics, settings = {}) {
  const {
    monthlyNewCustomers = 5,
    monthlyChurnRate = 5,
    monthlyMarketingBudget = 1000,
    avgCustomerLifespan = 24,
    clientRetention = 80
  } = settings;

  const summary = CA.summarizeCustomerAcquisition(metrics, {
    monthlyNewCustomers,
    monthlyChurnRate,
    marketingSpendPerMonth: monthlyMarketingBudget,
    avgCustomerLifespanMonths: avgCustomerLifespan,
    clientRetentionRate: clientRetention
  });

  const cac = CA.calculateCAC(monthlyMarketingBudget, monthlyNewCustomers);
  const ltv = CA.calculateLTV(metrics, avgCustomerLifespan, clientRetention);
  const churn = CA.calculateChurnRate(metrics?.totalClients || 0, (metrics?.totalClients || 0) * (1 - (monthlyChurnRate / 100)), monthlyNewCustomers);
  const growth = CA.projectCustomerGrowth({
    currentCustomers: metrics?.totalClients || 0,
    monthlyAcquisition: monthlyNewCustomers,
    monthlyChurnRate,
    projectionMonths: 12
  });

  return {
    summary,
    cac,
    ltv,
    churn,
    growth,
    html: generateDashboardHTML(summary, cac, ltv, churn, growth)
  };
}

/**
 * Generate HTML for customer analytics dashboard
 */
function generateDashboardHTML(summary, cac, ltv, churn, _growth) {
  const healthColor = getHealthColor(summary.healthScore);
  const cacHealthColor = summary.ltvToCAC.health === 'healthy' ? '#34d399' : summary.ltvToCAC.health === 'fair' ? '#fbbf24' : '#fb7185';

  return `
    <div class="customer-analytics-dashboard" style="background: var(--panel); border-radius: 12px; padding: 16px; margin: 16px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Customer Acquisition Analytics</h3>

      <!-- Health Score -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
        <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; color: var(--muted); margin-bottom: 6px;">Health Score</div>
          <div style="font-size: 28px; font-weight: 700; color: ${healthColor};">${summary.healthScore}</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">out of 100</div>
        </div>

        <div style="background: rgba(94, 234, 212, 0.1); border: 1px solid rgba(94, 234, 212, 0.3); border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; color: var(--muted); margin-bottom: 6px;">LTV:CAC Ratio</div>
          <div style="font-size: 28px; font-weight: 700; color: ${cacHealthColor};">${summary.ltvToCAC.ratioText}</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">${summary.ltvToCAC.health}</div>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
        <div style="background: var(--panel-2); border-radius: 8px; padding: 12px;">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">CAC</div>
          <div style="font-size: 20px; font-weight: 600; font-family: var(--mono);">$${Math.round(summary.cac)}</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 4px;">Cost per acquisition</div>
        </div>

        <div style="background: var(--panel-2); border-radius: 8px; padding: 12px;">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">LTV</div>
          <div style="font-size: 20px; font-weight: 600; font-family: var(--mono);">$${summary.ltv}</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 4px;">Lifetime value</div>
        </div>

        <div style="background: var(--panel-2); border-radius: 8px; padding: 12px;">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Churn Rate</div>
          <div style="font-size: 20px; font-weight: 600; font-family: var(--mono);">${summary.churnRate.toFixed(1)}%</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 4px;">Monthly</div>
        </div>

        <div style="background: var(--panel-2); border-radius: 8px; padding: 12px;">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">12-Month Growth</div>
          <div style="font-size: 20px; font-weight: 600; font-family: var(--mono); color: var(--good);">+${summary.projectedAnnualCustomers}</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 4px;">Projected customers</div>
        </div>
      </div>

      <!-- Recommendations -->
      <div style="background: var(--panel-2); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">Insights</div>
        <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: var(--muted); line-height: 1.5;">
          <li>${summary.ltvToCAC.recommendation}</li>
          <li>${churn.impact}</li>
          <li>Revenue impact: <strong style="color: var(--text);">$${summary.annualRevenueImpact.toLocaleString()}</strong> annually</li>
        </ul>
      </div>

      <!-- Input Controls for Sensitivity Analysis -->
      <div style="background: var(--panel-2); border-radius: 8px; padding: 12px;">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 10px;">Adjust Assumptions</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px;">
          <label style="display: flex; flex-direction: column; gap: 4px;">
            <span style="color: var(--muted);">Monthly New Customers</span>
            <input type="number" id="monthlyNewCustomersInput" value="5" min="0" step="1" style="padding: 4px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 11px;">
          </label>
          <label style="display: flex; flex-direction: column; gap: 4px;">
            <span style="color: var(--muted);">Monthly Churn %</span>
            <input type="number" id="monthlyChurnInput" value="5" min="0" max="100" step="0.5" style="padding: 4px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 11px;">
          </label>
          <label style="display: flex; flex-direction: column; gap: 4px;">
            <span style="color: var(--muted);">Monthly Marketing Budget</span>
            <input type="number" id="monthlyBudgetInput" value="1000" min="0" step="100" style="padding: 4px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 11px;">
          </label>
          <label style="display: flex; flex-direction: column; gap: 4px;">
            <span style="color: var(--muted);">Avg Customer Lifespan (mo)</span>
            <input type="number" id="lifespanInput" value="24" min="1" max="120" step="1" style="padding: 4px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 11px;">
          </label>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get color based on health score
 */
function getHealthColor(score) {
  if (score >= 80) return '#34d399'; // good
  if (score >= 60) return '#fbbf24'; // warn
  if (score >= 40) return '#f97316'; // bad
  return '#fb7185'; // critical
}

/**
 * Format metric for display
 */
export function formatMetric(value, type = 'number') {
  if (type === 'currency') {
    return '$' + Math.round(value).toLocaleString();
  }
  if (type === 'percentage') {
    return (Math.round(value * 10) / 10) + '%';
  }
  return Math.round(value).toLocaleString();
}

/**
 * Create mini cards for embedding in existing UI
 */
export function createMetricCards(summary) {
  return [
    {
      label: 'Customer Acquisition Cost',
      value: '$' + Math.round(summary.cac),
      trend: 'lower is better',
      icon: '💰'
    },
    {
      label: 'Lifetime Value',
      value: '$' + summary.ltv.toLocaleString(),
      trend: 'higher is better',
      icon: '📈'
    },
    {
      label: 'LTV:CAC Ratio',
      value: summary.ltvToCAC.ratioText,
      trend: summary.ltvToCAC.recommendation,
      icon: '⚖️'
    },
    {
      label: 'Monthly Churn',
      value: summary.churnRate.toFixed(1) + '%',
      trend: 'lower is better',
      icon: '📉'
    }
  ];
}
