import { calc, getCacheStats, normalizeOfferingType } from '../src/calculations/index';
import { floorStatus, rankOfferings } from '../src/calculations/offeringRanking';
import { displayPrice, isOneTime, isPerSession, monthlyFromPerSession, priceMonthlyForNewVisits } from '../src/calculations/offeringPrice';
import { bandMoves, calcRange, calcRangeDrivers, suggestRanges, sanitizeOfferingRange } from '../src/calculations/ranges';
import { getRangeCase } from '../src/calculations/rangeCase';
import { confidenceBadgeHtml, getSpreads, initRangeCase, initSpreadInputs, renderRangeCase, syncConfidenceBadge } from './components/RangeCasePanel';
import { marketBadge, sanitizeOfferingMarket } from '../src/calculations/marketPosition';
import { CONFIDENCE_LEVELS, CONFIDENCE_LABELS, MAX_NOTE_LENGTH, sanitizeOfferingMeta } from '../src/calculations/offeringMeta';
import { EXPENSE_CATEGORIES, EXPENSE_FREQUENCIES, DEFAULT_LIFE_YEARS, monthlyCategorySpend, scaleOverhead, sanitizeExpenses, costBreakdown } from '../src/calculations/expenses';
import { sanitizeResources } from '../src/calculations/resources';
import { pruneMembership } from '../src/calculations/membership';
import { initGroupRunsPanel, renderGroupRunResults, renderGroupRunsTable } from './components/GroupRunsPanel';
import { initMembershipPanel, renderMembershipPanel, renderMembershipResults } from './components/MembershipPanel';
import { captureTableFocus, restoreTableFocus } from './hooks/useTableFocus';
import { openScenarioModal, renderScenariosList } from './components/UIHelpers';
import { handleComparison, handleCSVImport, initScenarioComparison, populateComparisonDropdowns, showScenarioComparisonDiff } from './components/ScenarioComparison';
import { fmtInt, fmtPct1 } from './utils/format';
import { initDebugPanel, initPerfPanel } from './components/DebugPanel';
import { enterReadOnlyMode, hideContextualHelp, initOnboarding, updateTooltipsUIOnly } from './components/Onboarding';
import { initializeProgressiveDisclosure } from './utils/progressiveDisclosure';
import { initTooltips, setTooltipsEnabled } from './utils/tooltipManager';
import * as misc from './services/miscService';
import * as businessLogic from './services/businessLogic';
import { saveScenario, loadScenario, deleteScenario } from './services/scenarioService';
import { closeScenarioModal, createModal } from './components/Modal';
import { getAllScenarios, encodeScenarioToURL, decodeScenarioFromURL, isReadOnlyURL, getShareBase } from './services/miscService';
import { uuid, clamp } from './utils/helpers';
import { showToast } from './services/modalService';
import { renderCustomerAnalyticsDashboard } from '../src/analytics/customer-ui';
import { fmtMoney0, normalizeCurrency, taxBasisNote } from '../src/calculations/currency';
import { optimizeMix } from '../src/insights/mixOptimizer';
import { generateInsights, generateWhatIfScenarios } from '../src/insights/insightsEngine';
import { INDUSTRY_TEMPLATES } from './services/industryTemplates';
import { wizardScenarios, previewScenario } from '../src/insights/whatIfWizard';
import { getReverseCalculation, getRecommendedStrategy } from '../src/insights/reverseCalculator';
import { renderSensitivityHeatmap, renderScorecardRadar, renderClientFunnel } from './services/advancedChartsService';

// Untyped views for the (...args) forwarding wrappers below; real signatures are checked at direct call sites.
const miscAny = /** @type {any} */ (misc);
const businessLogicAny = /** @type {any} */ (businessLogic);

// wrapper around miscService helper to avoid ReferenceErrors in test env
const restoreScheduling = (...args) => (misc && typeof misc.restoreScheduling === 'function') ? miscAny.restoreScheduling(...args) : undefined;

// HTML escape helper
const escapeHtml = (...args) => (misc && typeof misc.escapeHtml === 'function') ? miscAny.escapeHtml(...args) : (args[0] == null ? '' : String(args[0]));

// other utility wrappers - remove functions that don't exist
const loadScenarioFromURL = (...args) => (misc && typeof misc.loadScenarioFromURL === 'function') ? miscAny.loadScenarioFromURL(...args) : undefined;

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


// Make INDUSTRY_TEMPLATES globally available
if (typeof window !== 'undefined') {
  window.INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES;
}

// Additional function wrappers to prevent ReferenceErrors - only include functions that exist
const loadSettings = (...args) => (misc && typeof misc.loadSettings === 'function') ? miscAny.loadSettings(...args) : (() => ({}));
const setExperienceLevel = (...args) => (misc && typeof misc.setExperienceLevel === 'function') ? miscAny.setExperienceLevel(...args) : undefined;
const updateSetting = (...args) => (misc && typeof misc.updateSetting === 'function') ? miscAny.updateSetting(...args) : undefined;
const loadIndustryTemplate = (...args) => (misc && typeof misc.loadIndustryTemplate === 'function') ? miscAny.loadIndustryTemplate(...args) : undefined;
const exportAsCSV = (...args) => (misc && typeof misc.exportAsCSV === 'function') ? miscAny.exportAsCSV(...args) : undefined;
const exportAsExcel = (...args) => (misc && typeof misc.exportAsExcel === 'function') ? miscAny.exportAsExcel(...args) : undefined;
const exportAsPDF = (...args) => (misc && typeof misc.exportAsPDF === 'function') ? miscAny.exportAsPDF(...args) : undefined;
const exportAsHTML = (...args) => (misc && typeof misc.exportAsHTML === 'function') ? miscAny.exportAsHTML(...args) : undefined;
const shareViaEmail = (...args) => (misc && typeof misc.shareViaEmail === 'function') ? miscAny.shareViaEmail(...args) : undefined;
const showEmbedCode = (...args) => (misc && typeof misc.showEmbedCode === 'function') ? miscAny.showEmbedCode(...args) : undefined;
const showScheduleDialog = (...args) => (misc && typeof misc.showScheduleDialog === 'function') ? miscAny.showScheduleDialog(...args) : undefined;
const exportAsFinancialReport = (...args) => (misc && typeof misc.exportAsFinancialReport === 'function') ? miscAny.exportAsFinancialReport(...args) : undefined;
const shareScenario = (...args) => (misc && typeof misc.shareScenario === 'function') ? miscAny.shareScenario(...args) : undefined;
// Use a function to avoid initialization issues
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
const updateValidationDisplay = (...args) => (businessLogic && typeof businessLogic.updateValidationDisplay === 'function') ? businessLogicAny.updateValidationDisplay(...args) : undefined;
const lazyLoadChart = (...args) => (misc && typeof misc.lazyLoadChart === 'function') ? miscAny.lazyLoadChart(...args) : undefined;
const updateRichVisualizations = (...args) => (misc && typeof misc.updateRichVisualizations === 'function') ? miscAny.updateRichVisualizations(...args) : undefined;

// Utility functions

// Settings and UI function wrappers

/** @type {import('../src/types').AppState} */
const state = {
  mode: 'forecast', // 'forecast' | 'current'
  offerings: businessLogic.defaultOfferings(),
  fullTimeEmployees: 1, // 40 hours/week
  partTimeEmployees: 0, // 20 hours/week
  fullTimeEmployeePay: 60000,
  partTimeEmployeePay: 30000,
  monthlyCosts: 250,
  processingFeePct: 0, // card/payment fee as % of revenue
  expenses: [],
  resources: [], // extra capacity pools (booth, room) offerings can be tagged with
  membershipPlans: [], // membership what-if inputs (display only, never feed calc)
  memberProfiles: [],
  productiveUtilizationPct: 80, // percent of hours available for service delivery
  targetUtilizationPct: 75, // forecasting target
  lockMix: false, // forecasting-only: keep Mix % totals at 100 by adjusting other offerings
  loadedTemplate: null, // Track which template was loaded (null if custom scenario)
  notes: '', // Presentation notes — embedded in shared URLs for context
  currency: 'USD', // display currency for this scenario (never affects calculations)
};

