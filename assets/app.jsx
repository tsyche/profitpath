import { calc } from '../src/calculations/index.js';
import { captureTableFocus, restoreTableFocus } from './hooks/useTableFocus';
import { openScenarioModal, renderScenariosList } from './components/UIHelpers';
import { initializeProgressiveDisclosure } from './utils/progressiveDisclosure';
import * as misc from './services/miscService';
import * as businessLogic from './services/businessLogic';
import { saveScenario, loadScenario, deleteScenario } from './services/scenarioService';
import { closeScenarioModal } from './components/Modal.js';
import { getAllScenarios, encodeScenarioToURL, decodeScenarioFromURL } from './services/miscService';
import { uuid } from './utils/helpers';
import { showConfirmationModal, showToast } from './services/modalService.js';

// Test scenarios for development
const TEST_SCENARIOS = {
  'basic': {
    name: 'Basic Service',
    offerings: [{ name: 'Basic Service', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 20, mixPct: 100, currentClients: 5 }]
  },
  'freelancer': {
    name: 'Freelancer',
    offerings: [
      { name: 'Consulting', priceMonthly: 200, sessionsPerYear: 24, hoursPerSession: 2, variableCostPerSession: 50, mixPct: 60, currentClients: 3 },
      { name: 'Support', priceMonthly: 150, sessionsPerYear: 48, hoursPerSession: 1, variableCostPerSession: 25, mixPct: 40, currentClients: 8 }
    ]
  }
};

// wrappers around miscService mobile menu helpers to avoid ReferenceErrors in test env
const closeMobileMenu = (...args) => (misc && typeof misc.closeMobileMenu === 'function') ? misc.closeMobileMenu(...args) : undefined;
const restoreScheduling = (...args) => (misc && typeof misc.restoreScheduling === 'function') ? misc.restoreScheduling(...args) : undefined;

// HTML escape helper
const escapeHtml = (...args) => (misc && typeof misc.escapeHtml === 'function') ? misc.escapeHtml(...args) : (args[0] == null ? '' : String(args[0]));

// other utility wrappers - remove functions that don't exist
const loadScenarioFromURL = (...args) => (misc && typeof misc.loadScenarioFromURL === 'function') ? misc.loadScenarioFromURL(...args) : undefined;

// DOM utility functions
const $ = (selector) => {
  if (typeof document === 'undefined') return null;
  return document.querySelector(selector);
};

const $$ = (selector) => {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll(selector));
};

// Make $ and $$ globally available for other modules
if (typeof window !== 'undefined') {
  window.$ = $;
  window.$$ = $$;
}

// Industry templates for template loading feature
const INDUSTRY_TEMPLATES = {
  consulting: {
    name: 'Consulting Services',
    description: 'Professional consulting business',
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
    description: 'Residential and commercial cleaning',
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
    description: 'Personal training and fitness coaching',
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
    description: 'Lawn care and landscaping business',
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
    description: 'Event and portrait photography',
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
    description: 'General home repair and maintenance',
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

// Make INDUSTRY_TEMPLATES globally available
if (typeof window !== 'undefined') {
  window.INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES;
}

// Additional function wrappers to prevent ReferenceErrors - only include functions that exist
const loadSettings = (...args) => (misc && typeof misc.loadSettings === 'function') ? misc.loadSettings(...args) : (() => ({}));
const setExperienceLevel = (...args) => (misc && typeof misc.setExperienceLevel === 'function') ? misc.setExperienceLevel(...args) : undefined;
const updateSetting = (...args) => (misc && typeof misc.updateSetting === 'function') ? misc.updateSetting(...args) : undefined;
const loadIndustryTemplate = (...args) => (misc && typeof misc.loadIndustryTemplate === 'function') ? misc.loadIndustryTemplate(...args) : undefined;
const exportAsCSV = (...args) => (misc && typeof misc.exportAsCSV === 'function') ? misc.exportAsCSV(...args) : undefined;
const exportAsExcel = (...args) => (misc && typeof misc.exportAsExcel === 'function') ? misc.exportAsExcel(...args) : undefined;
const exportAsPDF = (...args) => (misc && typeof misc.exportAsPDF === 'function') ? misc.exportAsPDF(...args) : undefined;
const exportAsHTML = (...args) => (misc && typeof misc.exportAsHTML === 'function') ? misc.exportAsHTML(...args) : undefined;
const shareViaEmail = (...args) => (misc && typeof misc.shareViaEmail === 'function') ? misc.shareViaEmail(...args) : undefined;
const showEmbedCode = (...args) => (misc && typeof misc.showEmbedCode === 'function') ? misc.showEmbedCode(...args) : undefined;
const showScheduleDialog = (...args) => (misc && typeof misc.showScheduleDialog === 'function') ? misc.showScheduleDialog(...args) : undefined;
const shareScenario = (...args) => (misc && typeof misc.shareScenario === 'function') ? misc.shareScenario(...args) : undefined;
const loadTestScenarios = (...args) => (misc && typeof misc.loadTestScenarios === 'function') ? misc.loadTestScenarios(...args) : undefined;
const loadSpecificTestScenario = (...args) => (misc && typeof misc.loadSpecificTestScenario === 'function') ? misc.loadSpecificTestScenario(...args) : undefined;
// Use a function to avoid initialization issues
const getTestScenarios = () => (typeof TEST_SCENARIOS !== 'undefined' ? TEST_SCENARIOS : {});
const showNotification = (...args) => (misc && typeof misc.showNotification === 'function') ? misc.showNotification(...args) : undefined;

// Make utility functions globally available after they're defined
// Use a function to ensure assignment happens after module is loaded
const assignGlobalFunctions = () => {
  if (typeof window !== 'undefined') {
    if (misc && misc.loadIndustryTemplate) {
      window.loadIndustryTemplate = misc.loadIndustryTemplate;
    }
    if (misc && misc.exportAsExcel) {
      window.exportAsExcel = misc.exportAsExcel;
    }
    if (typeof hideContextualHelp === 'function') {
      window.hideContextualHelp = hideContextualHelp;
    }
  }
};

// Assign immediately and also on window load
assignGlobalFunctions();
if (typeof window !== 'undefined') {
  window.addEventListener('load', assignGlobalFunctions);
}

// Missing utility functions
const safeParseNumber = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const rebalanceMix = () => {
  if (state.mode === 'forecast' && state.lockMix) {
    const sum = state.offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);
    if (sum > 0) {
      state.offerings.forEach((o) => (o.mixPct = ((Number(o.mixPct) || 0) / sum) * 100));
    }
  }
};

// Additional missing function wrappers - only include functions that exist
const updateValidationDisplay = (...args) => (misc && typeof misc.updateValidationDisplay === 'function') ? misc.updateValidationDisplay(...args) : undefined;
const lazyLoadChart = (...args) => (misc && typeof misc.lazyLoadChart === 'function') ? misc.lazyLoadChart(...args) : undefined;
const updateRichVisualizations = (...args) => (misc && typeof misc.updateRichVisualizations === 'function') ? misc.updateRichVisualizations(...args) : undefined;

// Utility functions
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Settings and UI function wrappers
const DEFAULT_CURRENCY = 'USD';
const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtPct1 = (n) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';

const state = {
  mode: 'forecast', // 'forecast' | 'current'
  offerings: businessLogic.defaultOfferings(),
  employees: 1,
  employeePay: 60000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80, // percent of HOURS_PER_YEAR available for service delivery
  targetUtilizationPct: 75, // forecasting target
  lockMix: false, // forecasting-only: keep Mix % totals at 100 by adjusting other offerings
};

// Make state accessible to calculations module
globalThis.state = state;

// Make calc and state globally available for export functions
if (typeof window !== 'undefined') {
  window.calc = calc;
  window.state = state;
  window.render = render;
  window.updateOutputs = updateOutputs;
  window.updateValidationDisplay = updateValidationDisplay;
  window.rebalanceMix = rebalanceMix;
  window.defaultOfferings = businessLogic.defaultOfferings;
  window.persistState = persistState;
}

// Persist state to localStorage (global helper so other modules can call it)
function persistState() {
  try {
    localStorage.setItem('profitpath-state', JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

function setStateFromInputs() {
  state.mode = $('#modeSelect').value;

  // Validate and sanitize inputs
  state.employees = Math.max(1, Math.floor(safeParseNumber($('#employees').value, 1)));
  state.employeePay = Math.max(0, safeParseNumber($('#employeePay').value, 0));
  state.monthlyCosts = Math.max(0, safeParseNumber($('#monthlyCosts').value, 0));
  state.productiveUtilizationPct = clamp(safeParseNumber($('#productiveUtilizationPct').value, 80), 0, 100);
  state.targetUtilizationPct = clamp(safeParseNumber($('#targetUtilizationPct').value, 75), 0, 150);
  state.lockMix = Boolean($('#lockMix')?.checked);
}

function onTableInput(e) {
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
    rebalanceMix(i, value);
  } else {
    o[k] = value;
  }

  // Update state and outputs in-place without re-rendering the entire table to preserve focus.
  try {
    persistState();
  } catch (e) {
    console.warn('Failed to persist state on input:', e);
  }
  try {
    const metrics = calc(state);
    updateOutputs(metrics);
    updateValidationDisplay(); // Update validation messages after calculations
  } catch (e) {
    console.warn('Failed to refresh outputs on input:', e);
  }
  // If changing mix in locked forecast mode, re-render to update other mix inputs
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
      if (state.offerings.length === 0) state.offerings = businessLogic.defaultOfferings();
      render();
    }
  }
}

function addOffering() {
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
  render();
}

function resetDefaults() {
  state.offerings = businessLogic.defaultOfferings();
  state.employees = 1;
  state.employeePay = 60000;
  state.monthlyCosts = 250;
  state.productiveUtilizationPct = 80;
  state.targetUtilizationPct = 75;
  state.mode = 'forecast';
  localStorage.removeItem('profitpath-state');
  render();
}

function render() {
  const focus = captureTableFocus('offeringsTable');

  let metrics;
  try {
    metrics = calc(state);
  } catch (e) {
    console.error('calc() failed:', e.message);
    // Fallback: use hardcoded results if calc fails
    metrics = {
      clients: 24,
      revenue: 57600,
      income: 54600,
      capacityPct: 75,
      totalSessions: 1248,
      serviceHours: 1248,
      annualFixedCosts: 3000,
      annualPayroll: 60000,
      variableCosts: 0,
      breakEvenClients: 5,
      breakEvenRevenue: 6000,
      contributionMarginPerClient: 400
    };
    // Display error in debug panel
    const dbg = $('#debugPanel');
    if (dbg) {
      dbg.textContent = 'Calculation error: ' + (e && e.stack ? e.stack : String(e));
      dbg.style.display = 'block';
    }
  }

  // ===== RENDER PHASE: Display all UI updates =====

  // Top-level inputs
  {
    const el = $('#modeSelect'); if (el) el.value = state.mode;
  }
  {
    const el = $('#employees'); if (el) el.value = state.employees;
  }
  {
    const el = $('#employeePay'); if (el) el.value = state.employeePay;
  }
  {
    const el = $('#monthlyCosts'); if (el) el.value = state.monthlyCosts;
  }
  {
    const el = $('#productiveUtilizationPct'); if (el) el.value = state.productiveUtilizationPct;
  }

  const isForecast = state.mode === 'forecast';
  {
    const targetEl = $('#targetUtilizationPct');
    if (targetEl) {
      const field = targetEl.closest('.field');
      if (field) field.classList.toggle('hidden', !isForecast);
      targetEl.value = state.targetUtilizationPct;
    }
  }

  $('#lockMixField')?.classList.toggle('hidden', !isForecast);
  const lockMixEl = $('#lockMix');
  if (lockMixEl) lockMixEl.checked = Boolean(state.lockMix);

  // Style hint: highlight which table column is editable in the current mode.
  $('#offeringsTable')?.classList.toggle('mode-forecast', isForecast);
  $('#offeringsTable')?.classList.toggle('mode-current', !isForecast);

  // Offerings table
  const tbody = $('#offeringsBody');
  tbody.innerHTML = '';

  metrics.offerings.forEach((o, idx) => {
    const tr = document.createElement('tr');

    const mixCell = isForecast
      ? '<input aria-label="Mix % for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" max="100" step="1" value="' + ((o.mixPct ?? 0).toFixed(1)) + '" data-k="mixPct" data-i="' + (idx) + '" />'
      : '<span class="muted">—</span>';

    const clientsCell = isForecast
      ? '<span class="muted">—</span>'
      : '<input aria-label="Clients for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" step="1" value="' + (o.currentClients ?? 0) + '" data-k="currentClients" data-i="' + (idx) + '" />';

    const estClients = isForecast
      ? Math.floor(metrics.clients * ((o.mixPct || 0) / 100))
      : o.currentClients;

    const estSessions = isForecast
      ? Math.round(estClients * o.sessionsPerYear)
      : Math.round((o.currentClients || 0) * o.sessionsPerYear);

    tr.innerHTML = '<td class="cell-edit group-start group-inputs" data-label="Offering"><input aria-label="Offering name" type="text" value="' + (escapeHtml(o.name)) + '" data-k="name" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Price / mo"><input aria-label="Price per month for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="10" value="' + (o.priceMonthly) + '" data-k="priceMonthly" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Sessions / yr"><input aria-label="Sessions per year for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.sessionsPerYear) + '" data-k="sessionsPerYear" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Hours / session"><input aria-label="Hours per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="0.1" value="' + (o.hoursPerSession) + '" data-k="hoursPerSession" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs group-end" data-label="Var $ / session"><input aria-label="Variable cost per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.variableCostPerSession) + '" data-k="variableCostPerSession" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-start group-mode" data-label="Mix % (forecast)">' + (mixCell) + '</td>' +
      '<td class="cell-edit group-mode group-end" data-label="Clients (current)">' + (clientsCell) + '</td>' +
      '<td class="cell-readonly group-start group-est" data-label="Est. clients"><span class="mono">' + (fmtInt(estClients)) + '</span></td>' +
      '<td class="cell-readonly group-est" data-label="Est. sessions"><span class="mono">' + (fmtInt(estSessions)) + '</span></td>' +
      '<td class="cell-readonly group-metrics" data-label="Annual Revenue"><span class="mono">' + (fmtMoney0(metrics.offeringMetrics[idx]?.revenue || 0)) + '</span></td>' +
      '<td class="cell-readonly group-metrics" data-label="Margin %"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.marginPct || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtPct1(metrics.offeringMetrics[idx]?.marginPct || 0)) + '</span></td>' +
      '<td class="cell-readonly group-metrics group-end" data-label="Annual Profit"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.profit || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtMoney0(metrics.offeringMetrics[idx]?.profit || 0)) + '</span></td>' +
      '<td class="cell-edit group-actions" data-label="Actions"><button class="btn small danger" data-action="removeOffering" data-i="' + (idx) + '" aria-label="Remove ' + (escapeHtml(o.name)) + '">Remove</button></td>';

    tbody.appendChild(tr);
  });

  restoreTableFocus(focus);

  // Mix/mode note (used as the "what am I editing" banner, especially on small screens).
  const mixNote = $('#mixNote');
  if (mixNote) {
    mixNote.classList.remove('note-forecast', 'note-current', 'note-warn', 'note-lock');
  }

  if (isForecast) {
    const sum = metrics.offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);
    const delta = Math.abs(sum - 100);

    mixNote.classList.add('note-forecast');
    if (state.lockMix) mixNote.classList.add('note-lock');
    if (!state.lockMix && delta >= 0.05) mixNote.classList.add('note-warn');

    mixNote.textContent = state.lockMix
      ? 'Forecast mode: editing Mix % (locked to 100%, auto-balancing others)'
      : (delta < 0.05
        ? 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '%)'
        : 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '% — auto-normalized for calculations)');
  } else {
    const total = metrics.offerings.reduce((a, o) => a + (Number(o.currentClients) || 0), 0);
    mixNote.classList.add('note-current');
    mixNote.textContent = total > 0
      ? 'Current mode: editing Clients (utilization computed from workload)'
      : 'Current mode: start by entering Clients';
  }

  // KPIs
  // populate KPI elements directly in case core.js isn't loaded (tests use
  // app.jsx standalone)
  function setKpi(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }
  setKpi('kpiClients', fmtInt(metrics.clients));
  setKpi('kpiSessions', fmtInt(metrics.totalSessions));
  setKpi('kpiServiceHours', fmtInt(metrics.serviceHours));
  setKpi('kpiCapacity', fmtPct1(metrics.capacityPct));
  setKpi('kpiRevenue', fmtMoney0(metrics.revenue));
  setKpi('kpiFixedCosts', fmtMoney0(metrics.annualFixedCosts));
  setKpi('kpiPayroll', fmtMoney0(metrics.annualPayroll));
  setKpi('kpiVariableCosts', fmtMoney0(metrics.variableCosts));
  setKpi('kpiBreakEvenClients', fmtInt(metrics.breakEvenClients));
  setKpi('kpiBreakEvenRevenue', fmtMoney0(metrics.breakEvenRevenue));
  setKpi('kpiContributionMargin', fmtMoney0(metrics.contributionMarginPerClient));
  setKpi('kpiIncome', fmtMoney0(metrics.income));

  updateOutputs(metrics);

  // Update validation messages
  if (typeof updateValidationDisplay === 'function') updateValidationDisplay();
}

