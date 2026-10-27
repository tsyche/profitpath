import type { AppState } from '../../src/types';
import { calc } from '../../src/calculations/index';
import { monthlyCategorySpend } from '../../src/calculations/expenses';
import { fmtMoney0 } from '../../src/calculations/currency';
import { renderCustomerAnalyticsDashboard } from '../../src/analytics/customer-ui';
import { optimizeMix } from '../../src/insights/mixOptimizer';
import { generateInsights, generateWhatIfScenarios, type Insight } from '../../src/insights/insightsEngine';
import { getReverseCalculation, getRecommendedStrategy } from '../../src/insights/reverseCalculator';
type ReverseResult = { requiresChange?: boolean; feasible?: boolean; message: string; warning?: string };
import { $opt, $req } from '../utils/dom';
import { wizardScenarios, previewScenario } from '../../src/insights/whatIfWizard';
import { renderSensitivityHeatmap, renderScorecardRadar, renderClientFunnel } from '../services/advancedChartsService';
import { escapeHtml } from '../services/miscService';
import { showToast } from '../services/modalService';
import { fmtPct1 } from '../utils/format';
import { resetSliders } from './SensitivityPanel';

/** Collapsible analysis panels: customer analytics, mix optimizer, insights, reverse calculator, what-if wizard, advanced charts. */

interface AnalysisDeps {
  getState: () => AppState;
  pushHistory: () => void;
  persistState: () => void;
  render: () => void;
}

let state: AppState;
let deps: AnalysisDeps | null = null;

/** Capture the (never reassigned) app state object and the callbacks the wizard needs. */
export function initAnalysisPanels(d: AnalysisDeps): void {
  deps = d;
  state = d.getState();
}

// Reverse-calculator auto-refresh state
let reverseHasRun = false;
let reverseRefreshTimer: ReturnType<typeof setTimeout> | undefined;

const $ = $opt;

