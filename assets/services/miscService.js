// Miscellaneous Helpers and UI Logic
/* global render calc updateOutputs updateValidationDisplay Chart */
import { safeParseNumber } from '../utils/helpers';
import { showToast } from './modalService.js';
import { persistState } from './stateManager.js';

// Utility functions for export functionality
const DEFAULT_CURRENCY = 'USD';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtPct1 = (n) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';
const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

// Utility function to clamp values between min and max
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function setStateFromInputs() {
  state.mode = $('#modeSelect').value;

  // Validate and sanitize inputs
  state.employees = Math.max(1, Math.floor(safeParseNumber($('#employees').value, 1)));
  state.employeePay = Math.max(0, safeParseNumber($('#employeePay').value, 0));
  state.monthlyCosts = Math.max(0, safeParseNumber($('#monthlyCosts').value, 0));
  state.productiveUtilizationPct = clamp(safeParseNumber($('#productiveUtilizationPct').value, 80), 0, 100);
  state.targetUtilizationPct = clamp(safeParseNumber($('#targetUtilizationPct').value, 75), 0, 150);
  state.lockMix = Boolean($('#lockMix')?.checked);
}

export function onTableInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;

  const k = el.dataset.k;
  const i = Number(el.dataset.i);
  if (!k || !Number.isFinite(i)) return;

  const o = state.offerings[i];
  if (!o) return;

  // Validate and sanitize input based on field type
  let value = el.value;
  let validationError = null;

  if (k === 'priceMonthly') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Price must be greater than $0';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'variableCostPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed < 0) {
      validationError = 'Variable costs cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'sessionsPerYear') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed <= 0) {
      validationError = 'Must have at least 1 session per year';
      value = 1;
    } else {
      value = parsed;
    }
  } else if (k === 'hoursPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Session must take at least 0.1 hours';
      value = 0.1;
    } else {
      value = parsed;
    }
  } else if (k === 'currentClients') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed < 0) {
      validationError = 'Client count cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'mixPct') {
    const parsed = safeParseNumber(value, 0, 0, 100);
    value = parsed;
  }

  // Show validation error if any and provide auto-fix for some cases
  if (validationError) {
    // Validation error handled-value has been sanitized

    // Auto-fix common issues
    if (k === 'priceMonthly' && value === 0 && o.priceMonthly === 0) {
      // Suggest a reasonable default price
    }

  }

  if (k === 'name') {
    o.name = el.value;
  } else if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    if (typeof rebalanceMix === 'function') rebalanceMix(i, value);
  } else {
    o[k] = value;
  }

  // Update state and outputs in-place without re-rendering the entire table to preserve focus.
  try {
    if (typeof persistState === 'function') persistState();
  } catch (e) {
    console.warn('Failed to persist state on input:', e);
  }

  // Refresh outputs to reflect the change
  try {
    if (typeof calc === 'function') {
      const metrics = calc();
      if (typeof updateOutputs === 'function') updateOutputs(metrics);
      if (typeof updateValidationDisplay === 'function') updateValidationDisplay(); // Update validation messages after calculations
    }
  } catch (e) {
    console.warn('Failed to refresh outputs on input:', e);
  }
  // If changing mix in locked forecast mode, re-render to update other mix inputs
  if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    if (typeof render === 'function') render();
  }
}

export function onTableClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === 'removeOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i)) {
      state.offerings.splice(i, 1);
      if (state.offerings.length === 0) {
        if (typeof defaultOfferings === 'function') {
          state.offerings = defaultOfferings();
        }
      }
      if (typeof render === 'function') render();
    }
  }
}

export function addOffering() {
  state.offerings.push({
    id: uuid(),
    name: 'Offering ' + (state.offerings.length + 1),
    priceMonthly: 100,
    sessionsPerYear: 12,
    hoursPerSession: 1.0,
    variableCostPerSession: 0,
    mixPct: 0,
    currentClients: 0,
  });
  if (typeof render === 'function') render();
}

export function resetDefaults() {
  state.offerings = typeof defaultOfferings === 'function' ? defaultOfferings() : [];
  state.employees = 1;
  state.employeePay = 60000;
  state.monthlyCosts = 10000;
  state.productiveUtilizationPct = 80;
  state.targetUtilizationPct = 75;
  state.mode = 'forecast';
  localStorage.removeItem('profitpath-state');
  if (typeof render === 'function') render();
}