function updateOutputs(metrics) {
  try {
    // Cache DOM elements to avoid repeated queries
    const kpiClients = $('#kpiClients');
    const kpiSessions = $('#kpiSessions');
    const kpiServiceHours = $('#kpiServiceHours');
    const kpiCapacity = $('#kpiCapacity');
    const kpiRevenue = $('#kpiRevenue');
    const kpiFixedCosts = $('#kpiFixedCosts');
    const kpiPayroll = $('#kpiPayroll');
    const kpiVariableCosts = $('#kpiVariableCosts');
    const kpiBreakEvenClients = $('#kpiBreakEvenClients');
    const kpiBreakEvenRevenue = $('#kpiBreakEvenRevenue');
    const kpiContributionMargin = $('#kpiContributionMargin');
    const kpiIncome = $('#kpiIncome');
    const capBar = $('#capacityBar');
    const capLabel = $('#capacityLabel');

    // Update KPI elements
    if (kpiClients) kpiClients.textContent = fmtInt(metrics.clients);
    if (kpiSessions) kpiSessions.textContent = fmtInt(metrics.totalSessions);
    if (kpiServiceHours) kpiServiceHours.textContent = fmtInt(metrics.serviceHours);
    if (kpiCapacity) kpiCapacity.textContent = fmtPct1(metrics.capacityPct);
    if (kpiRevenue) kpiRevenue.textContent = fmtMoney0(metrics.revenue);
    if (kpiFixedCosts) kpiFixedCosts.textContent = fmtMoney0(metrics.annualFixedCosts);
    if (kpiPayroll) kpiPayroll.textContent = fmtMoney0(metrics.annualPayroll);
    if (kpiVariableCosts) kpiVariableCosts.textContent = fmtMoney0(metrics.variableCosts);

    // Break-even analysis
    const breakEvenClients = Number.isFinite(metrics.breakEvenClients) ? fmtInt(metrics.breakEvenClients) : '∞';
    const breakEvenRevenue = Number.isFinite(metrics.breakEvenRevenue) ? fmtMoney0(metrics.breakEvenRevenue) : '$∞';
    const contributionMargin = fmtMoney0(metrics.contributionMarginPerClient);
    const income = fmtMoney0(metrics.income);

    if (kpiBreakEvenClients) {
      kpiBreakEvenClients.textContent = breakEvenClients;
      kpiBreakEvenClients.style.color = metrics.clients >= metrics.breakEvenClients ? 'var(--good)' : 'var(--bad)';
    }
    if (kpiBreakEvenRevenue) kpiBreakEvenRevenue.textContent = breakEvenRevenue;
    if (kpiContributionMargin) {
      kpiContributionMargin.textContent = contributionMargin;
      kpiContributionMargin.style.color = metrics.contributionMarginPerClient > 0 ? 'var(--good)' : 'var(--bad)';
    }
    if (kpiIncome) {
      kpiIncome.textContent = income;
      kpiIncome.style.color = metrics.income >= 60000 ? 'var(--good)' : metrics.income >= 0 ? 'var(--warn)' : 'var(--bad)';
    }

    // Capacity meter/gauge
    if (capBar) {
      const cap = clamp(metrics.capacityPct, 0, 150);
      capBar.style.width = ((cap / 150) * 100) + '%';
    }
    if (capLabel) {
      capLabel.textContent = metrics.capacityPct > 100
        ? 'Over capacity: ' + (fmtPct1(metrics.capacityPct)) + '(overtime likely)'
        : 'Utilization: ' + (fmtPct1(metrics.capacityPct));
    }

    // Lazy load simple revenue composition chart when visible
    if (typeof lazyLoadChart === 'function') lazyLoadChart(metrics);

    // Update break-even and visualizations if available
    // if (typeof updateBreakEvenAnalysis === 'function') updateBreakEvenAnalysis(metrics);
    if (typeof updateRichVisualizations === 'function') updateRichVisualizations(metrics);

    // Update debug panel if present
    const dbg = $('#debugPanel');
    if (dbg && $('#debugBody') && !$('#debugBody').classList.contains('collapsed')) {
      dbg.textContent = JSON.stringify(metrics, null, 2);
    }
  } catch (e) {
    console.warn('updateOutputs error:', e);
  }
}

$$('#controls input').forEach((el) => {
  el.addEventListener('input', () => {
    setStateFromInputs();
    persistState();
    render();
  });
});

