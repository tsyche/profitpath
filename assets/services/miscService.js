// Miscellaneous Helpers and UI Logic
/* global render calc updateOutputs updateValidationDisplay Chart */
import { safeParseNumber, clamp } from '../utils/helpers';
import { showToast } from './modalService.js';
import { createModal, closeCurrentModal } from '../components/Modal.js';
import { persistState } from './stateManager.js';
import { renderSimpleChart, updateRichVisualizations as vizUpdateRichVisualizations, updateBreakEvenAnalysis } from './visualizationService.js';

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
// Coerce a value to a finite number within [min, max], or return fallback
function toFiniteNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

const MAX_OFFERINGS = 50;
const MAX_NAME_LENGTH = 120;

// Sanitize untrusted scenario data (from URLs, localStorage, or imports) into a
// safe state object containing only allowlisted fields with clamped values.
// Returns null if the data is not a usable scenario. Handles the legacy
// employees/employeePay format by mapping it onto fullTime fields.
export function sanitizeScenarioState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const rawOfferings = Array.isArray(data.offerings) ? data.offerings.slice(0, MAX_OFFERINGS) : [];
  const offerings = rawOfferings
    .filter((o) => o && typeof o === 'object')
    .map((o, idx) => ({
      id: typeof o.id === 'string' && o.id ? o.id.slice(0, 64) : uuid(),
      name: (typeof o.name === 'string' ? o.name : '').trim().slice(0, MAX_NAME_LENGTH) || `Offering ${idx + 1}`,
      priceMonthly: toFiniteNumber(o.priceMonthly, 100, 0, 1e9),
      sessionsPerYear: Math.floor(toFiniteNumber(o.sessionsPerYear, 12, 1, 100000)),
      hoursPerSession: toFiniteNumber(o.hoursPerSession, 1, 0.1, 10000),
      variableCostPerSession: toFiniteNumber(o.variableCostPerSession, 0, 0, 1e9),
      mixPct: toFiniteNumber(o.mixPct, 0, 0, 100),
      currentClients: Math.floor(toFiniteNumber(o.currentClients, 0, 0, 1e7))
    }));

  if (offerings.length === 0) return null;

  return {
    mode: data.mode === 'current' ? 'current' : 'forecast',
    offerings,
    fullTimeEmployees: Math.floor(toFiniteNumber(data.fullTimeEmployees ?? data.employees, 1, 0, 100000)),
    partTimeEmployees: Math.floor(toFiniteNumber(data.partTimeEmployees, 0, 0, 100000)),
    fullTimeEmployeePay: toFiniteNumber(data.fullTimeEmployeePay ?? data.employeePay, 60000, 0, 1e9),
    partTimeEmployeePay: toFiniteNumber(data.partTimeEmployeePay, 30000, 0, 1e9),
    monthlyCosts: toFiniteNumber(data.monthlyCosts, 250, 0, 1e9),
    productiveUtilizationPct: toFiniteNumber(data.productiveUtilizationPct, 80, 1, 100),
    targetUtilizationPct: toFiniteNumber(data.targetUtilizationPct, 75, 1, 150),
    lockMix: data.lockMix === true,
    loadedTemplate: typeof data.loadedTemplate === 'string' ? data.loadedTemplate.slice(0, 100) : null
  };
}

export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Clipboard fallback for non-secure contexts
function copyToClipboardFallback(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  return new Promise((resolve, reject) => {
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) resolve();
      else reject(new Error('Copy command failed'));
    } catch (err) {
      document.body.removeChild(textArea);
      reject(err);
    }
  });
}

export function shareScenario() {
  const shareUrl = encodeScenarioToURL(window.state);
  if (!shareUrl) {
    showToast('Failed to generate share link', 'error');
    return;
  }
  updateSocialMetaTags(window.state);
  const handleCopySuccess = () => showToast('Share link copied to clipboard!', 'success');
  const handleCopyError = () => showToast('Share link: ' + shareUrl, 'info');

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(shareUrl)
      .then(handleCopySuccess)
      .catch(() => copyToClipboardFallback(shareUrl).then(handleCopySuccess).catch(handleCopyError));
  } else {
    copyToClipboardFallback(shareUrl).then(handleCopySuccess).catch(handleCopyError);
  }
}