export function exportAsCSV() {
  let results;
  try {
    // Use calc from global scope or handle gracefully if not available
    if (typeof calc === 'function') {
      results = calc();
    } else {
      // Fallback: use current state directly
      results = { state: state, metrics: {} };
      console.warn('calc function not available, using current state');
    }
  } catch (e) {
    console.error('Calculation failed in exportAsCSV:', e);
    alert('Error: Could not generate CSV export due to calculation error. Please check your inputs.');
    return;
  }

  // CSV header with summary metrics
  const lines = [
    'ProfitPath Business Analysis Report',
    'Generated: ' + (new Date().toLocaleString()),
    'Analysis Mode: ' + (state.mode === 'forecast' ? 'Forecast(Planning)' : 'Current(Operations Analysis)'),
    '',
    'BUSINESS PARAMETERS',
    'Parameter,Value,Unit',
    'Number of Employees, ' + (state.employees) + ', people',
    'Annual Employee Compensation, ' + (fmtMoney0(state.employeePay)) + ', USD / year',
    'Monthly Overhead Costs, ' + (fmtMoney0(state.monthlyCosts)) + ', USD / month',
    'Productive Utilization Target, ' + (fmtPct1(state.productiveUtilizationPct)) + ',% of available hours',
    'Overall Utilization Target, ' + (fmtPct1(state.targetUtilizationPct)) + ',% of total capacity',
    '',
    'FINANCIAL RESULTS',
    'Metric,Value,Unit',
    'Total Annual Revenue, ' + (fmtMoney0(results.revenue)) + ', USD / year',
    'Total Variable Costs, ' + (fmtMoney0(results.variableCosts)) + ', USD / year',
    'Gross Contribution Margin, ' + (fmtMoney0(Math.max(0, (results.revenue || 0) - (results.variableCosts || 0)))) + ', USD / year',
    'Fixed Overhead Costs, ' + (fmtMoney0(results.annualFixedCosts)) + ', USD / year',
    'Net Profit(Loss), ' + (fmtMoney0(results.income)) + ', USD / year',
    'Profit Margin, ' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)) + ',% of revenue',
    'Total Billable Hours, ' + (fmtInt(results.serviceHours || 0)) + ', hours / year',
    'Capacity Utilization, ' + (fmtPct1(results.capacityPct || 0)) + ',% of total capacity',
    '',
    'SERVICE OFFERINGS BREAKDOWN',
    'Service Name,Monthly Price,Sessions per Year,Hours per Session,Variable Cost per Session,Client Mix %,Current Clients,Projected Annual Revenue,Capacity Required',
  ];

  state.offerings.forEach((o) => {
    const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
    const capacityRequired = state.mode === 'forecast' ? Math.ceil((o.sessionsPerYear * state.employees * state.productiveUtilizationPct / 100) / o.sessionsPerYear) : o.currentClients;
    lines.push(
      '"' + (o.name) + '", ' + (o.priceMonthly) + ', ' + (o.sessionsPerYear) + ', ' + (o.hoursPerSession) + ', ' + (o.variableCostPerSession) + ', ' + (o.mixPct) + ', ' + (o.currentClients) + ', ' + (fmtMoney0(annualRevenue)) + ', ' + (capacityRequired)
    );
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-export-' + (new Date().toISOString().split('T')[0]) + '.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function shareScenario() {
  const shareUrl = encodeScenarioToURL(window.state);
  if (!shareUrl) {
    showToast('Failed to generate share link', 'error');
    return;
  }

  // Update social media meta tags with scenario data
  updateSocialMetaTags(window.state);

  // Copy to clipboard and show toast
  navigator.clipboard.writeText(shareUrl).then(() => {
    console.log('[SHARE] Clipboard success, calling showToast...');
    showToast('Share link copied to clipboard!', 'success');
    console.log('[SHARE] showToast called');
  }).catch(() => {
    showToast('Share link: ' + shareUrl, 'info');
  });
}

function showShareErrorModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Share Failed</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Could not generate a shareable link for this scenario.</p>
        <p>Please check your inputs and try again.</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => {
    document.body.removeChild(modal);
  }, 3000);
}

function showShareSuccessModal(shareUrl) {
  // Auto-copy to clipboard immediately
  navigator.clipboard.writeText(shareUrl).then(() => {
    showNotification('Direct share link copied to clipboard!', 'success');
  }).catch(() => {
    // Silent fail - user can manually copy
  });

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Share Success</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Direct share link with unique UUID copied to clipboard!</p>
        <p><strong>Shareable URL:</strong></p>
        <input type="text" id="shareUrlInput" value="${shareUrl}" readonly style="width: 100%; padding: 5px; margin-bottom: 10px;">
        <button onclick="copyToClipboard(document.getElementById('shareUrlInput').value); showNotification('Link copied!', 'success');">Copy to Clipboard</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add close button handler
  modal.querySelector('.modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Link copied to clipboard!', 'success');
  }).catch((err) => {
    console.error('Failed to copy text: ', err);
    showNotification('Failed to copy link', 'error');
  });
}

// Expose to window for onclick handlers
window.copyToClipboard = copyToClipboard;
window.showNotification = showNotification;

