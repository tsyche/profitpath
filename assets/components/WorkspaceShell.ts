import type { CalcResult } from '../../src/types';
import { calc } from '../../src/calculations/index';
import { fmtMoney0 } from '../../src/calculations/currency';
import { getRangeCase, RANGE_CASE_LABELS } from '../../src/calculations/rangeCase';
import { MODEL_SECTIONS, parseWorkspaceView, usesWorkspaces, workspaceViewKey, type ModelSection, type WorkspaceView } from '../../src/ui/workspaceNavigation';
import { persistState, state } from '../state/appState';
import { getAllScenarios, escapeHtml } from '../services/miscService';
import { saveScenario, uniqueCopyName, loadScenario } from '../services/scenarioService';
import { closeScenarioModal, createModal } from './Modal';
import { showScenarioComparisonDiff } from './ScenarioComparison';
import { openScenarioModal } from './UIHelpers';
import { initOfferingEditor, renderOfferingEditor, refreshOfferingList } from './OfferingEditor';
import { ensureValidInputs, hasPendingInputs, restorePendingInputs } from '../state/pendingInputs';
import { showWorkspaceExamples, startBlankWorkspace } from './WorkspaceEntry';
import { initWorkspaceResults, updateWorkspaceResults } from './WorkspaceResults';
import { showWorkspaceShareReview } from './WorkspaceShare';
import { leaveReadOnlyMode } from '../utils/readOnly';
import { render } from '../state/hooks';
import '../workspaces.css';

const viewKey = 'profitpath-workspace-view';
const nameKey = 'profitpath-working-name';
const labels = ['Business', 'Offerings', 'Costs', 'People & capacity', 'Assumptions'];
let current: WorkspaceView = { workspace: 'model', section: 'business' };
let lastModel: WorkspaceView = { ...current };
let draftName = 'Untitled model';
let retained = true;
let ready = false;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
function read(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function write(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Navigation remains usable without storage. */ } }
function urlFor(view: WorkspaceView) {
  const url = new URL(location.href);
  url.searchParams.set('view', workspaceViewKey(view));
  return url.pathname + url.search + url.hash;
}
function move(selector: string, destination: string) {
  const element = $(selector);
  const target = $(destination);
  if (element && target) target.appendChild(element);
}
function moveField(id: string, destination: string) {
  const field = $('#' + id)?.closest('.field');
  if (field) $(destination)?.appendChild(field);
}
function normalizedSnapshot(value: unknown): string {
  // Saving a named scenario clears only its example attribution.
  return JSON.stringify({ ...(value as Record<string, unknown>), loadedTemplate: null });
}
function scenarios() { try { return getAllScenarios(); } catch { return []; } }
function announce(message: string) { const status = $('#workspaceAnnouncement'); if (status) status.textContent = message; }

export function navigateWorkspace(view: WorkspaceView, options: { replace?: boolean; focus?: boolean } = {}) {
  if (!ready) return;
  const previous = workspaceViewKey(current);
  current = parseWorkspaceView(workspaceViewKey(view));
  if (current.workspace === 'model') lastModel = { ...current };
  const key = workspaceViewKey(current);
  if (options.replace) history.replaceState(history.state, '', urlFor(current));
  else if (key !== previous) history.pushState(history.state, '', urlFor(current));
  write(viewKey, key);
  applyView(options.focus !== false);
}

