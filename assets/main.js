// ============================================================================
// MAIN APPLICATION LOGIC
// ============================================================================

import { $, $$ } from './utils.js';
import { HOURS_PER_YEAR, DEBOUNCE_DELAY, CACHE_SIZE_LIMIT } from './constants.js';
import { validateBusinessRules } from './validation.js';
import { calc, clearCalcCache } from './calculations.js';
import {
  render,
  updateOutputs,
  updateValidationDisplay,
  debouncedCalculate,
  showUserError
} from './ui.js';
import {
  persistState,
  validateAndSanitizeLoadedState,
  getAllScenarios,
  saveScenario,
  loadScenario,
  deleteScenario,
  exportData
} from './storage.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================

export const state = {
  mode: 'forecast',
  offerings: [],
  employees: 1,
  employeePay: 60000,
  monthlyCosts: 2000,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 85,
  lockMix: false
};

// Initialize default offerings
function defaultOfferings() {
  return [{
    id: crypto.randomUUID?.() || 'default-1',
    name: 'Consulting Service',
    priceMonthly: 2500,
    sessionsPerYear: 12,
    hoursPerSession: 4,
    variableCostPerSession: 0,
    mixPct: 100,
    currentClients: 0
  }];
}

// ============================================================================
// SCENARIO MANAGEMENT
// ============================================================================

function renderScenariosList() {
  const container = $('#scenariosList');
  if (!container) return;

  const scenarios = getAllScenarios();

  if (scenarios.length === 0) {
    container.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
    return;
  }

  container.innerHTML = scenarios
    .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
    .map(scenario => `
      <div class="scenario-item" data-id="${scenario.id}">
        <div class="scenario-info">
          <div class="scenario-name">${scenario.name}</div>
          <div class="scenario-date">${new Date(scenario.timestamp).toLocaleDateString()}</div>
        </div>
        <div class="scenario-actions">
          <button class="btn small" onclick="loadScenario('${scenario.id}')">Load</button>
          <button class="btn small danger" onclick="deleteScenario('${scenario.id}')">Delete</button>
        </div>
      </div>
    `).join('');
}

// ============================================================================
// TEMPLATE SYSTEM
// ============================================================================

const industryTemplates = {
  consulting: {
    name: 'Management Consulting',
    description: 'Professional consulting services',
    config: {
      employees: 1,
      employeePay: 120000,
      monthlyCosts: 3000,
      productiveUtilizationPct: 70,
      targetUtilizationPct: 75
    },
    offerings: [
      {
        name: 'Strategy Consulting',
        priceMonthly: 15000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 0,
        mixPct: 40,
        currentClients: 0
      },
      {
        name: 'Implementation Support',
        priceMonthly: 8000,
        sessionsPerYear: 24,
        hoursPerSession: 4,
        variableCostPerSession: 0,
        mixPct: 35,
        currentClients: 0
      },
      {
        name: 'Advisory Services',
        priceMonthly: 3000,
        sessionsPerYear: 12,
        hoursPerSession: 2,
        variableCostPerSession: 0,
        mixPct: 25,
        currentClients: 0
      }
    ]
  },

  landscaping: {
    name: 'Landscaping Service',
    description: 'Outdoor landscaping and maintenance',
    config: {
      employees: 3,
      employeePay: 45000,
      monthlyCosts: 2000,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80
    },
    offerings: [
      {
        name: 'Full Property Maintenance',
        priceMonthly: 800,
        sessionsPerYear: 52,
        hoursPerSession: 2,
        variableCostPerSession: 50,
        mixPct: 30,
        currentClients: 0
      },
      {
        name: 'Lawn Care Only',
        priceMonthly: 400,
        sessionsPerYear: 52,
        hoursPerSession: 1,
        variableCostPerSession: 25,
        mixPct: 40,
        currentClients: 0
      },
      {
        name: 'Seasonal Projects',
        priceMonthly: 2000,
        sessionsPerYear: 4,
        hoursPerSession: 8,
        variableCostPerSession: 200,
        mixPct: 30,
        currentClients: 0
      }
    ]
  },

  cleaning: {
    name: 'House Cleaning Service',
    description: 'Residential and commercial cleaning',
    config: {
      employees: 4,
      employeePay: 35000,
      monthlyCosts: 1500,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85
    },
    offerings: [
      {
        name: 'Deep Cleaning',
        priceMonthly: 300,
        sessionsPerYear: 12,
        hoursPerSession: 4,
        variableCostPerSession: 40,
        mixPct: 25,
        currentClients: 0
      },
      {
        name: 'Regular Cleaning',
        priceMonthly: 200,
        sessionsPerYear: 26,
        hoursPerSession: 2,
        variableCostPerSession: 25,
        mixPct: 50,
        currentClients: 0
      },
      {
        name: 'Move-in/out Cleaning',
        priceMonthly: 600,
        sessionsPerYear: 4,
        hoursPerSession: 6,
        variableCostPerSession: 80,
        mixPct: 25,
        currentClients: 0
      }
    ]
  },

  'personal-training': {
    name: 'Personal Training',
    description: 'Fitness training and coaching',
    config: {
      employees: 2,
      employeePay: 55000,
      monthlyCosts: 1000,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 90
    },
    offerings: [
      {
        name: '1-on-1 Training',
        priceMonthly: 800,
        sessionsPerYear: 48,
        hoursPerSession: 1,
        variableCostPerSession: 0,
        mixPct: 60,
        currentClients: 0
      },
      {
        name: 'Group Training',
        priceMonthly: 300,
        sessionsPerYear: 48,
        hoursPerSession: 1,
        variableCostPerSession: 0,
        mixPct: 25,
        currentClients: 0
      },
      {
        name: 'Nutrition Coaching',
        priceMonthly: 400,
        sessionsPerYear: 12,
        hoursPerSession: 0.5,
        variableCostPerSession: 0,
        mixPct: 15,
        currentClients: 0
      }
    ]
  },

  handyman: {
    name: 'Handyman Services',
    description: 'Home repair and maintenance',
    config: {
      employees: 2,
      employeePay: 50000,
      monthlyCosts: 1200,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80
    },
    offerings: [
      {
        name: 'Emergency Repairs',
        priceMonthly: 150,
        sessionsPerYear: 6,
        hoursPerSession: 2,
        variableCostPerSession: 75,
        mixPct: 20,
        currentClients: 0
      },
      {
        name: 'Maintenance Plans',
        priceMonthly: 300,
        sessionsPerYear: 12,
        hoursPerSession: 3,
        variableCostPerSession: 120,
        mixPct: 50,
        currentClients: 0
      },
      {
        name: 'Home Improvement',
        priceMonthly: 2000,
        sessionsPerYear: 2,
        hoursPerSession: 16,
        variableCostPerSession: 800,
        mixPct: 30,
        currentClients: 0
      }
    ]
  },

  'virtual-assistant': {
    name: 'Virtual Assistant',
    description: 'Administrative and business support',
    config: {
      employees: 1,
      employeePay: 40000,
      monthlyCosts: 800,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 90
    },
    offerings: [
      {
        name: 'Full-time Support',
        priceMonthly: 2500,
        sessionsPerYear: 12,
        hoursPerSession: 160,
        variableCostPerSession: 0,
        mixPct: 30,
        currentClients: 0
      },
      {
        name: 'Part-time Support',
        priceMonthly: 1200,
        sessionsPerYear: 12,
        hoursPerSession: 80,
        variableCostPerSession: 0,
        mixPct: 40,
        currentClients: 0
      },
      {
        name: 'Project Support',
        priceMonthly: 800,
        sessionsPerYear: 4,
        hoursPerSession: 40,
        variableCostPerSession: 0,
        mixPct: 30,
        currentClients: 0
      }
    ]
  }
};