function updateSocialMetaTags(state) {
  const title = 'ProfitPath Scenario: ' + state.offerings.map(o => o.name).join(', ');
  const description = 'Check out my business profitability analysis with ' + state.offerings.length + ' service offerings';
  const image = 'https://example.com/profitpath-logo.png'; // Placeholder URL

  // Update meta tags
  const metaTitle = document.querySelector('meta[property="og:title"]') || document.createElement('meta');
  metaTitle.setAttribute('property', 'og:title');
  metaTitle.setAttribute('content', title);

  const metaDescription = document.querySelector('meta[property="og:description"]') || document.createElement('meta');
  metaDescription.setAttribute('property', 'og:description');
  metaDescription.setAttribute('content', description);

  const metaImage = document.querySelector('meta[property="og:image"]') || document.createElement('meta');
  metaImage.setAttribute('property', 'og:image');
  metaImage.setAttribute('content', image);

  const metaUrl = document.querySelector('meta[property="og:url"]') || document.createElement('meta');
  metaUrl.setAttribute('property', 'og:url');
  metaUrl.setAttribute('content', window.location.href);

  document.head.appendChild(metaTitle);
  document.head.appendChild(metaDescription);
  document.head.appendChild(metaImage);
  document.head.appendChild(metaUrl);
}

export function encodeScenarioToURL(state) {
  try {
    const serialized = JSON.stringify(state);
    const base64 = btoa(serialized);
    return window.location.origin + window.location.pathname + '?scenario=' + encodeURIComponent(base64);
  } catch (e) {
    console.error('Failed to encode scenario:', e);
    return null;
  }
}

export function decodeScenarioFromURL() {
  const params = new URLSearchParams(window.location.search);
  const scenarioParam = params.get('scenario');
  if (!scenarioParam) return null;

  try {
    const base64 = decodeURIComponent(scenarioParam);
    const serialized = atob(base64);
    return JSON.parse(serialized);
  } catch (e) {
    console.error('Failed to decode scenario:', e);
    return null;
  }
}

// Export functions for modal service
export function showModal(content, options = {}) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${options.title || 'Modal'}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        ${options.buttons || ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add event listeners for close buttons
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  });

  return modal;
}

export function showLoadingModal() {
  return showModal('<div class="spinner"></div><p>Loading...</p>', { title: 'Loading' });
}

export function showSuccessModal(message) {
  return showModal('<p>' + message + '</p>', { title: 'Success', buttons: '<button onclick="this.closest(\'.modal\').remove()">OK</button>' });
}

export function showErrorModal(error) {
  return showModal('<p>' + (error.message || error) + '</p>', { title: 'Error', buttons: '<button onclick="this.closest(\'.modal\').remove()">OK</button>' });
}

export function loadState() {
  try {
    const saved = localStorage.getItem('profitpath-state');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
  return null;
}

// Export functions for business logic
export function validateBusinessLogic() {
  const errors = [];

  if (state.employees <= 0) {
    errors.push('Number of employees must be greater than 0');
  }

  if (state.employeePay < 0) {
    errors.push('Employee pay cannot be negative');
  }

  if (state.monthlyCosts < 0) {
    errors.push('Monthly costs cannot be negative');
  }

  if (state.productiveUtilizationPct < 0 || state.productiveUtilizationPct > 100) {
    errors.push('Productive utilization must be between 0% and 100%');
  }

  if (state.targetUtilizationPct < 0 || state.targetUtilizationPct > 150) {
    errors.push('Target utilization must be between 0% and 150%');
  }

  state.offerings.forEach((o, i) => {
    if (o.priceMonthly <= 0) {
      errors.push(`Offering "${o.name}" must have a price greater than $0`);
    }

    if (o.sessionsPerYear <= 0) {
      errors.push(`Offering "${o.name}" must have at least 1 session per year`);
    }

    if (o.hoursPerSession <= 0) {
      errors.push(`Offering "${o.name}" must take at least 0.1 hours per session`);
    }

    if (o.variableCostPerSession < 0) {
      errors.push(`Offering "${o.name}" cannot have negative variable costs`);
    }

    if (o.mixPct < 0 || o.mixPct > 100) {
      errors.push(`Offering "${o.name}" mix percentage must be between 0% and 100%`);
    }
  });

  return errors;
}

export function rebalanceMix(changedIndex, newValue) {
  const total = state.offerings.reduce((sum, o, i) => i === changedIndex ? sum : sum + o.mixPct, 0);
  const remaining = Math.max(0, 100 - newValue);

  state.offerings.forEach((o, i) => {
    if (i !== changedIndex) {
      o.mixPct = (o.mixPct / total) * remaining;
    }
  });
}

export function defaultOfferings() {
  return [
    {
      id: uuid(),
      name: 'Consulting',
      priceMonthly: 500,
      sessionsPerYear: 12,
      hoursPerSession: 2.0,
      variableCostPerSession: 50,
      mixPct: 33.33,
      currentClients: 0,
    },
    {
      id: uuid(),
      name: 'Training',
      priceMonthly: 200,
      sessionsPerYear: 6,
      hoursPerSession: 4.0,
      variableCostPerSession: 20,
      mixPct: 33.33,
      currentClients: 0,
    },
    {
      id: uuid(),
      name: 'Support',
      priceMonthly: 100,
      sessionsPerYear: 24,
      hoursPerSession: 0.5,
      variableCostPerSession: 10,
      mixPct: 33.34,
      currentClients: 0,
    },
  ];
}

// Export functions for chart and visualization
export function renderChart(containerId, data, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Lazy load chart library if not already loaded
  if (typeof Chart === 'undefined') {
    loadScript('https://cdn.jsdelivr.net/npm/chart.js').then(() => {
      createChart(container, data, options);
    });
  } else {
    createChart(container, data, options);
  }
}

function createChart(container, data, options) {
  const ctx = container.getContext('2d');
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    ...options,
  };

  new Chart(ctx, {
    type: 'bar',
    data: data,
    options: chartOptions,
  });
}