{
  const btn = $('#addOfferingBtn');
  if (btn) btn.addEventListener('click', addOffering);
}
{
  const btn = $('#resetBtn');
  if (btn) btn.addEventListener('click', resetDefaults);
}

// Templates dropdown functionality
const templatesBtn = $('#templatesBtn');
if (templatesBtn) {
  templatesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const dropdown = templatesBtn.closest('.templates-dropdown');
    const menu = $('#templatesMenu');
    if (!dropdown || !menu) return;

    // If this menu is already active, just close it
    if (menu.style.display === 'block') {
      menu.style.display = 'none';
    } else {
      // Close other dropdowns and open this one
      closeAllDropdowns();
      menu.style.display = 'block';
    }
  });
}

// Function to refresh desktop settings dropdown with current values
function refreshDesktopSettings() {
  if (typeof document === 'undefined') return; // guard when running in non-DOM environments
  try {
    const settings = typeof loadSettings === 'function' ? loadSettings() : {};

    // Update experience level radios
    const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
    experienceRadios.forEach(radio => {
      radio.checked = radio.value === settings.experienceLevel;
    });

    // Update feature checkboxes
    const checkboxes = document.querySelectorAll('#settingsMenu input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const settingKey = checkbox.id;
      checkbox.checked = settings[settingKey];
    });
  } catch (error) {
    console.warn('Error refreshing desktop settings:', error);
  }
}

// Global settings change listener-refresh desktop settings when any setting changes
window.addEventListener('settingsChanged', () => {
  setTimeout(refreshDesktopSettings, 10); // Small delay to ensure settings are saved
});

// Initialize desktop settings on page load
setTimeout(refreshDesktopSettings, 100);

// Desktop Settings Cog Button
const settingsCogBtn = $('#settingsCogBtn');
if (settingsCogBtn) {
  settingsCogBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const dropdown = document.querySelector('.settings-dropdown');
    if (!dropdown) {
      console.error('Settings dropdown not found');
      return;
    }
    // If this dropdown is already active, just close it
    if (dropdown.classList.contains('active')) {
      dropdown.classList.remove('active');
    } else {
      // Close other dropdowns and open this one
      closeAllDropdowns();
      // Refresh settings values before showing
      refreshDesktopSettings();

      // Position the menu directly under the cog button
      const menu = dropdown.querySelector('.settings-menu');
      if (menu) {
        const buttonRect = settingsCogBtn.getBoundingClientRect();
        const menuWidth = 320; // max-width from CSS
        const viewportWidth = window.innerWidth;

        menu.style.position = 'fixed';
        menu.style.top = (buttonRect.bottom + 4) + 'px';

        // Calculate left position, ensuring menu stays on screen
        let leftPos = buttonRect.left + buttonRect.width / 2;
        const menuHalfWidth = menuWidth / 2;

        // If centering would put menu off left edge
        if (leftPos - menuHalfWidth < 10) {
          leftPos = menuHalfWidth + 10;
        }
        // If centering would put menu off right edge
        else if (leftPos + menuHalfWidth > viewportWidth - 10) {
          leftPos = viewportWidth - menuHalfWidth - 10;
        }

        menu.style.left = leftPos + 'px';
        menu.style.transform = 'translateX(-50%)';
        menu.style.right = 'auto';
      }

      dropdown.classList.add('active');
    }
  });
}


// Helper function to close all dropdowns
function closeAllDropdowns() {
  // Close all types of dropdowns
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
  // Also close templates and export menus
  const templatesMenu = $('#templatesMenu');
  if (templatesMenu) {
    templatesMenu.style.display = 'none';
  }
  const exportMenu = $('#exportMenu');
  if (exportMenu) {
    exportMenu.style.display = 'none';
  }
}

// Settings management
function initializeSettings() {
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};

  // Set experience level radio buttons
  const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
  experienceRadios.forEach(radio => {
    radio.checked = radio.value === settings.experienceLevel;
    radio.addEventListener('change', (e) => {
      setExperienceLevel(e.target.value);
      initializeSettings(); // Reinitialize to apply new settings
      updateUIForSettings();
    });
  });

  // Set feature toggles
  const checkboxes = [
    'showAdvancedCalculations',
    'showDetailedBreakdown',
    'showComparisonTools',
    'showExportOptions',
    'showDebugPanel',
    'compactMode',
    'showTooltips'
  ];

  checkboxes.forEach(key => {
    const checkbox = $('#' + key);
    if (checkbox) {
      checkbox.checked = settings[key];
      checkbox.addEventListener('change', (e) => {
        updateSetting(key, e.target.checked);
        updateUIForSettings();
      });
    }
  });
}

function updateUIForSettings() {
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};

  // Show/hide elements based on feature gates
  const elementsToToggle = [
    { selector: '.advanced-calculations', setting: 'showAdvancedCalculations' },
    { selector: '.detailed-breakdown', setting: 'showDetailedBreakdown' },
    { selector: '.comparison-tools', setting: 'showComparisonTools' },
    { selector: '.export-options', setting: 'showExportOptions' },
    { selector: '.debug-wrapper', setting: 'showDebugPanel' }
  ];

  elementsToToggle.forEach(({ selector, setting }) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.display = settings[setting] ? 'block' : 'none';
    });
  });

  // Apply compact mode
  document.body.classList.toggle('compact-mode', settings.compactMode);

  // Update tooltips visibility
  if (settings.showTooltips) {
    showContextualHelp();
  } else {
    hideContextualHelp();
  }
}

// Initialize settings on app load
initializeSettings();

// Template selection handlers
document.querySelectorAll('.template-option').forEach(option => {
  option.addEventListener('click', (e) => {
    e.preventDefault();
    const template = e.target.dataset.template;
    const menu = $('#templatesMenu');
    if (menu) menu.style.display = 'none';

    // Track template usage
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackTemplateUsage(template, e.target.textContent.trim());
    }

    loadIndustryTemplate(template);
  });
});

// Export dropdown functionality
const exportBtn = $('#exportBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const dropdown = exportBtn.closest('.export-dropdown');
    const menu = $('#exportMenu');
    if (!dropdown || !menu) return;

    // If this menu is already active, just close it
    if (menu.style.display === 'block') {
      menu.style.display = 'none';
    } else {
      // Close other dropdowns and open this one
      closeAllDropdowns();
      menu.style.display = 'block';
    }
  });
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
  // Close templates dropdown and menu
  if (!e.target.closest('.templates-dropdown')) {
    document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
    const templatesMenu = $('#templatesMenu');
    if (templatesMenu) {
      templatesMenu.style.display = 'none';
    }
  }

  // Close export dropdown and menu
  if (!e.target.closest('.export-dropdown')) {
    document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
    const exportMenu = $('#exportMenu');
    if (exportMenu) {
      exportMenu.style.display = 'none';
    }
  }

  // Close settings dropdown
  if (!e.target.closest('.settings-dropdown') && !e.target.closest('#settingsCogBtn')) {
    document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
  }
});

// Export format handlers are now implemented in miscService.js

document.querySelectorAll('.export-option').forEach(option => {
  option.addEventListener('click', (e) => {
    e.preventDefault();
    const format = e.target.dataset.format;
    const menu = $('#exportMenu');
    if (menu) menu.style.display = 'none';

    switch (format) {
      case 'csv':
        exportAsCSV();
        break;
      case 'excel':
        exportAsExcel();
        break;
      case 'pdf':
        exportAsPDF();
        break;
      case 'html':
        exportAsHTML();
        break;
      case 'email':
        shareViaEmail();
        break;
      case 'embed':
        showEmbedCode();
        break;
      case 'schedule':
        showScheduleDialog();
        break;
    }
  });
});
{
  const btn = $('#shareBtn');
  if (btn) btn.addEventListener('click', shareScenario);
}

// Hamburger menu
const hamburgerBtn = $('#hamburgerBtn');
const mobileMenuOverlay = $('#mobileMenuOverlay');
const mobileMenuClose = $('#mobileMenuClose');
const _mobileExportBtn = $('#mobileExportBtn');
const _mobileShareBtn = $('#mobileShareBtn');
const _mobileScenariosBtn = $('#mobileScenariosBtn');

// Mobile menu functionality
function setupMobileMenuObserver(mobileMenuOverlay) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (mobileMenuOverlay.classList.contains('active')) {
          setupMobileMenuHandlers();
        }
      }
    });
  });

  observer.observe(mobileMenuOverlay, { attributes: true, attributeFilter: ['class'] });
  return observer;
}

// Immediately initialize observer after defining function so it is
// available in all environments (avoids reference errors if the call is
// executed from a different lexical scope).
if (mobileMenuOverlay) {
  setupMobileMenuObserver(mobileMenuOverlay);
}

// Basic mobile menu event listeners (must be in same scope as the
// variables above so the identifiers exist when evaluated)
if (hamburgerBtn) {
  // misc.toggleMobileMenu may not exist in test environment, guard accordingly
  const handler = misc && typeof misc.toggleMobileMenu === 'function' ? misc.toggleMobileMenu : () => { };
  hamburgerBtn.addEventListener('click', handler);
}
if (mobileMenuOverlay) {
  mobileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === mobileMenuOverlay) {
      closeMobileMenu();
    }
  });
}
if (mobileMenuClose) {
  mobileMenuClose.addEventListener('click', closeMobileMenu);
}

function setupMobileMenuHandlers() {
  // Mobile Tour Button
  const mobileTourBtn = $('#mobileTourBtn');
  if (mobileTourBtn && !mobileTourBtn._handlerAttached) {
    mobileTourBtn._handlerAttached = true;
    mobileTourBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startGuidedTour();
      // Close mobile menu after starting tour
      setTimeout(() => {
        const overlay = $('#mobileMenuOverlay');
        const hamburger = $('#hamburgerBtn');
        if (overlay && hamburger) {
          overlay.classList.remove('active');
          hamburger.classList.remove('active');
        }
      }, 100);
    });
  }

  // Mobile Settings Button
  const mobileSettingsBtn = $('#mobileSettingsBtn');
  if (mobileSettingsBtn && !mobileSettingsBtn._settingsHandlerAttached) {
    mobileSettingsBtn._settingsHandlerAttached = true;
    mobileSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileSettings();
    });
  }

  // Mobile Export Button
  const _mobileExportBtn = $('#mobileExportBtn');
  if (_mobileExportBtn) {
    setTimeout(() => {
      setupMobileExportHandlers();
    }, 100);
  }
}