// Undo/Redo history stacks
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;
/** @type {string | null} */
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
  state.processingFeePct = clamp(safeParseNumber($('#processingFeePct').value, 0), 0, 20);
  state.productiveUtilizationPct = clamp(safeParseNumber($('#productiveUtilizationPct').value, 80), 0, 100);
  state.targetUtilizationPct = clamp(safeParseNumber($('#targetUtilizationPct').value, 75), 0, 150);
  state.lockMix = Boolean($('#lockMix')?.checked);
}

function onTableInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;

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
  /** @type {string | number} */
  let value = el.value;
  let validationError = null;

  if (k === 'priceMonthly' || k === 'pricePerSession') {
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
  } else if (k === 'laborPctOfPrice' || k === 'discountPct') {
    value = Math.min(100, Math.max(0, safeParseNumber(value, 0)));
  } else if (k === 'type') {
    value = normalizeOfferingType(value);
  } else if (k === 'seats') {
    value = Math.max(1, Math.floor(safeParseNumber(value, 1)));
  } else if (k === 'fillPct') {
    value = Math.min(100, Math.max(1, safeParseNumber(value, 100)));
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
  } else if (k === 'pricePerSession') {
    // Entry lens only: priceMonthly stays the canonical price everything else reads
    o.priceMonthly = monthlyFromPerSession(Number(value), isOneTime(o) ? 1 : o.sessionsPerYear);
  } else if (k === 'type') {
    const wasOneTime = isOneTime(o);
    if (value === 'one-time') {
      // The price shown today carries over as the price per sale
      o.priceMonthly = displayPrice(o) / 12;
      o.sessionsPerYear = 1;
      o.hoursPerSession = 0;
    } else if (wasOneTime && !(o.hoursPerSession > 0)) {
      o.hoursPerSession = 1;
    }
    o.type = normalizeOfferingType(value);
  } else if (k === 'sessionsPerYear' && isPerSession(o)) {
    // Visits are an assumption separate from the per-visit price, which stays put
    o.priceMonthly = priceMonthlyForNewVisits(o, Number(value));
    o.sessionsPerYear = Number(value);
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
    window.lastMetrics = metrics;
    updateOutputs(metrics);
    updateValidationDisplay(); // Update validation messages after calculations
  } catch (e) {
    console.warn('Failed to refresh outputs on input:', e);
  }
  // If changing mix in locked forecast mode, re-render to update other mix inputs
  if ((k === 'mixPct' && state.mode === 'forecast' && state.lockMix) || k === 'type') {
    render();
  }
}

function addExpense() {
  state.expenses.push({ id: uuid(), name: 'Expense ' + (state.expenses.length + 1), category: 'Other', amount: 0, frequency: 'monthly', lifeYears: DEFAULT_LIFE_YEARS });
  persistState();
  render();
}

// Only shown once there are expense line items; with just the free-form field it would repeat the KPI.
function renderCostBreakdown() {
  const wrap = $('#costBreakdown');
  const body = $('#costBreakdownBody');
  if (!wrap || !body) return;
  const rows = state.expenses.length ? costBreakdown(state) : [];
  wrap.hidden = rows.length === 0;
  body.innerHTML = rows.map(r => '<tr><td>' + escapeHtml(r.label) + '</td><td class="mono">' + fmtMoney0(r.annual) + '</td><td class="mono">' + fmtPct1(r.pct) + '</td></tr>').join('');
}

const FLOOR_LABELS = { ok: 'OK', thin: 'Thin', loss: 'Below cost' };
const FLOOR_COLORS = { ok: 'var(--good)', thin: 'var(--warn)', loss: 'var(--bad)' };

/** @param {any} metrics */
function renderOfferingRanking(metrics) {
  const wrap = $('#offeringRanking');
  const body = $('#offeringRankingBody');
  if (!wrap || !body) return;
  const rows = rankOfferings(metrics?.offeringMetrics || []);
  wrap.hidden = rows.length === 0;
  body.innerHTML = rows.map(r => '<tr><td>' + escapeHtml(r.name) + '</td><td class="mono">' + (r.hourFree ? 'n/a' : fmtMoney0(r.marginPerHour) + '/hr') + '</td><td class="mono">' + (r.discountPct > 0 && !r.hourFree ? fmtMoney0(r.discountedMarginPerHour) + '/hr (' + fmtPct1(r.discountPct) + ' off)' : '—') + '</td><td class="mono">' + fmtPct1(r.maxDiscountPct) +
    '</td><td data-status="' + r.status + '" style="color:' + FLOOR_COLORS[r.status] + '">' + FLOOR_LABELS[r.status] + '</td></tr>').join('');
}

/** @type {{ metric: import('../src/calculations/ranges').RangeMetric, label: string, fmt: (n: number) => string }[]} */
const RANGE_ROWS = [
  { metric: 'revenue', label: 'Annual revenue', fmt: fmtMoney0 },
  { metric: 'income', label: 'Net profit', fmt: fmtMoney0 },
  { metric: 'clients', label: 'Clients', fmt: fmtInt },
  { metric: 'capacityPct', label: 'Utilization', fmt: fmtPct1 },
  { metric: 'breakEvenClients', label: 'Break-even clients', fmt: (/** @type {number} */ n) => (Number.isFinite(n) ? fmtInt(n) : '∞') }
];

// Hidden unless some bound actually moves a headline number (e.g. client bounds in Forecast mode do nothing).
function renderRangeBand() {
  const wrap = $('#rangeBand');
  const body = $('#rangeBandBody');
  if (!wrap || !body) return;
  const r = calcRange(state);
  const moves = bandMoves(r);
  wrap.hidden = !moves;
  renderRangeCase(moves);
  const drivers = $('#rangeDrivers');
  if (drivers) {
    const top = moves ? calcRangeDrivers(state).slice(0, 3) : [];
    drivers.hidden = top.length === 0;
    drivers.textContent = top.length
      ? 'Biggest drivers of net profit: ' + top.map(d => d.name + (d.confidence ? ' (' + CONFIDENCE_LABELS[d.confidence] + ')' : '') + ' swings ' + fmtMoney0(d.swing) + '/yr').join('; ')
      : '';
  }
  body.innerHTML = moves
    ? RANGE_ROWS.map(({ metric: m, label, fmt }) => '<tr data-metric="' + m + '"><td>' + label + '</td><td class="mono">' + fmt(r[m].min) +
      '</td><td class="mono">' + fmt(r[m].base) + '</td><td class="mono">' + fmt(r[m].max) + '</td></tr>').join('')
    : '';
}