// Customer Analytics twisty (advanced feature). The markup existed but was never
// wired, so the toggle did nothing — connect it and render on expand.
export function initCustomerAnalyticsPanel() {
  const toggle = $('#customerAnalyticsToggle');
  const body = $('#customerAnalyticsBody');
  const panel = $('#customerAnalyticsPanel');
  if (!toggle || !body || !panel) return;

  const renderPanel = () => {
    try {
      const m = calc(state);
      // Marketing expense rows drive CAC; with none, the dashboard keeps its default budget
      const marketing = monthlyCategorySpend(state, 'Marketing');
      panel.innerHTML = renderCustomerAnalyticsDashboard(m, marketing > 0 ? { monthlyMarketingBudget: marketing } : {}).html;
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
export function initMixOptimizerPanel() {
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
    result = optimizeMix(state, metrics, objective as 'profit' | 'utilization');
  } catch (e) {
    console.warn('Mix optimization failed:', e);
    result = null;
  }

  if (!result) {
    resultsEl.innerHTML = '<p style="color: var(--muted);">Add at least two offerings to find an optimal mix.</p>';
    return;
  }

  let tableHtml = '<table class="sensitivity-comparison"><thead><tr><th title="Service offering">Offering</th><th title="Current mix percentage">Current Mix</th><th title="Suggested mix percentage">Suggested Mix</th></tr></thead><tbody>';
  result.suggestedMix.forEach((o, idx: number) => {
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
export function bindPanelToggle(toggleSel: string, bodySel: string, onOpen?: () => void) {
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
const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
/** @type {Record<string, string>} */
const SEVERITY_COLORS: Record<string, string> = { critical: 'var(--bad)', high: 'var(--bad)', medium: 'var(--warn)', low: 'var(--muted)' };

// Insights & What-Ifs: rules-based alerts plus what-if estimates computed by re-running calc
export function renderInsightsPanel() {
  const el = $('#insightsResults');
  if (!el) return;
  let insights: Insight[] = [];
  let whatIfs: ReturnType<typeof generateWhatIfScenarios> = [];
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

export function initInsightsPanel() {
  bindPanelToggle('#insightsToggle', '#insightsBody', renderInsightsPanel);
}

/** @type {Record<string, string>} */
const REVERSE_LABELS: Record<string, string> = { pricing: 'Raise prices', combined: 'Prices + volume', clients: 'Add clients', utilization: 'Raise utilization', costs: 'Cut costs' };

// What Would It Take?: solve each lever for a desired take-home
// Keep shown results current as inputs change; debounced because every lever is a bisection over calc()
export function scheduleReverseRefresh() {
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
    el.innerHTML = '<ul class="reverse-list" style="padding-left: 18px;">' + Object.entries(all as unknown as Record<string, ReverseResult | null>).map(([key, r]) => {
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

export function initReversePanel() {
  bindPanelToggle('#reverseToggle', '#reverseBody');
  $('#reverseRun')?.addEventListener('click', renderReverseResults);
  $('#reverseTarget')?.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') renderReverseResults(); });
}

// Guided "What If?" wizard: pick a scenario, set one dial, preview calc() before/after, optionally apply (undoable)
/** @type {{ id: string, value: number } | null} */
let wizardPick: { id: string; value: number } | null = null;

function renderWizardList() {
  const body = $('#whatIfBody');
  if (!body) return;
  wizardPick = null;
  $req('#whatIfTitle').textContent = 'What if?';
  body.innerHTML = '<p class="pp-sheet-note">Pick a scenario to preview its effect on your numbers. Nothing changes until you apply it. <a href="https://github.com/tsyche/profitpath/releases" target="_blank" rel="noopener noreferrer">See what’s new</a>.</p><div class="wi-list">' +
    wizardScenarios(state).map(s => '<button class="tmpl-card" type="button" data-wi="' + escapeHtml(s.id) + '"><span class="tmpl-name">' + escapeHtml(s.title) + '</span><span class="tmpl-sub">' + escapeHtml(s.blurb) + '</span></button>').join('') + '</div>';
}

/** @param {string} label @param {number} before @param {number} after @param {(n: number) => string} fmt @param {boolean} [higherIsBetter] */
function wizardRow(label: string, before: number, after: number, fmt: (n: number) => string, higherIsBetter = true) {
  const d = after - before;
  const cls = d === 0 ? '' : ((d > 0) === higherIsBetter ? 'wi-up' : 'wi-down');
  return '<tr><td>' + label + '</td><td class="mono">' + fmt(before) + '</td><td class="mono">' + fmt(after) + '</td><td class="mono ' + cls + '">' + (d > 0 ? '+' : '') + fmt(d) + '</td></tr>';
}

/**
 * Results table plus note for one scenario value; canApply says whether Apply is allowed.
 * @param {string} id @param {number} value
 */
function wizardResults(id: string, value: number) {
  const preview = previewScenario(state, id, value);
  const money = (n: number) => fmtMoney0(Math.round(n));
  const table = preview.after
    ? '<table class="wi-table"><thead><tr><th></th><th>Now</th><th>After</th><th>Change</th></tr></thead><tbody>' +
      wizardRow('Take-home (after est. tax)', preview.before.takeHome, preview.after.takeHome, money) +
      wizardRow('Net profit', preview.before.income, preview.after.income, money) +
      wizardRow('Capacity used', preview.before.capacityPct, preview.after.capacityPct, fmtPct1, false) +
      wizardRow('Clients', preview.before.clients, preview.after.clients, (n: number) => String(Math.round(n))) +
      '</tbody></table>'
    : '';
  return { canApply: !!preview.changes, html: table + (preview.note ? '<p class="muted" style="margin-top: 8px;">' + escapeHtml(preview.note) + '</p>' : '') };
}

/** @param {string} id */
function renderWizardStep(id: string) {
  const body = $('#whatIfBody');
  const scenario = wizardScenarios(state).find(s => s.id === id);
  if (!body || !scenario) return;
  const p = scenario.param;
  wizardPick = { id, value: p.value };
  const results = wizardResults(id, p.value);
  $req('#whatIfTitle').textContent = scenario.title;
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
  deps!.pushHistory();
  Object.assign(state, preview.changes);
  deps!.persistState();
  deps!.render();
  resetSliders();
  ppCloseModal('whatIfModal');
  showToast('Applied: ' + title + '. Undo with Ctrl+Z.', 'success', 4000);
}

export function initWhatIfWizard() {
  window.openWhatIfWizard = () => { renderWizardList(); ppOpenModal('whatIfModal'); };
  const body = $('#whatIfBody');
  if (!body) return;
  body.addEventListener('click', (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    const card = t.closest('[data-wi]');
    if (card) return renderWizardStep(card.getAttribute('data-wi') || '');
    if (t.closest('[data-wi-back]')) return renderWizardList();
    if (t.closest('[data-wi-apply]')) applyWizardPick();
  });
  body.addEventListener('input', (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (!wizardPick || (t.id !== 'wiRange' && t.id !== 'wiValue')) return;
    const n = Number(t.value);
    if (t.value === '' || !Number.isFinite(n)) return;
    wizardPick.value = n;
    // Re-render only the results and keep the slider/number pair in sync, so the focused input keeps focus
    const other = /** @type {HTMLInputElement | null} */ ($(t.id === 'wiRange' ? '#wiValue' : '#wiRange'));
    if (other) other.value = t.value;
    const results = wizardResults(wizardPick.id, n);
    $req('#wiResults').innerHTML = results.html;
    $req('#wiApply').disabled = !results.canApply;
  });
}

// Advanced Charts Panel: heat map, radar scorecard, client funnel
export function initAdvancedChartsPanel() {
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