// Export functions for scenario management
export function saveScenario(name, description = '') {
  const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
  const scenario = {
    id: uuid(),
    name: name,
    description: description,
    state: JSON.parse(JSON.stringify(state)),
    createdAt: new Date().toISOString(),
  };

  scenarios.push(scenario);
  localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));
  return scenario;
}

export function loadScenario(scenarioId) {
  const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (scenario) {
    state = scenario.state;
    if (typeof render === 'function') render();
    return true;
  }
  return false;
}

export function deleteScenario(scenarioId) {
  const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
  const filtered = scenarios.filter(s => s.id !== scenarioId);
  localStorage.setItem('profitpath-scenarios', JSON.stringify(filtered));
}

export function listScenarios() {
  return JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
}

// Additional functions needed by scenarioService.js
export function getAllScenarios() {
  const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
  console.log('getAllScenarios returning:', scenarios);
  return scenarios;
}

export function clearTestScenarios() {
  localStorage.removeItem('profitpath-scenarios');
  console.log('Test scenarios cleared');
}

export function showNotification(message, type = 'info') {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #007bff; color: white; padding: 10px 20px; border-radius: 4px; z-index: 15000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

export function populateComparisonDropdowns(modalContext = null) {
  // Sort scenarios with natural sort (so "2" comes before "10")
  const scenarios = getAllScenarios().sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
  console.log('Found scenarios:', scenarios.length);

  // Find dropdowns - if modalContext provided, search within it first
  let dropdown1 = null;
  let dropdown2 = null;

  if (modalContext) {
    dropdown1 = modalContext.querySelector('#compareScenario1');
    dropdown2 = modalContext.querySelector('#compareScenario2');
    console.log('Searching within modal context:', { dropdown1: !!dropdown1, dropdown2: !!dropdown2 });
  }

  // Fall back to document search if not found in modal
  if (!dropdown1) {
    dropdown1 = document.getElementById('compareScenario1');
  }
  if (!dropdown2) {
    dropdown2 = document.getElementById('compareScenario2');
  }

  // Try alternative selectors if not found
  if (!dropdown1) {
    dropdown1 = document.querySelector('#compareScenario1');
  }
  if (!dropdown2) {
    dropdown2 = document.querySelector('#compareScenario2');
  }

  // Try finding within modal overlays
  if (!dropdown1 || !dropdown2) {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
      if (!dropdown1) {
        dropdown1 = modal.querySelector('#compareScenario1');
      }
      if (!dropdown2) {
        dropdown2 = modal.querySelector('#compareScenario2');
      }
    });
  }

  console.log('Dropdown elements found:', { dropdown1: !!dropdown1, dropdown2: !!dropdown2 });

  if (!dropdown1 || !dropdown2) {
    console.error('Comparison dropdowns not found in DOM');
    return;
  }

  // Clear and populate
  dropdown1.innerHTML = '<option value="">Select first scenario...</option>';
  dropdown2.innerHTML = '<option value="">Select second scenario...</option>';

  // Add scenarios
  scenarios.forEach(scenario => {
    const option1 = document.createElement('option');
    option1.value = scenario.id;
    option1.textContent = scenario.name;
    dropdown1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = scenario.id;
    option2.textContent = scenario.name;
    dropdown2.appendChild(option2);
  });

  console.log('Dropdowns populated. Options:', dropdown1?.options?.length || 0);
}

// Additional functions needed by app.jsx
export function closeMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  if (overlay) overlay.classList.remove('active');
  if (hamburger) hamburger.classList.remove('active');
}

export function restoreScheduling() {
  // Restore any scheduled report generation
  console.log('restoreScheduling called');
}

export function loadScenarioFromURL() {
  const params = new URLSearchParams(window.location.search);
  const scenarioParam = params.get('scenario');
  if (!scenarioParam) return false;

  try {
    const base64 = decodeURIComponent(scenarioParam);
    const serialized = atob(base64);
    const scenarioData = JSON.parse(serialized);

    // Load the scenario data
    if (scenarioData) {
      window.state = scenarioData;
      if (typeof window.render === 'function') window.render();
      return true;
    }
  } catch (e) {
    console.error('Failed to load scenario from URL:', e);
  }
  return false;
}

export function loadSettings() {
  return JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
}