// Fill bounds apply to group rows in Forecast; client bounds apply in Current. Other cells show a dash like the main table.
function renderRangesTable() {
  const tbody = $('#rangesBody');
  if (!tbody) return;
  const isForecast = state.mode === 'forecast';
  /** @param {any} o @param {number} idx @param {string} k @param {string} label @param {boolean} on */
  const cell = (o, idx, k, label, on) => on
    ? '<td class="cell-edit" data-label="' + label + '"><input aria-label="' + label + ' for ' + escapeHtml(o.name) + '" type="number" min="' + (k.startsWith('fill') ? 1 : 0) +
      '"' + (k.startsWith('fill') ? ' max="100"' : '') + ' step="1" placeholder="none" value="' + (o[k] ?? '') + '" data-k="' + k + '" data-i="' + idx + '"/></td>'
    : '<td data-label="' + label + '"><span class="muted">—</span></td>';
  tbody.innerHTML = state.offerings.map((o, idx) => {
    const fill = o.type === 'group' && isForecast;
    return '<tr><td data-label="Offering">' + escapeHtml(o.name) + '</td>' +
      cell(o, idx, 'fillPctLow', 'Fill % low', fill) + cell(o, idx, 'fillPctHigh', 'Fill % high', fill) +
      cell(o, idx, 'currentClientsLow', 'Clients low', !isForecast) + cell(o, idx, 'currentClientsHigh', 'Clients high', !isForecast) +
      '<td class="cell-edit" data-label="Confidence"><select class="confidence-select" aria-label="Confidence for ' + escapeHtml(o.name) + '" data-k="confidence" data-i="' + idx + '" data-confidence="' + (o.confidence || '') + '">' +
      '<option value="">Untagged</option>' + CONFIDENCE_LEVELS.map(c => '<option value="' + c + '"' + (o.confidence === c ? ' selected' : '') + '>' + CONFIDENCE_LABELS[c] + '</option>').join('') + '</select></td>' +
      '<td class="cell-edit" data-label="Note"><input aria-label="Note for ' + escapeHtml(o.name) + '" type="text" maxlength="' + MAX_NOTE_LENGTH + '" placeholder="Source or caveat" value="' + escapeHtml(o.note || '') + '" data-k="note" data-i="' + idx + '"/></td></tr>';
  }).join('');
}

const BADGE_LABELS = { green: 'In range', yellow: 'Near edge', red: 'Off market' };
const BADGE_COLORS = { green: 'var(--good)', yellow: 'var(--warn)', red: 'var(--bad)' };

/** @param {any} o @param {any} metric */
function marketBadgeHtml(o, metric) {
  const status = metric ? floorStatus(metric.maxDiscountPct, o.discountPct || 0) : 'ok';
  const b = marketBadge(Number(displayPrice(o)) || 0, o, status);
  if (!b) return '<span class="muted">—</span>';
  const arrow = b.direction === 'below' ? ' ▼' : b.direction === 'above' ? ' ▲' : '';
  return '<span data-level="' + b.level + '" style="color:' + BADGE_COLORS[b.level] + '">' + BADGE_LABELS[b.level] + arrow + '</span>';
}

/** @param {any} metrics */
function renderMarketTable(metrics) {
  const tbody = $('#marketBody');
  if (!tbody) return;
  /** @param {any} o @param {number} idx @param {string} k @param {string} label */
  const num = (o, idx, k, label) => '<td class="cell-edit" data-label="' + label + '"><input aria-label="Market ' + label.toLowerCase() + ' for ' + escapeHtml(o.name) +
    '" type="number" min="0" step="1" placeholder="none" value="' + (o[k] ?? '') + '" data-k="' + k + '" data-i="' + idx + '"/></td>';
  tbody.innerHTML = state.offerings.map((o, idx) => '<tr><td data-label="Offering">' + escapeHtml(o.name) + '</td>' +
    '<td class="mono" data-label="Your price">' + fmtMoney0(displayPrice(o)) + (isOneTime(o) ? '/sale' : isPerSession(o) ? '/session' : '/mo') + '</td>' +
    num(o, idx, 'marketLow', 'Low') + num(o, idx, 'marketAvg', 'Avg') + num(o, idx, 'marketHigh', 'High') +
    '<td class="cell-edit" data-label="Source / date"><input aria-label="Market source for ' + escapeHtml(o.name) + '" type="text" maxlength="' + MAX_NOTE_LENGTH +
    '" placeholder="Source, date" value="' + escapeHtml(o.marketNote || '') + '" data-k="marketNote" data-i="' + idx + '"/></td>' +
    '<td data-label="Badge" class="market-badge">' + marketBadgeHtml(o, metrics?.offeringMetrics?.[idx]) + '</td></tr>').join('');
}

/** @param {any} e */
function onMarketInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;
  const k = el.dataset.k;
  const idx = Number(el.dataset.i);
  const o = /** @type {Record<string, any>} */ (state.offerings[idx]);
  if (!k || !o) return;
  const fieldKey = `mkt-${idx}-${k}`;
  if (fieldKey !== _lastHistoryField) {
    pushHistory();
    _lastHistoryField = fieldKey;
  }
  const clean = /** @type {Record<string, any>} */ (sanitizeOfferingMarket({ [k]: el.value }));
  if (clean[k] === undefined) delete o[k];
  else o[k] = clean[k];
  persistState();
  try {
    const cell = el.closest('tr')?.querySelector('.market-badge');
    if (cell) cell.innerHTML = marketBadgeHtml(o, calc(state).offeringMetrics[idx]);
  } catch (err) {
    console.warn('Failed to refresh market badge:', err);
  }
}

/** @param {any} e */
function onRangeInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
  const k = el.dataset.k;
  const o = /** @type {Record<string, any>} */ (state.offerings[Number(el.dataset.i)]);
  if (!k || !o) return;
  const fieldKey = `rng-${el.dataset.i}-${k}`;
  if (fieldKey !== _lastHistoryField) {
    pushHistory();
    _lastHistoryField = fieldKey;
  }
  // The shared sanitizer is the single source of truth; blank or junk clears the bound
  const isMeta = k === 'confidence' || k === 'note';
  const clean = /** @type {Record<string, any>} */ (isMeta ? sanitizeOfferingMeta({ [k]: el.value }) : sanitizeOfferingRange({ [k]: el.value }));
  if (clean[k] === undefined) delete o[k];
  else o[k] = clean[k];
  if (k === 'confidence') {
    el.dataset.confidence = clean[k] || '';
    syncConfidenceBadge(Number(el.dataset.i), clean[k]);
  }
  persistState();
  try {
    // Under an optimistic/conservative case a bound edit moves every output, so redraw them all
    if (getRangeCase() !== 'base' && k !== 'confidence' && k !== 'note') {
      render();
      const again = document.querySelector(`#rangesBody [data-i="${el.dataset.i}"][data-k="${k}"]`);
      if (again instanceof HTMLElement) again.focus();
    } else {
      renderRangeBand();
    }
  } catch (err) {
    console.warn('Failed to refresh range band:', err);
  }
}

function renderExpenses() {
  const tbody = $('#expensesBody');
  if (!tbody) return;
  /** @param {readonly string[]} list @param {string} current */
  const opts = (list, current) => list.map(v => '<option value="' + escapeHtml(v) + '"' + (v === current ? ' selected' : '') + '>' + escapeHtml(v) + '</option>').join('');
  tbody.innerHTML = '';
  state.expenses.forEach((e, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="cell-edit" data-label="Expense"><input aria-label="Expense name" type="text" maxlength="100" value="' + escapeHtml(e.name) + '" data-k="name" data-i="' + idx + '"/></td>' +
      '<td class="cell-edit" data-label="Category"><select aria-label="Category for ' + escapeHtml(e.name) + '" data-k="category" data-i="' + idx + '">' + opts(EXPENSE_CATEGORIES, e.category) + '</select></td>' +
      '<td class="cell-edit" data-label="Amount"><input aria-label="Amount for ' + escapeHtml(e.name) + '" type="number" min="0" step="1" value="' + e.amount + '" data-k="amount" data-i="' + idx + '"/></td>' +
      '<td class="cell-edit" data-label="Frequency"><select aria-label="Frequency for ' + escapeHtml(e.name) + '" data-k="frequency" data-i="' + idx + '">' + opts(EXPENSE_FREQUENCIES, e.frequency) + '</select></td>' +
      '<td class="cell-edit" data-label="Life (yrs)"><input aria-label="Useful life in years for ' + escapeHtml(e.name) + '" type="number" min="1" max="30" step="1" value="' + e.lifeYears + '"' + (e.frequency === 'one-time' ? '' : ' disabled') + ' data-k="lifeYears" data-i="' + idx + '"/></td>' +
      '<td class="cell-edit" data-label="Actions"><button class="btn small danger" data-action="removeExpense" data-i="' + idx + '" aria-label="Remove ' + escapeHtml(e.name) + '">Remove</button></td>';
    tbody.appendChild(tr);
  });
}