function loadTemplate(templateKey) {
  const template = industryTemplates[templateKey];
  if (!template) {
    alert('Template not found');
    return;
  }

  // Confirm loading template
  if (!confirm(`Load the "${template.name}" template? This will replace your current scenario.`)) {
    return;
  }

  // Load template data
  state.mode = 'forecast';
  Object.assign(state, template.config);
  state.offerings = template.offerings.map(o => ({
    ...o,
    id: crypto.randomUUID?.() || 'temp-id'
  }));

  // Clear caches and update UI
  clearCalcCache();
  render();

  // Show success message
  alert(`✅ "${template.name}" template loaded!\n\n${template.description}\n\nAdjust the values as needed for your specific situation.`);
}

// ============================================================================
// TABLE INPUT HANDLING - Refactored for better maintainability
// ============================================================================

function validateTableInputValue(k, rawValue, offering) {
  let value = rawValue;
  let validationError = null;

  const parsed = safeParseNumber(rawValue, 0);

  switch (k) {
    case 'priceMonthly':
      if (parsed <= 0) {
        validationError = 'Price must be greater than $0';
        value = 0;
      } else {
        value = parsed;
      }
      break;

    case 'variableCostPerSession':
      if (parsed < 0) {
        validationError = 'Variable costs cannot be negative';
        value = 0;
      } else {
        value = parsed;
      }
      break;

    case 'sessionsPerYear':
      const sessionsParsed = Math.floor(parsed);
      if (sessionsParsed <= 0) {
        validationError = 'Must have at least 1 session per year';
        value = 1;
      } else {
        value = sessionsParsed;
      }
      break;

    case 'hoursPerSession':
      if (parsed <= 0) {
        validationError = 'Session must take at least 0.1 hours';
        value = 0.1;
      } else {
        value = parsed;
      }
      break;

    case 'currentClients':
      const clientsParsed = Math.floor(parsed);
      if (clientsParsed < 0) {
        validationError = 'Client count cannot be negative';
        value = 0;
      } else {
        value = clientsParsed;
      }
      break;

    case 'mixPct':
      value = safeParseNumber(rawValue, 0, 0, 100);
      break;

    case 'name':
      value = rawValue.trim();
      break;
  }

  return { value, validationError };
}