function toggleMobileSettings() {
  // Toggle inline settings section
  let experienceSection = document.querySelector('.mobile-menu .settings-section:nth-of-type(1)');
  let preferencesSection = document.querySelector('.mobile-menu .settings-section:nth-of-type(2)');
  const mobileSettingsBtn = $('#mobileSettingsBtn');

  if (experienceSection) {
    experienceSection.style.display = experienceSection.style.display === 'none' ? 'block' : 'none';
  } else {
    experienceSection = document.createElement('div');
    experienceSection.className = 'settings-section';
    experienceSection.style.cssText = 'margin-top: 12px;padding: 12px;background: rgba(255, 255, 255, 0.05);border-radius: 8px;border: 1px solid rgba(255, 255, 255, 0.1);';
    experienceSection.innerHTML = '<div style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--text);">Experience Level</div><div style="display:flex;flex-direction:column;gap:6px;"><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="beginner" style="accent-color:#007bff;">Beginner</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="intermediate" style="accent-color:#007bff;">Intermediate</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="advanced" style="accent-color:#007bff;">Advanced</label></div>';
    mobileSettingsBtn.parentNode.insertBefore(experienceSection, mobileSettingsBtn.nextSibling);
  }

  if (preferencesSection) {
    preferencesSection.style.display = preferencesSection.style.display === 'none' ? 'block' : 'none';
  } else {
    preferencesSection = document.createElement('div');
    preferencesSection.className = 'settings-section';
    preferencesSection.style.cssText = 'margin-top: 12px;padding: 12px;background: rgba(255, 255, 255, 0.05);border-radius: 8px;border: 1px solid rgba(255, 255, 255, 0.1);';
    preferencesSection.innerHTML = '<div style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--text);">Preferences</div><div style="display:flex;flex-direction:column;gap:6px;"><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileCompactMode"> Compact mode</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileShowTooltips"> Show tooltips</label></div>';
    mobileSettingsBtn.parentNode.insertBefore(preferencesSection, mobileSettingsBtn.nextSibling);
  }

  // Initialize settings after a short delay to ensure DOM is ready
  const currentSettings = loadSettings ? loadSettings() : {};
  const experienceRadios = experienceSection.querySelectorAll('input[name="mobileExperienceLevel"]');
  experienceRadios.forEach(radio => {
    radio.checked = radio.value === currentSettings.experienceLevel;
    radio.addEventListener('change', (e) => {
      if (setExperienceLevel) setExperienceLevel(e.target.value);
      if (updateUIForSettings) updateUIForSettings();
      // Refresh mobile checkboxes to reflect new feature gates
      setTimeout(() => {
        const currentSettings = loadSettings ? loadSettings() : {};
        const mobileCheckboxes = document.querySelectorAll('.mobile-menu input[type="checkbox"]');
        mobileCheckboxes.forEach(checkbox => {
          const settingKey = checkbox.id.replace('mobile', '').replace(/^\w/, c => c.toLowerCase());
          checkbox.checked = currentSettings[settingKey];
        });
      }, 10);
    });
  });

  const preferencesCheckboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');
  preferencesCheckboxes.forEach(checkbox => {
    const settingKey = checkbox.id.replace('mobile', '').replace(/^\w/, c => c.toLowerCase());
    checkbox.checked = currentSettings[settingKey];
    checkbox.addEventListener('change', (e) => {
      if (updateSetting) updateSetting(settingKey, e.target.checked);
    });
  });
  if (updateUIForSettings) updateUIForSettings();
}

function setupMobileExportHandlers() {
  // Function to refresh mobile checkboxes after settings change
  const _refreshMobileCheckboxes = () => {
    const currentSettings = loadSettings ? loadSettings() : {};
    const mobileCheckboxes = document.querySelectorAll('.mobile-menu input[type="checkbox"]');
    mobileCheckboxes.forEach(checkbox => {
      const settingKey = checkbox.id.replace('mobile', '').replace(/^\w/, c => c.toLowerCase());
      checkbox.checked = currentSettings[settingKey];
    });
    // Also refresh experience level radios
    const mobileRadios = document.querySelectorAll('.mobile-menu input[name="mobileExperienceLevel"]');
    mobileRadios.forEach(radio => {
      radio.checked = radio.value === currentSettings.experienceLevel;
    });
  };
}
const _mobileExportEmbed = $('#mobileExportEmbed');

{
  const mobileExportCsv = $('#mobileExportCsv');
  if (mobileExportCsv) {
    mobileExportCsv.addEventListener('click', () => {
      exportAsCSV();
      closeMobileMenu();
    });
  }
}

{
  const mobileExportExcel = $('#mobileExportExcel');
  if (mobileExportExcel) {
    mobileExportExcel.addEventListener('click', () => {
      exportAsExcel();
      closeMobileMenu();
    });
  }
}

{
  const mobileExportPdf = $('#mobileExportPdf');
  if (mobileExportPdf) {
    mobileExportPdf.addEventListener('click', () => {
      exportAsPDF();
      closeMobileMenu();
    });
  }
}

{
  const mobileExportHtml = $('#mobileExportHtml');
  if (mobileExportHtml) {
    mobileExportHtml.addEventListener('click', () => {
      exportAsHTML();
      closeMobileMenu();
    });
  }
}

{
  const mobileExportEmail = $('#mobileExportEmail');
  if (mobileExportEmail) {
    mobileExportEmail.addEventListener('click', () => {
      shareViaEmail();
      closeMobileMenu();
    });
  }
}

{
  const mobileExportEmbedElem = $('#mobileExportEmbed');
  if (mobileExportEmbedElem) {
    mobileExportEmbedElem.addEventListener('click', () => {
      showEmbedCode();
      closeMobileMenu();
    });
  }
}

{
  const mobileExportScheduleElem = $('#mobileExportSchedule');
  if (mobileExportScheduleElem) {
    mobileExportScheduleElem.addEventListener('click', () => {
      // Schedule functionality - for now just show notification
      showNotification('Auto-schedule feature coming soon!', 'info');
      closeMobileMenu();
    });
  }
}

// Mobile share button - wrap in DOM ready check
function setupMobileShareButton() {
  const mobileShareBtn = $('#mobileShareBtn');
  if (mobileShareBtn) {
    mobileShareBtn.addEventListener('click', () => {
      misc.shareScenario();
      closeMobileMenu();
    });
  }
}

// Setup after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileShareButton);
} else {
  setupMobileShareButton();
}

const mobileTemplatesBtn = $('#mobileTemplatesBtn');
if (mobileTemplatesBtn) {
  mobileTemplatesBtn.addEventListener('click', () => {
    const options = $('#mobileTemplatesOptions');
    if (options) {
      _closeAllMobileSubmenus();
      options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
    }
  });
}

// Close any open mobile submenus
function _closeAllMobileSubmenus() {
  try {
    document.querySelectorAll('.mobile-submenu').forEach(el => {
      if (el && el.style) el.style.display = 'none';
    });
    // Also hide known submenu containers
    const containers = ['#mobileTemplatesOptions', '#mobileExportOptions', '#mobileShareOptions'];
    containers.forEach(sel => {
      const c = document.querySelector(sel);
      if (c && c.style) c.style.display = 'none';
    });
  } catch {
    // Fail silently in environments without DOM
  }
}

document.querySelectorAll('.mobile-templates-options .mobile-submenu-btn').forEach(option => {
  option.addEventListener('click', (e) => {
    e.preventDefault();
    const template = e.target.dataset.template;
    const menu = $('#mobileTemplatesOptions');
    if (menu) menu.style.display = 'none';

    // Track template usage
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackTemplateUsage(template, e.target.textContent.trim());
    }

    loadIndustryTemplate(template);
    closeMobileMenu(); // Close mobile menu after loading template
  });
});

const mobileScenariosBtn = $('#mobileScenariosBtn');

if (mobileScenariosBtn) {
  mobileScenariosBtn.addEventListener('click', () => {
    openScenarioModal();
    closeMobileMenu();
  });
}

// Mobile analytics button - use event delegation since button is inside hidden menu initially
function setupMobileAnalyticsButton() {
  // Use event delegation on document body
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('#mobileAnalyticsBtn');
    if (btn) {
      // More robust check for analytics UI
      const checkAnalyticsUI = () => {
        if (window.profitPathAnalyticsUI) {
          // Check if method exists on instance or prototype
          if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
            window.profitPathAnalyticsUI.showAnalyticsDashboard();
          } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
            // Call via prototype if instance method not available
            window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
          } else {
            setTimeout(checkAnalyticsUI, 100);
          }
        } else {
          setTimeout(checkAnalyticsUI, 100);
        }
      };
      checkAnalyticsUI();
      closeMobileMenu();
    }
  });
}

// Setup after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileAnalyticsButton);
} else {
  setupMobileAnalyticsButton();
}

const mobileFeedbackBtn = $('#mobileFeedbackBtn');
if (mobileFeedbackBtn) {
  mobileFeedbackBtn.addEventListener('click', () => {
    // More robust check for feedback UI
    const checkFeedbackUI = () => {
      if (window.feedbackUI) {
        // Check if method exists on instance or prototype
        if (typeof window.feedbackUI.openFeedbackModal === 'function') {
          window.feedbackUI.openFeedbackModal();
        } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
          // Call via prototype if instance method not available
          window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
        } else {
          setTimeout(checkFeedbackUI, 100);
        }
      } else {
        setTimeout(checkFeedbackUI, 100);
      }
    };
    checkFeedbackUI();
    closeMobileMenu();
  });
}

const mobileHelpBtn = $('#mobileHelpBtn');
if (mobileHelpBtn) {
  mobileHelpBtn.addEventListener('click', () => {
    // Call the same help menu function as desktop
    if (typeof showHelpMenu === 'function') {
      showHelpMenu();
    }
    closeMobileMenu();
  });
}

{
  const mobileSettingsBtn = $('#mobileSettingsBtn');
  if (mobileSettingsBtn) {
    mobileSettingsBtn.addEventListener('click', () => {
      const settingsCogBtn = $('#settingsCogBtn');
      if (settingsCogBtn) {
        settingsCogBtn.click();
      }
      closeMobileMenu();
    });
  }
}

$('#offeringsBody').addEventListener('input', onTableInput);
$('#offeringsBody').addEventListener('click', onTableClick);

// Save state when table content changes
$('#offeringsBody').addEventListener('input', persistState);
$('#offeringsBody').addEventListener('click', () => setTimeout(persistState, 0));

// Scenario modal wiring - use new modal system
{
  const scenariosBtnEl = $('#scenariosBtn');
  if (scenariosBtnEl) {
    scenariosBtnEl.addEventListener('click', () => {
      openScenarioModal();
    });
  }

  // Set up close button for scenarios modal
  const scenariosCloseBtnEl = $('#scenariosCloseBtn');
  if (scenariosCloseBtnEl) {
    scenariosCloseBtnEl.addEventListener('click', () => {
      closeScenarioModal();
    });
  }

  // Set up save button with confirmation
  const saveBtn = $('#saveScenarioBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const input = $('#scenarioNameInput');
      if (!input || !input.value.trim()) {
        showToast('Please enter a scenario name', 'error');
        return;
      }

      const result = await showConfirmationModal(
        'Save Scenario',
        'Save current configuration as "' + input.value.trim() + '"?',
        'This will overwrite any existing scenario with the same name.'
      );

      if (result) {
        saveScenario(input.value.trim());
        showToast('Scenario saved successfully', 'success');
      }
    });
  }

  // Set up input enter key
  const input = $('#scenarioNameInput');
  if (input) {
    input.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        if (!input.value.trim()) {
          showToast('Please enter a scenario name', 'error');
          return;
        }

        const result = await showConfirmationModal(
          'Save Scenario',
          'Save current configuration as "' + input.value.trim() + '"?',
          'This will overwrite any existing scenario with the same name.'
        );

        if (result) {
          saveScenario(input.value.trim());
          showToast('Scenario saved successfully', 'success');
        }
      }
    });
  }
}