function addResource() {
  const list = state.resources || (state.resources = []);
  pushHistory();
  list.push({ id: uuid(), name: 'Resource ' + (list.length + 1), hoursPerWeek: 40, weeksPerYear: 52 });
  persistState();
  render();
}

function renderResources() {
  const tbody = $('#resourcesBody');
  if (!tbody) return;
  const list = state.resources || [];
  tbody.innerHTML = list.map((r, idx) =>
    '<tr><td class="cell-edit" data-label="Resource"><input aria-label="Resource name" type="text" maxlength="100" value="' + escapeHtml(r.name) + '" data-k="name" data-i="' + idx + '"/></td>' +
    '<td class="cell-edit" data-label="Hours/week"><input aria-label="Hours per week for ' + escapeHtml(r.name) + '" type="number" min="0" max="168" step="1" value="' + r.hoursPerWeek + '" data-k="hoursPerWeek" data-i="' + idx + '"/></td>' +
    '<td class="cell-edit" data-label="Weeks/year"><input aria-label="Weeks per year for ' + escapeHtml(r.name) + '" type="number" min="0" max="52" step="1" value="' + r.weeksPerYear + '" data-k="weeksPerYear" data-i="' + idx + '"/></td>' +
    '<td class="cell-edit" data-label="Staff-free"><input aria-label="Staff-free: ' + escapeHtml(r.name) + ' needs no staff time" type="checkbox"' + (r.staffFree ? ' checked' : '') + ' data-k="staffFree" data-i="' + idx + '"/></td>' +
    '<td class="cell-edit" data-label="Actions"><button class="btn small danger" data-action="removeResource" data-i="' + idx + '" aria-label="Remove ' + escapeHtml(r.name) + '">Remove</button></td></tr>').join('');
  renderResourceTags();
}

function renderResourceTags() {
  const wrap = $('#resourceTagWrap');
  const body = $('#resourceTagBody');
  if (!wrap || !body) return;
  const list = state.resources || [];
  wrap.hidden = list.length === 0;
  body.innerHTML = list.length === 0 ? '' : state.offerings.map((o, idx) =>
    '<tr><td data-label="Offering">' + escapeHtml(o.name) + '</td>' +
    '<td class="cell-edit" data-label="Uses resource"><select aria-label="Resource used by ' + escapeHtml(o.name) + '" data-i="' + idx + '"><option value="">Staff only</option>' +
    list.map(r => '<option value="' + escapeHtml(r.id) + '"' + (o.resource === r.id ? ' selected' : '') + '>' + escapeHtml(r.name) + '</option>').join('') + '</select></td></tr>').join('');
}

function refreshAfterResourceEdit() {
  persistState();
  try {
    const metrics = calc(state);
    window.lastMetrics = metrics;
    updateOutputs(metrics);
    updateValidationDisplay();
  } catch (err) {
    console.warn('Failed to refresh outputs on resource edit:', err);
  }
}

/** @param {any} e */
function onResourceInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;
  const k = el.dataset.k;
  const row = /** @type {Record<string, any> | undefined} */ ((state.resources || [])[Number(el.dataset.i)]);
  if (!k || !row) return;
  const fieldKey = `res-${el.dataset.i}-${k}`;
  if (fieldKey !== _lastHistoryField) {
    pushHistory();
    _lastHistoryField = fieldKey;
  }
  // Per-row sanitizer is the single source of truth for clamping and fallbacks
  const clean = /** @type {Record<string, any>} */ (sanitizeResources([{ ...row, [k]: el.type === 'checkbox' ? el.checked : el.value }], () => row.id)[0]);
  if (clean[k] === undefined) delete row[k];
  else row[k] = clean[k];
  refreshAfterResourceEdit();
}

/** @param {any} e */
function onResourceTagChange(e) {
  const el = e.target;
  if (!(el instanceof HTMLSelectElement)) return;
  const o = /** @type {Record<string, any> | undefined} */ (state.offerings[Number(el.dataset.i)]);
  if (!o) return;
  pushHistory();
  // Only ids that exist are accepted; anything else clears the tag
  if ((state.resources || []).some(r => r.id === el.value)) o.resource = el.value;
  else delete o.resource;
  refreshAfterResourceEdit();
}

/** @param {any} e */
function onResourceClick(e) {
  const btn = e.target.closest('button[data-action="removeResource"]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const list = state.resources || [];
  if (!Number.isFinite(i) || !list[i]) return;
  pushHistory();
  const [gone] = list.splice(i, 1);
  state.offerings.forEach(o => { if (o.resource === gone.id) delete o.resource; });
  persistState();
  render();
}

/** @param {any} e */
function onExpenseInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
  const k = el.dataset.k;
  const i = Number(el.dataset.i);
  const row = /** @type {Record<string, any>} */ (state.expenses[i]);
  if (!k || !row) return;
  // Debounce history like offerings: one undo step per field, not per keystroke
  const fieldKey = `exp-${i}-${k}`;
  if (fieldKey !== _lastHistoryField) {
    pushHistory();
    _lastHistoryField = fieldKey;
  }
  if (k === 'name') {
    row.name = el.value.slice(0, 100);
  } else {
    // Per-row sanitizer is the single source of truth for clamping and fallbacks
    const [clean] = sanitizeExpenses([{ ...row, [k]: el.value }], () => row.id);
    row[k] = clean[k];
    if (k === 'frequency') {
      const life = el.closest('tr')?.querySelector('[data-k="lifeYears"]');
      if (life instanceof HTMLInputElement) life.disabled = row.frequency !== 'one-time';
    }
  }
  persistState();
  try {
    const metrics = calc(state);
    window.lastMetrics = metrics;
    updateOutputs(metrics);
    updateValidationDisplay();
  } catch (err) {
    console.warn('Failed to refresh outputs on expense input:', err);
  }
}

/** @param {any} e */
function onExpenseClick(e) {
  const btn = e.target.closest('button[data-action="removeExpense"]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  if (!Number.isFinite(i) || !state.expenses[i]) return;
  pushHistory();
  state.expenses.splice(i, 1);
  persistState();
  render();
}

function onTableClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === 'removeOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i) && state.offerings[i]) {
      // The calc and every persistence path need at least one offering; refuse rather than swap in demo data
      if (state.offerings.length === 1) {
        showToast('Keep at least one offering: edit or rename this one instead', 'info', 3000);
        return;
      }
      pushHistory();
      state.offerings.splice(i, 1);
      render();
    }
  }
  if (action === 'duplicateOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i) && state.offerings[i]) {
      pushHistory();
      state.offerings.splice(i + 1, 0, businessLogic.duplicateOffering(state.offerings[i], state.offerings, uuid));
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
    laborPctOfPrice: 0,
    discountPct: 0,
    type: 'subscription',
    seats: 1,
    fillPct: 100,
    mixPct: businessLogic.remainingMix(state.offerings),
    currentClients: 0,
  });
  render();
}