// Quote a CSV cell: double embedded quotes, and prefix a ' on values starting
// with = + - @ so spreadsheet apps don't execute them as formulas
export function csvCell(value) {
  let s = String(value == null ? '' : value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}

export function exportAsCSV() {
  let results;
  try {
    if (typeof calc === 'function') {
      results = calc(state);
    } else {
      results = { state: state, metrics: {} };
    }
  } catch (e) {
    console.error('Calculation failed in exportAsCSV:', e);
    alert('Error: Could not generate CSV export due to calculation error.');
    return;
  }

  const lines = [
    'ProfitPath Business Analysis Report',
    'Generated: ' + (new Date().toLocaleString()),
    'Mode: ' + (state.mode === 'forecast' ? 'Forecast' : 'Current'),
    '',
    'BUSINESS PARAMETERS',
    'Parameter,Value,Unit',
    'Full-time Employees,' + (state.fullTimeEmployees) + ',people',
    'Part-time Employees,' + (state.partTimeEmployees) + ',people',
    'FT Annual Pay,' + (fmtMoney0(state.fullTimeEmployeePay)) + ',USD/yr',
    'PT Annual Pay,' + (fmtMoney0(state.partTimeEmployeePay)) + ',USD/yr',
    'Monthly Overhead,' + (fmtMoney0(state.monthlyCosts)) + ',USD/mo',
    'Productive Utilization,' + (fmtPct1(state.productiveUtilizationPct)) + ',%',
    'Target Utilization,' + (fmtPct1(state.targetUtilizationPct)) + ',%',
    '',
    'FINANCIAL RESULTS',
    'Metric,Value,Unit',
    'Total Annual Revenue,' + (fmtMoney0(results.revenue)) + ',USD/yr',
    'Total Variable Costs,' + (fmtMoney0(results.variableCosts)) + ',USD/yr',
    'Net Profit(Loss),' + (fmtMoney0(results.income)) + ',USD/yr',
    'Profit Margin,' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)) + ',%',
    'Capacity Utilization,' + (fmtPct1(results.capacityPct || 0)) + ',%',
    '',
    'SERVICE OFFERINGS',
    'Name,Monthly Price,Sessions/yr,Hours/session,Var Cost/session,Mix %,Current Clients',
  ];

  state.offerings.forEach((o) => {
    lines.push(
      csvCell(o.name) + ',' + (o.priceMonthly) + ',' + (o.sessionsPerYear) + ',' + (o.hoursPerSession) + ',' + (o.variableCostPerSession) + ',' + (o.mixPct) + ',' + (o.currentClients)
    );
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-' + (new Date().toISOString().split('T')[0]) + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000); // Revoke after a minute
  trackEvent('export', { format: 'csv' });
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
        <input type="text" id="shareUrlInput" value="${shareUrl}" readonly class="copy-on-click" title="Click to copy" style="width: 100%; padding: 5px; margin-bottom: 10px;">
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
    // URI-encode before btoa so non-Latin1 characters (e.g. unicode offering
    // names) don't make btoa throw
    const base64 = btoa(encodeURIComponent(serialized));
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
    const decoded = atob(decodeURIComponent(scenarioParam));
    try {
      return JSON.parse(decodeURIComponent(decoded));
    } catch {
      // Legacy links encoded raw JSON without the URI-encoding step
      return JSON.parse(decoded);
    }
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
// Removed redundant functions

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
      // Ensure modal is a proper DOM element before calling querySelector
      if (modal && modal.querySelector && typeof modal.querySelector === 'function') {
        if (!dropdown1) {
          dropdown1 = modal.querySelector('#compareScenario1');
        }
        if (!dropdown2) {
          dropdown2 = modal.querySelector('#compareScenario2');
        }
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

  // Restore previously selected values from localStorage
  const savedCompare = JSON.parse(localStorage.getItem('profitpath-compare-selection') || 'null');
  if (savedCompare) {
    if (savedCompare.id1) dropdown1.value = savedCompare.id1;
    if (savedCompare.id2) dropdown2.value = savedCompare.id2;
  }

  // Add change listeners that only save the selection (not trigger comparison)
  const saveSelection = () => {
    localStorage.setItem('profitpath-compare-selection', JSON.stringify({
      id1: dropdown1.value || '',
      id2: dropdown2.value || ''
    }));
  };

  dropdown1.addEventListener('change', saveSelection);
  dropdown2.addEventListener('change', saveSelection);
}

// Additional functions needed by app.jsx
export function closeMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  if (overlay) overlay.classList.remove('active');
  if (hamburger) hamburger.classList.remove('active');

  // Collapse all expanded menu sections
  const mobileTemplatesOptions = document.getElementById('mobileTemplatesOptions');
  const mobileExportOptions = document.getElementById('mobileExportOptions');
  const mobileSettingsSection = document.querySelector('.mobile-settings-section');

  if (mobileTemplatesOptions) mobileTemplatesOptions.style.display = 'none';
  if (mobileExportOptions) mobileExportOptions.style.display = 'none';
  if (mobileSettingsSection) mobileSettingsSection.style.display = 'none';
}

export function restoreScheduling() {
  // Restore any scheduled report generation
  console.log('restoreScheduling called');
}

export function loadScenarioFromURL() {
  try {
    const scenarioData = decodeScenarioFromURL();
    if (!scenarioData) return false;

    // URL data is untrusted: allowlist + clamp every field before applying
    const sanitized = sanitizeScenarioState(scenarioData);
    if (!sanitized) return false;

    // Mutate the existing state object in place — replacing window.state would
    // orphan the reference app.jsx holds and the app would keep rendering the
    // old state
    Object.assign(window.state, sanitized);
    if (typeof window.render === 'function') window.render();
    return true;
  } catch (e) {
    console.error('Failed to load scenario from URL:', e);
  }
  return false;
}

export function loadSettings() {
  const DEFAULT_SETTINGS = {
    experienceLevel: 'beginner',
    showAdvancedCalculations: false,
    showDetailedBreakdown: false,
    showComparisonTools: false,
    showExportOptions: false,
    showDebugPanel: false,
    showTooltips: true,
    enableCaching: true,
    enableDebugMode: false,
    showPerformanceMetrics: false,
    showSensitivityAnalysis: false,
    theme: 'auto',
    compactMode: false
  };

  try {
    const stored = localStorage.getItem('profitpath-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

export function setExperienceLevel(level) {
  const FEATURE_GATES = {
    beginner: { showAdvancedCalculations: false, showDetailedBreakdown: false, showComparisonTools: false, showExportOptions: false, showDebugPanel: false, showPerformanceMetrics: false, showSensitivityAnalysis: false, showTooltips: true },
    intermediate: { showAdvancedCalculations: true, showDetailedBreakdown: true, showComparisonTools: true, showExportOptions: false, showDebugPanel: false, showPerformanceMetrics: false, showSensitivityAnalysis: true, showTooltips: true },
    advanced: { showAdvancedCalculations: true, showDetailedBreakdown: true, showComparisonTools: true, showExportOptions: true, showDebugPanel: true, showPerformanceMetrics: true, showSensitivityAnalysis: true, showTooltips: false }
  };

  const currentSettings = loadSettings();
  const newSettings = { ...currentSettings, experienceLevel: level };

  if (FEATURE_GATES[level]) {
    Object.assign(newSettings, FEATURE_GATES[level]);
  }

  localStorage.setItem('profitpath-settings', JSON.stringify(newSettings));
}

export function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  localStorage.setItem('profitpath-settings', JSON.stringify(settings));
}

export function loadIndustryTemplate(templateId) {
  // Use global INDUSTRY_TEMPLATES as single source of truth
  const template = window.INDUSTRY_TEMPLATES && window.INDUSTRY_TEMPLATES[templateId];
  if (template) {
    const config = template.config;

    // Apply template to current state
    window.state.offerings = config.offerings.map(o => ({
      ...o,
      id: uuid(),
      mixPct: o.mixPct || 0,
      currentClients: o.currentClients || 0
    }));
    window.state.fullTimeEmployees = config.fullTimeEmployees || 1;
    window.state.partTimeEmployees = config.partTimeEmployees || 0;
    window.state.fullTimeEmployeePay = config.fullTimeEmployeePay || 60000;
    window.state.partTimeEmployeePay = config.partTimeEmployeePay || 30000;
    window.state.monthlyCosts = config.monthlyCosts;
    window.state.productiveUtilizationPct = config.productiveUtilizationPct;
    window.state.targetUtilizationPct = config.targetUtilizationPct;

    // Track that this data came from a template
    window.state.loadedTemplate = templateId;

    // Refresh the UI
    if (typeof window.render === 'function') window.render();
    persistState();

    // Show success notification
    showToast(template.name + ' template loaded successfully.', 'success', 3000);

    // Track template usage
    trackEvent('template_loaded', { template: templateId });

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

  const lines = [
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
      `${csvCell(o.name)},${o.priceMonthly},${o.sessionsPerYear},${o.hoursPerSession},${o.variableCostPerSession},${o.mixPct},${o.currentClients}`
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

  // Track Excel export
  trackEvent('export', { format: 'excel' });
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

  const offeringsHtml = state.offerings.map(o => `
    <tr>
      <td>${escapeHtml(o.name)}</td>
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
    // Track PDF export
    trackEvent('export', { format: 'pdf' });
  }, 500);
  showNotification('PDF print dialog opened!', 'success');
}

export function exportAsHTML() {
  const state = window.state;
  const fmtMoney0 = (n) => '$' + Math.round(n).toLocaleString();
  const fmtMoney = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString();
  const fmtPct = (n) => n.toFixed(1) + '%';

  const offeringsHtml = state.offerings.map(o => `
    <tr>
      <td>${escapeHtml(o.name)}</td>
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

  // Track HTML export
  trackEvent('export', { format: 'html' });
}

export function shareViaEmail() {
  const state = window.state;
  const fmtMoney0 = (n) => '$' + Math.round(n).toLocaleString();
  const fmtPct = (n) => n.toFixed(1) + '%';

  const offeringsText = state.offerings.map(o =>
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

  // Track email export
  trackEvent('export', { format: 'email' });
}

export function showEmbedCode() {
  const embedCode = `<iframe src="${window.location.href}" width="100%" height="600" frameborder="0"></iframe>`;

  createModal({
    title: '📋 Embed Widget',
    content: `
      <p>Copy this code to embed ProfitPath on your website:</p>
      <textarea id="embedCodeText" readonly class="copy-on-click" title="Click to copy" style="width:100%;height:100px;padding:10px;margin:10px 0;font-family:monospace;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--panel);color:var(--text);box-sizing:border-box;">${embedCode}</textarea>
    `,
    size: 'medium',
    buttons: [
      {
        text: 'Copy to Clipboard',
        primary: true,
        action: () => {
          navigator.clipboard.writeText(embedCode).then(() => {
            showToast('Embed code copied to clipboard!', 'success', 2000);
          }).catch(() => {
            showToast('Copy failed — select the code above and copy manually.', 'error', 3000);
          });
        }
      }
    ]
  });
}

export function showScheduleDialog() {
  createModal({
    title: '📅 Schedule Reports',
    content: `
      <p style="margin-top: 0;">Set up automatic report delivery:</p>
      <form id="scheduleForm">
        <div style="margin: 12px 0;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Frequency:</label>
          <select id="scheduleFrequency" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px;">
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </div>
        <div style="margin: 12px 0;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Email:</label>
          <input id="scheduleEmail" type="email" placeholder="your@email.com" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
        </div>
        <button type="submit" class="btn primary" style="margin-top: 8px; width: 100%;">Set Schedule</button>
      </form>
    `,
    size: 'small'
  });

  const form = document.getElementById('scheduleForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const frequency = document.getElementById('scheduleFrequency').value;
      const email = document.getElementById('scheduleEmail').value;
      closeCurrentModal();
      showToast(`Reports scheduled ${frequency} to ${email}!`, 'success', 3000);
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
  try {
    if (renderSimpleChart) {
      renderSimpleChart(metrics);
    }
  } catch (e) {
    console.warn('lazyLoadChart error:', e);
  }
}

export function updateRichVisualizations(metrics) {
  try {
    if (typeof vizUpdateRichVisualizations === 'function') {
      vizUpdateRichVisualizations(metrics);
    }
    if (typeof updateBreakEvenAnalysis === 'function') {
      updateBreakEvenAnalysis(metrics);
    }
  } catch (e) {
    console.warn('updateRichVisualizations error:', e);
  }
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

// CSV Import/Export Functions
export function generateImportTemplate() {
  const template = `# Business Settings
# Edit values in the right column
employees,3
partTimeEmployees,0
employeePay,60000
partTimeEmployeePay,30000
monthlyCosts,500
productiveUtilizationPct,80
targetUtilizationPct,75

# Offerings
# Add or remove rows. Mix % values should sum to 100.
Name,Monthly Price ($),Sessions/Year,Hours/Session,Variable Cost/Session ($),Mix %,Current Clients
Consulting,1000,12,2,100,60,0
Support,500,24,1,50,40,0`;

  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(template));
  element.setAttribute('download', 'profitpath-template.csv');
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function importFromCSV(csvText) {
  const errors = [];
  const settings = {};
  const offerings = [];

  try {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));

    let inSettingsSection = false;
    let inOfferingsSection = false;
    let offeringHeaders = null;

    for (const line of lines) {
      if (line.includes('Settings')) {
        inSettingsSection = true;
        inOfferingsSection = false;
        continue;
      }
      if (line.includes('Offerings')) {
        inSettingsSection = false;
        inOfferingsSection = true;
        continue;
      }

      if (inSettingsSection) {
        const [key, value] = line.split(',').map(s => s.trim());
        if (key && value !== undefined) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            // Map CSV keys to state field names
            if (key === 'employees') settings.employees = Math.max(0, Math.floor(numValue));
            if (key === 'partTimeEmployees') settings.partTimeEmployees = Math.max(0, Math.floor(numValue));
            if (key === 'employeePay') settings.employeePay = Math.max(0, numValue);
            if (key === 'partTimeEmployeePay') settings.partTimeEmployeePay = Math.max(0, numValue);
            if (key === 'monthlyCosts') settings.monthlyCosts = Math.max(0, numValue);
            if (key === 'productiveUtilizationPct') settings.productiveUtilizationPct = Math.max(0, Math.min(100, numValue));
            if (key === 'targetUtilizationPct') settings.targetUtilizationPct = Math.max(0, numValue);
          }
        }
      }

      if (inOfferingsSection) {
        if (!offeringHeaders) {
          // First data row is the header
          offeringHeaders = line.split(',').map(h => h.trim().toLowerCase());
          continue;
        }

        // Parse offering row
        const values = line.split(',').map(v => v.trim());
        if (values.length < 7) continue;

        const offering = {
          id: `offering-${uuid()}`,
          name: values[0] || 'New Offering',
          priceMonthly: parseFloat(values[1]) || 0,
          sessionsPerYear: Math.max(1, Math.floor(parseFloat(values[2]) || 1)),
          hoursPerSession: Math.max(0.1, parseFloat(values[3]) || 1),
          variableCostPerSession: Math.max(0, parseFloat(values[4]) || 0),
          mixPct: Math.max(0, Math.min(100, parseFloat(values[5]) || 0)),
          currentClients: Math.max(0, Math.floor(parseFloat(values[6]) || 0))
        };

        // Validate offering
        if (!offering.name) {
          errors.push('Offering name cannot be empty');
          continue;
        }
        if (offering.priceMonthly <= 0) {
          errors.push(`Offering "${offering.name}": price must be > 0`);
          continue;
        }

        offerings.push(offering);
      }
    }

    // Validate offerings
    if (offerings.length === 0) {
      errors.push('CSV must contain at least 1 offering');
      return { success: false, errors };
    }

    // Success
    return { success: true, data: { settings, offerings }, errors };
  } catch (e) {
    return { success: false, errors: [`Parse error: ${e.message}`] };
  }
}

// Export default object with all functions
export default {
  escapeHtml,
  exportAsCSV,
  shareScenario,
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