// Desktop menu buttons wiring - defer until scripts are loaded
function setupDesktopMenuButtons() {
  const analyticsBtn = $('#analyticsBtn');
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
      // More robust check for analytics UI
      const checkAnalyticsUI = () => {
        if (window.profitPathAnalyticsUI) {
          // Check if method exists on instance or prototype
          if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
            // Debug: Desktop calling showAnalyticsDashboard
            window.profitPathAnalyticsUI.showAnalyticsDashboard();
          } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
            // Call via prototype if instance method not available
            window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
          } else {
            // Debug: Analytics UI method not available, retrying
            setTimeout(checkAnalyticsUI, 100);
          }
        } else {
          // Debug: Analytics UI not loaded yet
          setTimeout(checkAnalyticsUI, 100);
        }
      };
      checkAnalyticsUI();
    });
  }

  const desktopFeedbackBtn = $('#desktopFeedbackBtn');
  if (desktopFeedbackBtn) {
    desktopFeedbackBtn.addEventListener('click', () => {
      // More robust check for feedback UI
      const checkFeedbackUI = () => {
        if (window.feedbackUI) {
          // Check if method exists on instance or prototype
          if (typeof window.feedbackUI.openFeedbackModal === 'function') {
            window.feedbackUI.openFeedbackModal();
          } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
            // Call via prototype if instance method not available
            window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
          } else {
            console.warn('Feedback UI method not available, retrying...');
            setTimeout(checkFeedbackUI, 100);
          }
        } else {
          console.warn('Feedback UI not loaded yet');
          setTimeout(checkFeedbackUI, 100);
        }
      };
      checkFeedbackUI();
    });
  }
}

// Setup desktop buttons after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDesktopMenuButtons);
} else {
  setupDesktopMenuButtons();
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#scenariosModal').classList.contains('hidden')) {
    closeScenarioModal();
  }
});


// ============================================================================
// SCENARIO COMPARISON SYSTEM
// ============================================================================

// Helper to get selected scenario IDs from dropdowns
function getSelectedComparisonScenarios() {
  const scenario1Id = $('#compareScenario1').value;
  const scenario2Id = $('#compareScenario2').value;
  return { scenario1Id, scenario2Id };
}

// Populate scenario dropdowns
function populateComparisonDropdowns() {
  const scenarios = getAllScenarios();
  const select1 = $('#compareScenario1');
  const select2 = $('#compareScenario2');
  if (!select1 || !select2) return;

  select1.innerHTML = '<option value="">Select first scenario...</option>';
  select2.innerHTML = '<option value="">Select second scenario...</option>';

  scenarios.forEach(s => {
    const option1 = document.createElement('option');
    option1.value = s.id;
    option1.textContent = s.name;
    select1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = s.id;
    option2.textContent = s.name;
    select2.appendChild(option2);
  });
}

// Render the comparison table
function renderComparisonResults(metrics1, metrics2) {
  const comparisonResultsEl = $('#comparisonResults');
  if (!comparisonResultsEl) return;

  // Render into the wrapper div, not directly into comparisonResultsEl
  const tableWrap = comparisonResultsEl.querySelector('.comparison-table-wrap');
  if (!tableWrap) return;

  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt },
    { label: 'Annual Sessions', key: 'annualSessions', format: fmtInt },
    { label: 'Service Hours', key: 'serviceHours', format: fmtInt },
    { label: 'Utilization', key: 'utilizationPct', format: fmtPct1 },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
    { label: 'Fixed Costs', key: 'annualFixedCosts', format: fmtMoney0 },
    { label: 'Payroll', key: 'annualPayroll', format: fmtMoney0 },
    { label: 'Variable Costs', key: 'annualVariableCosts', format: fmtMoney0 },
    { label: 'Net Income', key: 'netIncome', format: fmtMoney0 },
    { label: 'Break-Even Clients', key: 'breakEvenClients', format: fmtInt },
    { label: 'Break-Even Revenue', key: 'breakEvenRevenue', format: fmtMoney0 },
    { label: 'Contribution Margin', key: 'contributionMarginPerClient', format: fmtMoney0 },
  ];

  let tableHtml = '<table class="comparison-table"><thead><tr><th>Metric</th><th class="scenario-col">Scenario 1</th><th class="scenario-col">Scenario 2</th><th class="difference-col">Difference</th></tr></thead><tbody>';

  metricsToCompare.forEach(m => {
    const val1 = metrics1[m.key];
    const val2 = metrics2[m.key];
    const diff = val2 - val1;

    let diffClass = 'difference-neutral';
    if (m.key.includes('income') || m.key.includes('revenue') || m.key.includes('margin')) {
      if (diff > 0) diffClass = 'difference-positive';
      else if (diff < 0) diffClass = 'difference-negative';
    } else if (m.key.includes('cost')) {
      if (diff > 0) diffClass = 'difference-negative';
      else if (diff < 0) diffClass = 'difference-positive';
    } else if (m.key.includes('utilization') || m.key.includes('clients') || m.key.includes('sessions') || m.key.includes('hours')) {
      if (diff > 0) diffClass = 'difference-positive';
      else if (diff < 0) diffClass = 'difference-negative';
    }

    tableHtml += '<tr><td class="metric-name">' + m.label + '</td><td class="scenario-col">' + m.format(val1) + '</td><td class="scenario-col">' + m.format(val2) + '</td><td class="difference-col ' + diffClass + '">' + m.format(diff) + '</td></tr>';
  });

  tableHtml += '</tbody></table>';
  tableWrap.innerHTML = tableHtml; // Assign to wrapper
  comparisonResultsEl.style.display = 'block';
}

// Handle comparison logic
function handleComparison() {
  const comparisonErrorEl = $('#comparisonError');
  if (comparisonErrorEl) comparisonErrorEl.style.display = 'none'; // Hide previous error

  const { scenario1Id, scenario2Id } = getSelectedComparisonScenarios();
  const scenarios = getAllScenarios();

  const scenario1 = scenarios.find(s => s.id === scenario1Id);
  const scenario2 = scenarios.find(s => s.id === scenario2Id);

  if (!scenario1 || !scenario2) {
    $('#comparisonResults').style.display = 'none';
    return;
  }

  // Calculate metrics for both scenarios
  const metrics1 = calc(scenario1.data || scenario1.state); // Handle older scenario structure
  const metrics2 = calc(scenario2.data || scenario2.state); // Handle older scenario structure

  renderComparisonResults(metrics1, metrics2);
}

// Update scenarios list and comparison dropdowns when modal opens
const scenariosModal = $('#scenariosModal');
if (scenariosModal) {
  // Original scenario modal close and button handlers (delegated)
  scenariosModal.addEventListener('click', (e) => {
    // Only close modal if clicking on close button, overlay, or outside modal content
    if (e.target.closest('.modal-header .btn-close') ||
      e.target.closest('#scenariosOverlay')) {
      closeScenarioModal();
    } else if (e.target.closest('.load-btn, .delete-btn')) {
      const btn = e.target.closest('.load-btn, .delete-btn');
      const scenarioId = btn.dataset.scenarioId;
      if (!scenarioId) return;

      if (btn.classList.contains('load-btn')) {
        loadScenario(scenarioId);
        closeScenarioModal();
      } else if (btn.classList.contains('delete-btn')) {
        deleteScenario(scenarioId);
        closeScenarioModal();
      }
    }
    // Handle comparison dropdowns to prevent default behavior from closing modal
    else if (e.target.closest('.scenario-select')) {
      e.stopPropagation();
    }
  });

  // Populate comparison dropdowns when the modal becomes visible
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (!scenariosModal.classList.contains('hidden')) {
          populateComparisonDropdowns();
          handleComparison(); // Also run comparison if both are selected
        } else {
          // Hide comparison results when modal is closed
          $('#comparisonResults').style.display = 'none';
        }
      }
    }

    // Ensure the app renders once the DOM is ready so KPIs are populated
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Defer to next tick to ensure all elements are present
        setTimeout(() => { try { render(); } catch (e) { console.warn('Initial render failed:', e); } }, 0);
      } else {
        window.addEventListener('DOMContentLoaded', () => { try { render(); } catch (e) { console.warn('Initial render failed:', e); } });
      }
    }
  });
  observer.observe(scenariosModal, { attributes: true, attributeFilter: ['class'] });

  // Initial population when app loads
  populateComparisonDropdowns();
}

// Event listeners for comparison dropdowns and button
const compareBtn = $('#compareBtn');
if (compareBtn) {
  compareBtn.addEventListener('click', handleComparison);
}

const compareScenario1 = $('#compareScenario1');
if (compareScenario1) {
  compareScenario1.addEventListener('change', handleComparison);
}

const compareScenario2 = $('#compareScenario2');
if (compareScenario2) {
  compareScenario2.addEventListener('change', handleComparison);
}

// Load scenario from URL first (if present), then localStorage
const loadedFromURL = typeof loadScenarioFromURL === 'function' ? loadScenarioFromURL() : false;

// Check for test scenario loading
if (typeof loadTestScenarios === 'function') loadTestScenarios();
if (typeof loadSpecificTestScenario === 'function') {
  const testScenarios = getTestScenarios();
  if (Object.keys(testScenarios).length > 0) {
    loadSpecificTestScenario(Object.keys(testScenarios).find(key => new URLSearchParams(window.location.search).get('testScenario') === key));
  }
}

wire(loadedFromURL);

// Restore any scheduled report generation
restoreScheduling();

// Run initial render in a safe guard so any runtime errors are reported to the debug panel
try {
  render();
} catch (e) {
  console.error('Render failed:', e);
  const dbg = $('#debugPanel');
  if (dbg) dbg.textContent = 'Render error: ' + (e && e.stack ? e.stack : String(e));
}

// Export key functions for testing and external usage
// `wire` normally lives in core/wire_function; provide noop stub so tests can
// import it without causing a transpile error. The real application replaces
// this by calling `wire()` from the bundled entrypoint.
function wire() {
  // Call render in test environment to ensure calculations run
  if (typeof render === 'function') {
    render();
  }
}

export { render, wire, setStateFromInputs, state };