function applyAutoFixes(k, value, offering, validationError) {
  let fixedValue = value;
  let fixedError = validationError;

  if (k === 'priceMonthly' && value === 0 && offering.priceMonthly === 0) {
    const suggestedPrice = offering.name?.toLowerCase().includes('premium') ? 300 :
                          offering.name?.toLowerCase().includes('basic') ? 100 : 200;
    fixedError = `Price cannot be $0. Consider $${suggestedPrice}/month for "${offering.name}" based on similar services.`;
    fixedValue = suggestedPrice;
  }

  if (k === 'hoursPerSession' && value === 0.1 && offering.hoursPerSession === 0.1) {
    fixedError = 'Session length seems very short. Typical service sessions are 1-2 hours.';
    fixedValue = 1.0;
  }

  return { fixedValue, fixedError };
}

function updateOfferingFromInput(offering, k, value, i) {
  if (k === 'name') {
    offering.name = value;
  } else if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    rebalanceMix(i, value);
  } else {
    offering[k] = value;
  }
}

function handleTableInputCalculation() {
  try {
    persistState();
  } catch (e) {
    // Failed to persist state - non-critical, data may not be saved but app continues
  }

  debouncedCalculate(() => {
    try {
      const metrics = calc();
      updateOutputs(metrics);
      updateValidationDisplay();
    } catch (e) {
      // Error handling is managed by debouncedCalculate
    }
  });
}

function onTableInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;

  const k = el.dataset.k;
  const i = Number(el.dataset.i);
  if (!k || !Number.isFinite(i)) return;

  const o = state.offerings[i];
  if (!o) return;

  // Validate and sanitize input
  let { value, validationError } = validateTableInputValue(k, el.value, o);

  // Apply auto-fixes for common validation issues
  if (validationError) {
    const { fixedValue, fixedError } = applyAutoFixes(k, value, o, validationError);
    value = fixedValue;
    validationError = fixedError;
  }

  // Apply the validated value to the offering
  updateOfferingFromInput(o, k, value, i);

  // Handle calculation and re-rendering
  handleTableInputCalculation();

  // Special case: re-render for mix percentage changes in locked mode
  if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    render();
  }
}

function onTableClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === 'removeOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i)) {
      state.offerings.splice(i, 1);
      if (state.offerings.length === 0) state.offerings = defaultOfferings();
      clearCalcCache();
      render();
    }
  }
}

function addOffering() {
  state.offerings.push({
    id: crypto.randomUUID?.() || 'temp-id',
    name: `Offering ${state.offerings.length + 1}`,
    priceMonthly: 100,
    sessionsPerYear: 12,
    hoursPerSession: 1.0,
    variableCostPerSession: 0,
    mixPct: 0,
    currentClients: 0,
  });
  clearCalcCache();
  render();
}

function resetDefaults() {
  Object.assign(state, {
    mode: 'forecast',
    offerings: defaultOfferings(),
    employees: 1,
    employeePay: 60000,
    monthlyCosts: 2000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 85,
    lockMix: false
  });
  clearCalcCache();
  render();
}

function setStateFromInputs() {
  const modeSelect = $('#modeSelect');
  if (modeSelect) state.mode = modeSelect.value;

  const employeesInput = $('#employees');
  if (employeesInput) state.employees = safeParseNumber(employeesInput.value, 1);

  const employeePayInput = $('#employeePay');
  if (employeePayInput) state.employeePay = safeParseNumber(employeePayInput.value, 60000);

  const monthlyCostsInput = $('#monthlyCosts');
  if (monthlyCostsInput) state.monthlyCosts = safeParseNumber(monthlyCostsInput.value, 0);

  const productiveUtilizationInput = $('#productiveUtilizationPct');
  if (productiveUtilizationInput) state.productiveUtilizationPct = safeParseNumber(productiveUtilizationInput.value, 80, 1, 100);

  const targetUtilizationInput = $('#targetUtilizationPct');
  if (targetUtilizationInput) state.targetUtilizationPct = safeParseNumber(targetUtilizationInput.value, 85, 1, 150);

  const lockMixInput = $('#lockMix');
  if (lockMixInput) state.lockMix = lockMixInput.checked;
}

function normalizeMix(offerings) {
  const total = offerings.reduce((sum, o) => sum + (Number(o.mixPct) || 0), 0);
  if (total === 0) {
    // If all are zero, distribute equally
    const equalShare = 100 / offerings.length;
    offerings.forEach(o => o.mixPct = equalShare);
  } else {
    // Normalize to 100%
    offerings.forEach(o => o.mixPct = (o.mixPct / total) * 100);
  }
}

function rebalanceMix(changedIdx, nextMixPct) {
  const offerings = state.offerings;
  const oldMixPct = offerings[changedIdx].mixPct;
  const delta = nextMixPct - oldMixPct;

  if (delta === 0) return;

  // Distribute the change among other offerings
  const otherOfferings = offerings.filter((_, i) => i !== changedIdx);
  const totalOtherMix = otherOfferings.reduce((sum, o) => sum + (Number(o.mixPct) || 0), 0);

  if (totalOtherMix === 0) {
    // If others are zero, distribute remaining equally
    const remaining = 100 - nextMixPct;
    const equalShare = remaining / otherOfferings.length;
    otherOfferings.forEach(o => o.mixPct = equalShare);
  } else {
    // Scale other offerings proportionally
    const scale = (100 - nextMixPct) / totalOtherMix;
    otherOfferings.forEach(o => o.mixPct = o.mixPct * scale);
  }

  offerings[changedIdx].mixPct = nextMixPct;
}