function syncCurrencySelect() {
  const el = $('#currencySelect');
  if (el) el.value = normalizeCurrency(state.currency);
}

function resetDefaults() {
  state.offerings = businessLogic.defaultOfferings();
  state.fullTimeEmployees = 1;
  state.partTimeEmployees = 0;
  state.fullTimeEmployeePay = 60000;
  state.partTimeEmployeePay = 30000;
  state.monthlyCosts = 250;
  state.processingFeePct = 0;
  state.expenses = [];
  state.resources = [];
  state.membershipPlans = [];
  state.memberProfiles = [];
  state.productiveUtilizationPct = 80;
  state.targetUtilizationPct = 75;
  state.mode = 'forecast';
  state.lockMix = false;
  state.loadedTemplate = null;
  state.currency = 'USD';
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

// Reverse-calculator auto-refresh state; declared before render() so the first render can read it
let reverseHasRun = false;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let reverseRefreshTimer;

function render() {
  syncCurrencySelect();
  const focus = captureTableFocus('offeringsTable');

  let metrics;
  try {
    metrics = calc(state);
    window.lastMetrics = metrics;
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
    const el = $('#processingFeePct'); if (el) el.value = state.processingFeePct;
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
    // Inputs always show what the user typed; metrics.offerings carries the active range case's fill and clients
    const raw = getRangeCase() === 'base' ? o : (state.offerings[idx] || o);

    const mixCell = isForecast
      ? '<input aria-label="Mix % for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" max="100" step="1" value="' + ((o.mixPct ?? 0).toFixed(1)) + '" data-k="mixPct" data-i="' + (idx) + '" data-tooltip="Percentage of total clients using this offering" />'
      : '<span class="muted">—</span>';

    const clientsCell = isForecast
      ? '<span class="muted">—</span>'
      : '<input aria-label="Clients for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" step="1" value="' + (raw.currentClients ?? 0) + '" data-k="currentClients" data-i="' + (idx) + '" data-tooltip="Number of active clients for this offering" />';

    const isGroup = o.type === 'group';
    const perSession = isPerSession(o);
    const oneTime = isOneTime(o);
    const typeCell = '<select aria-label="Type for ' + (escapeHtml(o.name)) + '" data-k="type" data-i="' + (idx) + '" data-tooltip="Subscription: monthly price per client. Per-session: price per visit times visits a year. Group: clients share a class with limited seats. One-time: a single sale per client, no staff hours">' +
      '<option value="subscription"' + (o.type === 'group' || perSession || oneTime ? '' : ' selected') + '>Subscription</option>' +
      '<option value="per-session"' + (perSession ? ' selected' : '') + '>Per-session</option>' +
      '<option value="one-time"' + (oneTime ? ' selected' : '') + '>One-time</option>' +
      '<option value="group"' + (isGroup ? ' selected' : '') + '>Group</option></select>';
    const priceCell = oneTime
      ? '<input aria-label="Price per sale for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (Math.round(displayPrice(o) * 100) / 100) + '" data-k="pricePerSession" data-i="' + (idx) + '" data-tooltip="What one sale costs. Set Clients (or Mix %) to the number of sales a year"/><span class="unit-suffix muted">/sale</span>'
      : perSession
      ? '<input aria-label="Price per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (Math.round(displayPrice(o) * 100) / 100) + '" data-k="pricePerSession" data-i="' + (idx) + '" data-tooltip="What one visit costs. Annual revenue per client is this times Sessions / yr"/><span class="unit-suffix muted">/session</span>'
      : '<input aria-label="Price per month for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="10" value="' + (o.priceMonthly) + '" data-k="priceMonthly" data-i="' + (idx) + '" data-tooltip="Monthly billing price per client"/><span class="unit-suffix muted">/mo</span>';
    const sessionsTip = perSession ? 'Assumption: how many visits each client books per year (the price per session stays fixed)' : 'How many times per year this service is delivered to each client';
    const seatsCell = isGroup
      ? '<input aria-label="Seats per class for ' + (escapeHtml(o.name)) + '" type="number" min="1" step="1" value="' + (o.seats || 1) + '" data-k="seats" data-i="' + (idx) + '" data-tooltip="Seats per class run. Sessions / yr is how many classes each enrolled client attends"/>'
      : '<span class="muted">—</span>';
    const fillCell = isGroup && isForecast
      ? '<input aria-label="Fill percent for ' + (escapeHtml(o.name)) + '" type="number" min="1" max="100" step="1" value="' + (raw.fillPct ?? 100) + '" data-k="fillPct" data-i="' + (idx) + '" data-tooltip="Forecast: average % of seats filled. Current mode derives fill from Clients"/>'
      : '<span class="muted">—</span>';

    const estClients = isForecast
      ? Math.floor(metrics.clients * ((o.mixPct || 0) / 100))
      : o.currentClients;

    const estSessions = isForecast
      ? Math.round(estClients * o.sessionsPerYear)
      : Math.round((o.currentClients || 0) * o.sessionsPerYear);

    tr.innerHTML = '<td class="cell-edit group-start group-inputs" data-label="Offering"><input aria-label="Offering name" type="text" value="' + (escapeHtml(o.name)) + '" data-k="name" data-i="' + (idx) + '" data-tooltip="Name of this service offering"/>' + confidenceBadgeHtml(state.offerings[idx]?.confidence) + '</td>' +
      '<td class="cell-edit group-inputs" data-label="Price">' + (priceCell) + '</td>' +
      '<td class="cell-edit group-inputs" data-label="Sessions / yr">' + (oneTime ? '<span class="muted">—</span>' : '<input aria-label="Sessions per year for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.sessionsPerYear) + '" data-k="sessionsPerYear" data-i="' + (idx) + '" data-tooltip="' + sessionsTip + '"/>') + '</td>' +
      '<td class="cell-edit group-inputs" data-label="Hours / session">' + (oneTime ? '<span class="muted">—</span>' : '<input aria-label="Hours per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="0.1" value="' + (o.hoursPerSession) + '" data-k="hoursPerSession" data-i="' + (idx) + '" data-tooltip="Duration of each service session in hours"/>') + '</td>' +
      '<td class="cell-edit group-inputs" data-label="Var $ / session"><input aria-label="Variable cost per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.variableCostPerSession) + '" data-k="variableCostPerSession" data-i="' + (idx) + '" data-tooltip="Cost per session (materials, supplies, delivery, etc.)"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Labor % of price"><input aria-label="Labor percent of list price for ' + (escapeHtml(o.name)) + '" type="number" min="0" max="100" step="1" value="' + (o.laborPctOfPrice || 0) + '" data-k="laborPctOfPrice" data-i="' + (idx) + '" data-tooltip="Contractor pay as a % of list price (added to Var $ / session)"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Best discount %"><input aria-label="Best-case discount percent for ' + (escapeHtml(o.name)) + '" type="number" min="0" max="100" step="1" value="' + (o.discountPct || 0) + '" data-k="discountPct" data-i="' + (idx) + '" data-tooltip="Deepest discount you offer (member, prepaid). Tests the price floor in Outputs; revenue stays at list price"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Type">' + (typeCell) + '</td>' +
      '<td class="cell-edit group-inputs" data-label="Seats">' + (seatsCell) + '</td>' +
      '<td class="cell-edit group-inputs group-end" data-label="Fill % (forecast)">' + (fillCell) + '</td>' +
      '<td class="cell-edit group-start group-mode" data-label="Mix % (forecast)" data-tooltip="Percentage of total clients using this offering (forecast mode only)">' + (mixCell) + '</td>' +
      '<td class="cell-edit group-mode group-end" data-label="Clients (current)" data-tooltip="Number of active clients for this offering (current mode only)">' + (clientsCell) + '</td>' +
      '<td class="cell-readonly group-start group-est" data-label="Est. clients"><span class="mono">' + (fmtInt(estClients)) + '</span></td>' +
      '<td class="cell-readonly group-est" data-label="Est. sessions"><span class="mono">' + (fmtInt(estSessions)) + '</span></td>' +
      '<td class="cell-readonly group-metrics" data-label="Annual Revenue"><span class="mono">' + (fmtMoney0(metrics.offeringMetrics[idx]?.revenue || 0)) + '</span></td>' +
      '<td class="cell-readonly group-metrics" data-label="Margin %"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.marginPct || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtPct1(metrics.offeringMetrics[idx]?.marginPct || 0)) + '</span></td>' +
      '<td class="cell-readonly group-metrics group-end" data-label="Annual Profit"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.margin || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtMoney0(metrics.offeringMetrics[idx]?.margin || 0)) + '</span></td>' +
      '<td class="cell-edit group-actions" data-label="Actions"><button class="btn small" data-action="duplicateOffering" data-i="' + (idx) + '" aria-label="Duplicate ' + (escapeHtml(o.name)) + '">Duplicate</button> <button class="btn small danger" data-action="removeOffering" data-i="' + (idx) + '" aria-label="Remove ' + (escapeHtml(o.name)) + '">Remove</button></td>';

    tbody.appendChild(tr);
  });

  restoreTableFocus(focus);
  renderExpenses();
  renderResources();
  renderRangesTable();
  renderGroupRunsTable();
  renderMembershipPanel();

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
  // Respect prefers-reduced-motion for animations
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // populate KPI elements directly in case core.js isn't loaded (tests use
  // app.jsx standalone)
  function setKpi(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const str = String(value);
    if (el.textContent !== str) {
      el.textContent = str;
      el.classList.remove('kpi-flash', 'kpi-count-up');
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add('kpi-flash');
      if (!prefersReducedMotion) {
        el.classList.add('kpi-count-up');
      }
    }
  }
  setKpi('kpiClients', fmtInt(metrics.clients));
  setKpi('kpiSessions', fmtInt(metrics.totalSessions));
  setKpi('kpiServiceHours', fmtInt(metrics.serviceHours));
  setKpi('kpiCapacity', fmtPct1(metrics.capacityPct));
  setKpi('kpiRevenue', fmtMoney0(metrics.revenue));
  setKpi('kpiFixedCosts', fmtMoney0(metrics.annualFixedCosts));
  renderCostBreakdown();
  renderOfferingRanking(metrics);
  renderMarketTable(metrics);
  renderRangeBand();
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
  // Header chips and the glance modal share these numbers; in-place edits (typing in the table) skip render()
  updateKeyMetrics();
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
    renderCostBreakdown();
    renderOfferingRanking(metrics);
    renderMarketTable(metrics);
    renderRangeBand();
    renderMembershipResults();
    renderGroupRunResults();
    if (!$('#insightsBody')?.classList.contains('collapsed')) renderInsightsPanel();
    scheduleReverseRefresh();
    if (kpiPayroll) kpiPayroll.textContent = fmtMoney0(metrics.annualPayroll);
    if (kpiVariableCosts) kpiVariableCosts.textContent = fmtMoney0(metrics.variableCosts);

    // Break-even analysis
    const breakEvenClients = Number.isFinite(metrics.breakEvenClients) ? fmtInt(metrics.breakEvenClients) : '∞';
    const breakEvenRevenue = Number.isFinite(metrics.breakEvenRevenue) ? fmtMoney0(metrics.breakEvenRevenue) : fmtMoney0(0).replace(/[\d\s.,]/g, '') + '∞';
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
    const taxDisclaimer = $('#taxDisclaimer');
    if (taxDisclaimer) {
      const basis = taxBasisNote(state.currency);
      taxDisclaimer.textContent = (basis ? basis + ' · ' : '') + 'Simplified US federal only · Consult a tax professional';
    }
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

    const bottleneckLine = $('#bottleneckLine');
    if (bottleneckLine) {
      /** @type {import('../src/types').PoolUtilization[]} */
      const pools = metrics.poolUtilization || [];
      bottleneckLine.hidden = pools.length < 2;
      if (pools.length >= 2) {
        const others = pools.filter(p => p.id !== metrics.bottleneck.id).map(p => p.name + ' ' + fmtPct1(p.pct));
        bottleneckLine.textContent = 'Bottleneck: ' + metrics.bottleneck.name + ' at ' + fmtPct1(metrics.bottleneck.pct) + ' (' + others.join(', ') + ')';
      }
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
  const body = $('#marketBody');
  if (body) {
    body.addEventListener('input', onMarketInput);
    body.addEventListener('blur', () => { _lastHistoryField = null; }, true);
  }
}
{
  initSpreadInputs();
  initRangeCase(() => render());
  const btn = $('#suggestRangesBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      pushHistory();
      _lastHistoryField = null;
      state.offerings.forEach(o => Object.assign(o, suggestRanges(o, state.mode, getSpreads())));
      persistState();
      render();
    });
  }
  const body = $('#rangesBody');
  if (body) {
    body.addEventListener('input', onRangeInput);
    body.addEventListener('blur', () => { _lastHistoryField = null; }, true);
  }
}
{
  const btn = $('#addResourceBtn');
  if (btn) btn.addEventListener('click', addResource);
  const body = $('#resourcesBody');
  if (body) {
    body.addEventListener('input', onResourceInput);
    body.addEventListener('click', onResourceClick);
    // A rename only lands in the tag dropdowns once editing finishes, so typing keeps focus
    body.addEventListener('change', renderResourceTags);
    body.addEventListener('blur', () => { _lastHistoryField = null; }, true);
  }
  const tagBody = $('#resourceTagBody');
  if (tagBody) tagBody.addEventListener('change', onResourceTagChange);
}
{
  const btn = $('#addExpenseBtn');
  if (btn) btn.addEventListener('click', addExpense);
  const body = $('#expensesBody');
  if (body) {
    body.addEventListener('input', onExpenseInput);
    body.addEventListener('click', onExpenseClick);
    body.addEventListener('blur', () => { _lastHistoryField = null; }, true);
  }
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
const appVersionEl = $('#appVersion');
if (appVersionEl) appVersionEl.textContent = 'ProfitPath v' + __APP_VERSION__;

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
    { selector: '.sensitivity-wrapper', setting: 'showSensitivityAnalysis' },
    { selector: '.mix-optimizer-wrapper', setting: 'showMixOptimizer' },
    { selector: '.insights-wrapper', setting: 'showInsights' },
    { selector: '.reverse-calculator-wrapper', setting: 'showReverseCalculator' },
    { selector: '.advanced-charts-wrapper', setting: 'showAdvancedCharts' }
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
      case 'financial-report':
        exportAsFinancialReport();
        break;
    }
  });
});
{
  const btn = $('#shareBtn');
  if (btn) btn.addEventListener('click', shareScenario);
}