function applyView(focus: boolean) {
  for (const workspace of ['model', 'results', 'compare']) {
    const element = $(`#workspace${workspace[0].toUpperCase() + workspace.slice(1)}`);
    if (element) { element.hidden = current.workspace !== workspace; element.inert = element.hidden; }
  }
  for (const section of MODEL_SECTIONS) {
    const element = $(`[data-model-section="${section}"]`);
    if (element) { element.hidden = current.section !== section; element.inert = element.hidden; }
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-workspace]').forEach(link => {
    const workspace = link.dataset.workspace;
    const view = workspace === 'model' ? lastModel : parseWorkspaceView(workspace!);
    link.href = urlFor(view);
    if (workspace === current.workspace) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-model-link]').forEach(link => {
    const section = link.dataset.modelLink as ModelSection;
    link.href = urlFor({ workspace: 'model', section });
    if (current.section === section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const picker = $<HTMLSelectElement>('#workspaceSection');
  if (picker) picker.value = current.section;
  $('#workspaceApp')!.dataset.workspace = current.workspace;
  $('#workspaceModelTitle')!.textContent = labels[MODEL_SECTIONS.indexOf(current.section)];
  const section = $(`[data-model-section="${current.section}"]`);
  section?.querySelectorAll<HTMLDetailsElement>(':scope > details:not(#setupNotes)').forEach(details => { details.open = true; });
  refreshWorkspace();
  renderOfferingEditor(current.offeringId, calc(state));
  restorePendingInputs();
  if (focus) {
    $(`#workspace${current.workspace[0].toUpperCase() + current.workspace.slice(1)}`)?.focus({ preventScroll: true });
    document.body.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }
  // Existing canvas/chart consumers listen for resize; wait until the view has measurable dimensions.
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

function refreshComparison() {
  const saved = scenarios();
  let selection: { id1?: string; id2?: string } = {};
  try { selection = JSON.parse(read('profitpath-compare-selection') || '{}'); } catch { /* invalid preferences reset */ }
  for (const [id, key] of [['workspaceBaseline', 'id1'], ['workspaceAlternative', 'id2']] as const) {
    const select = $<HTMLSelectElement>('#' + id);
    if (!select) continue;
    const value = select.value || selection[key] || '';
    select.innerHTML = '<option value="">Choose a saved scenario</option>';
    for (const scenario of saved) {
      const option = document.createElement('option');
      option.value = scenario.id; option.textContent = scenario.name;
      select.appendChild(option);
    }
    select.value = value;
  }
  $('#workspaceCompareEmpty')!.hidden = saved.length >= 2;
  $('#workspaceCompareControls')!.hidden = saved.length < 2;
}

export function refreshWorkspace(metrics: CalcResult = calc(state)) {
  if (!ready) return;
  const name = $<HTMLInputElement>('#workspaceName');
  if (name && document.activeElement !== name) name.value = draftName;
  const saved = scenarios().find(scenario => scenario.name.toLowerCase() === draftName.toLowerCase());
  const matches = saved && normalizedSnapshot(saved.state || saved.data) === normalizedSnapshot(state);
  $('#workspaceSaveStatus')!.textContent = !retained
    ? 'Draft could not be saved on this device. Free storage and edit again, or export a copy.'
    : matches ? 'Matches saved scenario · draft saved on this device'
    : 'Draft saved on this device · named scenario unchanged';
  const template = state.loadedTemplate && window.INDUSTRY_TEMPLATES?.[state.loadedTemplate];
  $('#workspaceExample')!.textContent = template ? `Example data · ${template.name}` : 'Working model';
  $('#workspaceContext')!.textContent = `${state.mode === 'forecast' ? 'Forecast · capacity-supported customers' : 'Current · existing customers'} · ${state.currency} · ${RANGE_CASE_LABELS[getRangeCase()]} case`;
  $('#workspaceOutcome')!.textContent = `This model produces ${fmtMoney0(metrics.income)} per year before estimated tax, at ${metrics.capacityPct.toFixed(1)}% of productive capacity.`;
  $('#workspaceModelReturn')?.setAttribute('href', urlFor(lastModel));
  $('#workspacePayroll')!.textContent = fmtMoney0(metrics.annualPayroll);
  const incomplete = hasPendingInputs();
  $('#workspacePendingStatus')!.hidden = !incomplete;
  $<HTMLButtonElement>('#workspaceSave')!.disabled = incomplete;
  $<HTMLButtonElement>('#workspaceTryChange')!.disabled = incomplete;
  document.querySelectorAll<HTMLButtonElement>('[data-workspace-action="share"]').forEach(button => { button.disabled = incomplete; });
  refreshOfferingList(metrics);
  updateWorkspaceResults(metrics);
  const caseUrl = new URL(location.href);
  if (caseUrl.searchParams.get('case') !== getRangeCase()) {
    caseUrl.searchParams.set('case', getRangeCase());
    history.replaceState(history.state, '', caseUrl.pathname + caseUrl.search + caseUrl.hash);
  }
  const assumptions = $('#workspaceAssumptionsList');
  if (assumptions) assumptions.innerHTML = state.offerings.map(offering => `<li><div><strong>${escapeHtml(offering.name)}</strong><p class="smallprint">${escapeHtml(offering.confidence || 'Untagged')} · ${offering.salesLossPct || 0}% expected sales loss${offering.resource ? ' · capacity resource in use' : ''}${offering.costPerRun ? ' · group run cost in use' : ''}</p></div><button class="btn" data-edit-offering="${escapeHtml(offering.id)}" type="button">Edit source</button></li>`).join('');
  refreshComparison();
}

function saveWorkingScenario() {
  if (!ensureValidInputs()) return;
  const name = draftName.trim();
  if (!name) { $('#workspaceName')?.focus(); return; }
  const existing = scenarios().find(scenario => scenario.name.toLowerCase() === name.toLowerCase());
  if (existing && normalizedSnapshot(existing.state || existing.data) !== normalizedSnapshot(state)) {
    createModal({ title: 'Update saved scenario?', content: `Replace the saved “${escapeHtml(existing.name)}” with this draft?`, buttons: [
      { text: 'Cancel' }, { text: 'Update scenario', primary: true, action: () => saveScenario(name) }
    ] });
  } else saveScenario(name);
}

function tryChange() {
  if (!ensureValidInputs()) return;
  const saved = scenarios();
  const existing = saved.find(scenario => scenario.name.toLowerCase() === draftName.toLowerCase());
  const suggested = uniqueCopyName(`${draftName} alternative`, saved.map(scenario => scenario.name));
  const modal = createModal({
    title: 'Try a change',
    content: `<p>${existing ? `Keep saved “${escapeHtml(existing.name)}” unchanged.` : `Save this draft as “${escapeHtml(draftName)}” first.`} Explore changes in a separately named draft.</p>
      <label for="workspaceAlternativeName">Alternative name</label><input id="workspaceAlternativeName" maxlength="120" value="${escapeHtml(suggested)}">`,
    buttons: [{ text: 'Cancel' }, { text: 'Create alternative', primary: true, action: () => {
      const name = modal.querySelector<HTMLInputElement>('#workspaceAlternativeName')!.value.trim();
      if (!name || saved.some(scenario => scenario.name.toLowerCase() === name.toLowerCase())) { announce('Choose a new alternative name.'); return; }
      if (!existing) saveScenario(draftName);
      draftName = name; write(nameKey, name);
      if (document.body.classList.contains('pp-readonly')) { leaveReadOnlyMode(); render(); }
      navigateWorkspace({ workspace: 'model', section: 'offerings' });
      announce('Alternative draft created. The saved baseline is unchanged.');
    } }]
  });
}

export function initWorkspaceShell({ shared = false } = {}) {
  if (!usesWorkspaces()) return;
  const grid = $('.grid');
  const controls = $('#controls');
  const outputs = grid?.querySelector<HTMLElement>(':scope > aside.card');
  if (!grid || !controls || !outputs) return;
  const validation = $('#validationContainer');
  const templateBadge = $('#templateBadge');
  const summary = $('.setup-summary');
  document.body.classList.add('workspace-layout');
  grid.id = 'workspaceApp'; grid.classList.add('workspace-grid');
  grid.innerHTML = `<section class="workspace-context" aria-label="Scenario context">
    <div><p id="workspaceExample" class="workspace-eyebrow"></p><label class="visually-hidden" for="workspaceName">Scenario name</label>
      <input id="workspaceName" maxlength="120" autocomplete="off" value="Untitled model"><p id="workspaceSaveStatus" role="status"></p><p id="workspaceContext"></p></div>
    <div class="workspace-actions"><button class="btn" id="workspaceSave" type="button" aria-label="Save scenario">Save</button><button class="btn" id="workspaceTryChange" type="button">Try a change</button>
      <button class="btn" data-workspace-action="share" type="button">Share / export</button>
      <details class="workspace-context-more"><summary>More</summary><div><button class="btn" data-workspace-action="scenarios" type="button">Saved scenarios</button><button class="btn" data-workspace-action="templates" type="button">New / examples</button><button class="btn" data-workspace-action="import" type="button">Import CSV</button></div></details></div></section>
    <nav class="workspace-nav" aria-label="Workspaces"><a data-workspace="model">Model</a><a data-workspace="results">Results</a><a data-workspace="compare">Compare</a></nav>
    <div id="workspacePendingStatus" class="workspace-pending-status" role="status" hidden>Incomplete changes are not saved. Results use the last valid values. <button class="btn" id="workspaceFixInput" type="button">Fix incomplete input</button></div>
    <div id="workspaceValidation"></div>
    <main id="workspaceModel" tabindex="-1" aria-labelledby="workspaceModelTitle">
      <nav class="workspace-section-nav" aria-label="Model sections">${MODEL_SECTIONS.map((section, index) => `<a data-model-link="${section}">${labels[index]}</a>`).join('')}</nav>
      <div class="workspace-section-picker"><label for="workspaceSection">Model section</label><select id="workspaceSection">${MODEL_SECTIONS.map((section, index) => `<option value="${section}">${labels[index]}</option>`).join('')}</select></div>
      <div class="workspace-model-content"><p class="workspace-eyebrow">Model</p><h1 id="workspaceModelTitle">Business</h1><div id="workspaceControls"></div></div>
    </main>
    <main id="workspaceResults" tabindex="-1" aria-labelledby="workspaceResultsTitle" hidden><p class="workspace-eyebrow">Annual results</p><h1 id="workspaceResultsTitle">Does this model work?</h1><p id="workspaceOutcome" class="workspace-outcome"></p>
      <div id="workspaceResultActions" class="workspace-actions"><a id="workspaceModelReturn" class="btn" href="#">Edit this model</a><button class="btn" data-workspace-action="share" type="button">Share / export</button></div><div id="workspaceOutputs"></div></main>
    <main id="workspaceCompare" tabindex="-1" aria-labelledby="workspaceCompareTitle" hidden><p class="workspace-eyebrow">Saved options</p><h1 id="workspaceCompareTitle">Which change should you make?</h1>
      <div id="workspaceCompareEmpty" class="workspace-empty"><h2>Save an option to compare.</h2><p>Save a baseline, then use Try a change and save an alternative. Both remain on this device.</p></div>
      <div id="workspaceCompareControls"><div class="workspace-compare-selects"><div><label for="workspaceBaseline">Baseline</label><select id="workspaceBaseline"></select></div><div><label for="workspaceAlternative">Alternative</label><select id="workspaceAlternative"></select></div></div>
      <div class="workspace-actions"><button class="btn primary" id="workspaceCompareButton" type="button">Compare options</button><button class="btn" id="workspaceEditAlternative" type="button">Edit alternative</button></div><p class="smallprint">Annual values. Comparison opens the existing full detail view, including its export and share actions.</p></div></main>
    <p class="visually-hidden" id="workspaceAnnouncement" role="status" aria-live="polite"></p>`;
  $('#workspaceControls')!.appendChild(controls);
  $('#workspaceOutputs')!.appendChild(outputs);
  for (const id of ['analysisAnalyzePanel', 'analysisCustomersPanel']) {
    const panel = $('#' + id);
    if (panel) { panel.hidden = false; panel.removeAttribute('role'); panel.removeAttribute('aria-labelledby'); }
  }
  if (validation) $('#workspaceValidation')!.appendChild(validation);
  if (templateBadge) $('#workspaceControls')!.appendChild(templateBadge);
  const body = controls.querySelector('.card-b')!;
  for (const section of MODEL_SECTIONS) {
    const panel = document.createElement('div');
    panel.dataset.modelSection = section; body.appendChild(panel);
  }
  const destination = (section: ModelSection) => `[data-model-section="${section}"]`;
  move('#setupBasics', destination('business')); move('#setupNotes', destination('business'));
  const currency = $('#currencySelect')?.closest('.settings-select-label');
  if (currency) {
    const originalSection = currency.closest<HTMLElement>('.settings-section');
    $(destination('business'))!.appendChild(currency);
    if (originalSection) originalSection.hidden = true;
  }
  const mode = $<HTMLSelectElement>('#modeSelect');
  if (mode) {
    mode.options[0].textContent = 'What can my capacity support? (Forecast)';
    mode.options[1].textContent = 'How does my current customer base perform? (Current)';
  }
  const levelHeading = $('#settingsMenu .settings-section h4');
  if (levelHeading) levelHeading.textContent = 'Initial detail';
  const reset = $('#resetBtn');
  if (reset) {
    const resetGroup = document.createElement('details');
    resetGroup.innerHTML = '<summary>Reset working model</summary><p class="smallprint">Named saved scenarios remain on this device.</p>';
    resetGroup.appendChild(reset);
    $('#settingsMenu')!.appendChild(resetGroup);
  }
  $(destination('business'))!.insertAdjacentHTML('afterbegin', `<details class="workspace-getting-started"${read('profitpath-onboarding-completed') === 'true' ? '' : ' open'}><summary>Start here · optional guidance</summary><p>Use an example, start blank, or open a saved scenario. Results are available throughout.</p>
    <div class="workspace-actions"><button class="btn" data-workspace-action="templates" type="button">Use an example</button><button class="btn" data-workspace-action="blank" type="button">Start blank</button><button class="btn" data-workspace-action="scenarios" type="button">Open saved scenarios</button></div>
    <ol><li>Choose the business mode and currency.</li><li>Add your offerings and their prices.</li><li>Review people, capacity, and costs.</li><li>Read Results, then try a change.</li></ol></details>`);
  move('#setupOfferings', destination('offerings')); move('#setupCosts', destination('costs'));
  move('#resourcesSection', destination('capacity')); move('#rangesSection', destination('assumptions'));
  move('#marketSection', destination('assumptions')); move('#groupRunsSection', destination('offerings'));
  const people = document.createElement('section');
  people.className = 'workspace-fields'; people.id = 'workspacePeople'; people.innerHTML = '<h2>People and productive time</h2>';
  $(destination('capacity'))!.prepend(people);
  move('.team-config-group', '#workspacePeople');
  for (const id of ['productiveUtilizationPct', 'targetUtilizationPct']) moveField(id, '#workspacePeople');
  const costs = document.createElement('section');
  costs.className = 'workspace-fields'; costs.id = 'workspaceCostFields'; costs.innerHTML = '<h2>Overhead and payments</h2>';
  $(destination('costs'))!.prepend(costs);
  for (const id of ['monthlyCosts', 'processingFeePct', 'processingFeePerTransaction', 'transactionsPerMonth']) moveField(id, '#workspaceCostFields');
  const payroll = document.createElement('p');
  payroll.innerHTML = 'Annual payroll: <strong id="workspacePayroll"></strong>. <a data-model-link="capacity">Edit people and capacity</a>. Profit spreads purchases over their useful life; Year 1 cash flow includes full purchases and loan principal.';
  $(destination('costs'))!.appendChild(payroll);
  if (summary) { summary.classList.add('workspace-summary'); summary.insertAdjacentHTML('beforeend', '<a data-workspace="results">View Results</a>'); $('#workspaceModel')!.appendChild(summary); }
  initOfferingEditor({ select: offeringId => navigateWorkspace({ workspace: 'model', section: 'offerings', ...(offeringId ? { offeringId } : {}) }) });
  initWorkspaceResults();
  $(destination('assumptions'))!.insertAdjacentHTML('beforeend', '<p>Review the assumptions behind the answer. Offering-specific values stay in their focused editor.</p><ul id="workspaceAssumptionsList" class="workspace-assumptions-list"></ul><details id="workspaceRangePresets"><summary>Range presets</summary></details>');
  const spreads = $('#suggestRangesBtn')?.parentElement;
  if (spreads) $('#workspaceRangePresets')!.appendChild(spreads);
  $('.skip-link')?.setAttribute('href', '#workspaceModel');
  draftName = shared ? (new URL(location.href).searchParams.get('name') || 'Shared snapshot').slice(0, 120) : read(nameKey) || 'Untitled model';
  const url = new URL(location.href);
  current = shared ? parseWorkspaceView('results') : parseWorkspaceView(url.searchParams.get('view') ?? read(viewKey));
  if (current.workspace === 'model') lastModel = { ...current };
  ready = true;
  grid.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('a, button');
    if (!target) return;
    if (target.dataset.workspace) {
      event.preventDefault(); navigateWorkspace(target.dataset.workspace === 'model' ? lastModel : parseWorkspaceView(target.dataset.workspace)); return;
    }
    if (target.dataset.modelLink) {
      event.preventDefault(); navigateWorkspace({ workspace: 'model', section: target.dataset.modelLink as ModelSection }); return;
    }
    if (target.id === 'workspaceModelReturn') { event.preventDefault(); navigateWorkspace(lastModel); return; }
    if (target.dataset.workspaceAction === 'scenarios') openScenarioModal();
    if (target.dataset.workspaceAction === 'import') $('#importCSVBtn')?.click();
    const named = (name: string) => { draftName = name; write(nameKey, name); navigateWorkspace({ workspace: 'model', section: 'offerings' }); };
    if (target.dataset.workspaceAction === 'templates') showWorkspaceExamples(named);
    if (target.dataset.workspaceAction === 'blank') startBlankWorkspace(named);
    if (target.dataset.workspaceAction === 'share') {
      const first = $<HTMLSelectElement>('#workspaceBaseline')!.value;
      const second = $<HTMLSelectElement>('#workspaceAlternative')!.value;
      showWorkspaceShareReview(draftName, current.workspace === 'compare' && first && second && first !== second ? { first, second } : undefined);
    }
    if (target.id === 'workspaceSave') saveWorkingScenario();
    if (target.id === 'workspaceFixInput') ensureValidInputs();
    if (target.dataset.editOffering) navigateWorkspace({ workspace: 'model', section: 'offerings', offeringId: target.dataset.editOffering });
    if (target.id === 'workspaceTryChange') tryChange();
    if (target.id === 'workspaceCompareButton') {
      const first = $<HTMLSelectElement>('#workspaceBaseline')!.value;
      const second = $<HTMLSelectElement>('#workspaceAlternative')!.value;
      if (!first || !second || first === second) { announce('Choose two different saved scenarios.'); return; }
      showScenarioComparisonDiff(first, second, () => { navigateWorkspace(parseWorkspaceView('compare')); $('#workspaceCompareButton')?.focus(); });
    }
    if (target.id === 'workspaceEditAlternative') {
      const id = $<HTMLSelectElement>('#workspaceAlternative')!.value;
      if (id) { loadScenario(id); navigateWorkspace({ workspace: 'model', section: 'offerings' }); }
    }
  });
  const keepFieldVisible = () => {
    const field = document.activeElement;
    if (!matchMedia('(max-width: 760px)').matches || !(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) || !field.closest('#workspaceModel')) return;
    const visibleHeight = window.visualViewport?.height || innerHeight;
    const bounds = field.getBoundingClientRect();
    if (bounds.top < 70 || bounds.bottom > visibleHeight - 155) {
      const row = field.closest<HTMLElement>('.workspace-editor-field, .field') || field;
      const offset = row.getBoundingClientRect().top - 80;
      document.body.scrollBy(0, offset);
    }
  };
  grid.addEventListener('focusin', () => requestAnimationFrame(keepFieldVisible));
  window.visualViewport?.addEventListener('resize', () => {
    document.body.classList.toggle('workspace-keyboard-open', window.visualViewport!.height < innerHeight * .75);
    requestAnimationFrame(keepFieldVisible);
  });
  $('#workspaceSection')!.addEventListener('change', event => navigateWorkspace({ workspace: 'model', section: (event.target as HTMLSelectElement).value as ModelSection }));
  $('#workspaceName')!.addEventListener('input', event => {
    draftName = (event.target as HTMLInputElement).value.slice(0, 120); write(nameKey, draftName); refreshWorkspace();
  });
  for (const id of ['workspaceBaseline', 'workspaceAlternative']) $('#' + id)!.addEventListener('change', () => {
    write('profitpath-compare-selection', JSON.stringify({ id1: $<HTMLSelectElement>('#workspaceBaseline')!.value, id2: $<HTMLSelectElement>('#workspaceAlternative')!.value }));
  });
  window.addEventListener('popstate', () => { current = parseWorkspaceView(new URL(location.href).searchParams.get('view')); if (current.workspace === 'model') lastModel = { ...current }; applyView(true); });
  $('.ab-logo')?.addEventListener('click', event => { event.preventDefault(); navigateWorkspace({ workspace: 'model', section: 'business' }); });
  window.addEventListener('profitpath:outputs', event => refreshWorkspace((event as CustomEvent<CalcResult>).detail));
  window.addEventListener('profitpath:rendered', () => { refreshWorkspace(); renderOfferingEditor(current.offeringId, calc(state)); });
  window.addEventListener('profitpath:refresh-offering-list', () => refreshOfferingList(calc(state)));
  window.addEventListener('profitpath:pending-inputs', () => refreshWorkspace());
  window.addEventListener('profitpath:reveal-input', event => {
    const [body, id] = (event as CustomEvent<string>).detail.split(':');
    if (['offeringsBody', 'rangesBody', 'marketBody', 'groupRunsBody', 'resourceTagBody'].includes(body)) {
      navigateWorkspace({ workspace: 'model', section: 'offerings', offeringId: id });
      document.querySelectorAll<HTMLDetailsElement>('#workspaceOfferingEditor details').forEach(details => { details.open = true; });
    } else {
      const section = body === 'expensesBody' || ['monthlyCosts', 'processingFeePct', 'processingFeePerTransaction', 'transactionsPerMonth'].includes(id) ? 'costs'
        : body === 'resourcesBody' || ['fullTimeEmployees', 'partTimeEmployees', 'fullTimeEmployeePay', 'partTimeEmployeePay', 'productiveUtilizationPct', 'targetUtilizationPct'].includes(id) ? 'capacity' : 'business';
      navigateWorkspace({ workspace: 'model', section });
    }
  });
  window.addEventListener('profitpath:draft-status', event => { retained = (event as CustomEvent<boolean>).detail; refreshWorkspace(); });
  window.addEventListener('profitpath:scenario', event => {
    const detail = (event as CustomEvent<{ action?: string; name: string }>).detail;
    draftName = detail.name; write(nameKey, draftName); refreshWorkspace();
    if (detail.action === 'loaded' && $('#scenariosModal')) {
      closeScenarioModal(); navigateWorkspace({ workspace: 'model', section: 'business' });
    }
  });
  retained = persistState();
  navigateWorkspace(current, { replace: true, focus: false });
}