// ============================================================================
// SCENARIO COMPARISON
// ============================================================================

let comparisonModal = null;
let comparisonScenarioA = null;
let comparisonScenarioB = null;

function populateComparisonDropdowns() {
  const scenarios = getAllScenarios();
  const scenarioASelect = $('#compareScenarioA');
  const scenarioBSelect = $('#compareScenarioB');

  // Clear existing options
  scenarioASelect.innerHTML = '<option value="">Select scenario A...</option>';
  scenarioBSelect.innerHTML = '<option value="">Select scenario B...</option>';

  // Add current scenario option
  const currentOptionA = document.createElement('option');
  currentOptionA.value = 'current';
  currentOptionA.textContent = 'Current Scenario';
  scenarioASelect.appendChild(currentOptionA);

  const currentOptionB = document.createElement('option');
  currentOptionB.value = 'current';
  currentOptionB.textContent = 'Current Scenario';
  scenarioBSelect.appendChild(currentOptionB);

  // Add saved scenarios
  scenarios.forEach(scenario => {
    const optionA = document.createElement('option');
    optionA.value = scenario.id;
    optionA.textContent = scenario.name;
    scenarioASelect.appendChild(optionA);

    const optionB = document.createElement('option');
    optionB.value = scenario.id;
    optionB.textContent = scenario.name;
    scenarioBSelect.appendChild(optionB);
  });
}

function openComparisonModal() {
  if (!comparisonModal) {
    comparisonModal = $('#comparisonModal');
  }

  populateComparisonDropdowns();
  comparisonModal.classList.remove('hidden');
}

function closeComparisonModal() {
  if (comparisonModal) {
    comparisonModal.classList.add('hidden');
  }
  comparisonScenarioA = null;
  comparisonScenarioB = null;
}

function loadScenarioForComparison(scenarioId) {
  if (scenarioId === 'current') {
    return { ...state };
  }

  const scenarios = getAllScenarios();
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario) return null;

  return scenario.data;
}

function calculateScenarioMetrics(scenarioData) {
  if (!scenarioData) return null;

  try {
    const metrics = calc(scenarioData);
    return {
      revenue: metrics.revenue,
      income: metrics.income,
      breakEvenClients: metrics.breakEvenClients,
      capacityPct: metrics.capacityPct,
      contributionMarginPerClient: metrics.contributionMarginPerClient
    };
  } catch (e) {
    // Failed to calculate scenario metrics - handled gracefully
    return null;
  }
}

function performComparison() {
  const scenarioAId = $('#compareScenarioA').value;
  const scenarioBId = $('#compareScenarioB').value;

  if (!scenarioAId || !scenarioBId) {
    alert('Please select two scenarios to compare.');
    return;
  }

  if (scenarioAId === scenarioBId) {
    alert('Please select different scenarios to compare.');
    return;
  }

  comparisonScenarioA = loadScenarioForComparison(scenarioAId);
  comparisonScenarioB = loadScenarioForComparison(scenarioBId);

  if (!comparisonScenarioA || !comparisonScenarioB) {
    alert('Failed to load one or both scenarios.');
    return;
  }

  const metricsA = calculateScenarioMetrics(comparisonScenarioA);
  const metricsB = calculateScenarioMetrics(comparisonScenarioB);

  if (!metricsA || !metricsB) {
    alert('Failed to calculate metrics for comparison.');
    return;
  }

  displayComparison(metricsA, metricsB, scenarioAId, scenarioBId);
  openComparisonModal();
}