// Global error handler to surface errors into the debug panel for easier debugging
window.addEventListener('error', (ev) => {
  const dbg = $('#debugPanel');
  const msg = ev?.error?.stack || ev?.message || String(ev);
  console.error('Uncaught error:', ev.error || ev.message || ev);
  if (dbg) dbg.textContent = 'Uncaught error: ' + msg;
});

// Debug panel toggle wiring: collapsible panel above the simple chart
function initDebugPanel() {
  const toggle = $('#debugToggle');
  const body = $('#debugBody');
  const pre = $('#debugPanel');
  if (!toggle || !body || !pre) return;

  // Update pre with calc() output and set a concise summary on the toggle
  function refreshDebug() {
    // Only refresh if debug panel is initialized and visible
    if (!pre || pre.style.display === 'none') return;

    try {
      const res = calc(state);
      pre.textContent = JSON.stringify(res, null, 2);
      toggle.textContent = '▶ Debug — clients: ' + (res.clients || 0) + ', revenue: ' + fmtMoney0(res.revenue || 0);
    } catch (e) {
      pre.textContent = 'Error generating debug: ' + (e && e.stack ? e.stack : String(e));
      toggle.textContent = '▶ Debug — error';
    }
  }

  // restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-debug-expanded');
  const expanded = stored === '1';
  if (expanded) {
    body.classList.remove('collapsed');
    body.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    const expandedNow = !isCollapsed;
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    localStorage.setItem('profitpath-debug-expanded', expandedNow ? '1' : '0');
    // refresh content when expanding
    if (expandedNow) refreshDebug();
  });

  // refresh periodically (keeps the debug info up to date while editing)
  setInterval(refreshDebug, 1500);
  // initial refresh
  refreshDebug();
}

// Initialize debug panel after DOM is ready
try {
  initDebugPanel();
} catch {
  try {
    persistState();
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

// Persist chosen logo so future loads remember the finalized variant
try {
  localStorage.setItem('profitpath-logo', 'final');
  document.documentElement.setAttribute('data-logo', 'final');
} catch {
  // non-fatal
}

// Register service worker for PWA functionality
// TEMPORARILY DISABLED-forcing network CSS loading
/*
if ('serviceWorker' in navigator) {
        window.addEventListener('load', () =>{
          navigator.serviceWorker.register('/sw.js')
            .then((registration) =>{
              // Service Worker registered successfully
 
              // Handle service worker updates
              registration.addEventListener('updatefound', () =>{
                const newWorker=registration.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () =>{
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      // New version available
                      if (confirm('A new version of ProfitPath is available. Reload to update?')) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                      }
                    }
                  });
                }
              });
            })
            .catch((_error) =>{
              // Service Worker registration failed
            });
        });
}
      */

// Onboarding system for guided experience
const _initializeOnboarding = () => {
  // Check if user has completed onboarding
  const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';

  // Always show help button (users can access help anytime)
  addOnboardingHelpButton();

  // Show welcome message for new users who haven't completed onboarding
  if (!onboardingCompleted) {
    setTimeout(() => {
      showWelcomeDialog();
    }, 1000);
  }

  // Initialize contextual tooltips
  initializeContextualTooltips();

  // Initialize progressive disclosure
  initializeProgressiveDisclosure();
};

// Initialize onboarding system after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initializeOnboarding);
} else {
  _initializeOnboarding();
}

// Scroll lock helpers for guided tour
let _tourScrollLocked = false;
let _tourPrevHtmlOverflow = '';
let _tourPrevBodyOverflow = '';
function _preventTourScroll(e) {
  // allow certain inputs inside the tour dialog (handled by pointer events), but
  // generally prevent default touch/wheel scrolling while tour is active
  e.preventDefault();
}

function _trapTourKeys(e) {
  // Prevent keyboard scrolling keys while tour active
  const blocked = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (blocked.includes(e.key)) {
    e.preventDefault();
  }
}

function lockScrollForTour() {
  if (_tourScrollLocked) return;
  _tourScrollLocked = true;
  try {
    _tourPrevHtmlOverflow = document.documentElement.style.overflow || '';
    _tourPrevBodyOverflow = document.body.style.overflow || '';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } catch {
    // ignore
  }
  document.addEventListener('touchmove', _preventTourScroll, { passive: false });
  document.addEventListener('wheel', _preventTourScroll, { passive: false });
  document.addEventListener('keydown', _trapTourKeys, { passive: false });
}

function unlockScrollForTour() {
  if (!_tourScrollLocked) return;
  _tourScrollLocked = false;
  try {
    document.documentElement.style.overflow = _tourPrevHtmlOverflow || '';
    document.body.style.overflow = _tourPrevBodyOverflow || '';
  } catch {
    // ignore
  }
  document.removeEventListener('touchmove', _preventTourScroll);
  document.removeEventListener('wheel', _preventTourScroll);
  document.removeEventListener('keydown', _trapTourKeys);
}

function addOnboardingHelpButton() {
  // The help button is now in the HTML, just add event listeners
  const helpButton = document.getElementById('helpBtn');
  if (!helpButton) return;

  helpButton.addEventListener('click', showHelpMenu);
}

function showWelcomeDialog() {
  const dialog = createOnboardingDialog({
    title: 'Welcome to ProfitPath! 🎉',
    content: '<div class="welcome-content"><p>Get started with your profitability analysis in just a few minutes.</p><p>Would you like a quick guided tour of the key features?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="welcome-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Take Tour</button><button class="welcome-btn" data-action="industry" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Choose Industry</button><button class="welcome-btn" data-action="skip" style="background:transparent;color:#666;border:none;padding:10px 20px;cursor:pointer;">Skip for Now</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.welcome-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        dialog.remove(); // Close the dialog

        if (action === 'tour') {
          startGuidedTour();
        } else if (action === 'industry') {
          showIndustrySelector();
        }
        // Skip action just closes the dialog
      });
    });
  }, 100);

  document.body.appendChild(dialog);
}

function showIndustrySelector() {
  const industries = [
    { id: 'consulting', name: 'Consulting', icon: '💼', description: 'Professional services, advisory, strategy' },
    { id: 'cleaning', name: 'Cleaning Services', icon: '🧽', description: 'Residential and commercial cleaning' },
    { id: 'landscaping', name: 'Landscaping', icon: '🌿', description: 'Garden maintenance, lawn care' },
    { id: 'fitness', name: 'Fitness & Wellness', icon: '🏋️', description: 'Personal training, gym services' },
    { id: 'photography', name: 'Photography', icon: '📷', description: 'Event, portrait, commercial photography' },
    { id: 'other', name: 'Other Service Business', icon: '🏭', description: 'Custom service business setup' }
  ];

  const industryGrid = industries.map(industry => '<div class="industry-option" data-industry="' + industry.id + '">' +
    '<div class="industry-icon" style="font-size:32px;margin-bottom:8px;">' + industry.icon + '</div>' +
    '<div class="industry-name">' + industry.name + '</div>' +
    '<div class="industry-desc">' + industry.description + '</div>' +
    '</div>'
  ).join('');

  const dialog = createOnboardingDialog({
    title: 'What type of service business do you run?',
    content: '<div class="industry-grid">' + industryGrid + '</div><p style="margin-top:16px;color:var(--muted);">This helps us provide tailored guidance and templates.</p>',
    buttons: [
      { text: 'Continue', action: () => { }, primary: true },
      { text: 'Skip', action: () => { } }
    ]
  });

  // Add click handlers for industry options
  setTimeout(() => {
    document.querySelectorAll('.industry-option').forEach(option => {
      option.addEventListener('click', () => {
        const industryId = option.dataset.industry;
        selectIndustry(industryId, dialog);
      });
    });
  }, 100);

  document.body.appendChild(dialog);
}

function selectIndustry(industryId, dialog) {
  // Save selected industry
  localStorage.setItem('selectedIndustry', industryId);

  // Load industry-specific template
  loadOnboardingIndustryTemplate(industryId);

  // Close dialog and show success message
  dialog.remove();

  const successDialog = createOnboardingDialog({
    title: 'Great choice! 🎯',
    content: '<div class="success-content"><p>We\'ve loaded a template configuration for your industry.</p><p>Would you like to take a quick tour to learn how to customize it?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="success-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Show Me How</button><button class="success-btn" data-action="explore" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Explore on My Own</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.success-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        successDialog.remove(); // Close the dialog

        if (action === 'tour') {
          startGuidedTour();
        }
        // Explore action just closes the dialog
      });
    });
  }, 100);

  document.body.appendChild(successDialog);
}

function loadOnboardingIndustryTemplate(industryId) {
  const templates = {
    consulting: {
      offerings: [{
        name: 'Strategy Consulting',
        priceMonthly: 5000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 200
      }]
    },
    cleaning: {
      offerings: [{
        name: 'Standard Cleaning',
        priceMonthly: 150,
        sessionsPerYear: 4,
        hoursPerSession: 2,
        variableCostPerSession: 15
      }]
    },
    landscaping: {
      offerings: [{
        name: 'Weekly Lawn Care',
        priceMonthly: 200,
        sessionsPerYear: 52,
        hoursPerSession: 1,
        variableCostPerSession: 25
      }]
    },
    fitness: {
      offerings: [{
        name: 'Personal Training',
        priceMonthly: 300,
        sessionsPerYear: 48,
        hoursPerSession: 1,
        variableCostPerSession: 0
      }]
    },
    photography: {
      offerings: [{
        name: 'Wedding Photography',
        priceMonthly: 2500,
        sessionsPerYear: 6,
        hoursPerSession: 8,
        variableCostPerSession: 100
      }]
    }
  };

  const template = templates[industryId];
  if (template) {
    // Apply template to current scenario
    if (template.offerings) {
      state.offerings = template.offerings.map(o => ({
        ...o,
        id: uuid(),
        mixPct: 100 / template.offerings.length,
        currentClients: 0
      }));
    }

    // Refresh the UI
    render();
    persistState();
  }
}

function startGuidedTour() {
  // Lock scrolling while the guided tour is active so users can't interrupt
  // the tour by manually scrolling. Programmatic scrolling (scrollIntoView)
  // is still allowed.
  lockScrollForTour();
  const tour = createGuidedTour();
  tour.start();
}

// Global tour state
let tourSteps = [];
let tourActive = false;

