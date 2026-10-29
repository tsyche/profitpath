import type { CalcResult } from '../../src/types';
import { fmtMoney0 } from '../../src/calculations/currency';
import { escapeHtml } from '../services/miscService';
import { state } from '../state/appState';

const questions = [
  ['money', 'Where does the money go?'],
  ['services', 'Which services contribute most?'],
  ['capacity', 'What limits growth?'],
  ['income', 'What would reach my income target?'],
  ['customers', 'How do customer plans work?'],
  ['explore', 'Explore price and capacity assumptions']
] as const;
const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
function move(selector: string, destination: string) {
  const element = $(selector);
  const target = $(destination);
  if (element && target) target.appendChild(element);
}
function moveKpi(id: string, destination: string) {
  const element = $('#' + id)?.closest('.kpi');
  if (element) $(destination)?.appendChild(element);
}

export function initWorkspaceResults() {
  const root = $('#workspaceResults')!;
  root.insertAdjacentHTML('beforeend', `<div id="workspaceCase"></div><div id="workspacePrimaryMetrics" class="workspace-primary-metrics">
    <div class="workspace-primary-income"><span>Net income before tax</span><div id="workspaceIncomeValue"></div><p class="smallprint">Per year · after modeled costs</p></div></div>
    <section class="workspace-break-even" aria-label="Break-even summary"><div><h2>Break-even</h2><p id="workspaceBreakEvenSummary"></p><p id="workspaceMaterialWarning" class="smallprint"></p></div><button class="btn primary" type="button" id="workspaceResultsTryChange">Try a change</button></section>
    <div class="workspace-questions">${questions.map(([id, question]) => `<details class="workspace-question" id="workspaceQuestion-${id}"><summary>${question}</summary><div class="workspace-question-content" id="workspaceAnswer-${id}"></div></details>`).join('')}</div>`);
  move('#rangeCaseWrap', '#workspaceCase');
  move('#kpiIncome', '#workspaceIncomeValue');
  moveKpi('kpiRevenue', '#workspacePrimaryMetrics');
  moveKpi('kpiCapacity', '#workspacePrimaryMetrics');
  const primary = $('#workspacePrimaryMetrics')!;
  primary.after($('#workspaceOutcome')!, $('#workspaceResultActions')!);
  for (const id of ['kpiFixedCosts', 'kpiPayroll', 'kpiVariableCosts', 'kpiYearOneCashFlow', 'kpiContributionMargin']) moveKpi(id, '#workspaceAnswer-money');
  move('#costBreakdown', '#workspaceAnswer-money');
  move('.tax-section-wrapper', '#workspaceAnswer-money');
  move('.charts-visualizations-container', '#workspaceAnswer-money');
  for (const id of ['kpiClients', 'kpiSessions']) moveKpi(id, '#workspaceAnswer-services');
  $('#workspaceAnswer-services')!.insertAdjacentHTML('afterbegin', '<div class="table-wrap"><table class="table table-flat" aria-label="Annual offering contributions"><thead><tr><th>Offering</th><th>Revenue</th><th>Contribution</th></tr></thead><tbody id="workspaceOfferingContributions"></tbody></table></div>');
  move('#offeringRanking', '#workspaceAnswer-services');
  move('.mix-optimizer-wrapper', '#workspaceAnswer-services');
  move('.capacity', '#workspaceAnswer-capacity');
  moveKpi('kpiServiceHours', '#workspaceAnswer-capacity');
  $('#workspaceAnswer-capacity')!.insertAdjacentHTML('beforeend', '<p><a data-model-link="capacity">Review people, rooms, and equipment</a></p>');
  move('.reverse-calculator-wrapper', '#workspaceAnswer-income');
  move('.insights-wrapper', '#workspaceAnswer-income');
  move('.advisor-wrapper', '#workspaceAnswer-income');
  $('#workspaceAnswer-income')!.insertAdjacentHTML('afterbegin', '<button class="btn" type="button" id="workspaceWhatIf">Open What If wizard</button>');
  move('.membership-wrapper', '#workspaceAnswer-customers');
  move('.customer-analytics-wrapper', '#workspaceAnswer-customers');
  move('.sensitivity-wrapper', '#workspaceAnswer-explore');
  move('.advanced-charts-wrapper', '#workspaceAnswer-explore');
  move('#rangeBand', '#workspaceAnswer-explore');
  move('.break-even-section-wrapper', '#workspaceAnswer-money');
  for (const selector of ['.debug-wrapper', '.perf-wrapper']) move(selector, '#settingsMenu');
  // Preserve the original source containers/IDs for existing handlers, while retiring their empty presentation.
  $('#workspaceOutputs')!.hidden = true;
  root.addEventListener('toggle', event => {
    if (event.target instanceof HTMLDetailsElement && event.target.open) requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }, true);
  $('#workspaceResultsTryChange')!.addEventListener('click', () => $('#workspaceTryChange')?.click());
  $('#workspaceWhatIf')!.addEventListener('click', () => window.openWhatIfWizard());
}

export function updateWorkspaceResults(metrics: CalcResult) {
  const summary = $('#workspaceBreakEvenSummary');
  if (!summary) return;
  summary.textContent = Number.isFinite(metrics.breakEvenClients)
    ? `${Math.ceil(metrics.breakEvenClients).toLocaleString()} customers, or ${fmtMoney0(metrics.breakEvenRevenue)} annual revenue, cover modeled costs.`
    : 'No finite break-even point with the current contribution margin.';
  const incomplete = state.offerings.some(offering => !offering.name.trim() || offering.priceMonthly <= 0);
  $('#workspaceMaterialWarning')!.textContent = incomplete ? 'Complete offering names and positive prices before relying on these results.'
    : metrics.capacityPct > 100 ? 'Modeled demand exceeds productive capacity. Review people, resources, or customer mix.'
    : state.loadedTemplate ? 'Example assumptions: replace them with your business inputs before making a decision.'
    : state.mode === 'forecast' ? 'Forecast models capacity-supported customers. It does not predict demand or promise sales.'
    : 'Current results use your entered customer counts and service assumptions.';
  $('#workspaceOfferingContributions')!.innerHTML = metrics.offeringMetrics.map(offering => `<tr><td>${escapeHtml(offering.name)}</td><td>${fmtMoney0(offering.revenue)}</td><td>${fmtMoney0(offering.margin)}</td></tr>`).join('');
  $('#workspaceCase')!.hidden = $('#rangeBand')!.hidden;
  $('#workspaceResultsTryChange')?.toggleAttribute('disabled', Boolean(document.querySelector('#workspaceTryChange[disabled]')));
}