function displayComparison(metricsA, metricsB, scenarioAId, scenarioBId) {
  // Update titles
  const scenarioAName = scenarioAId === 'current' ? 'Current Scenario' :
    getAllScenarios().find(s => s.id === scenarioAId)?.name || 'Scenario A';
  const scenarioBName = scenarioBId === 'current' ? 'Current Scenario' :
    getAllScenarios().find(s => s.id === scenarioBId)?.name || 'Scenario B';

  const comparisonTitle = $('#comparisonTitle');
  if (comparisonTitle) comparisonTitle.textContent = `${scenarioAName} vs ${scenarioBName}`;

  const scenarioATitle = $('#scenarioA h4');
  if (scenarioATitle) scenarioATitle.textContent = scenarioAName;

  const scenarioBTitle = $('#scenarioB h4');
  if (scenarioBTitle) scenarioBTitle.textContent = scenarioBName;

  // Update metrics
  const scenarioARevenue = $('#scenarioA-revenue');
  if (scenarioARevenue) scenarioARevenue.textContent = fmtMoney0(metricsA.revenue);

  const scenarioAProfit = $('#scenarioA-profit');
  if (scenarioAProfit) scenarioAProfit.textContent = fmtMoney0(metricsA.income);

  const scenarioABreakeven = $('#scenarioA-breakeven');
  if (scenarioABreakeven) scenarioABreakeven.textContent = Number.isFinite(metricsA.breakEvenClients) ? fmtInt(metricsA.breakEvenClients) : '∞';

  const scenarioAUtilization = $('#scenarioA-utilization');
  if (scenarioAUtilization) scenarioAUtilization.textContent = fmtPct1(metricsA.capacityPct);

  const scenarioAMargin = $('#scenarioA-margin');
  if (scenarioAMargin) scenarioAMargin.textContent = fmtMoney0(metricsA.contributionMarginPerClient);

  const scenarioBRevenue = $('#scenarioB-revenue');
  if (scenarioBRevenue) scenarioBRevenue.textContent = fmtMoney0(metricsB.revenue);

  const scenarioBProfit = $('#scenarioB-profit');
  if (scenarioBProfit) scenarioBProfit.textContent = fmtMoney0(metricsB.income);

  const scenarioBBreakeven = $('#scenarioB-breakeven');
  if (scenarioBBreakeven) scenarioBBreakeven.textContent = Number.isFinite(metricsB.breakEvenClients) ? fmtInt(metricsB.breakEvenClients) : '∞';

  const scenarioBUtilization = $('#scenarioB-utilization');
  if (scenarioBUtilization) scenarioBUtilization.textContent = fmtPct1(metricsB.capacityPct);

  const scenarioBMargin = $('#scenarioB-margin');
  if (scenarioBMargin) scenarioBMargin.textContent = fmtMoney0(metricsB.contributionMarginPerClient);

  // Calculate and display differences
  displayComparisonDifferences(metricsA, metricsB);
}

function displayComparisonDifferences(metricsA, metricsB) {
  const differencesContainer = $('#comparisonDifferences');
  if (!differencesContainer) return;

  differencesContainer.innerHTML = '<h5>Key Differences</h5>';

  const differences = [
    {
      label: 'Revenue',
      valueA: metricsA.revenue,
      valueB: metricsB.revenue,
      format: fmtMoney0,
      higherIsBetter: true
    },
    {
      label: 'Profit',
      valueA: metricsA.income,
      valueB: metricsB.income,
      format: fmtMoney0,
      higherIsBetter: true
    },
    {
      label: 'Break-even',
      valueA: metricsA.breakEvenClients,
      valueB: metricsB.breakEvenClients,
      format: (val) => Number.isFinite(val) ? fmtInt(val) : '∞',
      higherIsBetter: false // Lower break-even is better
    },
    {
      label: 'Utilization',
      valueA: metricsA.capacityPct,
      valueB: metricsB.capacityPct,
      format: fmtPct1,
      higherIsBetter: true
    },
    {
      label: 'Margin/Client',
      valueA: metricsA.contributionMarginPerClient,
      valueB: metricsB.contributionMarginPerClient,
      format: fmtMoney0,
      higherIsBetter: true
    }
  ];

  differences.forEach(diff => {
    const diffValue = diff.valueB - diff.valueA;
    const isPositive = diff.higherIsBetter ? diffValue > 0 : diffValue < 0;
    const isNegative = diff.higherIsBetter ? diffValue < 0 : diffValue > 0;

    // Only show significant differences (>1% or >$100)
    const isSignificant = Math.abs(diffValue) > (diff.format === fmtMoney0 ? 100 : 1);

    if (isSignificant) {
      const differenceEl = document.createElement('div');
      differenceEl.className = 'comparison-difference';

      const labelEl = document.createElement('span');
      labelEl.className = 'difference-label';
      labelEl.textContent = diff.label;

      const valueEl = document.createElement('span');
      valueEl.className = `difference-value ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`;
      valueEl.textContent = (diffValue > 0 ? '+' : '') + diff.format(diffValue);

      differenceEl.appendChild(labelEl);
      differenceEl.appendChild(valueEl);
      differencesContainer.appendChild(differenceEl);
    }
  });

  if (differencesContainer.children.length === 1) {
    // Only header, no differences
    differencesContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin: 0;">Scenarios are very similar</p>';
  }
}

// ============================================================================
// URL SCENARIO SHARING
// ============================================================================

function encodeScenarioToURL(state) {
  try {
    const data = JSON.stringify({
      v: '1.1.0', // version
      mode: state.mode,
      offerings: state.offerings,
      employees: state.employees,
      employeePay: state.employeePay,
      monthlyCosts: state.monthlyCosts,
      productiveUtilizationPct: state.productiveUtilizationPct,
      targetUtilizationPct: state.targetUtilizationPct,
      lockMix: state.lockMix
    });
    return btoa(encodeURIComponent(data));
  } catch (e) {
    // Failed to encode scenario
    return null;
  }
}

function decodeScenarioFromURL(encoded) {
  try {
    const data = JSON.parse(decodeURIComponent(atob(encoded)));
    if (data.v !== '1.1.0') {
      throw new Error('Incompatible scenario version');
    }
    return data;
  } catch (e) {
    // Failed to decode scenario from URL
    return null;
  }
}

