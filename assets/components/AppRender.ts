import type { AppState, CalcResult } from '../../src/types';
import { calc } from '../../src/calculations/index';
import { displayPrice, isOneTime, isPerSession } from '../../src/calculations/offeringPrice';
import { getRangeCase } from '../../src/calculations/rangeCase';
import { fmtMoney0, normalizeCurrency, taxBasisNote } from '../../src/calculations/currency';
import { confidenceBadgeHtml } from './RangeCasePanel';
import { renderGroupRunResults, renderGroupRunsTable } from './GroupRunsPanel';
import { renderMembershipPanel, renderMembershipResults } from './MembershipPanel';
import { renderAdvisorPanel, renderInsightsPanel, scheduleReverseRefresh } from './AnalysisPanels';
import { renderCostBreakdown, renderExpenses } from './ExpensesPanel';
import { renderMarketTable, renderOfferingRanking, renderRangeBand, renderRangesTable } from './RangesMarketPanel';
import { renderResources } from './ResourcesPanel';
import { captureTableFocus, restoreTableFocus } from '../hooks/useTableFocus';
import { escapeHtml, lazyLoadChart, updateRichVisualizations } from '../services/miscService';
import * as businessLogic from '../services/businessLogic';
import { clamp, errMsg, errStack, safeParseNumber } from '../utils/helpers';
import { fmtInt, fmtPct1 } from '../utils/format';
import { $, $$ } from '../utils/dom';
import { persistState, pushHistory, redo, state, undo } from '../state/appState';

/** Main render pass: inputs, offerings table, KPI outputs and the panels that follow them. */

export function setStateFromInputs() {
  state.mode = $('#modeSelect')!.value as AppState['mode'];

  // Validate and sanitize inputs for full-time and part-time employees
  state.fullTimeEmployees = Math.max(0, Math.floor(safeParseNumber($('#fullTimeEmployees')!.value, 1)));
  state.partTimeEmployees = Math.max(0, Math.floor(safeParseNumber($('#partTimeEmployees')!.value, 0)));
  state.fullTimeEmployeePay = Math.max(0, safeParseNumber($('#fullTimeEmployeePay')!.value, 0));
  state.partTimeEmployeePay = Math.max(0, safeParseNumber($('#partTimeEmployeePay')!.value, 0));

  state.monthlyCosts = Math.max(0, safeParseNumber($('#monthlyCosts')!.value, 0));
  state.processingFeePct = clamp(safeParseNumber($('#processingFeePct')!.value, 0), 0, 20);
  state.processingFeePerTransaction = Math.max(0, safeParseNumber($('#processingFeePerTransaction')!.value, 0));
  state.transactionsPerMonth = Math.max(0, safeParseNumber($('#transactionsPerMonth')!.value, 0));
  state.productiveUtilizationPct = clamp(safeParseNumber($('#productiveUtilizationPct')!.value, 80), 0, 100);
  state.targetUtilizationPct = clamp(safeParseNumber($('#targetUtilizationPct')!.value, 75), 0, 150);
  state.lockMix = Boolean($('#lockMix')?.checked);
}