// Wire the currency selector (per-scenario display currency)
{
  const currencyEl = $('#currencySelect');
  if (currencyEl) {
    currencyEl.addEventListener('change', () => {
      state.currency = normalizeCurrency(currencyEl.value);
      persistState();
      render();
    });
  }
}

// Wire presentation notes textarea
{
  const notesEl = $('#scenarioNotes');
  if (notesEl) {
    // Value is filled in wire(), after URL/localStorage state is applied
    notesEl.addEventListener('input', () => {
      state.notes = notesEl.value.slice(0, 2000);
      persistState();
    });
  }
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

// Read-only mode: lock all inputs when ?readonly=1 is present in the URL
if (loadedFromURL && isReadOnlyURL()) enterReadOnlyMode(state);

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
  // Fill notes now that URL/localStorage state has been applied
  const notesInput = $('#scenarioNotes');
  if (notesInput) notesInput.value = state.notes || '';
  syncCurrencySelect();

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
      const metrics = { ...m, totalClients: m.clients };
      // Marketing expense rows drive CAC; with none, the dashboard keeps its default budget
      const marketing = monthlyCategorySpend(state, 'Marketing');
      panel.innerHTML = renderCustomerAnalyticsDashboard(metrics, marketing > 0 ? { monthlyMarketingBudget: marketing } : {}).html;
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

// Client Mix Optimizer Panel
function initMixOptimizerPanel() {
  const toggle = $('#mixOptimizerToggle');
  const body = $('#mixOptimizerBody');
  if (!toggle || !body) return;

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    const expandedNow = !isCollapsed;
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
  });

  $('#mixOptimizerRun')?.addEventListener('click', () => {
    updateMixOptimizer();
  });
}