function loadScenarioFromURL() {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return false;

    const scenario = decodeScenarioFromURL(hash);
    if (!scenario) return false;

    Object.assign(state, scenario);
    validateAndSanitizeLoadedState();
    return true;
  } catch (e) {
    // Failed to load scenario from URL
    return false;
  }
}

function shareScenario() {
  try {
    const encoded = encodeScenarioToURL(state);
    if (!encoded) {
      alert('Failed to encode scenario for sharing');
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert('Share URL copied to clipboard!');
      }).catch(() => {
        // Fallback to manual copy
        prompt('Copy this URL to share:', url);
      });
    } else {
      prompt('Copy this URL to share:', url);
    }
  } catch (e) {
    alert('Failed to generate share URL');
  }
}

// ============================================================================
// MOBILE MENU HANDLING
// ============================================================================

function toggleMobileMenu() {
  const menu = $('#mobileMenuOverlay');
  if (menu) {
    menu.classList.toggle('active');
  }
}

function openMobileMenu() {
  const menu = $('#mobileMenuOverlay');
  if (menu) {
    menu.classList.add('active');
  }
}

function closeMobileMenu() {
  const menu = $('#mobileMenuOverlay');
  if (menu) {
    menu.classList.remove('active');
  }
}

// ============================================================================
// EVENT WIRING AND INITIALIZATION
// ============================================================================

function openScenarioModal() {
  const modal = $('#scenariosModal');
  if (modal) {
    modal.classList.remove('hidden');
    const input = $('#scenarioNameInput');
    if (input) input.focus();
    renderScenariosList();
    populateComparisonDropdowns();
  }
}

function closeScenarioModal() {
  const modal = $('#scenariosModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function wire(skipLocalStorageLoading = false) {
  // Load persisted state from localStorage if available (unless we loaded from URL)
  if (!skipLocalStorageLoading) {
    try {
      const saved = localStorage.getItem('profitpath-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved state with defaults to handle new fields gracefully
        state.mode = parsed.mode ?? state.mode;
        state.offerings = parsed.offerings ?? state.offerings;
        state.employees = parsed.employees ?? state.employees;
        state.employeePay = parsed.employeePay ?? state.employeePay;
        state.monthlyCosts = parsed.monthlyCosts ?? state.monthlyCosts;
        state.productiveUtilizationPct = parsed.productiveUtilizationPct ?? state.productiveUtilizationPct;
        state.targetUtilizationPct = parsed.targetUtilizationPct ?? state.targetUtilizationPct;
        state.lockMix = parsed.lockMix ?? state.lockMix;

        // Validate loaded data and sanitize if needed
        validateAndSanitizeLoadedState();
      }
    } catch (e) {
      // Failed to load saved state - will use defaults, non-critical for first-time users
    }
  }

  // Mode selection
  const modeSelect = $('#modeSelect');
  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      setStateFromInputs();
      persistState();
      render();
    });
  }

  // Lock mix toggle
  const lockMixEl = $('#lockMix');
  if (lockMixEl) {
    lockMixEl.addEventListener('change', () => {
      setStateFromInputs();

      // If enabling the lock, immediately rebalance without changing relative weights.
      if (state.mode === 'forecast' && state.lockMix) {
        const sum = state.offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);
        if (sum > 0) {
          state.offerings.forEach((o) => (o.mixPct = ((Number(o.mixPct) || 0) / sum) * 100));
        }
      }

      persistState();
      render();
    });
  }

  // Global inputs with debounced updates for better performance
  $$('#controls input').forEach((el) => {
    el.addEventListener('input', () => {
      setStateFromInputs();
      persistState();
      debouncedCalculate(() => render());
    });
  });

  // Templates dropdown functionality
  const templatesBtn = $('#templatesBtn');
  if (templatesBtn) {
    templatesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = e.target.closest('.templates-dropdown');
      if (dropdown) dropdown.classList.toggle('active');
    });
  }

  // Export dropdown functionality
  const exportBtn = $('#exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = e.target.closest('.export-dropdown');
      if (dropdown) dropdown.classList.toggle('active');
    });
  }

  // Close dropdowns when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.templates-dropdown')) {
      $$('.templates-dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
    if (!e.target.closest('.export-dropdown')) {
      $$('.export-dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });

  // Template menu options
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('template-option')) {
      const template = e.target.dataset.template;
      loadTemplate(template);
      // Close dropdown
      $$('.templates-dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });

  // Export menu options
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('export-option')) {
      const format = e.target.dataset.format;
      exportData(format);
      // Close dropdown
      $$('.export-dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });

  // Table event handlers
  const offeringsBody = $('#offeringsBody');
  if (offeringsBody) {
    offeringsBody.addEventListener('input', onTableInput);
    offeringsBody.addEventListener('click', onTableClick);
  }

  // Add offering button
  const addBtn = $('#addOfferingBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addOffering);
  }

  // Reset button
  const resetBtn = $('#resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetDefaults);
  }

  // Scenario modal wiring
  const scenariosBtn = $('#scenariosBtn');
  if (scenariosBtn) {
    scenariosBtn.addEventListener('click', openScenarioModal);
  }

  const scenariosCloseBtn = $('#scenariosCloseBtn');
  if (scenariosCloseBtn) {
    scenariosCloseBtn.addEventListener('click', closeScenarioModal);
  }

  const scenariosOverlay = $('#scenariosOverlay');
  if (scenariosOverlay) {
    scenariosOverlay.addEventListener('click', closeScenarioModal);
  }

  // Scenario management
  const saveScenarioBtn = $('#saveScenarioBtn');
  if (saveScenarioBtn) {
    saveScenarioBtn.addEventListener('click', () => {
      const nameInput = $('#scenarioNameInput');
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        alert('Please enter a scenario name');
        return;
      }

      try {
        if (saveScenario(name)) {
          alert('Scenario saved successfully!');
          nameInput.value = '';
          renderScenariosList();
          populateComparisonDropdowns();
        }
      } catch (e) {
        alert('Error saving scenario: ' + e.message);
      }
    });
  }

  // Share button
  const shareBtn = $('#shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareScenario);
  }

  // Comparison modal wiring
  const compareBtn = $('#compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', performComparison);
  }

  const comparisonCloseBtn = $('#comparisonCloseBtn');
  if (comparisonCloseBtn) {
    comparisonCloseBtn.addEventListener('click', closeComparisonModal);
  }

  const comparisonOverlay = $('#comparisonOverlay');
  if (comparisonOverlay) {
    comparisonOverlay.addEventListener('click', closeComparisonModal);
  }

  // Hamburger menu
  const hamburgerBtn = $('#hamburgerBtn');
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleMobileMenu);
  }

  const mobileMenuOverlay = $('#mobileMenuOverlay');
  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', (e) => {
      if (e.target === mobileMenuOverlay) {
        closeMobileMenu();
      }
    });
  }

  // Mobile menu buttons
  const mobileExportBtn = $('#mobileExportBtn');
  if (mobileExportBtn) {
    mobileExportBtn.addEventListener('click', () => {
      exportData('csv');
      closeMobileMenu();
    });
  }

  const mobileShareBtn = $('#mobileShareBtn');
  if (mobileShareBtn) {
    mobileShareBtn.addEventListener('click', () => {
      shareScenario();
      closeMobileMenu();
    });
  }

  const mobileScenariosBtn = $('#mobileScenariosBtn');
  if (mobileScenariosBtn) {
    mobileScenariosBtn.addEventListener('click', () => {
      closeMobileMenu();
      openScenarioModal();
    });
  }

  // Mobile template buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('mobile-menu-btn')) {
      if (e.target.hasAttribute('data-template')) {
        const template = e.target.dataset.template;
        loadTemplate(template);
        closeMobileMenu();
      } else if (e.target.hasAttribute('data-format')) {
        const format = e.target.dataset.format;
        exportData(format);
        closeMobileMenu();
      }
    }
  });

  // Debug panel toggle
  const debugToggle = $('#debugToggle');
  if (debugToggle) {
    debugToggle.addEventListener('click', () => {
      const debugBody = $('#debugBody');
      if (debugBody) {
        debugBody.classList.toggle('collapsed');
        debugToggle.textContent = debugBody.classList.contains('collapsed') ? 'Show Debug' : 'Hide Debug';
      }
    });
  }
}