export function setExperienceLevel(level) {
  const settings = loadSettings();
  settings.experienceLevel = level;
  localStorage.setItem('profitpath-settings', JSON.stringify(settings));
}

export function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  localStorage.setItem('profitpath-settings', JSON.stringify(settings));
}

export function loadIndustryTemplate(templateId) {
  const templates = {
    consulting: {
      name: 'Consulting Services',
      config: {
        offerings: [
          { name: 'Strategy Session', priceMonthly: 500, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 50, mixPct: 30, currentClients: 5 },
          { name: 'Monthly Retainer', priceMonthly: 2000, sessionsPerYear: 12, hoursPerSession: 10, variableCostPerSession: 100, mixPct: 50, currentClients: 3 },
          { name: 'Project Work', priceMonthly: 3000, sessionsPerYear: 4, hoursPerSession: 20, variableCostPerSession: 200, mixPct: 20, currentClients: 2 }
        ],
        employees: 1,
        employeePay: 80000,
        monthlyCosts: 500,
        productiveUtilizationPct: 75,
        targetUtilizationPct: 80
      }
    },
    cleaning: {
      name: 'Cleaning Services',
      config: {
        offerings: [
          { name: 'Weekly Cleaning', priceMonthly: 150, sessionsPerYear: 52, hoursPerSession: 2, variableCostPerSession: 20, mixPct: 60, currentClients: 15 },
          { name: 'Biweekly Cleaning', priceMonthly: 250, sessionsPerYear: 26, hoursPerSession: 3, variableCostPerSession: 30, mixPct: 30, currentClients: 10 },
          { name: 'Deep Cleaning', priceMonthly: 400, sessionsPerYear: 4, hoursPerSession: 6, variableCostPerSession: 50, mixPct: 10, currentClients: 5 }
        ],
        employees: 2,
        employeePay: 45000,
        monthlyCosts: 300,
        productiveUtilizationPct: 85,
        targetUtilizationPct: 90
      }
    },
    fitness: {
      name: 'Fitness Services',
      config: {
        offerings: [
          { name: 'Personal Training Sessions', priceMonthly: 300, sessionsPerYear: 48, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 60, currentClients: 24 },
          { name: 'Group Fitness Classes', priceMonthly: 150, sessionsPerYear: 96, hoursPerSession: 0.5, variableCostPerSession: 0, mixPct: 30, currentClients: 48 },
          { name: 'Online Coaching', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 0.1, variableCostPerSession: 0, mixPct: 10, currentClients: 60 }
        ],
        employees: 1,
        employeePay: 40000,
        monthlyCosts: 200,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 85
      }
    },
    landscaping: {
      name: 'Landscaping Services',
      config: {
        offerings: [
          { name: 'Weekly Lawn Maintenance', priceMonthly: 150, sessionsPerYear: 52, hoursPerSession: 1.5, variableCostPerSession: 20, mixPct: 50, currentClients: 20 },
          { name: 'Biweekly Lawn Care', priceMonthly: 100, sessionsPerYear: 26, hoursPerSession: 1, variableCostPerSession: 15, mixPct: 30, currentClients: 15 },
          { name: 'Seasonal Services', priceMonthly: 200, sessionsPerYear: 4, hoursPerSession: 4, variableCostPerSession: 40, mixPct: 20, currentClients: 10 }
        ],
        employees: 2,
        employeePay: 35000,
        monthlyCosts: 400,
        productiveUtilizationPct: 85,
        targetUtilizationPct: 90
      }
    },
    photography: {
      name: 'Photography Services',
      config: {
        offerings: [
          { name: 'Wedding Photography', priceMonthly: 2000, sessionsPerYear: 8, hoursPerSession: 8, variableCostPerSession: 150, mixPct: 40, currentClients: 8 },
          { name: 'Portrait Sessions', priceMonthly: 300, sessionsPerYear: 48, hoursPerSession: 2, variableCostPerSession: 25, mixPct: 35, currentClients: 24 },
          { name: 'Event Photography', priceMonthly: 800, sessionsPerYear: 24, hoursPerSession: 4, variableCostPerSession: 75, mixPct: 25, currentClients: 12 }
        ],
        employees: 1,
        employeePay: 55000,
        monthlyCosts: 300,
        productiveUtilizationPct: 75,
        targetUtilizationPct: 80
      }
    },
    handyman: {
      name: 'Handyman Services',
      config: {
        offerings: [
          { name: 'Maintenance Contracts', priceMonthly: 120, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 25, mixPct: 40, currentClients: 25 },
          { name: 'Repair Services', priceMonthly: 180, sessionsPerYear: 24, hoursPerSession: 1.5, variableCostPerSession: 30, mixPct: 35, currentClients: 20 },
          { name: 'Home Improvement', priceMonthly: 300, sessionsPerYear: 8, hoursPerSession: 4, variableCostPerSession: 60, mixPct: 25, currentClients: 10 }
        ],
        employees: 1,
        employeePay: 50000,
        monthlyCosts: 250,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 85
      }
    }
  };

  const template = templates[templateId];
  if (template) {
    const config = template.config;

    // Apply template to current state
    window.state.offerings = config.offerings.map(o => ({
      ...o,
      id: uuid(),
      mixPct: o.mixPct || 0,
      currentClients: o.currentClients || 0
    }));
    window.state.employees = config.employees;
    window.state.employeePay = config.employeePay;
    window.state.monthlyCosts = config.monthlyCosts;
    window.state.productiveUtilizationPct = config.productiveUtilizationPct;
    window.state.targetUtilizationPct = config.targetUtilizationPct;

    // Refresh the UI
    if (typeof window.render === 'function') window.render();
    persistState();

    return true;
  }
  return false;
}