export function syncCurrencySelect() {
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
  state.processingFeePerTransaction = 0;
  state.transactionsPerMonth = 0;
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


export function render() {
  syncCurrencySelect();
  captureTableFocus('offeringsTable');

  let metrics: CalcResult;
  try {
    metrics = calc(state);
    window.lastMetrics = metrics;
  } catch (e) {
    console.error('calc() failed:', errMsg(e));
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
    } as unknown as CalcResult;
    // Display error in debug panel
    const dbg = $('#debugPanel');
    if (dbg) {
      dbg.textContent = 'Calculation error: ' + errStack(e);
      dbg.style.display = 'block';
    }
  }

  // ===== RENDER PHASE: Display all UI updates =====

  // Top-level inputs
  {
    const el = $('#modeSelect'); if (el) el.value = String(state.mode);
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
    const el = $('#fullTimeEmployees'); if (el) el.value = String(state.fullTimeEmployees);
  }
  {
    const el = $('#partTimeEmployees'); if (el) el.value = String(state.partTimeEmployees);
  }
  {
    const el = $('#fullTimeEmployeePay'); if (el) el.value = String(state.fullTimeEmployeePay);
  }
  {
    const el = $('#partTimeEmployeePay'); if (el) el.value = String(state.partTimeEmployeePay);
  }
  {
    const el = $('#monthlyCosts'); if (el) el.value = String(state.monthlyCosts);
  }
  {
    const el = $('#processingFeePct'); if (el) el.value = String(state.processingFeePct);
  }
  {
    const el = $('#processingFeePerTransaction'); if (el) el.value = String(state.processingFeePerTransaction);
    const count = $('#transactionsPerMonth'); if (count) count.value = String(state.transactionsPerMonth);
  }
  {
    const el = $('#productiveUtilizationPct'); if (el) el.value = String(state.productiveUtilizationPct);
  }

  const isForecast = state.mode === 'forecast';
  {
    const targetEl = $('#targetUtilizationPct');
    if (targetEl) {
      const field = targetEl.closest('.field');
      if (field) field.classList.toggle('hidden', !isForecast);
      targetEl.value = String(state.targetUtilizationPct);
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
  tbody!.innerHTML = '';

  metrics.offerings.forEach((o, idx: number) => {
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
      '<td class="cell-edit group-inputs" data-label="Sessions / yr">' + (oneTime ? '<span class="muted">—</span>' : '<input aria-label="Sessions per year for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="0.1" value="' + (o.sessionsPerYear) + '" data-k="sessionsPerYear" data-i="' + (idx) + '" data-tooltip="' + sessionsTip + '"/>') + '</td>' +
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

    tbody!.appendChild(tr);
  });

  restoreTableFocus('offeringsTable');
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
    const sum = metrics.offerings.reduce((a: number, o) => a + (Number(o.mixPct) || 0), 0);
    const delta = Math.abs(sum - 100);

    mixNote!.classList.add('note-forecast');
    if (state.lockMix) mixNote!.classList.add('note-lock');
    if (!state.lockMix && delta >= 0.05) mixNote!.classList.add('note-warn');

    mixNote!.textContent = state.lockMix
      ? 'Forecast mode: editing Mix % (locked to 100%, auto-balancing others)'
      : (delta < 0.05
        ? 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '%)'
        : 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '% — auto-normalized for calculations)');
  } else {
    const total = metrics.offerings.reduce((a: number, o) => a + (Number(o.currentClients) || 0), 0);
    mixNote!.classList.add('note-current');
    mixNote!.textContent = total > 0
      ? 'Current mode: editing Clients (utilization computed from workload)'
      : 'Current mode: start by entering Clients';
  }

  // KPIs
  // Respect prefers-reduced-motion for animations
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // populate KPI elements directly in case core.js isn't loaded (tests use
  // app.ts standalone)
  function setKpi(id: string, value: string | number) {
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
  setKpi('kpiYearOneCashFlow', fmtMoney0(metrics.yearOneCashFlow));

  updateOutputs(metrics);

  // Update validation messages
  if (typeof updateValidationDisplay === 'function') updateValidationDisplay();

  // Update template source badge
  updateTemplateBadge();
}

// Build an inline SVG progress ring for the utilization KPI card
function buildUtilizationRing(pct: number) {
  const r = 16;
  const circ = +(2 * Math.PI * r).toFixed(2);
  const fill = Math.min(clamp(pct, 0, 150) / 150, 1);
  const offset = +(circ * (1 - fill)).toFixed(2);
  const color = pct > 100 ? 'var(--bad)' : pct > 75 ? 'var(--warn)' : 'var(--good)';
  return `<div class="kpi-ring-wrap"><svg width="40" height="40" viewBox="0 0 40 40" class="kpi-ring" aria-hidden="true"><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--border)" stroke-width="3.5"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="${color}" stroke-width="3.5" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 20 20)" stroke-linecap="round"/></svg><span style="color:${color}">${fmtPct1(pct)}</span></div>`;
}

// Apply a status class (good/warn/danger) to the nearest .kpi ancestor of a value element
function applyKpiStatus(valueEl: Element | null, status: string) {
  const card = valueEl?.closest('.kpi');
  if (!card) return;
  card.classList.remove('kpi--good', 'kpi--warn', 'kpi--danger');
  if (status) card.classList.add('kpi--' + status);
}

// Inject or update the break-even progress bar inside a KPI card
function updateBreakEvenBar(cardEl: Element | null, clients: number, beClients: number) {
  if (!cardEl || !Number.isFinite(beClients) || beClients <= 0) return;
  let bar = cardEl.querySelector<HTMLElement>('.kpi-be-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'kpi-be-bar';
    bar.innerHTML = '<div class="kpi-be-bar-fill"></div>';
    cardEl.appendChild(bar);
  }
  const ratio = Math.min(1, clients / beClients);
  const color = clients >= beClients ? 'var(--good)' : ratio > 0.7 ? 'var(--warn)' : 'var(--bad)';
  const fill = bar.querySelector<HTMLElement>('.kpi-be-bar-fill');
  if (fill) fill.style.cssText = `width:${(ratio * 100).toFixed(1)}%;background:${color}`;
  bar.dataset.tooltip = `${fmtInt(clients)} of ${fmtInt(beClients)} clients needed to break even`;
}

export function updateOutputs(metrics: CalcResult) {
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
    if (!$('#advisorBody')?.classList.contains('collapsed')) renderAdvisorPanel();
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
        kpiFederalTax!.textContent = fmtMoney0(metrics.federalTax);
        kpiQuarterly!.textContent = fmtMoney0(metrics.quarterlyEst);
        kpiTakeHome!.textContent = fmtMoney0(metrics.takeHome);
        kpiTakeHome!.style.color = metrics.takeHome > 0 ? 'var(--good)' : 'var(--bad)';
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
        const others = pools.filter((p) => p.id !== metrics.bottleneck.id).map((p) => p.name + ' ' + fmtPct1(p.pct));
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
    if (dbg && $('#debugBody') && !$('#debugBody')!.classList.contains('collapsed')) {
      dbg.textContent = JSON.stringify(metrics, null, 2);
    }
  } catch (e) {
    console.warn('updateOutputs error:', e);
  }
}


// Update key metrics for both full screen and mobile
function updateKeyMetrics() {
  try {
    const metrics = calc(state);

    // Appbar at-a-glance chips (Revenue, Net income, Utilization). Net income
    // is the only one kept on narrow widths; tapping opens the glance modal.
    const setText = (id: string, val: string) => { const el = $('#' + id); if (el) el.textContent = val; };
    const revenue = fmtMoney0(metrics.revenue || 0);
    const income = fmtMoney0(metrics.income || 0);
    const util = fmtPct1(metrics.capacityPct || 0);
    const incomeStatus = (metrics.income || 0) >= 60000 ? 'good' : (metrics.income || 0) >= 0 ? 'warn' : 'danger';
    const incomeColor = incomeStatus === 'good' ? 'var(--good)' : incomeStatus === 'warn' ? 'var(--warn)' : 'var(--bad)';
    setText('abkRevenue', revenue);
    setText('abkIncome', income);
    setText('abkUtil', util);
    setText('setupSummaryRevenue', revenue);
    setText('setupSummaryIncome', income);
    setText('setupSummaryUtilization', util);
    const abkIncome = $('#abkIncome'); if (abkIncome) abkIncome.style.color = incomeColor;
    const glIncome = $('#glIncome'); if (glIncome) glIncome.style.color = incomeColor;
    const setupSummaryIncome = $('#setupSummaryIncome'); if (setupSummaryIncome) setupSummaryIncome.style.color = incomeColor;

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


export function bindControls(): void {
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
  const resetBtn = $('#resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetDefaults);
  // Wire the currency selector (per-scenario display currency)
  const currencyEl = $('#currencySelect');
  if (currencyEl) {
    currencyEl.addEventListener('change', () => {
      state.currency = normalizeCurrency(currencyEl.value);
      persistState();
      render();
    });
  }
  // Wire presentation notes textarea
  const notesEl = $('#scenarioNotes');
  if (notesEl) {
    // Value is filled in wire(), after URL/localStorage state is applied
    notesEl.addEventListener('input', () => {
      state.notes = notesEl.value.slice(0, 2000);
      persistState();
    });
  }
  // Mobile undo/redo buttons
  const mobileUndoBtn = $('#mobileUndoBtn');
  if (mobileUndoBtn) mobileUndoBtn.addEventListener('click', undo);
  const mobileRedoBtn = $('#mobileRedoBtn');
  if (mobileRedoBtn) mobileRedoBtn.addEventListener('click', redo);
}