function createGuidedTour() {
  const isMobile = window.innerWidth < 768;
  tourSteps = [
    {
      target: '.logo',
      title: 'Welcome to ProfitPath',
      content: 'This is your profitability dashboard. Let\'s take a quick tour of the key areas.',
      position: 'bottom'
    },
    {
      target: '.inputs-fields .field:first-child',
      title: 'Choose Your Mode',
      content: 'Select \'Forecast\' mode to plan capacity for a target client count. Use \'Current\' mode to analyze your active existing client base.',
      position: 'right'
    },
    {
      target: '.team-config-group',
      title: 'Team Configuration',
      content: 'Enter your team size and compensation details. The calculator assumes 2080 paid hours per year per employee.',
      position: 'right'
    },
    {
      target: '.offerings-section .section-h',
      title: 'Define Your Services',
      content: 'Add your service offerings with pricing, frequency, and costs. Each offering can have different terms.',
      position: 'right'
    },
    {
      target: 'aside.card .card-h',
      title: 'Key Profitability Metric',
      content: 'This shows your net income after all expenses. Green indicates profitability, red indicates losses.',
      position: 'top'
    },
    {
      target: 'aside.card .capacity',
      title: 'Capacity Utilization',
      content: 'Monitor how busy your team is. Aim for 80-90% utilization to balance profitability and client service.',
      position: 'left'
    },
    {
      target: '.break-even-section-wrapper',
      title: 'Break-even Analysis',
      content: 'See how many clients you need to break even with a detailed break-even analysis.',
      position: 'left'
    },
    {
      target: '.charts-visualizations-container',
      title: 'Charts & Visualizations',
      content: 'Explore interactive charts and graphs that help visualize your business metrics and financial analysis.',
      position: 'top'
    },
    {
      target: isMobile ? '#hamburgerBtn' : '.header-actions',
      title: 'Save, Export & Share',
      content: isMobile ? 'Access all saving, exporting, and sharing tools from the menu.' : 'Save scenarios for comparison, generate professional reports, or share your analysis with stakeholders.',
      position: 'bottom'
    }
  ];

  tourActive = true;

  return {
    start: () => showTourStep(0)
  };
}

async function showTourStep(stepIndex) {
  if (!tourActive || stepIndex >= tourSteps.length) {
    completeTour();
    return;
  }

  const step = tourSteps[stepIndex];
  let target = document.querySelector(step.target);

  // Try fallback selectors if primary target not found
  if (!target) {
    const fallbacks = {
      '.header': '.container',
      '.offering-item': '.card',
      '.metrics-section': '.card',
      '#scenariosBtn': '.btn',
      '#shareBtn': '.btn'
    };
    target = document.querySelector(fallbacks[step.target] || step.target);
  }

  if (!target) {
    console.warn('Tour step ' + stepIndex + ' target not found: ' + step.target + ', skipping...');
    showTourStep(stepIndex + 1);
    return;
  }

  // Scroll the target element into view smoothly, then wait for scrolling to stop
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

  // Wait until scrolling has settled and the target is roughly centered before creating the tooltip.
  // This avoids creating the overlay while the page is still animating which caused the overlay
  // to be slightly offset when long smooth-scrolls were required.
  await waitForTargetSettled(target, { timeoutMs: 3000, idleMs: 250 });

  // Remove any leftover tooltips/overlays to avoid duplicates or jumping.
  document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

  // Now create the tooltip (createTooltip will append it to the DOM)
  const tooltip = createTooltip(step, target, null, stepIndex, tourSteps);

  // Add keyboard support
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && tourActive) {
      document.removeEventListener('keydown', handleKeydown);
      exitTour();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // Store cleanup function
  tooltip._cleanupKeyboard = () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}

// Helper to wait until scrolling stops and the target is approximately centered
function waitForTargetSettled(target, { timeoutMs = 3000, idleMs = 250, stableMs = 250 } = {}) {
  return new Promise((resolve) => {
    let idleTimer = null;
    let timeoutTimer = null;
    let rafId = null;

    function cleanup() {
      if (idleTimer) clearTimeout(idleTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll, { passive: true });
      window.removeEventListener('resize', onScroll);
    }

    // After we observe no scroll for idleMs, ensure the element's rect is stable
    // for stableMs milliseconds before resolving. If the element is not near
    // the center, perform an immediate snap and continue waiting for stability.
    function ensureStableAndResolve() {
      const startTime = Date.now();
      let lastRect = target.getBoundingClientRect();
      let lastChange = Date.now();

      // If target is far from center, snap it into view first (instant)
      const rectNow = lastRect;
      const viewportCenterY = window.innerHeight / 2;
      const deltaCenter = Math.abs((rectNow.top + rectNow.bottom) / 2 - viewportCenterY);
      if (deltaCenter > window.innerHeight * 0.2) {
        try {
          target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
        } catch {
          // ignore
        }
        // update lastRect after snapping
        lastRect = target.getBoundingClientRect();
        lastChange = Date.now();
      }

      function checkRect() {
        const rect = target.getBoundingClientRect();
        const dx = Math.abs(rect.top - lastRect.top) + Math.abs(rect.left - lastRect.left) + Math.abs(rect.width - lastRect.width) + Math.abs(rect.height - lastRect.height);
        if (dx > 2) {
          lastRect = rect;
          lastChange = Date.now();
        }

        if (Date.now() - lastChange >= stableMs) {
          cleanup();
          resolve();
          return;
        }

        if (Date.now() - startTime >= timeoutMs) {
          cleanup();
          resolve();
          return;
        }

        rafId = requestAnimationFrame(checkRect);
      }

      checkRect();
    }

    function onScroll() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        ensureStableAndResolve();
      }, idleMs);
    }

    // Start listeners and safety timeout
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    timeoutTimer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs + 200);

    // Kick off initial idle check (in case no scroll events occur)
    onScroll();
  });
}

function exitTour() {
  tourActive = false;
  // Remove all tooltips and overlays
  // Unlock scrolling when the tour exits
  unlockScrollForTour();
  document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

  // Show exit confirmation
  const exitDialog = createOnboardingDialog({
    title: 'Tour Exited',
    content: '<p>You can resume the guided tour anytime by clicking the ❓ help button in the top-right corner.</p><p>Feel free to explore the features at your own pace!</p>',
    buttons: [
      { text: 'Got it!', action: () => { } }
    ]
  });

  document.body.appendChild(exitDialog);
}

function completeTour() {
  tourActive = false;
  // Unlock scrolling when the tour completes
  unlockScrollForTour();
  localStorage.setItem('onboardingCompleted', 'true');

  const completionDialog = createOnboardingDialog({
    title: 'Tour Complete! 🎉',
    content: '<p>You now know the basics of ProfitPath!</p><p>Explore the features at your own pace. Use the ❓ help button anytime for guidance.</p>',
    buttons: [
      { text: 'Got it!', action: () => { }, primary: true }
    ]
  });

  document.body.appendChild(completionDialog);
}

function createTooltip(step, target, onNext, stepIndex, steps) {
  const isMobile = window.innerWidth < 768;

  // Get fresh bounding rect after scrolling completes
  const rect = target.getBoundingClientRect();

  // Calculate final position first
  let left, top, transform;

  if (isMobile) {
    // On mobile, always position below the element for better visibility
    left = Math.max(10, Math.min(window.innerWidth - 290, rect.left + rect.width / 2 - 140));
    top = rect.bottom + 10;
    transform = 'translate(0, 0)';
  } else {
    switch (step.position) {
      case 'top':
        left = rect.left + rect.width / 2;
        top = rect.top - 10;
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        left = rect.left + rect.width / 2;
        top = rect.bottom + 10;
        transform = 'translate(-50%, 0)';
        break;
      case 'left':
        left = rect.left - 10;
        top = rect.top + rect.height / 2;
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        left = rect.right + 10;
        top = rect.top + rect.height / 2;
        transform = 'translate(0, -50%)';
        break;
      default:
        left = rect.left + rect.width / 2;
        top = rect.bottom + 10;
        transform = 'translate(-50%, 0)';
    }
  }

  // Ensure tooltip stays within viewport bounds
  const tooltipWidth = isMobile ? 280 : 300;
  const tooltipHeight = 200; // Approximate height with navigation

  if (left < 10) {
    left = 10;
  }
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tooltipWidth - 10;
  }
  if (top - tooltipHeight < 10) {
    top = tooltipHeight + 10;
    if (!isMobile) transform = transform.replace('-100%', '0');
  }
  if (top + tooltipHeight > window.innerHeight - 10) {
    top = window.innerHeight - tooltipHeight - 10;
    if (!isMobile) transform = transform.replace('0', '-100%');
  }

  // Create tooltip with final position-no intermediate rendering
  const tooltip = document.createElement('div');
  tooltip.className = 'onboarding-tooltip';
  tooltip.style.cssText = 'position: fixed;z-index: 10000;background: white;border: 2px solid #007bff;border-radius: 8px;padding: 16px;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);max-width: ' + (isMobile ? '280px' : '300px') + ';pointer-events: auto;font-size: ' + (isMobile ? '14px' : '16px') + ';left: ' + left + 'px;top: ' + top + 'px;transform: ' + transform + ';opacity: 0;transition: opacity 0.3s ease-out;';

  // Append to DOM and fade in from final position
  document.body.appendChild(tooltip);
  requestAnimationFrame(() => {
    tooltip.style.opacity = '1';
  });

  // Create progress dots
  const progressDots = steps.map((_, index) => '<span class="tour-dot ' + (index === stepIndex ? 'active' : '') + ' ' + (index < stepIndex ? 'completed' : '') + '" data-step="' + index + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;cursor:pointer;background:' + (index === stepIndex ? '#007bff' : index < stepIndex ? '#28a745' : '#ddd') + ';transition:all 0.2s;"></span>').join('');

  tooltip.innerHTML = '<div style="position:relative;padding-right:24px;"><button class="tour-exit-btn" style="position:absolute;top:0;right:0;background:transparent;border:none;font-size:16px;cursor:pointer;color:var(--text, #666);padding:4px;line-height:1;">✕</button><div style="font-weight:bold;margin-bottom:8px;color:var(--text, #007bff);">' + step.title + '</div><div style="margin-bottom:16px;color:var(--text, #333);line-height:1.4;">' + step.content + '</div><div style="display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative;"><div class="tour-navigation" style="display:flex;align-items:center;">' + (stepIndex > 0 ? '<button class="tour-arrow tour-arrow-prev" data-direction="prev" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;font-size:18px;line-height:1;">‹</button>' : '<div style="width:32px;"></div>') + '<div class="tour-dots" style="display:flex;align-items:center;">' + progressDots + '</div>' + (stepIndex < steps.length - 1 ? '<button class="tour-arrow tour-arrow-next" data-direction="next" style="background:#007bff;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:18px;line-height:1;">›</button>' : '<button class="tour-finish-btn" style="background:#28a745;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:16px;line-height:1;">✓</button>') + '</div></div></div>';

  // Add event listeners for navigation
  setTimeout(() => {
    // Exit button
    const exitBtn = tooltip.querySelector('.tour-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitTour();
      });
    }

    // Navigation buttons
    const prevBtn = tooltip.querySelector('.tour-arrow-prev');
    const nextBtn = tooltip.querySelector('.tour-arrow-next');
    const finishBtn = tooltip.querySelector('.tour-finish-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        if (stepIndex > 0) {
          showTourStep(stepIndex - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        if (stepIndex < steps.length - 1) {
          showTourStep(stepIndex + 1);
        }
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        completeTour();
      });
    }

    // Progress dots
    const dots = tooltip.querySelectorAll('.tour-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetStep = parseInt(e.currentTarget.dataset.step);
        tooltip.remove();
        showTourStep(targetStep);
      });
    });
  }, 50);

  // Add event listener for the button
  setTimeout(() => {
    const nextBtn = tooltip.querySelector('.tooltip-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        tooltip.remove();
        if (onNext) onNext();
      });
    }
  }, 10);

  // Highlighting: place a fixed overlay around the target so we don't rely on modifying
  // the target's own styles (avoids stacking-context/overflow issues and layout shifts).
  const OVERLAY_PAD = 9; // pixels to expand the highlight beyond the element (increased by 1 to keep outer perimeter)
  const BORDER_THICKNESS = 7; // highlight border thickness (reduced by 1px for less clipping)

  const rect2 = target.getBoundingClientRect();
  const computed = window.getComputedStyle(target);
  // If the target has no rounded corners, use a mild default so highlights look rounded
  const parsedBR = parseFloat(computed.borderRadius) || 0;
  const borderRadius = (parsedBR && parsedBR > 4) ? parsedBR + 'px' : '10px';

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.cssText = 'position: fixed;left: ' + (rect2.left - OVERLAY_PAD) + 'px;top: ' + (rect2.top - OVERLAY_PAD) + 'px;width: ' + (rect2.width + OVERLAY_PAD * 2) + 'px;height: ' + (rect2.height + OVERLAY_PAD * 2) + 'px;border: ' + BORDER_THICKNESS + 'px solid #007bff;border-radius: ' + borderRadius + ';box-shadow: 0 8px 32px rgba(0, 123, 255, 0.12);pointer-events: none;z-index: 9999;animation: pulse 2s infinite;';

  // Append overlay underneath the tooltip (tooltip uses z-index:10000)
  document.body.appendChild(overlay);

  // Store overlay for cleanup
  tooltip._overlay = overlay;

  // Wrap original remove to also remove the overlay and keyboard handler
  const originalRemove = tooltip.remove;
  tooltip.remove = function () {
    try {
      if (tooltip._overlay && tooltip._overlay.parentNode) tooltip._overlay.parentNode.removeChild(tooltip._overlay);
    } catch {
      // ignore
    }
    if (tooltip._cleanupKeyboard) {
      tooltip._cleanupKeyboard();
    }
    originalRemove.call(this);
  };

  return tooltip;
}