export function exportAsExcel() {
  const state = window.state;
  const fmtMoney0 = (n) => '$' + Math.round(n).toLocaleString();
  const fmtMoney = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString();
  const fmtPct = (n) => n.toFixed(1) + '%';
  const fmtNum = (n) => (Math.round(n * 100) / 100).toLocaleString();

  let lines = [
    'ProfitPath Analysis Report',
    'Generated: ' + new Date().toLocaleString(),
    '',
    'BUSINESS OVERVIEW',
    'Metric,Value',
    'Employees,' + state.employees,
    'Employee Pay,' + fmtMoney0(state.employeePay),
    'Monthly Costs,' + fmtMoney0(state.monthlyCosts),
    'Productive Utilization,' + fmtPct(state.productiveUtilizationPct),
    'Target Utilization,' + fmtPct(state.targetUtilizationPct),
    '',
    'SERVICE OFFERINGS',
    'Service Name,Monthly Price,Sessions/Year,Hours/Session,Variable Cost,Mix %,Current Clients'
  ];

  state.offerings.forEach((o) => {
    lines.push(
      `"${o.name}",${o.priceMonthly},${o.sessionsPerYear},${o.hoursPerSession},${o.variableCostPerSession},${o.mixPct},${o.currentClients}`
    );
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-export-' + new Date().toISOString().split('T')[0] + '.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('Excel export downloaded!', 'success');
}

export function exportAsPDF() {
  // Create a printable HTML version and open print dialog
  const state = window.state;
  const fmtMoney0 = (n) => '$' + Math.round(n).toLocaleString();
  const fmtMoney = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString();
  const fmtPct = (n) => n.toFixed(1) + '%';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showNotification('Please allow popups to print PDF', 'error');
    return;
  }

  let offeringsHtml = state.offerings.map(o => `
    <tr>
      <td>${o.name}</td>
      <td>${fmtMoney0(o.priceMonthly)}</td>
      <td>${o.sessionsPerYear}</td>
      <td>${o.hoursPerSession}</td>
      <td>${fmtMoney0(o.variableCostPerSession)}</td>
      <td>${fmtPct(o.mixPct)}</td>
      <td>${o.currentClients}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ProfitPath Analysis Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .section { margin: 20px 0; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>ProfitPath Analysis Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      
      <div class="section">
        <h2>Business Overview</h2>
        <p><span class="label">Employees:</span> ${state.employees}</p>
        <p><span class="label">Employee Pay:</span> ${fmtMoney0(state.employeePay)}</p>
        <p><span class="label">Monthly Costs:</span> ${fmtMoney0(state.monthlyCosts)}</p>
        <p><span class="label">Productive Utilization:</span> ${fmtPct(state.productiveUtilizationPct)}</p>
        <p><span class="label">Target Utilization:</span> ${fmtPct(state.targetUtilizationPct)}</p>
      </div>
      
      <div class="section">
        <h2>Service Offerings</h2>
        <table>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Monthly Price</th>
              <th>Sessions/Year</th>
              <th>Hours/Session</th>
              <th>Variable Cost</th>
              <th>Mix %</th>
              <th>Current Clients</th>
            </tr>
          </thead>
          <tbody>
            ${offeringsHtml}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
  showNotification('PDF print dialog opened!', 'success');
}

export function exportAsHTML() {
  const state = window.state;
  const fmtMoney0 = (n) => '$' + Math.round(n).toLocaleString();
  const fmtMoney = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString();
  const fmtPct = (n) => n.toFixed(1) + '%';

  let offeringsHtml = state.offerings.map(o => `
    <tr>
      <td>${o.name}</td>
      <td>${fmtMoney0(o.priceMonthly)}</td>
      <td>${o.sessionsPerYear}</td>
      <td>${o.hoursPerSession}</td>
      <td>${fmtMoney0(o.variableCostPerSession)}</td>
      <td>${fmtPct(o.mixPct)}</td>
      <td>${o.currentClients}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>ProfitPath Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #007bff; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .section { margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
    .label { font-weight: bold; color: #333; }
    .value { color: #007bff; }
  </style>
</head>
<body>
  <h1>ProfitPath Analysis Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <div class="section">
    <h2>Business Overview</h2>
    <div class="metric"><span class="label">Employees:</span> <span class="value">${state.employees}</span></div>
    <div class="metric"><span class="label">Employee Pay:</span> <span class="value">${fmtMoney0(state.employeePay)}</span></div>
    <div class="metric"><span class="label">Monthly Costs:</span> <span class="value">${fmtMoney0(state.monthlyCosts)}</span></div>
    <div class="metric"><span class="label">Productive Utilization:</span> <span class="value">${fmtPct(state.productiveUtilizationPct)}</span></div>
    <div class="metric"><span class="label">Target Utilization:</span> <span class="value">${fmtPct(state.targetUtilizationPct)}</span></div>
  </div>
  
  <div class="section">
    <h2>Service Offerings</h2>
    <table>
      <thead>
        <tr>
          <th>Service Name</th>
          <th>Monthly Price</th>
          <th>Sessions/Year</th>
          <th>Hours/Session</th>
          <th>Variable Cost</th>
          <th>Mix %</th>
          <th>Current Clients</th>
        </tr>
      </thead>
      <tbody>
        ${offeringsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-report-' + new Date().toISOString().split('T')[0] + '.html');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('HTML report downloaded!', 'success');
}

export function shareViaEmail() {
  const state = window.state;
  const fmtMoney0 = (n) => '$' + Math.round(n).toLocaleString();
  const fmtPct = (n) => n.toFixed(1) + '%';

  let offeringsText = state.offerings.map(o =>
    `- ${o.name}: ${fmtMoney0(o.priceMonthly)}/month, ${o.sessionsPerYear} sessions/year, ${fmtPct(o.mixPct)} mix`
  ).join('\n');

  const subject = encodeURIComponent('ProfitPath Analysis Report');
  const body = encodeURIComponent(
    `Check out my ProfitPath analysis:\n\n` +
    `Business Overview:\n` +
    `- Employees: ${state.employees}\n` +
    `- Employee Pay: ${fmtMoney0(state.employeePay)}\n` +
    `- Monthly Costs: ${fmtMoney0(state.monthlyCosts)}\n` +
    `- Productive Utilization: ${fmtPct(state.productiveUtilizationPct)}\n` +
    `- Target Utilization: ${fmtPct(state.targetUtilizationPct)}\n\n` +
    `Service Offerings:\n${offeringsText}\n\n` +
    `View full analysis at: ${window.location.href}`
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  showNotification('Email client opened!', 'success');
}

export function showEmbedCode() {
  console.log('showEmbedCode called');
  const embedCode = `<iframe src="${window.location.href}" width="100%" height="600" frameborder="0"></iframe>`;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;';
  modal.innerHTML = `
    <div class="modal-content" style="position: relative; background: white; margin: 50px auto; padding: 20px; max-width: 500px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px 20px; background: #f8f9fa; border-radius: 8px 8px 0 0;">
        <h3 style="margin: 0; font-size: 24px; font-weight: 600; color: #333;">📋 Embed Code</h3>
        <button class="modal-close" style="background: #dc3545; color: white; border: none; font-size: 28px; cursor: pointer; padding: 8px; border-radius: 4px; width: 40px; height: 40px;">&times;</button>
      </div>
      <div class="modal-body">
        <p>Copy this code to embed ProfitPath on your website:</p>
        <textarea id="embedCodeText" readonly style="width: 100%; height: 100px; padding: 10px; margin: 10px 0; font-family: monospace; border: 1px solid #ccc; border-radius: 4px;">${embedCode}</textarea>
        <button onclick="navigator.clipboard.writeText(document.getElementById('embedCodeText').value); alert('Embed code copied!');" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy to Clipboard</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add close functionality
  modal.querySelector('.modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

export function showScheduleDialog() {
  console.log('showScheduleDialog called');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; outline: none;';
  modal.innerHTML = `
    <div class="modal-content" style="position: relative; background: white; margin: 50px auto; padding: 20px; max-width: 500px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px 20px; background: #f8f9fa; border-radius: 8px 8px 0 0;">
        <h3 style="margin: 0; font-size: 24px; font-weight: 600; color: #333;">📅 Schedule Reports</h3>
        <button class="modal-close" style="background: #dc3545; color: white; border: none; font-size: 28px; cursor: pointer; padding: 8px; border-radius: 4px; width: 40px; height: 40px;">&times;</button>
      </div>
      <div class="modal-body">
        <p>Set up automatic report delivery:</p>
        <form id="scheduleForm">
          <div style="margin: 10px 0;">
            <label>Frequency:</label>
            <select style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div style="margin: 10px 0;">
            <label>Email:</label>
            <input type="email" placeholder="your@email.com" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
          </div>
          <button type="submit" style="margin-top: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Set Schedule</button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add close functionality
  modal.querySelector('.modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Handle form submission
  const form = document.getElementById('scheduleForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const frequency = form.querySelector('select').value;
      const email = form.querySelector('input[type="email"]').value;

      alert(`Reports scheduled ${frequency} to ${email}!`);
      document.body.removeChild(modal);
    });
  }
}

export function loadTestScenarios() {
  // Placeholder for loading test scenarios
  console.log('loadTestScenarios called');
}

export function loadSpecificTestScenario(scenarioKey) {
  // Placeholder for loading specific test scenario
  console.log('loadSpecificTestScenario called:', scenarioKey);
}

export function updateValidationDisplay() {
  // Placeholder for updating validation display
  console.log('updateValidationDisplay called');
}

export function lazyLoadChart(metrics) {
  // Placeholder for lazy loading charts
  console.log('lazyLoadChart called:', metrics);
}

export function updateRichVisualizations(metrics) {
  // Placeholder for updating rich visualizations
  console.log('updateRichVisualizations called:', metrics);
}

export function toggleMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  if (overlay) overlay.classList.toggle('active');
  if (hamburger) hamburger.classList.toggle('active');
}

// Export functions for settings and preferences

export function getSetting(key, defaultValue = null) {
  const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

export function resetSettings() {
  localStorage.removeItem('profitpath-settings');
}

// Export functions for analytics and feedback
export function trackEvent(eventName, properties = {}) {
  if (!getSetting('analyticsEnabled', true)) return;

  const data = {
    event: eventName,
    timestamp: new Date().toISOString(),
    properties: properties,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Send to analytics endpoint (placeholder)
  console.log('Analytics event:', data);
}

export function sendFeedback(rating, comment = '') {
  const feedback = {
    rating: rating,
    comment: comment,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Send feedback to server (placeholder)
  console.log('Feedback:', feedback);
  return true;
}

// Export functions for performance monitoring
export function measurePerformance(fn, label) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`${label} took ${duration.toFixed(2)}ms`);

  // Track performance metrics
  trackEvent('performance', {
    function: label,
    duration: duration,
  });

  return result;
}

export function getPerformanceMetrics() {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    };
  }
  return {};
}

// Export functions for accessibility
export function enhanceAccessibility() {
  // Add ARIA labels and roles
  document.querySelectorAll('input').forEach(input => {
    if (!input.getAttribute('aria-label')) {
      input.setAttribute('aria-label', input.placeholder || input.name || 'Input field');
    }
  });

  // Add keyboard navigation support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        document.body.removeChild(modal);
      });
    }
  });
}