function updateMixOptimizer() {
  const resultsEl = $('#mixOptimizerResults');
  if (!resultsEl) return;

  const objective = $('#mixOptimizerObjective')?.value || 'profit';

  let result;
  try {
    const metrics = calc(state);
    result = optimizeMix(state, metrics, objective);
  } catch (e) {
    console.warn('Mix optimization failed:', e);
    result = null;
  }

  if (!result) {
    resultsEl.innerHTML = '<p style="color: var(--muted);">Add at least two offerings to find an optimal mix.</p>';
    return;
  }

  let tableHtml = '<table class="sensitivity-comparison"><thead><tr><th title="Service offering">Offering</th><th title="Current mix percentage">Current Mix</th><th title="Suggested mix percentage">Suggested Mix</th></tr></thead><tbody>';
  result.suggestedMix.forEach((o, idx) => {
    const current = result.currentMix[idx]?.mixPct ?? 0;
    tableHtml += `<tr><td>${escapeHtml(o.name)}</td><td>${Math.round(current)}%</td><td>${Math.round(o.mixPct)}%</td></tr>`;
  });
  tableHtml += '</tbody></table>';

  const summary = result.improved
    ? `<p style="margin-top: 8px;">${escapeHtml(result.message)}</p>`
    : '<p style="margin-top: 8px; color: var(--muted);">Your current mix is already close to optimal for this objective.</p>';

  resultsEl.innerHTML = tableHtml + summary;
}

// Collapsible-panel toggle shared by the insights and reverse panels
/** @param {string} toggleSel @param {string} bodySel @param {() => void} [onOpen] */
function bindPanelToggle(toggleSel, bodySel, onOpen) {
  const toggle = $(toggleSel);
  const body = $(bodySel);
  if (!toggle || !body) return;
  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    toggle.textContent = (isCollapsed ? '▶' : '▼') + toggle.textContent.slice(1);
    if (!isCollapsed && onOpen) onOpen();
  });
}

/** @type {Record<string, number>} */
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
/** @type {Record<string, string>} */
const SEVERITY_COLORS = { critical: 'var(--bad)', high: 'var(--bad)', medium: 'var(--warn)', low: 'var(--muted)' };

// Insights & What-Ifs: rules-based alerts plus what-if estimates computed by re-running calc
function renderInsightsPanel() {
  const el = $('#insightsResults');
  if (!el) return;
  /** @type {any[]} */
  let insights = [];
  /** @type {any[]} */
  let whatIfs = [];
  try {
    const metrics = calc(state);
    insights = generateInsights(metrics, state).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    whatIfs = generateWhatIfScenarios(metrics, state);
  } catch (e) {
    console.warn('Insights failed:', e);
  }
  const list = insights.length
    ? '<ul class="insights-list" style="padding-left: 18px;">' + insights.map(i =>
      '<li data-severity="' + i.severity + '"><strong style="color:' + SEVERITY_COLORS[i.severity] + '">' + escapeHtml(i.severity.toUpperCase()) + '</strong> ' +
      escapeHtml(i.title) + ' <span class="muted">' + escapeHtml(i.message) + '</span></li>').join('') + '</ul>'
    : '<p class="muted">No issues found for the current scenario.</p>';
  const table = whatIfs.length
    ? '<table class="sensitivity-comparison" style="margin-top: 8px;"><thead><tr><th>What if</th><th>Estimated impact</th></tr></thead><tbody>' +
      whatIfs.map(w => '<tr><td title="' + escapeHtml(w.description) + '">' + escapeHtml(w.name) + '</td><td class="mono">' + escapeHtml(w.estimatedImpact) + '</td></tr>').join('') + '</tbody></table>'
    : '';
  el.innerHTML = list + table;
}

function initGroupRunsSection() {
  initGroupRunsPanel({ getState: () => state, pushHistory, refresh: refreshAfterResourceEdit });
  renderGroupRunsTable();
}

function initMembershipSection() {
  initMembershipPanel({
    getState: () => state,
    persist: persistState,
    pushHistory
  });
  bindPanelToggle('#membershipToggle', '#membershipBody', renderMembershipPanel);
}

function initInsightsPanel() {
  bindPanelToggle('#insightsToggle', '#insightsBody', renderInsightsPanel);
}

/** @type {Record<string, string>} */
const REVERSE_LABELS = { pricing: 'Raise prices', combined: 'Prices + volume', clients: 'Add clients', utilization: 'Raise utilization', costs: 'Cut costs' };

// What Would It Take?: solve each lever for a desired take-home
// Keep shown results current as inputs change; debounced because every lever is a bisection over calc()
function scheduleReverseRefresh() {
  if (!reverseHasRun || $('#reverseBody')?.classList.contains('collapsed')) return;
  clearTimeout(reverseRefreshTimer);
  reverseRefreshTimer = setTimeout(renderReverseResults, 300);
}

