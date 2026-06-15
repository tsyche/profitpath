import { calc, getCacheStats } from '../src/calculations/index.js';
import { captureTableFocus, restoreTableFocus } from './hooks/useTableFocus';
import { openScenarioModal, renderScenariosList } from './components/UIHelpers';
import { initializeProgressiveDisclosure } from './utils/progressiveDisclosure';
import { initTooltips, setTooltipsEnabled } from './utils/tooltipManager.js';
import * as misc from './services/miscService';
import * as businessLogic from './services/businessLogic';
import { saveScenario, loadScenario, deleteScenario } from './services/scenarioService';
import { closeScenarioModal, createModal } from './components/Modal.js';
import { getAllScenarios, encodeScenarioToURL, decodeScenarioFromURL } from './services/miscService';
import { uuid, clamp } from './utils/helpers';
import { showToast } from './services/modalService.js';
import { renderCustomerAnalyticsDashboard } from '../src/analytics/customer-ui.js';

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

// wrapper around miscService helper to avoid ReferenceErrors in test env
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
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 80000,
      partTimeEmployeePay: 30000,
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
      fullTimeEmployees: 2,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 45000,
      partTimeEmployeePay: 30000,
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
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 40000,
      partTimeEmployeePay: 30000,
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
        { name: 'Weekly Lawn Maintenance', priceMonthly: 280, sessionsPerYear: 52, hoursPerSession: 1.5, variableCostPerSession: 20, mixPct: 50, currentClients: 15 },
        { name: 'Biweekly Lawn Care', priceMonthly: 200, sessionsPerYear: 26, hoursPerSession: 1, variableCostPerSession: 15, mixPct: 30, currentClients: 10 },
        { name: 'Seasonal Services', priceMonthly: 350, sessionsPerYear: 4, hoursPerSession: 4, variableCostPerSession: 40, mixPct: 20, currentClients: 8 }
      ],
      fullTimeEmployees: 2,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 35000,
      partTimeEmployeePay: 30000,
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
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 55000,
      partTimeEmployeePay: 30000,
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
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 50000,
      partTimeEmployeePay: 30000,
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
    if (misc && misc.showEmbedCode) {
      window.showEmbedCode = misc.showEmbedCode;
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

// No local shadowing needed

// Additional missing function wrappers - only include functions that exist
const updateValidationDisplay = (...args) => (businessLogic && typeof businessLogic.updateValidationDisplay === 'function') ? businessLogic.updateValidationDisplay(...args) : undefined;
const lazyLoadChart = (...args) => (misc && typeof misc.lazyLoadChart === 'function') ? misc.lazyLoadChart(...args) : undefined;
const updateRichVisualizations = (...args) => (misc && typeof misc.updateRichVisualizations === 'function') ? misc.updateRichVisualizations(...args) : undefined;

// Utility functions

// Settings and UI function wrappers
const DEFAULT_CURRENCY = 'USD';
const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtPct1 = (n) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';

const state = {
  mode: 'forecast', // 'forecast' | 'current'
  offerings: businessLogic.defaultOfferings(),
  fullTimeEmployees: 1, // 40 hours/week
  partTimeEmployees: 0, // 20 hours/week
  fullTimeEmployeePay: 60000,
  partTimeEmployeePay: 30000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80, // percent of hours available for service delivery
  targetUtilizationPct: 75, // forecasting target
  lockMix: false, // forecasting-only: keep Mix % totals at 100 by adjusting other offerings
  loadedTemplate: null, // Track which template was loaded (null if custom scenario)
};

// Undo/Redo history stacks
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;
let _lastHistoryField = null; // Track last field edited for debounce

// Make state accessible to calculations module
globalThis.state = state;

// Make calc and state globally available for export functions
if (typeof window !== 'undefined') {
  window.calc = calc;
  window.state = state;
  window.render = render;
  window.updateOutputs = updateOutputs;
  window.updateValidationDisplay = updateValidationDisplay;
  window.rebalanceMix = businessLogic.rebalanceMix;
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

// Undo/Redo history management
function pushHistory() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0; // Clear redo on new action
  updateUndoRedoButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  Object.assign(state, JSON.parse(undoStack.pop()));
  persistState();
  render();
  updateUndoRedoButtons();
  showToast('Undone', 'info', 1500);
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  Object.assign(state, JSON.parse(redoStack.pop()));
  persistState();
  render();
  updateUndoRedoButtons();
  showToast('Redone', 'info', 1500);
}

function updateUndoRedoButtons() {
  const undoBtn = $('#undoBtn');
  const redoBtn = $('#redoBtn');
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function setStateFromInputs() {
  state.mode = $('#modeSelect').value;

  // Validate and sanitize inputs for full-time and part-time employees
  state.fullTimeEmployees = Math.max(0, Math.floor(safeParseNumber($('#fullTimeEmployees').value, 1)));
  state.partTimeEmployees = Math.max(0, Math.floor(safeParseNumber($('#partTimeEmployees').value, 0)));
  state.fullTimeEmployeePay = Math.max(0, safeParseNumber($('#fullTimeEmployeePay').value, 0));
  state.partTimeEmployeePay = Math.max(0, safeParseNumber($('#partTimeEmployeePay').value, 0));

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

  // Debounce history: only push on first keystroke of a field
  const fieldKey = `${i}-${k}`;
  if (fieldKey !== _lastHistoryField) {
    pushHistory();
    _lastHistoryField = fieldKey;
  }

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
    businessLogic.rebalanceMix(i, value);
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

// Update template source indicator badge
function updateTemplateBadge() {
  const badge = $('#templateBadge');
  const templateName = $('#templateName');

  if (state.loadedTemplate && window.INDUSTRY_TEMPLATES && window.INDUSTRY_TEMPLATES[state.loadedTemplate]) {
    const template = window.INDUSTRY_TEMPLATES[state.loadedTemplate];
    if (badge && templateName) {
      templateName.textContent = template.name;
      badge.style.display = 'block';
    }
  } else {
    if (badge) {
      badge.style.display = 'none';
    }
  }
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

  // Sync the appbar mode toggle (Forecast <-> Current) with current state.
  {
    const badge = $('#modeBadgeBtn');
    if (badge) {
      const isForecastMode = state.mode === 'forecast';
      const label = badge.querySelector('.ab-badge-text');
      if (label) label.textContent = isForecastMode ? 'Forecast' : 'Current';
      badge.classList.toggle('is-current', !isForecastMode);
      badge.setAttribute('aria-pressed', isForecastMode ? 'false' : 'true');
      badge.dataset.tooltip = isForecastMode
        ? 'Forecast mode — tap to switch to Current'
        : 'Current mode — tap to switch to Forecast';
    }
  }

  // Update key metrics display (both full screen and mobile)
  updateKeyMetrics();

  {
    const el = $('#fullTimeEmployees'); if (el) el.value = state.fullTimeEmployees;
  }
  {
    const el = $('#partTimeEmployees'); if (el) el.value = state.partTimeEmployees;
  }
  {
    const el = $('#fullTimeEmployeePay'); if (el) el.value = state.fullTimeEmployeePay;
  }
  {
    const el = $('#partTimeEmployeePay'); if (el) el.value = state.partTimeEmployeePay;
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
      ? '<input aria-label="Mix % for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" max="100" step="1" value="' + ((o.mixPct ?? 0).toFixed(1)) + '" data-k="mixPct" data-i="' + (idx) + '" data-tooltip="Percentage of total clients using this offering" />'
      : '<span class="muted">—</span>';

    const clientsCell = isForecast
      ? '<span class="muted">—</span>'
      : '<input aria-label="Clients for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" step="1" value="' + (o.currentClients ?? 0) + '" data-k="currentClients" data-i="' + (idx) + '" data-tooltip="Number of active clients for this offering" />';

    const estClients = isForecast
      ? Math.floor(metrics.clients * ((o.mixPct || 0) / 100))
      : o.currentClients;

    const estSessions = isForecast
      ? Math.round(estClients * o.sessionsPerYear)
      : Math.round((o.currentClients || 0) * o.sessionsPerYear);

    tr.innerHTML = '<td class="cell-edit group-start group-inputs" data-label="Offering"><input aria-label="Offering name" type="text" value="' + (escapeHtml(o.name)) + '" data-k="name" data-i="' + (idx) + '" data-tooltip="Name of this service offering"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Price / mo"><input aria-label="Price per month for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="10" value="' + (o.priceMonthly) + '" data-k="priceMonthly" data-i="' + (idx) + '" data-tooltip="Monthly billing price per client"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Sessions / yr"><input aria-label="Sessions per year for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.sessionsPerYear) + '" data-k="sessionsPerYear" data-i="' + (idx) + '" data-tooltip="How many times per year this service is delivered to each client"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Hours / session"><input aria-label="Hours per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="0.1" value="' + (o.hoursPerSession) + '" data-k="hoursPerSession" data-i="' + (idx) + '" data-tooltip="Duration of each service session in hours"/></td>' +
      '<td class="cell-edit group-inputs group-end" data-label="Var $ / session"><input aria-label="Variable cost per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.variableCostPerSession) + '" data-k="variableCostPerSession" data-i="' + (idx) + '" data-tooltip="Cost per session (materials, supplies, delivery, etc.)"/></td>' +
      '<td class="cell-edit group-start group-mode" data-label="Mix % (forecast)" data-tooltip="Percentage of total clients using this offering (forecast mode only)">' + (mixCell) + '</td>' +
      '<td class="cell-edit group-mode group-end" data-label="Clients (current)" data-tooltip="Number of active clients for this offering (current mode only)">' + (clientsCell) + '</td>' +
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
    if (!el) return;
    const str = String(value);
    if (el.textContent !== str) {
      el.textContent = str;
      el.classList.remove('kpi-flash');
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add('kpi-flash');
    }
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

  // Update template source badge
  updateTemplateBadge();
}

// Build an inline SVG progress ring for the utilization KPI card
function buildUtilizationRing(pct) {
  const r = 16;
  const circ = +(2 * Math.PI * r).toFixed(2);
  const fill = Math.min(clamp(pct, 0, 150) / 150, 1);
  const offset = +(circ * (1 - fill)).toFixed(2);
  const color = pct > 100 ? 'var(--bad)' : pct > 75 ? 'var(--warn)' : 'var(--good)';
  return `<div class="kpi-ring-wrap"><svg width="40" height="40" viewBox="0 0 40 40" class="kpi-ring" aria-hidden="true"><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--border)" stroke-width="3.5"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="${color}" stroke-width="3.5" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 20 20)" stroke-linecap="round"/></svg><span style="color:${color}">${fmtPct1(pct)}</span></div>`;
}

// Apply a status class (good/warn/danger) to the nearest .kpi ancestor of a value element
function applyKpiStatus(valueEl, status) {
  const card = valueEl?.closest('.kpi');
  if (!card) return;
  card.classList.remove('kpi--good', 'kpi--warn', 'kpi--danger');
  if (status) card.classList.add('kpi--' + status);
}

// Inject or update the break-even progress bar inside a KPI card
function updateBreakEvenBar(cardEl, clients, beClients) {
  if (!cardEl || !Number.isFinite(beClients) || beClients <= 0) return;
  let bar = cardEl.querySelector('.kpi-be-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'kpi-be-bar';
    bar.innerHTML = '<div class="kpi-be-bar-fill"></div>';
    cardEl.appendChild(bar);
  }
  const ratio = Math.min(1, clients / beClients);
  const color = clients >= beClients ? 'var(--good)' : ratio > 0.7 ? 'var(--warn)' : 'var(--bad)';
  const fill = bar.querySelector('.kpi-be-bar-fill');
  if (fill) fill.style.cssText = `width:${(ratio * 100).toFixed(1)}%;background:${color}`;
  bar.dataset.tooltip = `${fmtInt(clients)} of ${fmtInt(beClients)} clients needed to break even`;
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
    if (kpiCapacity) {
      kpiCapacity.innerHTML = buildUtilizationRing(metrics.capacityPct);
      applyKpiStatus(kpiCapacity, metrics.capacityPct > 100 ? 'danger' : metrics.capacityPct > 75 ? 'warn' : 'good');
    }
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
      const beStatus = metrics.clients >= metrics.breakEvenClients ? 'good' : 'danger';
      kpiBreakEvenClients.style.color = beStatus === 'good' ? 'var(--good)' : 'var(--bad)';
      applyKpiStatus(kpiBreakEvenClients, beStatus);
      updateBreakEvenBar(kpiBreakEvenClients.closest('.kpi'), metrics.clients, metrics.breakEvenClients);
    }
    if (kpiBreakEvenRevenue) kpiBreakEvenRevenue.textContent = breakEvenRevenue;
    if (kpiContributionMargin) {
      kpiContributionMargin.textContent = contributionMargin;
      const cmStatus = metrics.contributionMarginPerClient > 0 ? 'good' : 'danger';
      kpiContributionMargin.style.color = cmStatus === 'good' ? 'var(--good)' : 'var(--bad)';
      applyKpiStatus(kpiContributionMargin, cmStatus);
    }
    if (kpiIncome) {
      kpiIncome.textContent = income;
      const incomeStatus = metrics.income >= 60000 ? 'good' : metrics.income >= 0 ? 'warn' : 'danger';
      kpiIncome.style.color = incomeStatus === 'good' ? 'var(--good)' : incomeStatus === 'warn' ? 'var(--warn)' : 'var(--bad)';
      const pill = kpiIncome.closest('.pill');
      if (pill) {
        pill.classList.remove('pill--good', 'pill--warn', 'pill--danger');
        pill.classList.add('pill--' + incomeStatus);
      }
    }

    // Tax estimates
    const kpiSeTax = $('#kpiSeTax');
    const kpiFederalTax = $('#kpiFederalTax');
    const kpiQuarterly = $('#kpiQuarterly');
    const kpiTakeHome = $('#kpiTakeHome');
    if (kpiSeTax) {
      if (metrics.income > 0) {
        kpiSeTax.textContent = fmtMoney0(metrics.seTax);
        kpiFederalTax.textContent = fmtMoney0(metrics.federalTax);
        kpiQuarterly.textContent = fmtMoney0(metrics.quarterlyEst);
        kpiTakeHome.textContent = fmtMoney0(metrics.takeHome);
        kpiTakeHome.style.color = metrics.takeHome > 0 ? 'var(--good)' : 'var(--bad)';
      } else {
        ['#kpiSeTax', '#kpiFederalTax', '#kpiQuarterly', '#kpiTakeHome'].forEach(id => {
          const el = $(id);
          if (el) {
            el.textContent = '—';
            el.style.color = '';
          }
        });
      }
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
    pushHistory();
    setStateFromInputs();
    persistState();
    render();
  });
});

$$('#controls select').forEach((el) => {
  el.addEventListener('change', () => {
    pushHistory();
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

// Templates now open the #templatesModal (via inline ppOpenModal in the markup);
// the modal's cards delegate to the hidden .template-option handlers below.

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

// Settings Cog Button — opens the #settingsModal (consistent with Scenarios /
// Templates). Refresh values first so radios/checkboxes reflect saved settings.
const settingsCogBtn = $('#settingsCogBtn');
if (settingsCogBtn) {
  settingsCogBtn.addEventListener('click', (e) => {
    e.preventDefault();
    refreshDesktopSettings();
    if (typeof window.ppOpenModal === 'function') window.ppOpenModal('settingsModal');
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

// Level description panel
function updateLevelDescription(level) {
  const descriptions = {
    beginner: {
      enabled: ['Basic calculations', 'Simple exports', 'Tooltips', 'Scenario management'],
      locked: ['Advanced calculations', 'Detailed breakdowns', 'Scenario comparison', 'Full export suite', 'Debug panel']
    },
    intermediate: {
      enabled: ['Basic calculations', 'Advanced calculations', 'Detailed breakdowns', 'Scenario comparison', 'Tooltips', 'Simple exports'],
      locked: ['Full export suite (Excel, PDF, Email)', 'Debug panel']
    },
    advanced: {
      enabled: ['Basic calculations', 'Advanced calculations', 'Detailed breakdowns', 'Scenario comparison', 'Sensitivity analysis', 'Tooltips', 'CSV import', 'Undo/Redo', 'Full export suite (Excel, PDF, HTML, Email)', 'Debug panel', 'Performance metrics', 'Scenario comparison tools'],
      locked: []
    }
  };

  const desc = descriptions[level] || descriptions.beginner;
  const container = document.getElementById('levelDescription');
  if (!container) return;

  let html = '<div style="font-size: 12px;">';

  if (desc.enabled.length > 0) {
    html += '<div style="margin-bottom: 6px;"><div style="font-weight: 500; color: #16a34a; margin-bottom: 2px;">✓ Enabled:</div>';
    desc.enabled.forEach(feature => {
      html += `<div style="color: #374151; margin-left: 18px; line-height: 1.4;">${feature}</div>`;
    });
    html += '</div>';
  }

  if (desc.locked.length > 0) {
    html += '<div><div style="font-weight: 500; color: #888; margin-bottom: 2px;">🔒 Locked:</div>';
    desc.locked.forEach(feature => {
      html += `<div style="color: #888; margin-left: 18px; line-height: 1.4; font-size: 11px;">${feature}</div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// Settings management
let settingsInitialized = false;

function initializeSettings() {
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};

  // Only attach event listeners once to prevent duplicates
  if (!settingsInitialized) {
    settingsInitialized = true;

    // Set experience level radio buttons
    const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
    experienceRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const prevSettings = typeof loadSettings === 'function' ? loadSettings() : {};
        const level = e.target.value;

        // Only show toast if level actually changed
        if (prevSettings.experienceLevel !== level) {
          const prevTooltipsState = prevSettings.showTooltips;

          setExperienceLevel(level);

          // Get new settings to check if tooltips changed
          const newSettings = typeof loadSettings === 'function' ? loadSettings() : {};
          const newTooltipsState = newSettings.showTooltips;

          // Show toast notification for level change
          const labels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
          const hints = {
            beginner: 'Core features active.',
            intermediate: 'Advanced calculations and scenario tools unlocked.',
            advanced: 'All features enabled, including export suite and debug panel.'
          };
          showToast(`${labels[level]} mode — ${hints[level]}`, 'info', 1800);

          // Show toast for tooltips change if it occurred
          if (prevTooltipsState !== newTooltipsState) {
            if (newTooltipsState) {
              showToast('Contextual tooltips enabled! Hover over elements to see help.', 'info', 1800);
            } else {
              showToast('Contextual tooltips disabled.', 'info', 1800);
            }
          }

          // Update level description panel
          updateLevelDescription(level);

          // Delay UI update slightly to ensure settings are saved first
          setTimeout(() => {
            updateUIForSettings();
          }, 50);
        }
      });
    });

    // Set feature toggles
    const checkboxes = [
      'showAdvancedCalculations',
      'showDetailedBreakdown',
      'showComparisonTools',
      'showExportOptions',
      'showDebugPanel',
      'showTooltips'
    ];

    checkboxes.forEach(key => {
      const checkbox = $('#' + key);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const prevSettings = typeof loadSettings === 'function' ? loadSettings() : {};
          const newValue = e.target.checked;

          // Only update if value actually changed
          if (prevSettings[key] !== newValue) {
            updateSetting(key, newValue);
            updateUIForSettings();
          }
        });
      }
    });
  }

  // Update checkbox states and level description (runs every time)
  const settings2 = typeof loadSettings === 'function' ? loadSettings() : {};

  const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
  experienceRadios.forEach(radio => {
    radio.checked = radio.value === settings2.experienceLevel;
  });

  const checkboxes = [
    'showAdvancedCalculations',
    'showDetailedBreakdown',
    'showComparisonTools',
    'showExportOptions',
    'showDebugPanel',
    'showTooltips'
  ];

  checkboxes.forEach(key => {
    const checkbox = $('#' + key);
    if (checkbox) {
      // Force update by setting checked state based on current settings
      const shouldBeChecked = settings2[key] === true;
      if (checkbox.checked !== shouldBeChecked) {
        checkbox.checked = shouldBeChecked;
      }
    }
  });

  // Update level description panel on initialization
  updateLevelDescription(settings2.experienceLevel || 'beginner');
}

function updateUIForSettings() {
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};

  // Show/hide elements based on feature gates
  const elementsToToggle = [
    { selector: '.advanced-calculations', setting: 'showAdvancedCalculations' },
    { selector: '.detailed-breakdown', setting: 'showDetailedBreakdown' },
    { selector: '.comparison-tools', setting: 'showComparisonTools' },
    { selector: '.export-options', setting: 'showExportOptions' },
    { selector: '.debug-wrapper', setting: 'showDebugPanel' },
    { selector: '.perf-wrapper', setting: 'showPerformanceMetrics' },
    { selector: '.sensitivity-wrapper', setting: 'showSensitivityAnalysis' }
  ];

  elementsToToggle.forEach(({ selector, setting }) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.display = settings[setting] ? 'block' : 'none';
    });
  });

  // Update tooltips checkbox state
  const tooltipCheckbox = $('#showTooltips');
  if (tooltipCheckbox) {
    tooltipCheckbox.checked = settings.showTooltips === true;
  }

  // Update tooltips visibility - silent mode (no toast)
  if (settings.showTooltips) {
    updateTooltipsUIOnly(true);
    setTooltipsEnabled(true);
  } else {
    updateTooltipsUIOnly(false);
    setTooltipsEnabled(false);
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

// Update key metrics for both full screen and mobile
function updateKeyMetrics() {
  try {
    const metrics = calc(state);

    // Appbar at-a-glance chips (Revenue, Net income, Utilization). Net income
    // is the only one kept on narrow widths; tapping opens the glance modal.
    const setText = (id, val) => { const el = $('#' + id); if (el) el.textContent = val; };
    const revenue = fmtMoney0(metrics.revenue || 0);
    const income = fmtMoney0(metrics.income || 0);
    const util = fmtPct1(metrics.capacityPct || 0);
    setText('abkRevenue', revenue);
    setText('abkIncome', income);
    setText('abkUtil', util);

    // At-a-glance modal: full default set (Revenue, Net income, Clients,
    // Annual sessions, Utilization).
    setText('glRevenue', revenue);
    setText('glIncome', income);
    setText('glClients', fmtInt(metrics.clients || 0));
    setText('glSessions', fmtInt(metrics.totalSessions || 0));
    setText('glUtil', util);
  } catch (e) {
    console.error('Error updating key metrics:', e);
  }
}

// Mobile undo/redo buttons
const mobileUndoBtn = $('#mobileUndoBtn');
if (mobileUndoBtn) {
  mobileUndoBtn.addEventListener('click', undo);
}

const mobileRedoBtn = $('#mobileRedoBtn');
if (mobileRedoBtn) {
  mobileRedoBtn.addEventListener('click', redo);
}


$('#offeringsBody').addEventListener('input', onTableInput);
$('#offeringsBody').addEventListener('blur', () => { _lastHistoryField = null; }, true); // Capture blur to clear field tracking
$('#offeringsBody').addEventListener('click', onTableClick);

// Save state when table content changes
$('#offeringsBody').addEventListener('input', persistState);
$('#offeringsBody').addEventListener('click', () => setTimeout(persistState, 0));

// Scenarios button wiring - uses new dynamic modal in UIHelpers
// Wire up desktop scenarios button (mobile button is wired at line 1410)
const desktopScenariosBtn = $('#desktopScenariosBtn');
if (desktopScenariosBtn) {
  desktopScenariosBtn.addEventListener('click', () => {
    openScenarioModal();
  });
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
  if (e.key !== 'Escape') return;
  const modal = $('#scenariosModal');
  if (modal && !modal.classList.contains('hidden')) {
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

  // Restore previously selected values from localStorage
  const savedCompare = JSON.parse(localStorage.getItem('profitpath-compare-selection') || 'null');
  if (savedCompare) {
    if (savedCompare.id1) select1.value = savedCompare.id1;
    if (savedCompare.id2) select2.value = savedCompare.id2;
  }

  // Add change listeners that only save the selection (not trigger comparison)
  const saveSelection = () => {
    localStorage.setItem('profitpath-compare-selection', JSON.stringify({
      id1: select1.value || '',
      id2: select2.value || ''
    }));
  };

  select1.addEventListener('change', saveSelection);
  select2.addEventListener('change', saveSelection);
}

// CSV Import handler
function handleCSVImport(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = misc.importFromCSV(e.target.result);
    if (!result.success) {
      createModal({
        title: 'Import Error',
        content: `<div style="color: #dc3545;">${result.errors.map(err => `<p>${err}</p>`).join('')}</div>`,
        size: 'small',
        buttons: [{ text: 'Close', primary: true }]
      });
      return;
    }

    const { settings, offerings } = result.data;

    // Apply imported settings to state
    if (settings.employees !== undefined) state.fullTimeEmployees = settings.employees;
    if (settings.partTimeEmployees !== undefined) state.partTimeEmployees = settings.partTimeEmployees;
    if (settings.employeePay !== undefined) state.fullTimeEmployeePay = settings.employeePay;
    if (settings.partTimeEmployeePay !== undefined) state.partTimeEmployeePay = settings.partTimeEmployeePay;
    if (settings.monthlyCosts !== undefined) state.monthlyCosts = settings.monthlyCosts;
    if (settings.productiveUtilizationPct !== undefined) state.productiveUtilizationPct = settings.productiveUtilizationPct;
    if (settings.targetUtilizationPct !== undefined) state.targetUtilizationPct = settings.targetUtilizationPct;

    // Apply imported offerings
    if (offerings.length > 0) state.offerings = offerings;

    persistState();
    render();
    showToast(`Imported ${offerings.length} offering${offerings.length !== 1 ? 's' : ''} successfully`, 'success', 2000);
  };

  reader.onerror = () => {
    showToast('Failed to read CSV file', 'error');
  };

  reader.readAsText(file);
}

// Handle comparison logic
function handleComparison() {
  const comparisonErrorEl = $('#comparisonError');
  if (comparisonErrorEl) comparisonErrorEl.style.display = 'none'; // Hide previous error

  const { scenario1Id, scenario2Id } = getSelectedComparisonScenarios();

  if (!scenario1Id || !scenario2Id) {
    const compRes = $('#comparisonResults');
    if (compRes) compRes.style.display = 'none';
    return;
  }

  // Close the scenario modal and open the diff view
  closeScenarioModal();
  showScenarioComparisonDiff(scenario1Id, scenario2Id);
}

// Show full-width side-by-side scenario comparison diff
function showScenarioComparisonDiff(id1, id2) {
  // Check for temp comparison scenarios first (from shared links), then use saved scenarios
  let tempScenarios = [];
  const tempData = localStorage.getItem('profitpath-temp-compare');
  if (tempData) {
    try {
      tempScenarios = JSON.parse(tempData);
    } catch (e) {
      console.warn('Failed to parse temp comparison data:', e);
    }
  }

  const allScenarios = [...tempScenarios, ...getAllScenarios()];
  const scenario1 = allScenarios.find(s => s.id === id1);
  const scenario2 = allScenarios.find(s => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for comparison');
    return;
  }

  // Compute metrics for both scenarios
  const metrics1 = calc(scenario1.data || scenario1.state);
  const metrics2 = calc(scenario2.data || scenario2.state);

  // Define metrics to compare with hints about what's "better"
  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt, betterIsHigher: true },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0, betterIsHigher: true },
    { label: 'Net Income', key: 'income', format: fmtMoney0, betterIsHigher: true },
    { label: 'Utilization', key: 'capacityPct', format: fmtPct1, betterIsHigher: true },
    { label: 'Fixed Costs', key: 'totalFixedCosts', format: fmtMoney0, betterIsHigher: false },
    { label: 'Variable Costs', key: 'variableCosts', format: fmtMoney0, betterIsHigher: false },
    { label: 'Break-even Clients', key: 'breakEvenClients', format: fmtInt, betterIsHigher: false },
    { label: 'Contribution Margin/Client', key: 'contributionMarginPerClient', format: fmtMoney0, betterIsHigher: true }
  ];

  // Build header row
  let contentHtml = '<div class="scenario-diff-wrap">';
  contentHtml += '<div class="scenario-diff-header">';
  contentHtml += '<div class="diff-col-label"></div>';
  contentHtml += '<div class="diff-col-s1"><strong>' + escapeHtml(scenario1.name) + '</strong><span class="diff-date">' + escapeHtml(scenario1.timestamp) + '</span></div>';
  contentHtml += '<div class="diff-col-s2"><strong>' + escapeHtml(scenario2.name) + '</strong><span class="diff-date">' + escapeHtml(scenario2.timestamp) + '</span></div>';
  contentHtml += '<div class="diff-col-delta">Change</div>';
  contentHtml += '</div>';

  // Build summary metrics section
  contentHtml += '<div class="scenario-diff-section-title">Summary</div>';
  contentHtml += '<div class="scenario-diff-table">';

  metricsToCompare.forEach(m => {
    const val1 = metrics1[m.key];
    const val2 = metrics2[m.key];
    const delta = val2 - val1;
    const deltaStr = m.format(delta);

    // Determine diff class (better/worse/neutral)
    let diffClass = 'diff-neutral';
    if (delta !== 0) {
      const isImprovement = m.betterIsHigher ? (delta > 0) : (delta < 0);
      diffClass = isImprovement ? 'diff-better' : 'diff-worse';
    }

    const sign = delta > 0 ? '+' : '';
    contentHtml += '<div class="scenario-diff-row">';
    contentHtml += '<div class="diff-col-label">' + m.label + '</div>';
    contentHtml += '<div class="diff-col-s1">' + m.format(val1) + '</div>';
    contentHtml += '<div class="diff-col-s2">' + m.format(val2) + '</div>';
    contentHtml += '<div class="diff-col-delta ' + diffClass + '">' + sign + deltaStr + '</div>';
    contentHtml += '</div>';
  });

  contentHtml += '</div>';

  // Add export and sharing options
  contentHtml += '<div class="scenario-diff-section-title">Export & Share</div>';
  contentHtml += '<div class="scenario-diff-export-options" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">';
  contentHtml += '<button class="btn primary" onclick="window.exportComparisonAsCSV(\'' + id1 + '\', \'' + id2 + '\')">📊 Export CSV</button>';
  contentHtml += '<button class="btn secondary" onclick="window.shareComparison(\'' + id1 + '\', \'' + id2 + '\')">🔗 Share Comparison</button>';
  contentHtml += '<button class="btn secondary" onclick="window.exportComparisonAsPDF(\'' + id1 + '\', \'' + id2 + '\')">📄 Export PDF</button>';
  contentHtml += '<button class="btn secondary" onclick="window.getComparisonEmbedCode(\'' + id1 + '\', \'' + id2 + '\')">📋 Get Embed Code</button>';
  contentHtml += '</div>';

  // Per-offering breakdown (if offerings match by name)
  if (metrics1.offeringMetrics && metrics2.offeringMetrics) {
    const names1 = metrics1.offeringMetrics.map(o => o.name);
    const names2 = metrics2.offeringMetrics.map(o => o.name);
    const namesMatch = names1.length === names2.length && names1.every((n, i) => n === names2[i]);

    if (namesMatch && metrics1.offeringMetrics.length > 0) {
      contentHtml += '<div class="scenario-diff-section-title">By Offering</div>';

      metrics1.offeringMetrics.forEach((off1, idx) => {
        const off2 = metrics2.offeringMetrics[idx];
        contentHtml += '<div class="scenario-diff-offering">';
        contentHtml += '<div class="scenario-diff-offering-name">' + escapeHtml(off1.name) + '</div>';
        contentHtml += '<div class="scenario-diff-table">';

        // Revenue
        const revDelta = off2.revenue - off1.revenue;
        const revIsImp = revDelta > 0;
        contentHtml += '<div class="scenario-diff-row scenario-diff-offering-row">';
        contentHtml += '<div class="diff-col-label">Revenue</div>';
        contentHtml += '<div class="diff-col-s1">' + fmtMoney0(off1.revenue) + '</div>';
        contentHtml += '<div class="diff-col-s2">' + fmtMoney0(off2.revenue) + '</div>';
        contentHtml += '<div class="diff-col-delta ' + (revDelta === 0 ? 'diff-neutral' : revIsImp ? 'diff-better' : 'diff-worse') + '">' + (revDelta > 0 ? '+' : '') + fmtMoney0(revDelta) + '</div>';
        contentHtml += '</div>';

        // Clients
        const clientDelta = off2.clients - off1.clients;
        const clientIsImp = clientDelta > 0;
        contentHtml += '<div class="scenario-diff-row scenario-diff-offering-row">';
        contentHtml += '<div class="diff-col-label">Clients</div>';
        contentHtml += '<div class="diff-col-s1">' + fmtInt(off1.clients) + '</div>';
        contentHtml += '<div class="diff-col-s2">' + fmtInt(off2.clients) + '</div>';
        contentHtml += '<div class="diff-col-delta ' + (clientDelta === 0 ? 'diff-neutral' : clientIsImp ? 'diff-better' : 'diff-worse') + '">' + (clientDelta > 0 ? '+' : '') + fmtInt(clientDelta) + '</div>';
        contentHtml += '</div>';

        // Margin %
        const marginPct1 = off1.marginPct || 0;
        const marginPct2 = off2.marginPct || 0;
        const marginDelta = marginPct2 - marginPct1;
        const marginIsImp = marginDelta > 0;
        contentHtml += '<div class="scenario-diff-row scenario-diff-offering-row">';
        contentHtml += '<div class="diff-col-label">Margin %</div>';
        contentHtml += '<div class="diff-col-s1">' + fmtPct1(marginPct1) + '</div>';
        contentHtml += '<div class="diff-col-s2">' + fmtPct1(marginPct2) + '</div>';
        contentHtml += '<div class="diff-col-delta ' + (marginDelta === 0 ? 'diff-neutral' : marginIsImp ? 'diff-better' : 'diff-worse') + '">' + (marginDelta > 0 ? '+' : '') + fmtPct1(marginDelta) + '</div>';
        contentHtml += '</div>';

        contentHtml += '</div>';
        contentHtml += '</div>';
      });
    }
  }

  contentHtml += '</div>';

  // Create and show modal with onClose callback to return to scenarios
  createModal({
    title: 'Scenario Comparison: ' + escapeHtml(scenario1.name) + ' vs ' + escapeHtml(scenario2.name),
    content: contentHtml,
    size: 'full',
    onClose: () => openScenarioModal()
  });
}

// Export comparison as CSV
window.exportComparisonAsCSV = function (id1, id2) {
  const scenarios = getAllScenarios();
  const scenario1 = scenarios.find(s => s.id === id1);
  const scenario2 = scenarios.find(s => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for export');
    return;
  }

  const metrics1 = calc(scenario1.data || scenario1.state);
  const metrics2 = calc(scenario2.data || scenario2.state);

  // Create CSV content. Every cell goes through csvCell so untrusted names and
  // negative numbers (which start with '-') can't be executed as spreadsheet formulas.
  const cell = misc.csvCell;
  let csvContent = ['Metric', cell(scenario1.name), cell(scenario2.name), 'Change'].join(',') + '\n';

  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
    { label: 'Net Income', key: 'income', format: fmtMoney0 },
    { label: 'Utilization', key: 'capacityPct', format: fmtPct1 },
    { label: 'Fixed Costs', key: 'totalFixedCosts', format: fmtMoney0 },
    { label: 'Variable Costs', key: 'variableCosts', format: fmtMoney0 },
    { label: 'Break-even Clients', key: 'breakEvenClients', format: fmtInt },
    { label: 'Contribution Margin/Client', key: 'contributionMarginPerClient', format: fmtMoney0 }
  ];

  metricsToCompare.forEach(m => {
    const val1 = metrics1[m.key];
    const val2 = metrics2[m.key];
    const delta = val2 - val1;
    const sign = delta > 0 ? '+' : '';

    csvContent += [cell(m.label), cell(m.format(val1)), cell(m.format(val2)), cell(sign + m.format(delta))].join(',') + '\n';
  });

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Strip characters that don't belong in a filename (names can be untrusted).
  const safeFileName = (n) => String(n || 'scenario').replace(/[^a-z0-9 _-]+/gi, '').trim().slice(0, 60) || 'scenario';
  a.download = `scenario-comparison-${safeFileName(scenario1.name)}-vs-${safeFileName(scenario2.name)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Share comparison link with full scenario state encoded in URL
window.shareComparison = function (id1, id2) {
  const scenarios = getAllScenarios();
  const scenario1 = scenarios.find(s => s.id === id1);
  const scenario2 = scenarios.find(s => s.id === id2);

  if (!scenario1 || !scenario2) {
    showToast('Unable to load scenarios for sharing', 'error');
    return;
  }

  let shareUrl;
  try {
    // unicode-safe base64: encodeURIComponent handles multi-byte chars
    const json = JSON.stringify({
      s1: { name: scenario1.name, state: scenario1.state },
      s2: { name: scenario2.name, state: scenario2.state }
    });
    const statePayload = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/gi, (_, p) => String.fromCharCode(parseInt(p, 16))));
    shareUrl = window.location.origin + window.location.pathname + '?compareStates=' + encodeURIComponent(statePayload);
  } catch (e) {
    showToast('Unable to generate share link', 'error');
    return;
  }

  const showFallbackModal = () => {
    createModal({
      title: '🔗 Share Comparison',
      content: `<p style="color:var(--text);margin-bottom:8px;">Shareable link for this comparison:</p><textarea readonly class="copy-on-click" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--surface-2);color:var(--text);font-family:var(--mono);font-size:12px;min-height:80px;word-break:break-all;box-sizing:border-box;">${shareUrl}</textarea><p class="copy-field-hint">Click the field to copy</p>`,
      size: 'medium'
    });
  };

  if (!navigator.clipboard) {
    showFallbackModal();
    return;
  }

  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast('Comparison link copied to clipboard!');
  }).catch(showFallbackModal);
};

// Export comparison as PDF
window.exportComparisonAsPDF = function (id1, id2) {
  const scenarios = getAllScenarios();
  const scenario1 = scenarios.find(s => s.id === id1);
  const scenario2 = scenarios.find(s => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for export');
    return;
  }

  // Create a printable version of the comparison
  const printWindow = window.open('', '_blank');
  const metrics1 = calc(scenario1.data || scenario1.state);
  const metrics2 = calc(scenario2.data || scenario2.state);

  const n1 = escapeHtml(scenario1.name);
  const n2 = escapeHtml(scenario2.name);
  let printContent = `
    <html>
      <head>
        <title>Scenario Comparison: ${n1} vs ${n2}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .positive { color: green; }
          .negative { color: red; }
        </style>
      </head>
      <body>
        <h1>Scenario Comparison</h1>
        <h2>${n1} vs ${n2}</h2>
        <table>
          <tr><th>Metric</th><th>${n1}</th><th>${n2}</th><th>Change</th></tr>
  `;

  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
    { label: 'Net Income', key: 'income', format: fmtMoney0 },
    { label: 'Utilization', key: 'capacityPct', format: fmtPct1 }
  ];

  metricsToCompare.forEach(m => {
    const val1 = metrics1[m.key];
    const val2 = metrics2[m.key];
    const delta = val2 - val1;
    const sign = delta > 0 ? '+' : '';
    const changeClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';

    printContent += `<tr><td>${m.label}</td><td>${m.format(val1)}</td><td>${m.format(val2)}</td><td class="${changeClass}">${sign}${m.format(delta)}</td></tr>`;
  });

  printContent += `
        </table>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

// Get embed code for comparison
window.getComparisonEmbedCode = function (id1, id2) {
  const scenarios = getAllScenarios();
  const scenario1 = scenarios.find(s => s.id === id1);
  const scenario2 = scenarios.find(s => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for embed code');
    return;
  }

  const embedUrl = window.location.origin + window.location.pathname + '?compare=' + id1 + ',' + id2 + '&embed=true';
  const embedCode = `<iframe src="${embedUrl}" width="800" height="600" frameborder="0"></iframe>`;

  // createModal already appends to body and wires close-on-scrim + ESC
  const overlay = createModal({
    title: '📋 Embed Comparison',
    content: `
      <p style="color:var(--text);margin-bottom:8px;">Embed code for this comparison:</p>
      <textarea readonly class="copy-on-click" style="width:100%;height:100px;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--surface-2);color:var(--text);font-family:var(--mono);font-size:12px;box-sizing:border-box;">${embedCode}</textarea>
      <p class="copy-field-hint">Click the field to copy</p>
      <p style="margin-top:6px;font-size:12px;color:var(--muted);">Preview: <a href="${embedUrl}" target="_blank" style="color:var(--accent);">Open in new tab</a></p>
    `,
    size: 'medium'
  });
};

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

// Event listener for compare button (dropdown changes no longer auto-trigger)
const compareBtn = $('#compareBtn');
if (compareBtn) {
  compareBtn.addEventListener('click', handleComparison);
}

// Contextual help content for KPI "?" buttons
const KPI_HELP = {
  'utilization': {
    title: 'Capacity Utilization',
    content: '<p>Utilization measures what percentage of your team\'s available billable hours are actually being used for client work.</p>' +
      '<p><strong>Formula:</strong> Service hours required ÷ (Employees × 2,080 hrs/yr × Productive utilization %)</p>' +
      '<ul style="margin:8px 0 0 16px;line-height:1.8">' +
      '<li><strong style="color:var(--good)">0–75%</strong> — Healthy, room to grow</li>' +
      '<li><strong style="color:var(--warn)">75–100%</strong> — Strong but approaching capacity</li>' +
      '<li><strong style="color:var(--bad)">&gt;100%</strong> — Over-committed; add staff or reduce clients</li>' +
      '</ul>' +
      '<p style="margin-top:8px;color:var(--muted);font-size:13px;">Tip: aim for 80–90% as your steady-state target — enough buffer to handle growth without burning out your team.</p>'
  },
  'contribution-margin': {
    title: 'Contribution Margin',
    content: '<p>Contribution margin is how much revenue each client contributes toward covering your fixed costs (rent, payroll, insurance) <em>after</em> paying the direct costs to serve them.</p>' +
      '<p><strong>Formula:</strong> (Client revenue per year) − (Variable costs per year for that client)</p>' +
      '<p>Once your total contribution margin across all clients exceeds your fixed costs, you\'re profitable.</p>' +
      '<p style="margin-top:8px;color:var(--muted);font-size:13px;">Tip: a negative contribution margin means you\'re losing money on each client — no amount of volume will fix that. Fix pricing or variable costs first.</p>'
  },
  'break-even': {
    title: 'Break-even Clients',
    content: '<p>Break-even clients is the minimum number of clients you need to cover <em>all</em> your costs — payroll, fixed overhead, and variable delivery costs.</p>' +
      '<p><strong>Formula:</strong> Total fixed costs ÷ Contribution margin per client</p>' +
      '<p>Below break-even = operating at a loss. Above it = every additional client is pure profit (until you hit capacity).</p>' +
      '<p style="margin-top:8px;color:var(--muted);font-size:13px;">Tip: the progress bar below the number shows how close your current client count is to break-even. Green = you\'ve crossed it.</p>'
  }
};

// Delegated handler: KPI help "?" buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.kpi-help-btn');
  if (!btn) return;
  e.stopPropagation();
  const topic = btn.dataset.topic;
  const help = KPI_HELP[topic];
  if (!help) return;
  createModal({ title: help.title, content: `<div style="line-height:1.7;color:var(--text)">${help.content}</div>`, size: 'sm' });
});

// Delegated handler: any .copy-on-click input or textarea selects-all and copies on click
document.addEventListener('click', (e) => {
  const el = e.target.closest('.copy-on-click');
  if (!el) return;
  el.select();
  el.classList.add('copy-on-click--copied');
  setTimeout(() => el.classList.remove('copy-on-click--copied'), 1500);

  const val = el.value;
  // Guard: optional-chaining alone is not safe to chain .then() on — check explicitly
  if (typeof navigator.clipboard?.writeText === 'function') {
    navigator.clipboard.writeText(val).then(() => {
      showToast('Copied to clipboard!');
    }).catch(() => {
      // Permission denied or API unavailable — fall back to selection + execCommand
      try { document.execCommand('copy'); } catch { /* */ }
      showToast('Copied to clipboard!');
    });
  } else {
    // No async Clipboard API — execCommand works because text is already selected
    try { document.execCommand('copy'); } catch { /* */ }
    showToast('Copied to clipboard!');
  }
});

// Load scenario from URL first (if present), then localStorage
const loadedFromURL = typeof loadScenarioFromURL === 'function' ? loadScenarioFromURL() : false;

// Restore last session's state from localStorage (auto-save read-back)
if (!loadedFromURL && typeof misc.loadState === 'function' && typeof misc.sanitizeScenarioState === 'function') {
  const persisted = misc.loadState();
  const sanitizedPersisted = persisted ? misc.sanitizeScenarioState(persisted) : null;
  if (sanitizedPersisted) Object.assign(state, sanitizedPersisted);
}

// Check for test scenario loading
if (typeof loadTestScenarios === 'function') loadTestScenarios();
if (typeof loadSpecificTestScenario === 'function') {
  const testScenarios = getTestScenarios();
  if (Object.keys(testScenarios).length > 0) {
    loadSpecificTestScenario(Object.keys(testScenarios).find(key => new URLSearchParams(window.location.search).get('testScenario') === key));
  }
}

// Check for shared comparison link
const compareStatesParam = new URLSearchParams(window.location.search).get('compareStates');
if (compareStatesParam) {
  try {
    const payload = JSON.parse(decodeURIComponent(atob(decodeURIComponent(compareStatesParam)).replace(/[^A-Za-z0-9@*_+\-.\/]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))));
    if (payload.s1 && payload.s2) {
      // Names come from an untrusted share link — coerce to a bounded string.
      // (They are also escaped at render time; this just caps storage size.)
      const safeName = (n) => String(n == null ? 'Shared scenario' : n).slice(0, 120);
      // Create temporary comparison scenarios in localStorage
      const tempScenarios = [
        { id: 'temp-s1', name: safeName(payload.s1.name), timestamp: new Date().toLocaleString(), state: payload.s1.state },
        { id: 'temp-s2', name: safeName(payload.s2.name), timestamp: new Date().toLocaleString(), state: payload.s2.state }
      ];
      localStorage.setItem('profitpath-temp-compare', JSON.stringify(tempScenarios));
    }
  } catch (e) {
    console.warn('Failed to decode comparison link:', e);
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

// Auto-open comparison if shared link was used
const tempCompareData = localStorage.getItem('profitpath-temp-compare');
if (tempCompareData && compareStatesParam) {
  try {
    const tempScenarios = JSON.parse(tempCompareData);
    if (tempScenarios.length === 2) {
      // Delay to ensure modal is ready
      setTimeout(() => {
        window.showScenarioComparisonDiff('temp-s1', 'temp-s2');
        // Clean up the temp data from localStorage
        localStorage.removeItem('profitpath-temp-compare');
        // Remove the compareStates param from the URL
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }, 100);
    }
  } catch (e) {
    console.warn('Failed to auto-open shared comparison:', e);
  }
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

  // Wire up undo/redo buttons
  const undoBtn = $('#undoBtn');
  const redoBtn = $('#redoBtn');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);

  // Keyboard shortcuts for undo/redo
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      redo();
    }
  });

  // Wire up CSV import button — guard prevents duplicate listeners when wire() is called multiple times
  const importBtn = $('#importCSVBtn');
  const csvFileInput = $('#csvFileInput');
  if (importBtn && csvFileInput && !importBtn._importWired) {
    importBtn._importWired = true;

    importBtn.addEventListener('click', () => {
      createModal({
        title: 'Import from CSV',
        content: `
          <p>Upload a CSV file to import your business settings and offerings.</p>
          <div id="csvDropZone" style="border: 2px dashed #5eead4; border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; background: rgba(94, 234, 212, 0.05);">
            <div style="color: #5eead4; font-weight: 600; margin-bottom: 8px;">Click to select or drag and drop CSV</div>
            <div style="font-size: 12px; color: var(--muted);">Supported: .csv files with business settings and offerings</div>
          </div>
        `,
        size: 'medium'
      });

      // Wire the drop zone after modal renders
      setTimeout(() => {
        const zone = document.getElementById('csvDropZone');
        if (!zone) return;

        zone.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const input = document.getElementById('csvFileInput');
          if (input && !input._pickerOpen) {
            input._pickerOpen = true;
            input.click();
          }
        });

        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.style.borderColor = '#60a5fa';
          zone.style.background = 'rgba(96, 165, 250, 0.1)';
        });

        zone.addEventListener('dragleave', () => {
          zone.style.borderColor = '#5eead4';
          zone.style.background = 'rgba(94, 234, 212, 0.05)';
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.style.borderColor = '#5eead4';
          zone.style.background = 'rgba(94, 234, 212, 0.05)';
          const file = e.dataTransfer.files[0];
          if (file) handleCSVImport(file);
        });
      }, 50);
    });

    csvFileInput.addEventListener('change', (e) => {
      csvFileInput._pickerOpen = false;
      if (e.target.files[0]) {
        handleCSVImport(e.target.files[0]);
      } else {
        closeModal();
      }
      csvFileInput.value = '';
    });

    // Also clear the guard on cancel (browsers that fire 'cancel' instead of 'change')
    csvFileInput.addEventListener('cancel', () => {
      csvFileInput._pickerOpen = false;
    });
  }
}

export { render, wire, setStateFromInputs, state };

// Sensitivity Analysis Panel
function initSensitivityPanel() {
  const toggle = $('#sensitivityToggle');
  const body = $('#sensitivityBody');
  if (!toggle || !body) return;

  // Restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-sensitivity-expanded');
  if (stored === '1') {
    // Small delay to allow CSS transitions to animate
    setTimeout(() => {
      body.classList.remove('collapsed');
      body.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
      initSliders();
    }, 50);
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    const expandedNow = !isCollapsed;
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    localStorage.setItem('profitpath-sensitivity-expanded', expandedNow ? '1' : '0');
    if (expandedNow) initSliders();
  });

  $('#sensitivityReset')?.addEventListener('click', () => {
    resetSliders();
    updateSensitivity();
  });
}

// Customer Analytics twisty (advanced feature). The markup existed but was never
// wired, so the toggle did nothing — connect it and render on expand.
function initCustomerAnalyticsPanel() {
  const toggle = $('#customerAnalyticsToggle');
  const body = $('#customerAnalyticsBody');
  const panel = $('#customerAnalyticsPanel');
  if (!toggle || !body || !panel) return;

  const renderPanel = () => {
    try {
      const m = calc(state);
      const metrics = { ...m, totalClients: m.totalClients ?? m.clients ?? 0 };
      panel.innerHTML = renderCustomerAnalyticsDashboard(metrics, {}).html;
    } catch (e) {
      console.warn('Customer analytics render failed:', e);
      panel.innerHTML = '<p style="color: var(--muted); text-align: center;">Unable to load customer analytics.</p>';
    }
  };

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    const expandedNow = !isCollapsed;
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    if (expandedNow) renderPanel();
  });
}

function initSliders() {
  const sliders = {
    price: $('#priceSlider'),
    overhead: $('#overheadSlider'),
    utilization: $('#utilizationSlider'),
    employees: $('#employeesSlider')
  };

  const labels = {
    price: '#priceSliderVal',
    overhead: '#overheadSliderVal',
    utilization: '#utilizationSliderVal',
    employees: '#employeesSliderVal'
  };

  // Get current state values for baseline
  const baseUtilization = state.productiveUtilizationPct || 75;
  const baseEmployees = state.employees || 1;

  sliders.utilization.value = baseUtilization;
  sliders.employees.value = baseEmployees;
  $(labels.utilization).textContent = baseUtilization + '%';
  $(labels.employees).textContent = baseEmployees;

  // Wire up slider input events
  sliders.price.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    $(labels.price).textContent = (val >= 0 ? '+' : '') + val + '%';
    updateSensitivity();
  });

  sliders.overhead.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    $(labels.overhead).textContent = (val >= 0 ? '+' : '') + val + '%';
    updateSensitivity();
  });

  sliders.utilization.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    $(labels.utilization).textContent = val + '%';
    updateSensitivity();
  });

  sliders.employees.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    $(labels.employees).textContent = val;
    updateSensitivity();
  });

  updateSensitivity();
}

function resetSliders() {
  $('#priceSlider').value = 0;
  $('#overheadSlider').value = 0;
  $('#utilizationSlider').value = state.productiveUtilizationPct || 75;
  $('#employeesSlider').value = state.employees || 1;

  $('#priceSliderVal').textContent = '+0%';
  $('#overheadSliderVal').textContent = '+0%';
  $('#utilizationSliderVal').textContent = (state.productiveUtilizationPct || 75) + '%';
  $('#employeesSliderVal').textContent = state.employees || 1;
}

function updateSensitivity() {
  // Get slider values
  const priceAdjust = (parseInt($('#priceSlider').value) || 0) / 100;
  const overheadAdjust = (parseInt($('#overheadSlider').value) || 0) / 100;
  const utilizationVal = parseInt($('#utilizationSlider').value) || 75;
  const employeesVal = parseInt($('#employeesSlider').value) || 1;

  // Build adjusted state copy
  const adjusted = JSON.parse(JSON.stringify(state));
  adjusted.productiveUtilizationPct = utilizationVal;
  adjusted.employees = employeesVal;

  // Apply price multiplier to all offerings
  if (priceAdjust !== 0) {
    adjusted.offerings = adjusted.offerings.map(o => ({
      ...o,
      priceMonthly: o.priceMonthly * (1 + priceAdjust)
    }));
  }

  // Apply overhead multiplier
  if (overheadAdjust !== 0) {
    adjusted.monthlyCosts = adjusted.monthlyCosts * (1 + overheadAdjust);
  }

  // Calculate baseline and adjusted
  const baseline = calc(state);
  const adjustedMetrics = calc(adjusted);

  // Build comparison table
  const rows = [
    { label: 'Employees', baseline: state.employees || 1, adjusted: employeesVal, isCurrency: false },
    { label: 'Revenue', baseline: baseline.revenue, adjusted: adjustedMetrics.revenue, isCurrency: true },
    { label: 'Net Income', baseline: baseline.income, adjusted: adjustedMetrics.income, isCurrency: true },
    { label: 'Utilization', baseline: baseline.capacityPct, adjusted: adjustedMetrics.capacityPct, isCurrency: false, isPercent: true },
    { label: 'Break-even Clients', baseline: baseline.breakEvenClients, adjusted: adjustedMetrics.breakEvenClients, isCurrency: false },
    { label: 'Take-Home', baseline: baseline.takeHome, adjusted: adjustedMetrics.takeHome, isCurrency: true }
  ];

  let tableHtml = '<table class="sensitivity-comparison"><thead><tr><th title="The metric being compared">Metric</th><th title="Current value from your saved state">Baseline</th><th title="Value after applying slider adjustments">Adjusted</th><th title="Difference between adjusted and baseline (green = positive, red = negative)">Change</th></tr></thead><tbody>';
  rows.forEach(row => {
    const baseVal = row.isCurrency ? fmtMoney0(row.baseline) : (row.isPercent ? Math.round(row.baseline) + '%' : Math.round(row.baseline));
    const adjVal = row.isCurrency ? fmtMoney0(row.adjusted) : (row.isPercent ? Math.round(row.adjusted) + '%' : Math.round(row.adjusted));
    const delta = row.adjusted - row.baseline;
    const deltaFormatted = row.isCurrency ? fmtMoney0(delta) : (row.isPercent ? Math.round(delta) + '%' : Math.round(delta));
    const deltaClass = delta > 0 ? 'sens-better' : (delta < 0 ? 'sens-worse' : 'sens-neutral');
    const sign = delta >= 0 ? '+' : '';
    tableHtml += `<tr><td>${row.label}</td><td>${baseVal}</td><td>${adjVal}</td><td class="${deltaClass}">${sign}${deltaFormatted}</td></tr>`;
  });
  tableHtml += '</tbody></table>';

  // Build tornado chart (horizontal bars showing impact of current slider adjustments)
  const impacts = [];

  // Price impact (current slider adjustment or default ±20%)
  if (priceAdjust !== 0) {
    const priceOnly = JSON.parse(JSON.stringify(state));
    priceOnly.offerings = priceOnly.offerings.map(o => ({ ...o, priceMonthly: o.priceMonthly * (1 + priceAdjust) }));
    const priceOnlyMetrics = calc(priceOnly);
    impacts.push({ label: 'Price', impact: Math.abs(priceOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const priceUp = JSON.parse(JSON.stringify(state));
    priceUp.offerings = priceUp.offerings.map(o => ({ ...o, priceMonthly: o.priceMonthly * 1.2 }));
    const priceDownMetrics = calc(priceUp);
    impacts.push({ label: 'Price', impact: Math.abs(priceDownMetrics.income - baseline.income) });
  }

  // Overhead impact (current slider adjustment or default ±20%)
  if (overheadAdjust !== 0) {
    const overheadOnly = JSON.parse(JSON.stringify(state));
    overheadOnly.monthlyCosts = overheadOnly.monthlyCosts * (1 + overheadAdjust);
    const overheadOnlyMetrics = calc(overheadOnly);
    impacts.push({ label: 'Overhead', impact: Math.abs(overheadOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const overheadUp = JSON.parse(JSON.stringify(state));
    overheadUp.monthlyCosts = overheadUp.monthlyCosts * 1.2;
    const overheadDownMetrics = calc(overheadUp);
    impacts.push({ label: 'Overhead', impact: Math.abs(baseline.income - overheadDownMetrics.income) });
  }

  // Utilization impact (current slider adjustment or default ±20%)
  const utilDelta = utilizationVal - (state.productiveUtilizationPct || 75);
  if (utilDelta !== 0) {
    const utilOnly = JSON.parse(JSON.stringify(state));
    utilOnly.productiveUtilizationPct = utilizationVal;
    const utilOnlyMetrics = calc(utilOnly);
    impacts.push({ label: 'Utilization', impact: Math.abs(utilOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const utilUp = JSON.parse(JSON.stringify(state));
    utilUp.productiveUtilizationPct = Math.min(150, (utilUp.productiveUtilizationPct || 75) * 1.2);
    const utilDownMetrics = calc(utilUp);
    impacts.push({ label: 'Utilization', impact: Math.abs(utilDownMetrics.income - baseline.income) });
  }

  // Employees impact (current slider adjustment or default ±20%)
  const empDelta = employeesVal - (state.employees || 1);
  if (empDelta !== 0) {
    const empOnly = JSON.parse(JSON.stringify(state));
    empOnly.employees = employeesVal;
    if (empOnly.fullTimeEmployees) empOnly.fullTimeEmployees = employeesVal;
    const empOnlyMetrics = calc(empOnly);
    impacts.push({ label: 'Employees', impact: Math.abs(empOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const empUp = JSON.parse(JSON.stringify(state));
    empUp.employees = Math.min(20, (empUp.employees || 1) * 1.2);
    const empDownMetrics = calc(empUp);
    impacts.push({ label: 'Employees', impact: Math.abs(empDownMetrics.income - baseline.income) });
  }

  // Sort by label to maintain consistent order (not by impact value)
  const labelOrder = ['Price', 'Overhead', 'Utilization', 'Employees'];
  impacts.sort((a, b) => {
    const idxA = labelOrder.indexOf(a.label);
    const idxB = labelOrder.indexOf(b.label);
    return idxA - idxB;
  });
  const maxImpact = Math.max(...impacts.map(i => i.impact), 1);

  // Build tornado SVG
  const barHeight = 20;
  const gap = 5;
  const labelWidth = 100;
  const chartWidth = 250;
  const valueWidth = 100; // space for the value text (increased for larger numbers like 15,790)
  let tornadoSvg = `<svg width="${labelWidth + chartWidth + valueWidth}" height="${impacts.length * (barHeight + gap) + 40}" style="margin-top: 8px;">`;
  tornadoSvg += '<text x="0" y="15" font-size="12" fill="var(--muted)" font-weight="600">Impact on Net Income</text>';

  impacts.forEach((item, idx) => {
    const y = 30 + idx * (barHeight + gap);
    const barWidth = (item.impact / maxImpact) * chartWidth;
    const tooltipText = getTornadoTooltip(item.label);
    tornadoSvg += `<text x="0" y="${y + barHeight - 3}" font-size="11" fill="var(--muted)">${item.label}</text>`;
    tornadoSvg += `<rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight - 2}" fill="var(--accent)" opacity="0.6" rx="2"><title>${tooltipText}</title></rect>`;
    tornadoSvg += `<text x="${labelWidth + barWidth + 4}" y="${y + barHeight - 3}" font-size="10" fill="var(--muted)" font-family="var(--mono)">${fmtMoney0(item.impact)}</text>`;
  });

  tornadoSvg += '</svg>';

  // Render into results div
  const resultsDiv = $('#sensitivityResults');
  if (resultsDiv) {
    resultsDiv.innerHTML = tableHtml + tornadoSvg;
  }
}

// Helper function to get tooltip text for tornado chart bars
function getTornadoTooltip(label) {
  const tooltips = {
    'Price': 'Impact of pricing changes on net income (revenue effect)',
    'Overhead': 'Impact of overhead cost changes on net income (cost effect)',
    'Utilization': 'Impact of utilization changes on net income (capacity effect)',
    'Employees': 'Impact of team size changes on net income (capacity + cost effect)'
  };
  return tooltips[label] || 'Impact on net income';
}

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
      pre.dataset.tooltip = 'Raw calculation engine output showing all computed metrics (for troubleshooting)';
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Debug — clients: ${res.clients || 0}, revenue: ${fmtMoney0(res.revenue || 0)}`;
    } catch (e) {
      pre.textContent = 'Error generating debug: ' + (e && e.stack ? e.stack : String(e));
      pre.dataset.tooltip = 'Error generating debug output';
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Debug — error`;
    }
  }

  // restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-debug-expanded');
  const expanded = stored === '1';
  if (expanded) {
    // Small delay to allow CSS transitions to animate
    setTimeout(() => {
      body.classList.remove('collapsed');
      body.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
      // Refresh debug data when panel is expanded on page load
      refreshDebug();
    }, 50);
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

// Performance monitoring panel (Advanced feature)
function initPerfPanel() {
  const toggle = $('#perfToggle');
  const body = $('#perfBody');
  const panel = $('#perfPanel');
  if (!toggle || !body || !panel) return;

  let perfInterval = null;

  function refreshPerf() {
    if (!panel || body.classList.contains('collapsed')) return;

    try {
      const stats = getCacheStats();
      const html = `
        <div title="Number of cached calculation results (improves performance by avoiding redundant calculations)"><span class="perf-label">Cache:</span> <span class="perf-value">${stats.size} / ${stats.maxSize}</span> entries</div>
        <div title="Percentage of calculations served from cache (higher is better)"><span class="perf-label">Hit rate:</span> <span class="perf-value">${stats.hitRate}%</span> (${stats.hits} hits, ${stats.misses} misses)</div>
        <div title="Time taken for the most recent calculation"><span class="perf-label">Last calc:</span> <span class="perf-value">${stats.lastCalcMs}ms</span></div>
        <div title="Total number of calculations performed this session"><span class="perf-label">Total calcs:</span> <span class="perf-value">${stats.totalCalcs}</span></div>
      `;
      panel.innerHTML = html;
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Performance — ${stats.hitRate}% hit rate`;
    } catch (e) {
      panel.innerHTML = '<div>Error: ' + escapeHtml(e.message) + '</div>';
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Performance — error`;
    }
  }

  // Restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-perf-expanded');
  const expanded = stored === '1';
  if (expanded) {
    // Small delay to allow CSS transitions to animate
    setTimeout(() => {
      body.classList.remove('collapsed');
      body.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
      // Refresh performance data when panel is expanded on page load
      refreshPerf();
    }, 50);
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    const expandedNow = !isCollapsed;
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    localStorage.setItem('profitpath-perf-expanded', expandedNow ? '1' : '0');

    if (expandedNow) {
      refreshPerf();
      perfInterval = setInterval(refreshPerf, 2000);
    } else if (perfInterval) {
      clearInterval(perfInterval);
      perfInterval = null;
    }
  });

  // Also update perf display on render
  const originalRender = window.render;
  window.render = function () {
    originalRender.apply(this, arguments);
    if (!body.classList.contains('collapsed')) {
      refreshPerf();
    }
  };
}

// Initialize debug, performance, and sensitivity panels after DOM is ready
try {
  initDebugPanel();
  initPerfPanel();
  initSensitivityPanel();
  initCustomerAnalyticsPanel();
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

// Migrate legacy unprefixed localStorage keys to profitpath- namespace (one-time, silent)
(function _migrateLegacyKeys() {
  const migrations = [
    ['onboardingCompleted', 'profitpath-onboarding-completed'],
    ['selectedIndustry',    'profitpath-selected-industry'],
  ];
  for (const [oldKey, newKey] of migrations) {
    const val = localStorage.getItem(oldKey);
    if (val !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, val);
    }
    if (val !== null) localStorage.removeItem(oldKey);
  }
})();

// Onboarding system for guided experience
const _initializeOnboarding = () => {
  // Check if user has completed onboarding
  const onboardingCompleted = localStorage.getItem('profitpath-onboarding-completed') === 'true';

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

  // Initialize enhanced tooltip system with current setting state
  try {
    const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
    const tooltipsEnabled = settings.showTooltips !== false;
    updateTooltipsUIOnly(tooltipsEnabled);
  } catch (e) {
    // Default to enabled if settings can't be read
    updateTooltipsUIOnly(true);
  }

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
    content: '<div class="welcome-content"><p>Get started with your profitability analysis in just a few minutes.</p><p>Would you like a quick guided tour of the key features?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="welcome-btn" data-action="tour" style="background:var(--accent);color:#06231a;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Take Tour</button><button class="welcome-btn" data-action="industry" style="background:var(--surface-2);color:var(--text);border:1px solid var(--border);padding:10px 20px;border-radius:6px;cursor:pointer;">Choose Industry</button><button class="welcome-btn" data-action="skip" style="background:transparent;color:var(--muted);border:none;padding:10px 20px;cursor:pointer;">Skip for Now</button></div>',
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
  localStorage.setItem('profitpath-selected-industry', industryId);

  // Load industry-specific template
  loadOnboardingIndustryTemplate(industryId);

  // Close dialog and show success message
  dialog.remove();

  const successDialog = createOnboardingDialog({
    title: 'Great choice! 🎯',
    content: '<div class="success-content"><p>We\'ve loaded a template configuration for your industry.</p><p>Would you like to take a quick tour to learn how to customize it?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="success-btn" data-action="tour" style="background:var(--accent);color:#06231a;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Show Me How</button><button class="success-btn" data-action="explore" style="background:var(--surface-2);color:var(--text);border:1px solid var(--border);padding:10px 20px;border-radius:6px;cursor:pointer;">Explore on My Own</button></div>',
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
  // Use the same INDUSTRY_TEMPLATES as single source of truth
  const template = INDUSTRY_TEMPLATES[industryId];
  if (template) {
    const config = template.config;

    // Apply template to current scenario - load all offerings like the main menu
    state.offerings = config.offerings.map(o => ({
      ...o,
      id: uuid(),
      mixPct: o.mixPct || (100 / config.offerings.length),
      currentClients: o.currentClients || 0
    }));

    // Apply employee and cost configuration
    state.fullTimeEmployees = config.fullTimeEmployees || 1;
    state.partTimeEmployees = config.partTimeEmployees || 0;
    state.fullTimeEmployeePay = config.fullTimeEmployeePay || 60000;
    state.partTimeEmployeePay = config.partTimeEmployeePay || 30000;
    state.monthlyCosts = config.monthlyCosts || 250;
    state.productiveUtilizationPct = config.productiveUtilizationPct || 80;
    state.targetUtilizationPct = config.targetUtilizationPct || 85;

    // Track that this data came from a template
    state.loadedTemplate = industryId;

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
  tourSteps = [
    {
      target: '.ab-logo',
      title: 'Welcome to ProfitPath',
      content: 'This is your profitability dashboard. Let\'s take a quick tour of the key areas.',
      position: 'bottom'
    },
    {
      target: '.inputs-fields .field',
      title: 'Choose Your Mode',
      content: 'Select <strong>Forecast</strong> mode to plan capacity for a target client count. Use <strong>Current</strong> mode to analyze your existing active client base.',
      position: 'right'
    },
    {
      target: '.team-config-group',
      title: 'Team Configuration',
      content: 'Enter your team size and compensation. ProfitPath assumes 2,080 paid hours per year per full-time employee.',
      position: 'right'
    },
    {
      target: '.offerings-section .section-h',
      title: 'Define Your Services',
      content: 'Add service offerings with pricing, session frequency, and per-session costs. Each offering can have different terms.',
      position: 'right'
    },
    {
      target: '.card-h:last-of-type',
      title: 'Net Income at a Glance',
      content: 'Your net income summary lives here. The pill turns green when profitable and red when you\'re running at a loss.',
      position: 'left'
    },
    {
      target: '.capacity',
      title: 'Capacity Utilization',
      content: 'Monitor how much of your team\'s billable time is in use. Aim for 80–90% — above that risks burnout; below means idle capacity.',
      position: 'left'
    },
    {
      target: '.break-even-section-wrapper',
      title: 'Break-even Analysis',
      content: 'See exactly how many clients and how much revenue you need to cover all costs. The progress bar shows how close you are.',
      position: 'left'
    },
    {
      target: '.charts-visualizations-container',
      title: 'Charts & Visualizations',
      content: 'Interactive charts help you visualize revenue mix, cost breakdown, and profitability trends.',
      position: 'left'
    },
    {
      target: '#appMenuBtn',
      title: 'Save, Export & Share',
      content: 'Open the menu to save scenarios, export reports (CSV, PDF, Excel), compare scenarios side-by-side, and share your analysis.',
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
  localStorage.setItem('profitpath-onboarding-completed', 'true');

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

  // Create progress dots
  const progressDots = steps.map((_, index) => '<span class="tour-dot ' + (index === stepIndex ? 'active' : '') + ' ' + (index < stepIndex ? 'completed' : '') + '" data-step="' + index + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;cursor:pointer;background:' + (index === stepIndex ? '#007bff' : index < stepIndex ? '#28a745' : '#ddd') + ';transition:all 0.2s;"></span>').join('');

  // Create tooltip (initially hidden to measure actual height)
  const tooltip = document.createElement('div');
  tooltip.className = 'onboarding-tooltip';
  tooltip.style.cssText = 'position: fixed;z-index: 10000;background: var(--surface);color: var(--text);border: 2px solid var(--accent, #007bff);border-radius: 8px;padding: 16px;box-shadow: var(--elev-4, 0 4px 12px rgba(0, 0, 0, 0.15));max-width: ' + (isMobile ? '280px' : '300px') + ';pointer-events: auto;font-size: ' + (isMobile ? '14px' : '16px') + ';visibility: hidden;opacity: 0;transition: opacity 0.3s ease-out;left: 0;top: 0;transform: translate(0, 0);';

  // Set content before measuring
  tooltip.innerHTML = '<div style="position:relative;padding-right:24px;"><button class="tour-exit-btn" style="position:absolute;top:0;right:0;background:transparent;border:none;font-size:16px;cursor:pointer;color:var(--text, #666);padding:4px;line-height:1;">✕</button><div style="font-weight:bold;margin-bottom:8px;color:var(--text, #007bff);">' + step.title + '</div><div style="margin-bottom:16px;color:var(--text, #333);line-height:1.4;">' + step.content + '</div><div style="display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative;"><div class="tour-navigation" style="display:flex;align-items:center;">' + (stepIndex > 0 ? '<button class="tour-arrow tour-arrow-prev" data-direction="prev" style="background:var(--surface-2);border:1px solid var(--border);border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;font-size:18px;line-height:1;">‹</button>' : '<div style="width:32px;"></div>') + '<div class="tour-dots" style="display:flex;align-items:center;">' + progressDots + '</div>' + (stepIndex < steps.length - 1 ? '<button class="tour-arrow tour-arrow-next" data-direction="next" style="background:#007bff;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:18px;line-height:1;">›</button>' : '<button class="tour-finish-btn" style="background:#28a745;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:16px;line-height:1;">✓</button>') + '</div></div></div>';

  // Append to DOM (invisible) and measure actual height
  document.body.appendChild(tooltip);
  const tooltipHeight = tooltip.offsetHeight;

  // Now recalculate position with actual height
  let finalTop = top;
  const finalTransform = transform;

  // Clamp to the viewport in a transform-aware way. `left`/`finalTop` are the
  // anchor point; the transform shifts the box by a fraction of its own size
  // (e.g. translate(-100%) for a tooltip placed to the left of the target). The
  // old clamp ignored the transform, so 'left'/'right'/'top' tooltips got shoved
  // back on top of the element they were pointing at.
  const fracOf = (axis) => {
    const m = finalTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!m) return 0;
    const v = (axis === 'x' ? m[1] : m[2]).trim();
    if (v.includes('-100%')) return -1;
    if (v.includes('-50%')) return -0.5;
    return 0;
  };
  // Horizontal: keep the rendered box (left + fx*width .. + width) on screen.
  const fx = fracOf('x');
  let renderedLeft = left + fx * tooltipWidth;
  if (renderedLeft < 10) renderedLeft = 10;
  if (renderedLeft + tooltipWidth > window.innerWidth - 10) renderedLeft = window.innerWidth - tooltipWidth - 10;
  left = renderedLeft - fx * tooltipWidth;
  // Vertical: same, for the rendered top.
  const fy = fracOf('y');
  let renderedTop = finalTop + fy * tooltipHeight;
  if (renderedTop < 10) renderedTop = 10;
  if (renderedTop + tooltipHeight > window.innerHeight - 10) renderedTop = window.innerHeight - tooltipHeight - 10;
  finalTop = renderedTop - fy * tooltipHeight;

  // Set final position while still invisible (prevents jump)
  tooltip.style.left = left + 'px';
  tooltip.style.top = finalTop + 'px';
  tooltip.style.transform = finalTransform;

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

  // Highlighting: place a fixed overlay around the target so we don't rely on modifying
  // the target's own styles (avoids stacking-context/overflow issues and layout shifts).
  const OVERLAY_PAD = 9; // pixels to expand the highlight beyond the element (increased by 1 to keep outer perimeter)
  const BORDER_THICKNESS = 7; // highlight border thickness (reduced by 1px for less clipping)

  const rect2 = target.getBoundingClientRect();
  const computed = window.getComputedStyle(target);
  // If the target has no rounded corners, use a mild default so highlights look rounded
  const parsedBR = parseFloat(computed.borderRadius) || 0;
  const borderRadius = (parsedBR && parsedBR > 4) ? parsedBR + 'px' : '10px';

  // Create overlay invisibly (will show with tooltip)
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.cssText = 'position: fixed;left: ' + (rect2.left - OVERLAY_PAD) + 'px;top: ' + (rect2.top - OVERLAY_PAD) + 'px;width: ' + (rect2.width + OVERLAY_PAD * 2) + 'px;height: ' + (rect2.height + OVERLAY_PAD * 2) + 'px;border: ' + BORDER_THICKNESS + 'px solid #007bff;border-radius: ' + borderRadius + ';box-shadow: 0 8px 32px rgba(0, 123, 255, 0.12);pointer-events: none;z-index: 9999;opacity: 0;transition: opacity 0.3s ease-out;animation: pulse 2s infinite;';

  // Append both overlay and tooltip to DOM (both invisible)
  document.body.appendChild(overlay);

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

  // Double rAF: first frame commits layout, second frame reveals both together (prevents position jump)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
      overlay.style.opacity = '1';
    });
  });

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
  // Theme-aware surface (was hardcoded white, which broke in dark mode).
  dialogContent.className = 'onboarding-dialog-card';
  dialogContent.style.cssText = 'background: var(--surface);color: var(--text);border: 1px solid var(--border-strong);border-radius: 16px;padding: 24px;max-width: 500px;width: 90%;box-shadow: var(--elev-4, 0 8px 32px rgba(0, 0, 0, 0.2));';

  dialogContent.innerHTML = '<h2 style="margin:0 0 16px 0;color:var(--text);font-size:24px;">' + title + '</h2><div style="color:var(--text);line-height:1.5;">' + content + '</div><div style="margin-top:24px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">' + buttons.map((btn, index) => '<button class="dialog-btn ' + (btn.primary ? 'primary' : 'secondary') + '" data-action="' + index + '" data-primary="' + (btn.primary ? 'true' : 'false') + '" style="padding:8px 16px;border:' + (btn.primary ? 'none' : '1px solid var(--border)') + ';border-radius:8px;background:' + (btn.primary ? 'var(--accent)' : 'var(--surface-2)') + ';color:' + (btn.primary ? 'var(--accent-contrast, #fff)' : 'var(--text)') + ';cursor:pointer;font-weight:' + (btn.primary ? '700' : '550') + ';">' + btn.text + '</button>').join('') + '</div>';

  // Shared close that also tears down the Escape listener. Parity with the rest
  // of the app's modals/sheets, which all close on Esc and on scrim click.
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => {
    dialog.remove();
    document.removeEventListener('keydown', onKey);
  };
  document.addEventListener('keydown', onKey);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });

  // Add event listeners for dialog buttons
  setTimeout(() => {
    const dialogBtns = dialogContent.querySelectorAll('.dialog-btn');
    dialogBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const action = buttons[index]?.action;
        close();
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
  // Reflect the current tooltip state so the option toggles (Enable <-> Disable)
  // rather than always offering to enable.
  let tipsOn = true;
  try {
    tipsOn = JSON.parse(localStorage.getItem('profitpath-settings') || '{}').showTooltips !== false;
  } catch { /* default on */ }
  const btnStyle = 'display:block;width:100%;padding:12px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;text-align:left;cursor:pointer;';
  const tooltipsBtn = tipsOn
    ? '<button class="help-menu-btn" data-action="tooltips" style="' + btnStyle + '">🚫 <strong>Disable Tooltips</strong><br><small>Turn off contextual help throughout the app</small></button>'
    : '<button class="help-menu-btn" data-action="tooltips" style="' + btnStyle + '">💡 <strong>Show Tooltips</strong><br><small>Enable contextual help throughout the app</small></button>';

  const helpDialog = createOnboardingDialog({
    title: 'Help & Learning Center',
    content: '<div style="display:grid;gap:12px;">' +
      '<button class="help-menu-btn" data-action="tour" style="' + btnStyle + '">🎯 <strong>Take Guided Tour</strong><br><small>Step-by-step walkthrough of key features</small></button>' +
      '<button class="help-menu-btn" data-action="faq" style="' + btnStyle + '">📖 <strong>Quick Reference</strong><br><small>Common questions and calculation formulas</small></button>' +
      '<button class="help-menu-btn" data-action="industry" style="' + btnStyle + '">🏢 <strong>Change Industry</strong><br><small>Switch to a different business template</small></button>' +
      tooltipsBtn +
      '</div>',
    buttons: [
      { text: 'Close', action: () => { } }
    ]
  });

  // Delegated listener on the dialog element — no setTimeout needed
  helpDialog.addEventListener('click', (e) => {
    const btn = e.target.closest('.help-menu-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    helpDialog.remove();
    if (action === 'tour') startGuidedTour();
    else if (action === 'faq') showQuickReference();
    else if (action === 'industry') showIndustrySelector();
    else if (action === 'tooltips') { if (tipsOn) hideContextualHelp(); else showContextualHelp(); }
  });

  document.body.appendChild(helpDialog);
}

function showQuickReference() {
  const faqHtml = `
<div style="line-height:1.7;color:var(--text)">
  <h4 style="margin:0 0 6px;color:var(--text)">Forecast vs Current mode</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px"><strong style="color:var(--text)">Forecast</strong> — set a target client count; ProfitPath calculates the capacity and revenue you'd need. <strong style="color:var(--text)">Current</strong> — enter your actual active client counts per offering; ProfitPath shows your live utilization and profitability.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">How utilization is calculated</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Service hours required ÷ (Employees × 2,080 hrs/yr × Productive utilization %). Target 80–90% for a healthy, sustainable pace.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">What contribution margin means</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Revenue per client per year minus the variable costs to serve them. Each client's contribution margin goes toward covering your fixed costs (rent, payroll, insurance). When the total exceeds fixed costs, you're profitable.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">Break-even clients</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Fixed costs ÷ Contribution margin per client. Below this number = operating at a loss. Above it = profitable. The progress bar shows how close you are.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">Saving and comparing scenarios</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Use <strong style="color:var(--text)">Scenarios</strong> (app menu or bottom bar) to save your current setup with a name. Load it later, or select two saved scenarios and hit <strong style="color:var(--text)">Compare</strong> to see a side-by-side diff of every metric.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">Exporting and sharing</h4>
  <p style="margin:0 0 0;color:var(--muted);font-size:13px">Open the app menu → <strong style="color:var(--text)">Export</strong> for CSV, Excel, PDF, HTML, email, and embed options. Use <strong style="color:var(--text)">Share</strong> to generate a URL that encodes your current scenario so others can view it without any account.</p>
</div>`;

  createModal({ title: 'Quick Reference', content: faqHtml, size: 'md' });
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
      element.dataset.tooltip = content;
    }
  });
}

// Silent tooltip UI update (no toast) - for syncing with settings
function updateTooltipsUIOnly(enabled) {
  const tooltipElements = document.querySelectorAll('[title]');

  if (enabled) {
    // Enable tooltips without showing toast
    tooltipElements.forEach(el => {
      if (!el.dataset.tooltipEnabled) {
        el.dataset.originalTitle = el.title;
        el.dataset.tooltipEnabled = 'true';
        el.title = '';
        el.addEventListener('mouseenter', showEnhancedTooltip);
        el.addEventListener('mouseleave', hideEnhancedTooltip);
      }
    });
  } else {
    // Disable tooltips without showing toast
    tooltipElements.forEach(el => {
      if (el.dataset.tooltipEnabled === 'true') {
        el.title = el.dataset.originalTitle || '';
        delete el.dataset.tooltipEnabled;
        delete el.dataset.originalTitle;
        el.removeEventListener('mouseenter', showEnhancedTooltip);
        el.removeEventListener('mouseleave', hideEnhancedTooltip);
        // Clear tooltip if it's currently showing
        if (el._tooltip) {
          el._tooltip.remove();
          delete el._tooltip;
        }
      }
    });
    // Clear any existing tooltips
    const activeTooltips = document.querySelectorAll('.enhanced-tooltip');
    activeTooltips.forEach(t => t.remove());
  }
}

function hideContextualHelp() {
  // Disable enhanced tooltips with confirmation toast
  updateTooltipsUIOnly(false);

  // Update settings to reflect tooltips are disabled
  setTooltipsEnabled(false);
  if (updateSetting) {
    updateSetting('showTooltips', false);
  }

  // Show confirmation
  showToast('Contextual tooltips disabled.', 'info', 1800);
}

function showContextualHelp() {
  // Enable enhanced tooltips with confirmation toast
  updateTooltipsUIOnly(true);

  // Update settings to reflect tooltips are enabled
  setTooltipsEnabled(true);
  if (updateSetting) {
    updateSetting('showTooltips', true);
  }

  // Show confirmation
  showToast('Contextual tooltips enabled! Hover over elements to see help.', 'info', 1800);
}

function showEnhancedTooltip(e) {
  // Check if tooltips are actually enabled (check localStorage for current setting)
  try {
    const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
    if ('showTooltips' in settings && settings.showTooltips === false) {
      hideEnhancedTooltip(e);
      return;
    }
  } catch (err) {
    // Continue with default behavior if settings can't be read
  }

  const content = e.target.dataset.originalTitle;
  if (!content) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'enhanced-tooltip';
  tooltip.textContent = content;
  tooltip.style.cssText = 'position: fixed;background: #333;color: white;padding: 8px 12px;border-radius: 4px;font-size: 12px;z-index: 10002;pointer-events: none;max-width: 200px;word-wrap: break-word;';

  document.body.appendChild(tooltip);

  const rect = e.target.getBoundingClientRect();
  const tRect = tooltip.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;

  // Clamp left so tooltip doesn't overflow viewport edges
  const halfWidth = tRect.width / 2;
  const clampedLeft = Math.min(Math.max(centerX, halfWidth + 8), window.innerWidth - halfWidth - 8);
  tooltip.style.left = clampedLeft + 'px';
  tooltip.style.transform = 'translateX(-50%)';

  // Force below if element has data-tooltip-below, or if too close to the top
  if ('tooltipBelow' in e.target.dataset || rect.top - tRect.height - 12 < 0) {
    tooltip.style.top = (rect.bottom + 8) + 'px';
  } else {
    tooltip.style.top = (rect.top - 8) + 'px';
    tooltip.style.transform += ' translateY(-100%)';
  }

  e.target._tooltip = tooltip;
}

function hideEnhancedTooltip(e) {
  if (e.target && e.target._tooltip) {
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
if (typeof showScenarioComparisonDiff === 'function') window.showScenarioComparisonDiff = showScenarioComparisonDiff;
// Scenarios initialization removed - handled by main wiring

// Initialize scenarios when DOM is ready - REMOVED to prevent conflicts with new modal system
// initializeScenarios();

initializeProgressiveDisclosure();
initTooltips();

// Initialize the app
if (typeof document !== 'undefined') {
  wire();
}