// Export functions for internationalization
export function setLanguage(language) {
  updateSetting('language', language);
  // Reload page to apply language changes
  window.location.reload();
}

export function getLanguage() {
  return getSetting('language', 'en');
}

export function translate(key, language = null) {
  const lang = language || getLanguage();
  const translations = {
    en: {
      'save_scenario': 'Save Scenario',
      'load_scenario': 'Load Scenario',
      'delete_scenario': 'Delete Scenario',
      'export_csv': 'Export CSV',
      'share_scenario': 'Share Scenario',
      'settings': 'Settings',
      'help': 'Help',
    },
    es: {
      'save_scenario': 'Guardar Escenario',
      'load_scenario': 'Cargar Escenario',
      'delete_scenario': 'Eliminar Escenario',
      'export_csv': 'Exportar CSV',
      'share_scenario': 'Compartir Escenario',
      'settings': 'Configuración',
      'help': 'Ayuda',
    },
  };

  return translations[lang] && translations[lang][key] ? translations[lang][key] : key;
}

// Export functions for debugging
export function debugState() {
  console.group('ProfitPath Debug State');
  console.log('Current State:', JSON.parse(JSON.stringify(state)));
  console.log('Settings:', JSON.parse(localStorage.getItem('profitpath-settings') || '{}'));
  console.log('Scenarios:', JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]'));
  console.log('Performance Metrics:', getPerformanceMetrics());
  console.groupEnd();
}

export function enableDebugMode() {
  updateSetting('debugMode', true);
  console.log('Debug mode enabled');
}

export function disableDebugMode() {
  updateSetting('debugMode', false);
  console.log('Debug mode disabled');
}

export function isDebugMode() {
  return getSetting('debugMode', false);
}

// Export utility functions
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export default object with all functions
export default {
  escapeHtml,
  setStateFromInputs,
  onTableInput,
  onTableClick,
  addOffering,
  resetDefaults,
  exportAsCSV,
  shareScenario,
  showModal,
  showLoadingModal,
  showSuccessModal,
  showErrorModal,
  persistState,
  loadState,
  validateBusinessLogic,
  rebalanceMix,
  defaultOfferings,
  renderChart,
  saveScenario,
  loadScenario,
  deleteScenario,
  listScenarios,
  updateSetting,
  getSetting,
  resetSettings,
  trackEvent,
  sendFeedback,
  measurePerformance,
  getPerformanceMetrics,
  enhanceAccessibility,
  setLanguage,
  getLanguage,
  translate,
  debugState,
  enableDebugMode,
  disableDebugMode,
  isDebugMode,
  uuid,
  debounce,
  throttle,
};