function renderReverseResults() {
  reverseHasRun = true;
  const el = $('#reverseResults');
  const input = $('#reverseTarget');
  if (!el || !input) return;
  const desired = Number(input.value);
  if (!Number.isFinite(desired) || desired <= 0) {
    el.innerHTML = '<p class="muted">Enter a take-home amount above zero.</p>';
    return;
  }
  try {
    const metrics = calc(state);
    const all = getReverseCalculation(state, metrics, desired);
    const best = getRecommendedStrategy(state, metrics, desired);
    el.innerHTML = '<ul class="reverse-list" style="padding-left: 18px;">' + Object.entries(all).map(([key, r]) => {
      if (!r) return '';
      const tag = !r.requiresChange ? 'Already there' : r.feasible ? (best && best.name === key ? 'Recommended' : 'Feasible') : 'Not realistic';
      const color = r.feasible ? 'var(--good)' : 'var(--bad)';
      return '<li data-strategy="' + key + '" data-feasible="' + !!r.feasible + '"><strong>' + REVERSE_LABELS[key] + '</strong> <span style="color:' + color + '">(' + tag + ')</span> ' +
        escapeHtml(r.message) + (r.warning ? ' <span class="muted">' + escapeHtml(r.warning) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  } catch (e) {
    console.warn('Reverse calculation failed:', e);
    el.innerHTML = '<p class="muted">Could not work that out for the current scenario.</p>';
  }
}

function initReversePanel() {
  bindPanelToggle('#reverseToggle', '#reverseBody');
  $('#reverseRun')?.addEventListener('click', renderReverseResults);
  $('#reverseTarget')?.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => { if (e.key === 'Enter') renderReverseResults(); });
}

// Guided "What If?" wizard: pick a scenario, set one dial, preview calc() before/after, optionally apply (undoable)
/** @type {{ id: string, value: number } | null} */
let wizardPick = null;

function renderWizardList() {
  const body = $('#whatIfBody');
  if (!body) return;
  wizardPick = null;
  $('#whatIfTitle').textContent = 'What if?';
  body.innerHTML = '<p class="pp-sheet-note">Pick a scenario to preview its effect on your numbers. Nothing changes until you apply it.</p><div class="wi-list">' +
    wizardScenarios(state).map(s => '<button class="tmpl-card" type="button" data-wi="' + escapeHtml(s.id) + '"><span class="tmpl-name">' + escapeHtml(s.title) + '</span><span class="tmpl-sub">' + escapeHtml(s.blurb) + '</span></button>').join('') + '</div>';
}

/** @param {string} label @param {number} before @param {number} after @param {(n: number) => string} fmt @param {boolean} [higherIsBetter] */
function wizardRow(label, before, after, fmt, higherIsBetter = true) {
  const d = after - before;
  const cls = d === 0 ? '' : ((d > 0) === higherIsBetter ? 'wi-up' : 'wi-down');
  return '<tr><td>' + label + '</td><td class="mono">' + fmt(before) + '</td><td class="mono">' + fmt(after) + '</td><td class="mono ' + cls + '">' + (d > 0 ? '+' : '') + fmt(d) + '</td></tr>';
}

/**
 * Results table plus note for one scenario value; canApply says whether Apply is allowed.
 * @param {string} id @param {number} value
 */
function wizardResults(id, value) {
  const preview = previewScenario(state, id, value);
  const money = (/** @type {number} */ n) => fmtMoney0(Math.round(n));
  const table = preview.after
    ? '<table class="wi-table"><thead><tr><th></th><th>Now</th><th>After</th><th>Change</th></tr></thead><tbody>' +
      wizardRow('Take-home (after est. tax)', preview.before.takeHome, preview.after.takeHome, money) +
      wizardRow('Net profit', preview.before.income, preview.after.income, money) +
      wizardRow('Capacity used', preview.before.capacityPct, preview.after.capacityPct, fmtPct1, false) +
      wizardRow('Clients', preview.before.clients, preview.after.clients, n => String(Math.round(n))) +
      '</tbody></table>'
    : '';
  return { canApply: !!preview.changes, html: table + (preview.note ? '<p class="muted" style="margin-top: 8px;">' + escapeHtml(preview.note) + '</p>' : '') };
}

/** @param {string} id */
function renderWizardStep(id) {
  const body = $('#whatIfBody');
  const scenario = wizardScenarios(state).find(s => s.id === id);
  if (!body || !scenario) return;
  const p = scenario.param;
  wizardPick = { id, value: p.value };
  const results = wizardResults(id, p.value);
  $('#whatIfTitle').textContent = scenario.title;
  const bounds = 'min="' + p.min + '" max="' + p.max + '" step="' + p.step + '" value="' + p.value + '"';
  body.innerHTML = '<p class="pp-sheet-note">' + escapeHtml(scenario.blurb) + '</p>' +
    '<div class="wi-param"><label for="wiValue">' + escapeHtml(p.label) + '</label>' +
    (p.unit === '$' ? '' : '<input type="range" id="wiRange" ' + bounds + ' aria-label="' + escapeHtml(p.label) + ' slider">') +
    '<input type="number" id="wiValue" ' + bounds + '><span class="muted">' + (p.unit === '$' ? '' : escapeHtml(p.unit)) + '</span></div>' +
    '<div id="wiResults">' + results.html + '</div>' +
    '<div class="wi-actions"><button class="btn secondary" type="button" data-wi-back>Back</button>' +
    '<button class="btn primary" type="button" id="wiApply" data-wi-apply' + (results.canApply ? '' : ' disabled') + '>Apply to my scenario</button></div>';
}

function applyWizardPick() {
  if (!wizardPick) return;
  const { id, value } = wizardPick;
  const preview = previewScenario(state, id, value);
  if (!preview.changes) return;
  const title = wizardScenarios(state).find(s => s.id === id)?.title || 'What-if';
  pushHistory();
  Object.assign(state, preview.changes);
  persistState();
  render();
  resetSliders();
  ppCloseModal('whatIfModal');
  showToast('Applied: ' + title + '. Undo with Ctrl+Z.', 'success', 4000);
}

function initWhatIfWizard() {
  window.openWhatIfWizard = () => { renderWizardList(); ppOpenModal('whatIfModal'); };
  const body = $('#whatIfBody');
  if (!body) return;
  body.addEventListener('click', (/** @type {MouseEvent} */ e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const card = t.closest('[data-wi]');
    if (card) return renderWizardStep(card.getAttribute('data-wi') || '');
    if (t.closest('[data-wi-back]')) return renderWizardList();
    if (t.closest('[data-wi-apply]')) applyWizardPick();
  });
  body.addEventListener('input', (/** @type {Event} */ e) => {
    const t = /** @type {HTMLInputElement} */ (e.target);
    if (!wizardPick || (t.id !== 'wiRange' && t.id !== 'wiValue')) return;
    const n = Number(t.value);
    if (t.value === '' || !Number.isFinite(n)) return;
    wizardPick.value = n;
    // Re-render only the results and keep the slider/number pair in sync, so the focused input keeps focus
    const other = /** @type {HTMLInputElement | null} */ ($(t.id === 'wiRange' ? '#wiValue' : '#wiRange'));
    if (other) other.value = t.value;
    const results = wizardResults(wizardPick.id, n);
    $('#wiResults').innerHTML = results.html;
    $('#wiApply').disabled = !results.canApply;
  });
}

// Advanced Charts Panel: heat map, radar scorecard, client funnel
function initAdvancedChartsPanel() {
  const toggle = $('#advancedChartsToggle');
  const body = $('#advancedChartsBody');
  if (!toggle || !body) return;

  const renderCharts = () => {
    try {
      const metrics = calc(state);
      const heatmapEl = $('#heatmapContainer');
      const radarEl = $('#radarContainer');
      const funnelEl = $('#funnelContainer');
      if (heatmapEl) heatmapEl.innerHTML = renderSensitivityHeatmap(state);
      if (radarEl) radarEl.innerHTML = renderScorecardRadar(metrics);
      if (funnelEl) funnelEl.innerHTML = renderClientFunnel(metrics);
    } catch (e) {
      console.warn('Advanced charts render failed:', e);
    }
  };

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    const expandedNow = !isCollapsed;
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    if (expandedNow) renderCharts();
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
    Object.assign(adjusted, scaleOverhead(adjusted, 1 + overheadAdjust));
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
    const overheadOnlyMetrics = calc(scaleOverhead(overheadOnly, 1 + overheadAdjust));
    impacts.push({ label: 'Overhead', impact: Math.abs(overheadOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const overheadUp = JSON.parse(JSON.stringify(state));
    const overheadDownMetrics = calc(scaleOverhead(overheadUp, 1.2));
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


// Initialize debug, performance, and sensitivity panels after DOM is ready
try {
  initDebugPanel(() => state);
  initPerfPanel();
  initSensitivityPanel();
  initCustomerAnalyticsPanel();
  initMixOptimizerPanel();
  initInsightsPanel();
  initMembershipSection();
  initGroupRunsSection();
  initReversePanel();
  initAdvancedChartsPanel();
  initWhatIfWizard();
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

initScenarioComparison({ getState: () => state, render, persistState });
initOnboarding({ getState: () => state, render, persistState });

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