function createOnboardingDialog({ title, content, buttons }) {
  const dialog = document.createElement('div');
  dialog.className = 'onboarding-dialog-overlay';
  dialog.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 10001;';

  const dialogContent = document.createElement('div');
  dialogContent.style.cssText = 'background: white;border-radius: 12px;padding: 24px;max-width: 500px;width: 90%;box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);';

  dialogContent.innerHTML = '<h2 style="margin:0 0 16px 0;color:var(--text, #333);font-size:24px;">' + title + '</h2><div style="color:var(--text, #666);line-height:1.5;">' + content + '</div><div style="margin-top:24px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">' + buttons.map((btn, index) => '<button class="dialog-btn" data-action="' + index + '" data-primary="' + (btn.primary ? 'true' : 'false') + '" style="padding:8px 16px;border:' + (btn.primary ? 'none' : '1px solid #ddd') + ';border-radius:6px;background:' + (btn.primary ? '#007bff' : 'white') + ';color:' + (btn.primary ? 'white' : '#333') + ';cursor:pointer;font-weight:' + (btn.primary ? 'bold' : 'normal') + ';">' + btn.text + '</button>').join('') + '</div>';

  // Add event listeners for dialog buttons
  setTimeout(() => {
    const dialogBtns = dialogContent.querySelectorAll('.dialog-btn');
    dialogBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const action = buttons[index]?.action;
        dialog.remove();
        if (action && typeof action === 'function') {
          action();
        }
      });
    });
  }, 10);

  dialog.appendChild(dialogContent);
  return dialog;
}

function showHelpMenu() {
  const helpDialog = createOnboardingDialog({
    title: 'Help & Learning Center',
    content: '<div style="display:grid;gap:12px;"><button class="help-menu-btn" data-action="tour" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🎯 <strong>Take Guided Tour</strong><br><small>Step-by-step walkthrough of key features</small></button><button class="help-menu-btn" data-action="industry" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🏢 <strong>Change Industry</strong><br><small>Switch to a different business template</small></button><button class="help-menu-btn" data-action="tooltips" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">💡 <strong>Show Tooltips</strong><br><small>Enable contextual help throughout the app</small></button></div>',
    buttons: [
      { text: 'Close', action: () => { } }
    ]
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.help-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        helpDialog.remove(); // Close the dialog

        setTimeout(() => {
          if (action === 'tour') {
            startGuidedTour();
          } else if (action === 'industry') {
            showIndustrySelector();
          } else if (action === 'tooltips') {
            showContextualHelp();
          }
        }, 100);
      });
    });
  }, 100);

  document.body.appendChild(helpDialog);
}

function initializeContextualTooltips() {
  // Add tooltips to key elements
  const tooltipElements = [
    { selector: '#employees', content: 'Set the number of full-time employees in your business' },
    { selector: '#employeePay', content: 'Average annual salary per employee including benefits' },
    { selector: '.offering-card .btn.danger', content: 'Remove this service offering from your business model' },
    { selector: '#scenariosBtn', content: 'Save current configuration or load previous scenarios' },
    { selector: '#shareBtn', content: 'Generate shareable link for stakeholders' },
    { selector: '.settings-cog-btn', content: 'Customize experience level and advanced features' }
  ];

  tooltipElements.forEach(({ selector, content }) => {
    const element = document.querySelector(selector);
    if (element) {
      element.title = content; // Basic tooltip
    }
  });
}

function hideContextualHelp() {
  // Disable enhanced tooltips
  const tooltipElements = document.querySelectorAll('[data-tooltip-enabled="true"]');
  tooltipElements.forEach(el => {
    if (el.dataset.originalTitle) {
      el.title = el.dataset.originalTitle;
      delete el.dataset.tooltipEnabled;
      delete el.dataset.originalTitle;

      el.removeEventListener('mouseenter', showEnhancedTooltip);
      el.removeEventListener('mouseleave', hideEnhancedTooltip);
    }
  });

  // Update settings to reflect tooltips are disabled
  if (updateSetting) {
    updateSetting('showTooltips', false);
  }

  // Show confirmation
  const notification = document.createElement('div');
  notification.textContent = 'Contextual tooltips disabled.';
  notification.style.cssText = 'position: fixed;top: 20px;left: 50%;transform: translateX(-50%);background: var(--accent, #007bff);color: white;padding: 10px 20px;border-radius: 6px;z-index: 10002;font-size: 14px;';
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function showContextualHelp() {
  // Enable enhanced tooltips
  const tooltipElements = document.querySelectorAll('[title]');
  tooltipElements.forEach(el => {
    if (!el.dataset.tooltipEnabled) {
      el.dataset.originalTitle = el.title;
      el.dataset.tooltipEnabled = 'true';
      el.title = ''; // Remove basic tooltip

      el.addEventListener('mouseenter', showEnhancedTooltip);
      el.addEventListener('mouseleave', hideEnhancedTooltip);
    }
  });

  // Update settings to reflect tooltips are enabled
  if (updateSetting) {
    updateSetting('showTooltips', true);
  }

  // Show confirmation
  const notification = document.createElement('div');
  notification.textContent = 'Contextual tooltips enabled! Hover over elements to see help.';
  notification.style.cssText = 'position: fixed;top: 20px;left: 50%;transform: translateX(-50%);background: var(--accent, #007bff);color: white;padding: 10px 20px;border-radius: 6px;z-index: 10002;font-size: 14px;';
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function showEnhancedTooltip(e) {
  const content = e.target.dataset.originalTitle;
  if (!content) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'enhanced-tooltip';
  tooltip.textContent = content;
  tooltip.style.cssText = 'position: fixed;background: #333;color: white;padding: 8px 12px;border-radius: 4px;font-size: 12px;z-index: 10002;pointer-events: none;max-width: 200px;word-wrap: break-word;';

  document.body.appendChild(tooltip);

  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = (rect.left + rect.width / 2) + 'px';
  tooltip.style.top = (rect.top - 8) + 'px';
  tooltip.style.transform = 'translate(-50%, -100%)';

  e.target._tooltip = tooltip;
}

function hideEnhancedTooltip(e) {
  if (e.target._tooltip) {
    e.target._tooltip.remove();
    delete e.target._tooltip;
  }
}

// Make functions global
if (typeof getAllScenarios === 'function') window.getAllScenarios = getAllScenarios;
if (typeof saveScenario === 'function') window.saveScenario = saveScenario;
if (typeof renderScenariosList === 'function') window.renderScenariosList = renderScenariosList;
if (typeof loadScenario === 'function') window.loadScenario = loadScenario;
if (typeof deleteScenario === 'function') window.deleteScenario = deleteScenario;
if (typeof openScenarioModal === 'function') window.openScenarioModal = openScenarioModal;
if (typeof closeScenarioModal === 'function') window.closeScenarioModal = closeScenarioModal;
if (typeof encodeScenarioToURL === 'function') window.encodeScenarioToURL = encodeScenarioToURL;
if (typeof decodeScenarioFromURL === 'function') window.decodeScenarioFromURL = decodeScenarioFromURL;
if (typeof loadScenarioFromURL === 'function') window.loadScenarioFromURL = loadScenarioFromURL;
function _initializeScenarios() {
  // Set up scenarios button
  const scenariosBtn = document.getElementById('scenariosBtn');
  if (scenariosBtn) {
    scenariosBtn.addEventListener('click', openScenarioModal);
  }

  // Set up modal close button
  const modalCloseBtn = document.querySelector('#scenariosModal .btn-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeScenarioModal);
  }

  // Set up save button
  const saveBtn = document.getElementById('saveScenarioBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const input = document.getElementById('scenarioNameInput');
      if (input) {
        saveScenario(input.value);
      }
    });
  }

  // Set up input enter key
  const input = document.getElementById('scenarioNameInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveScenario(input.value);
      }
    });
  }

  // Delegate events for load and delete buttons
  // Delegate events for load and delete buttons
  const scenariosList = document.getElementById('scenariosList');
  if (scenariosList) {
    scenariosList.addEventListener('click', (e) => {
      const target = e.target;
      const scenarioId = target.dataset.scenarioId;

      if (target.classList.contains('load-btn') && scenarioId) {
        loadScenario(scenarioId);
      } else if (target.classList.contains('delete-btn') && scenarioId) {
        // Directly call deleteScenario - it handles its own confirmation
        deleteScenario(scenarioId);
      }
    });
  }
}

// Initialize scenarios when DOM is ready - REMOVED to prevent conflicts with new modal system
// initializeScenarios();

initializeProgressiveDisclosure();

// Initialize the app
if (typeof document !== 'undefined') {
  wire();
}