// ============================================================================
// TEST SCENARIOS SYSTEM
// ============================================================================

// Comprehensive test scenarios covering various UI states and edge cases
const testScenarios = {
  // Basic scenarios
  'default': {
    name: 'Default Setup',
    description: 'Standard consulting setup',
    data: {
      mode: 'forecast',
      employees: 1,
      employeePay: 60000,
      monthlyCosts: 2000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'test-1',
        name: 'Consulting Service',
        priceMonthly: 2500,
        sessionsPerYear: 12,
        hoursPerSession: 4,
        variableCostPerSession: 100,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  // Profit scenarios
  'high-profit': {
    name: 'High Profit Scenario',
    description: 'Very profitable setup',
    data: {
      mode: 'forecast',
      employees: 2,
      employeePay: 80000,
      monthlyCosts: 5000,
      productiveUtilizationPct: 90,
      targetUtilizationPct: 95,
      offerings: [{
        id: 'premium-1',
        name: 'Premium Consulting',
        priceMonthly: 15000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 500,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'low-profit': {
    name: 'Low Profit Scenario',
    description: 'Barely profitable setup',
    data: {
      mode: 'forecast',
      employees: 3,
      employeePay: 70000,
      monthlyCosts: 8000,
      productiveUtilizationPct: 60,
      targetUtilizationPct: 65,
      offerings: [{
        id: 'budget-1',
        name: 'Budget Consulting',
        priceMonthly: 1800,
        sessionsPerYear: 12,
        hoursPerSession: 2,
        variableCostPerSession: 200,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'loss-making': {
    name: 'Loss Making Scenario',
    description: 'Operating at a loss',
    data: {
      mode: 'forecast',
      employees: 4,
      employeePay: 90000,
      monthlyCosts: 15000,
      productiveUtilizationPct: 70,
      targetUtilizationPct: 75,
      offerings: [{
        id: 'unprofitable-1',
        name: 'Underpriced Service',
        priceMonthly: 800,
        sessionsPerYear: 12,
        hoursPerSession: 3,
        variableCostPerSession: 400,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  // Utilization scenarios
  'over-capacity': {
    name: 'Over Capacity',
    description: 'Utilization above 100%',
    data: {
      mode: 'current',
      employees: 1,
      employeePay: 60000,
      monthlyCosts: 2000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'busy-1',
        name: 'Popular Service',
        priceMonthly: 1000,
        sessionsPerYear: 12,
        hoursPerSession: 20, // Very time-intensive
        variableCostPerSession: 50,
        mixPct: 0,
        currentClients: 10
      }]
    }
  },

  'under-capacity': {
    name: 'Under Capacity',
    description: 'Very low utilization',
    data: {
      mode: 'current',
      employees: 5,
      employeePay: 60000,
      monthlyCosts: 10000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'slow-1',
        name: 'Niche Service',
        priceMonthly: 5000,
        sessionsPerYear: 12,
        hoursPerSession: 2,
        variableCostPerSession: 100,
        mixPct: 0,
        currentClients: 1
      }]
    }
  },

  // Complex scenarios
  'multi-service': {
    name: 'Multi-Service Mix',
    description: 'Multiple offerings with different pricing',
    data: {
      mode: 'forecast',
      employees: 3,
      employeePay: 65000,
      monthlyCosts: 6000,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80,
      offerings: [
        {
          id: 'basic-1',
          name: 'Basic Consulting',
          priceMonthly: 1200,
          sessionsPerYear: 12,
          hoursPerSession: 2,
          variableCostPerSession: 50,
          mixPct: 40,
          currentClients: 0
        },
        {
          id: 'premium-1',
          name: 'Premium Consulting',
          priceMonthly: 5000,
          sessionsPerYear: 12,
          hoursPerSession: 8,
          variableCostPerSession: 300,
          mixPct: 35,
          currentClients: 0
        },
        {
          id: 'training-1',
          name: 'Training Program',
          priceMonthly: 800,
          sessionsPerYear: 24,
          hoursPerSession: 1.5,
          variableCostPerSession: 25,
          mixPct: 25,
          currentClients: 0
        }
      ]
    }
  },

  'edge-case': {
    name: 'Edge Cases',
    description: 'Extreme values for testing',
    data: {
      mode: 'forecast',
      employees: 10,
      employeePay: 200000,
      monthlyCosts: 50000,
      productiveUtilizationPct: 95,
      targetUtilizationPct: 150,
      offerings: [{
        id: 'extreme-1',
        name: 'Luxury Service',
        priceMonthly: 50000,
        sessionsPerYear: 1,
        hoursPerSession: 100,
        variableCostPerSession: 10000,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'zero-values': {
    name: 'Zero Values',
    description: 'Testing zero/very low values',
    data: {
      mode: 'forecast',
      employees: 1,
      employeePay: 10000,
      monthlyCosts: 100,
      productiveUtilizationPct: 10,
      targetUtilizationPct: 15,
      offerings: [{
        id: 'minimal-1',
        name: 'Minimal Service',
        priceMonthly: 100,
        sessionsPerYear: 12,
        hoursPerSession: 0.5,
        variableCostPerSession: 1,
        mixPct: 100,
        currentClients: 0
      }]
    }
  }
};

// Load test scenarios into localStorage
function loadTestScenarios() {
  const scenarios = Object.entries(testScenarios).map(([key, scenario]) => ({
    id: `test-${key}`,
    name: `[TEST] ${scenario.name}`,
    timestamp: Date.now() + Object.keys(testScenarios).indexOf(key) * 1000, // Stagger timestamps
    data: scenario.data
  }));

  // Add to existing scenarios
  const existingScenarios = getAllScenarios();
  const allScenarios = [...existingScenarios, ...scenarios];

  localStorage.setItem('profitpath-scenarios', JSON.stringify(allScenarios));
  console.log(`Loaded ${scenarios.length} test scenarios`);
}

// Check URL parameters for test scenario loading
function checkTestScenarioParams() {
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has('loadTestScenarios')) {
    loadTestScenarios();
    // Remove the parameter from URL
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);
    alert('Test scenarios loaded! Check the Scenarios menu.');
  }

  if (urlParams.has('testScenario')) {
    const scenarioKey = urlParams.get('testScenario');
    if (testScenarios[scenarioKey]) {
      Object.assign(state, testScenarios[scenarioKey].data);
      validateAndSanitizeLoadedState();
      // Remove the parameter from URL
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize the application
async function init() {
  // Check for test scenario parameters first
  checkTestScenarioParams();

  // Set default offerings if none exist
  if (!state.offerings || state.offerings.length === 0) {
    state.offerings = defaultOfferings();
  }

  // Try to load scenario from URL first
  const loadedFromURL = loadScenarioFromURL();

  // Wire up event handlers
  wire(loadedFromURL);

  // Initial render
  render();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for potential testing
export { state, render, calc, loadTemplate, performComparison };
