// ============================================================================
// STORAGE & PERSISTENCE FUNCTIONS
// ============================================================================

import { state } from './main.js';
import { uuid } from './utils.js';

const SCENARIOS_KEY = 'profitpath-scenarios';

// Validate and sanitize state loaded from localStorage
export function validateAndSanitizeLoadedState() {
  let needsSave = false;

  // Sanitize global inputs
  if (state.employees < 1) {
    state.employees = 1;
    needsSave = true;
  }
  if (state.employeePay < 0) {
    state.employeePay = 60000;
    needsSave = true;
  }
  if (state.monthlyCosts < 0) {
    state.monthlyCosts = 0;
    needsSave = true;
  }
  if (state.productiveUtilizationPct <= 0 || state.productiveUtilizationPct > 100) {
    state.productiveUtilizationPct = 80;
    needsSave = true;
  }
  if (state.targetUtilizationPct <= 0 || state.targetUtilizationPct > 150) {
    state.targetUtilizationPct = 85;
    needsSave = true;
  }

  // Sanitize offerings
  if (!Array.isArray(state.offerings)) {
    state.offerings = [];
    needsSave = true;
  }

  state.offerings = state.offerings.filter(o => o && typeof o === 'object').map(offering => {
    const sanitized = {
      id: offering.id || uuid(),
      name: (offering.name || '').trim() || `Offering ${state.offerings.indexOf(offering) + 1}`,
      priceMonthly: Math.max(0.01, offering.priceMonthly || 100),
      sessionsPerYear: Math.max(1, Math.floor(offering.sessionsPerYear || 12)),
      hoursPerSession: Math.max(0.1, offering.hoursPerSession || 1),
      variableCostPerSession: Math.max(0, offering.variableCostPerSession || 0),
      mixPct: Math.max(0, Math.min(100, offering.mixPct || 0)),
      currentClients: Math.max(0, Math.floor(offering.currentClients || 0))
    };

    if (JSON.stringify(sanitized) !== JSON.stringify(offering)) {
      needsSave = true;
    }

    return sanitized;
  });

  // Ensure at least one offering exists
  if (state.offerings.length === 0) {
    state.offerings = [{
      id: uuid(),
      name: 'Sample Service',
      priceMonthly: 1000,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 0,
      mixPct: 100,
      currentClients: 0
    }];
    needsSave = true;
  }

  return needsSave;
}

// Persist current state to localStorage
export function persistState() {
  try {
    const stateToSave = {
      mode: state.mode,
      offerings: state.offerings,
      employees: state.employees,
      employeePay: state.employeePay,
      monthlyCosts: state.monthlyCosts,
      productiveUtilizationPct: state.productiveUtilizationPct,
      targetUtilizationPct: state.targetUtilizationPct,
      lockMix: state.lockMix
    };

    localStorage.setItem('profitpath-state', JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Failed to persist state:', e);
    // Non-critical error - continue without saving
  }
}

// Get all saved scenarios
export function getAllScenarios() {
  try {
    const saved = localStorage.getItem(SCENARIOS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load scenarios:', e);
    return [];
  }
}

// Save a scenario
export function saveScenario(name) {
  try {
    const scenarios = getAllScenarios();
    const scenario = {
      id: uuid(),
      name: name.trim(),
      timestamp: Date.now(),
      data: {
        mode: state.mode,
        offerings: state.offerings.map(o => ({ ...o })), // Deep copy
        employees: state.employees,
        employeePay: state.employeePay,
        monthlyCosts: state.monthlyCosts,
        productiveUtilizationPct: state.productiveUtilizationPct,
        targetUtilizationPct: state.targetUtilizationPct,
        lockMix: state.lockMix
      }
    };

    // Check for duplicate names (allow if different)
    const existingIndex = scenarios.findIndex(s => s.name === scenario.name);
    if (existingIndex >= 0) {
      if (!confirm(`A scenario named "${scenario.name}" already exists. Overwrite it?`)) {
        return false;
      }
      scenarios[existingIndex] = scenario;
    } else {
      scenarios.push(scenario);
    }

    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
    return true;
  } catch (e) {
    console.error('Failed to save scenario:', e);
    throw new Error('Failed to save scenario');
  }
}

// Load a scenario by ID
export function loadScenario(scenarioId) {
  try {
    const scenarios = getAllScenarios();
    const scenario = scenarios.find(s => s.id === scenarioId);

    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // Load the scenario data
    Object.assign(state, scenario.data);

    // Sanitize loaded data
    validateAndSanitizeLoadedState();

    return scenario;
  } catch (e) {
    console.error('Failed to load scenario:', e);
    throw new Error('Failed to load scenario');
  }
}

// Delete a scenario
export function deleteScenario(scenarioId) {
  try {
    const scenarios = getAllScenarios();
    const filteredScenarios = scenarios.filter(s => s.id !== scenarioId);

    if (filteredScenarios.length === scenarios.length) {
      throw new Error('Scenario not found');
    }

    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(filteredScenarios));
    return true;
  } catch (e) {
    console.error('Failed to delete scenario:', e);
    throw new Error('Failed to delete scenario');
  }
}

// ============================================================================
// EXPORT/IMPORT FUNCTIONS
// ============================================================================

export function exportData(format) {
  const { calc } = await import('./calculations.js');
  const metrics = calc();

  switch (format) {
    case 'csv':
      return exportAsCSV(metrics);
    case 'json':
      return exportAsJSON(metrics);
    case 'html':
      return exportAsHTML(metrics);
    case 'summary':
      return exportExecutiveSummary(metrics);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

function exportAsCSV(metrics) {
  const headers = [
    'Metric',
    'Value',
    'Description'
  ];

  const rows = [
    ['Revenue', fmtMoney0(metrics.revenue), 'Total annual revenue'],
    ['Fixed Costs', fmtMoney0(metrics.fixedCosts), 'Annual fixed costs'],
    ['Variable Costs', fmtMoney0(metrics.variableCosts), 'Annual variable costs'],
    ['Total Costs', fmtMoney0(metrics.totalCosts), 'Total annual costs'],
    ['Profit', fmtMoney0(metrics.income), 'Annual profit/loss'],
    ['Clients', fmtInt(metrics.clients), 'Number of clients'],
    ['Utilization', fmtPct1(metrics.capacityPct), 'Capacity utilization percentage'],
    ['Break-even Clients', Number.isFinite(metrics.breakEvenClients) ? fmtInt(metrics.breakEvenClients) : '∞', 'Clients needed to break even']
  ];

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  downloadFile(csv, 'profitpath-analysis.csv', 'text/csv');
}

function exportAsJSON(metrics) {
  const data = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.1.0'
    },
    inputs: {
      mode: state.mode,
      employees: state.employees,
      employeePay: state.employeePay,
      monthlyCosts: state.monthlyCosts,
      productiveUtilizationPct: state.productiveUtilizationPct,
      targetUtilizationPct: state.targetUtilizationPct
    },
    offerings: state.offerings,
    calculations: metrics
  };

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, 'profitpath-data.json', 'application/json');
}

function exportAsHTML(metrics) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProfitPath Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .metric h3 { margin-top: 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #007bff; }
        .offerings { margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ProfitPath Analysis Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Revenue</h3>
            <div class="value">${fmtMoney0(metrics.revenue)}</div>
        </div>
        <div class="metric">
            <h3>Profit</h3>
            <div class="value" style="color: ${metrics.income >= 0 ? '#28a745' : '#dc3545'}">${fmtMoney0(metrics.income)}</div>
        </div>
        <div class="metric">
            <h3>Utilization</h3>
            <div class="value">${fmtPct1(metrics.capacityPct)}</div>
        </div>
        <div class="metric">
            <h3>Break-even Clients</h3>
            <div class="value">${Number.isFinite(metrics.breakEvenClients) ? fmtInt(metrics.breakEvenClients) : '∞'}</div>
        </div>
    </div>

    <div class="offerings">
        <h2>Service Offerings</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Monthly Price</th>
                    <th>Sessions/Year</th>
                    <th>Hours/Session</th>
                    <th>Est. Clients</th>
                    <th>Est. Revenue</th>
                </tr>
            </thead>
            <tbody>
                ${metrics.offerings.map(o => `
                    <tr>
                        <td>${escapeHtml(o.name)}</td>
                        <td>${fmtMoney0(o.priceMonthly)}</td>
                        <td>${o.sessionsPerYear}</td>
                        <td>${o.hoursPerSession}</td>
                        <td>${fmtInt(o.calculatedClients || 0)}</td>
                        <td>${fmtMoney0((o.calculatedClients || 0) * o.priceMonthly * o.sessionsPerYear)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;

  downloadFile(html, 'profitpath-report.html', 'text/html');
}

function exportExecutiveSummary(metrics) {
  const summary = `# ProfitPath Executive Summary

**Report Generated:** ${new Date().toLocaleDateString()}

## Key Financial Metrics

- **Annual Revenue:** ${fmtMoney0(metrics.revenue)}
- **Annual Profit:** ${fmtMoney0(metrics.income)}
- **Profit Margin:** ${fmtPct1(metrics.revenue > 0 ? (metrics.income / metrics.revenue) * 100 : 0)}
- **Capacity Utilization:** ${fmtPct1(metrics.capacityPct)}

## Business Health Indicators

- **Break-even Point:** ${Number.isFinite(metrics.breakEvenClients) ? `${fmtInt(metrics.breakEvenClients)} clients` : 'Not achievable with current pricing'}
- **Current Client Load:** ${fmtInt(metrics.clients)} clients
- **Status:** ${metrics.clients >= metrics.breakEvenClients ? '✅ Profitable' : '⚠️ Below break-even'}

## Service Portfolio

${metrics.offerings.map(o => `- **${o.name}**: ${fmtMoney0(o.priceMonthly)}/month, ${o.sessionsPerYear} sessions/year`).join('\n')}

## Recommendations

${metrics.capacityPct > 110 ? '- **High utilization detected** - Consider hiring additional staff or increasing prices\n' : ''}
${metrics.capacityPct < 60 ? '- **Low utilization detected** - Opportunity to take on more clients or optimize pricing\n' : ''}
${metrics.income < 0 ? '- **Operating at a loss** - Review pricing strategy and cost structure\n' : ''}
${metrics.income > 100000 ? '- **Strong profitability** - Consider expansion or service diversification\n' : ''}

---
*Report generated by ProfitPath business analysis tool*
`;

  downloadFile(summary, 'profitpath-summary.md', 'text/markdown');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
