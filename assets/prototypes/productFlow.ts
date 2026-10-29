import { calc, normalizeOfferingType } from '../../src/calculations/index';
import { displayPrice, isOneTime, isPerSession, monthlyFromPerSession, priceMonthlyForNewVisits } from '../../src/calculations/offeringPrice';
import { getRangeCase, RANGE_CASE_LABELS, setRangeCase } from '../../src/calculations/rangeCase';
import type { AppOffering, AppState, CalcResult } from '../../src/types';
import { fitnessFixture, hybridFixture } from './fixtures';

// Review-only composition. No application boot code, production storage, or new financial rules.
const storageKey = 'profitpath-design-prototype-v1';
const sections = ['business', 'offerings', 'costs', 'capacity', 'assumptions'] as const;
const sectionLabels = ['Business', 'Offerings', 'Costs', 'People & capacity', 'Assumptions'];
type Section = typeof sections[number];
type SavedOption = { name: string; model: AppState };
type Draft = { model: AppState; name: string; options: SavedOption[]; example: boolean };
let draft: Draft = { model: fitnessFixture(), name: 'Fitness example', options: [], example: true };
try {
  const stored = sessionStorage.getItem(storageKey);
  if (stored) draft = JSON.parse(stored) as Draft;
} catch { /* A blocked session store leaves a usable in-memory prototype. */ }
let selected = '';
let query = '';
let typeFilter = '';
let lastModel = '#model/business';
let listScroll = 0;
let returnToOffering = '';
let groupedField = '';
let compareBase = 0;
let compareAlternative = 1;
const history: AppState[] = [];
const invalid = new Map<string, { text: string; message: string }>();
const root = document.getElementById('app')!;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const html = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const money = (value: number, currency = draft.model.currency) => Number.isFinite(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) : 'Not reached';
const pct = (value: number) => `${value.toFixed(1)}%`;
const unit = (offering: AppOffering) => isOneTime(offering) ? 'sale' : isPerSession(offering) ? 'session' : 'month';
const announce = (message: string) => { $('#announcement')!.textContent = message; };
const hasInvalid = () => invalid.size > 0;
function persist() {
  try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); }
  catch { announce('Tab storage is unavailable. Keep this tab open to retain the prototype draft.'); }
}
function navigate(hash: string) {
  if (location.hash === hash) render(true);
  else location.hash = hash;
}
function view() {
  const [workspace, rawSection, offeringId] = location.hash.slice(1).split('/');
  const section: Section = sections.includes(rawSection as Section) ? rawSection as Section : 'business';
  return { workspace: ['model', 'results', 'compare'].includes(workspace) ? workspace : 'entry', section, offeringId };
}
function link(hash: string, label: string, current = false) {
  return `<a href="${html(hash)}"${current ? ' aria-current="page"' : ''}>${html(label)}</a>`;
}
function field(label: string, key: string, value: number | string, options: { min?: number; max?: number; hint?: string; text?: boolean; optional?: boolean } = {}) {
  const id = `field-${selected || 'business'}-${key}`;
  const errorKey = `${selected}:${key}`;
  const error = invalid.get(errorKey);
  return `<div class="field"><label for="${id}">${html(label)}</label>
    <input id="${id}" data-field="${key}" value="${html(error?.text ?? value)}" type="${options.text ? 'text' : 'number'}"
      ${options.text ? 'maxlength="120"' : `step="any" min="${options.min ?? 0}" ${options.max === undefined ? '' : `max="${options.max}"`}`}
      ${options.optional ? 'data-optional="true"' : 'required'} aria-invalid="${Boolean(error)}" aria-describedby="${id}-hint ${id}-error">
    <p id="${id}-hint" class="hint">${html(options.hint || '')}</p>
    <p id="${id}-error" class="error"${error ? '' : ' hidden'}>${html(error?.message)}</p></div>`;
}
function heading(eyebrow: string, title: string, description: string) {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div></div>`;
}
function entry() {
  return `<main class="entry" id="workspace" tabindex="-1">
    <div class="entry-intro"><p class="eyebrow">A clearer path to your next decision</p>
    <h1>Build your model.<br>See what works.</h1><p>Explore your services, costs, and capacity. Then compare a change before making it.</p></div>
    <div class="entry-grid"><section class="surface"><p class="eyebrow">Start with an example</p><h2>Fitness & wellness</h2>
      <p>Personal training, group classes, and online coaching. Use the example to learn the flow, then make it yours.</p>
      <div class="template-types"><span class="chip">3 offerings</span><span class="chip">1 full-time person</span><span class="chip">USD · annual results</span></div>
      <div class="preview"><div><span>Personal training</span><strong>$300 / month</strong></div><div><span>Group fitness</span><strong>$150 / month</strong></div><div><span>Online coaching</span><strong>$100 / month</strong></div></div>
      <p class="hint">Example assumptions, not recommended prices or expected demand. Forecast models what capacity can support.</p>
      <div class="actions" style="margin-top:22px"><button class="primary" data-action="fitness">Use Fitness example</button><button data-action="hybrid">Explore 12-offering studio</button></div>
    </section><div class="entry-alternatives"><section class="surface"><h2>Start with your business</h2><p>A blank draft, with optional guidance. You can visit Results at any time.</p><button data-action="blank">Start blank</button></section>
      <section class="surface"><h2>Keep exploring</h2><p>This prototype retains its own draft in this tab. Your real saved scenarios remain in the current app.</p><button data-action="resume">Resume prototype draft</button></section></div></div>
    <p class="hint" style="margin-top:24px">Review tasks: edit a service, check the result, try a change, and compare two saved options. No mandatory tour.</p>
  </main>`;
}
function context() {
  const saved = draft.options.find(option => option.name === draft.name);
  const matches = saved && JSON.stringify(saved.model) === JSON.stringify(draft.model);
  return `<section class="context" aria-label="Scenario context"><div><p class="eyebrow">${draft.example ? 'Example data · customize before use' : 'Working model'}</p>
    <strong>${html(draft.name)}</strong><p class="muted" id="draftStatus">${matches ? 'Matches saved option' : 'Draft retained in this tab · unsaved option'}</p>
    <p class="hint">${draft.model.mode === 'forecast' ? 'Forecast · capacity-supported customers' : 'Current · existing customers'} · ${html(draft.model.currency)} · ${RANGE_CASE_LABELS[getRangeCase()]} case</p></div>
    <div class="actions"><button data-action="undo" ${history.length ? '' : 'disabled'}>Undo</button><button data-action="save" ${hasInvalid() ? 'disabled' : ''}>Save option</button><button data-action="try" ${hasInvalid() ? 'disabled' : ''}>Try a change</button><button data-action="share" aria-label="Review / share" ${hasInvalid() ? 'disabled' : ''}>Share</button></div></section>`;
}
function summary(metrics: CalcResult) {
  return `<aside class="live-summary" aria-label="Live annual results"><div class="summary-numbers"><div><span>Net income / year</span><strong data-metric="income">${money(metrics.income)}</strong></div>
    <div><span>Revenue / year</span><strong data-metric="revenue">${money(metrics.revenue)}</strong></div><div><span>Utilization</span><strong data-metric="capacityPct">${pct(metrics.capacityPct)}</strong></div></div>${link('#results', 'View Results')}</aside>`;
}
function business() {
  return `${heading('Model / Business', 'Start with the question.', 'Set how this model works. Every section is available whenever you need it.')}
    <div class="checklist" aria-label="Optional setup checklist">${sections.slice(0, 4).map((section, index) => link(`#model/${section}`, `${index + 1}. ${sectionLabels[index]}`)).join('')}</div>
    <section class="surface"><h2>What are you modeling?</h2><div class="form-grid">
      <div class="field wide"><label for="mode">Business mode</label><select id="mode" data-setting="mode">
        <option value="forecast" ${draft.model.mode === 'forecast' ? 'selected' : ''}>What can my capacity support? (Forecast)</option>
        <option value="current" ${draft.model.mode === 'current' ? 'selected' : ''}>How does my current customer base perform? (Current)</option></select>
        <p class="hint">Forecast uses your service mix and available capacity. It does not predict demand or promise sales.</p></div>
      <div class="field"><label for="currency">Scenario currency</label><select id="currency" data-setting="currency">${['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(currency => `<option ${currency === draft.model.currency ? 'selected' : ''}>${currency}</option>`).join('')}</select><p class="hint">Display units only. No exchange-rate conversion.</p></div>
      <div class="field wide"><label for="notes">Context and conclusion</label><textarea id="notes" maxlength="2000" data-setting="notes">${html(draft.model.notes)}</textarea><p class="hint">Keep assumptions and the decision together for sharing.</p></div>
    </div></section>`;
}
function offeringRows() {
  return draft.model.offerings.filter(offering => offering.name.toLowerCase().includes(query.toLowerCase()) && (!typeFilter || (offering.type || 'subscription') === typeFilter)).map(offering =>
    `<button type="button" class="offering-row" data-offering="${html(offering.id)}" aria-pressed="${offering.id === selected}">
      ${html(offering.name)}<span data-row-id="${html(offering.id)}">${html(offering.type || 'subscription')} · ${money(displayPrice(offering))} / ${unit(offering)} · ${draft.model.mode === 'forecast' ? `${offering.mixPct}% mix` : `${offering.currentClients} clients`}</span></button>`
  ).join('') || '<p class="muted">No matching offerings. Try another name or type.</p>';
}
function offeringEditor(offering: AppOffering) {
  const oneTime = isOneTime(offering);
  return `<section class="surface editor" aria-label="Offering editor"><button class="back-list" data-action="back-list">Back to offerings</button>
    <div class="editor-head"><p class="eyebrow">Focused editor</p><h2>${html(offering.name)}</h2><p class="hint">Changes update your draft and annual results. Saved options stay separate.</p></div>
    <div class="form-grid">${field('Offering name', 'name', offering.name, { text: true })}
      <div class="field"><label for="offeringType">Offering type</label><select id="offeringType" data-setting="type">${['subscription', 'per-session', 'group', 'one-time'].map(type => `<option value="${type}" ${type === (offering.type || 'subscription') ? 'selected' : ''}>${type === 'per-session' ? 'Per session' : type === 'one-time' ? 'One-time sale' : type === 'group' ? 'Group' : 'Subscription'}</option>`).join('')}</select></div>
      ${field(`Price per ${unit(offering)} (${draft.model.currency})`, 'price', displayPrice(offering), { min: 0.01 })}
      ${oneTime ? '<p class="hint">One sale per customer. No staff hours; variable cost is per sale.</p>' : field('Sessions per year', 'sessionsPerYear', offering.sessionsPerYear, { min: 1 })}
      ${oneTime ? '' : field('Hours per session', 'hoursPerSession', offering.hoursPerSession, { min: 0.1 })}
      ${draft.model.mode === 'forecast' ? field('Share of customers (%)', 'mixPct', offering.mixPct, { max: 100, hint: 'Customer mix, not revenue share. Math normalizes the total.' }) : field('Current customers', 'currentClients', offering.currentClients)}
    </div><details ${$('#detail') instanceof HTMLSelectElement && ($('#detail') as HTMLSelectElement).value === 'advanced' ? 'open' : ''}><summary>Delivery and costs${offering.resource || offering.costPerRun ? ' · in use' : ''}</summary><div class="form-grid">
      ${field(oneTime ? 'Variable cost per sale' : 'Variable cost per session', 'variableCostPerSession', offering.variableCostPerSession)}
      ${field('Contractor labor (% of price)', 'laborPctOfPrice', offering.laborPctOfPrice || 0, { max: 100 })}
      ${offering.type === 'group' ? field('Seats per run', 'seats', offering.seats || 1, { min: 1 }) + field('Filled seats (%)', 'fillPct', offering.fillPct || 100, { min: 1, max: 100 }) + field('Cost per group run', 'costPerRun', offering.costPerRun || 0) : ''}
      <div class="field"><label for="resource">Capacity resource</label><select id="resource" data-setting="resource"><option value="">Staff only</option>${(draft.model.resources || []).map(resource => `<option value="${html(resource.id)}" ${resource.id === offering.resource ? 'selected' : ''}>${html(resource.name)}${resource.staffFree ? ' · no staff time' : ''}</option>`).join('')}</select><p class="hint">${link('#model/capacity', 'Review people and capacity')}</p></div>
    </div></details><details id="priceAssumptions"><summary>Pricing assumptions · try a price change</summary><p class="hint">Change price above, then estimate how much demand you might lose. The model does not estimate this for you.</p><div class="form-grid">
      ${field('Expected sales lost (%)', 'salesLossPct', offering.salesLossPct || 0, { max: 100 })}
      ${field('Best discount (%)', 'discountPct', offering.discountPct || 0, { max: 100 })}
    </div></details><details><summary>Uncertainty and context · ${html(offering.confidence || 'untagged')}</summary><p class="hint">Ranges describe scenarios, not statistical confidence. Existing bounds remain in use.</p><div class="form-grid">
      <div class="field"><label for="confidence">Input confidence</label><select id="confidence" data-setting="confidence">${['', 'verified', 'estimated', 'guess'].map(value => `<option value="${value}" ${value === (offering.confidence || '') ? 'selected' : ''}>${value || 'Not tagged'}</option>`).join('')}</select></div>
      ${field('Offering note', 'note', offering.note || '', { text: true, optional: true })}
      ${draft.model.mode === 'current' ? field('Customers · low', 'currentClientsLow', offering.currentClientsLow ?? '', { optional: true }) + field('Customers · high', 'currentClientsHigh', offering.currentClientsHigh ?? '', { optional: true }) : offering.type === 'group' ? field('Filled seats · low (%)', 'fillPctLow', offering.fillPctLow ?? '', { min: 1, max: 100, optional: true }) + field('Filled seats · high (%)', 'fillPctHigh', offering.fillPctHigh ?? '', { min: 1, max: 100, optional: true }) : ''}
    </div></details></section>`;
}
function offerings() {
  const offering = draft.model.offerings.find(offering => offering.id === selected);
  return `${heading('Model / Offerings', 'One service at a time.', 'Find a service, edit what matters, and see the result without crossing the whole model.')}
    <div class="editor-layout ${offering ? 'has-selection' : ''}"><div class="list-column"><div class="offering-tools">
    <label class="sr-only" for="offeringSearch">Find an offering</label><input id="offeringSearch" type="search" placeholder="Find an offering…" value="${html(query)}">
    <label class="sr-only" for="typeFilter">Filter by type</label><select id="typeFilter"><option value="">All types</option>${['subscription', 'group', 'per-session', 'one-time'].map(type => `<option ${typeFilter === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
    <button data-action="add">Add offering</button></div><div class="offering-list">${offeringRows()}</div></div>
    ${offering ? offeringEditor(offering) : '<section class="surface editor"><p class="eyebrow">Focused editor</p><h2>Choose an offering</h2><p class="muted">Your list stays short. Details appear here when you need them.</p></section>'}</div>`;
}
function costs() {
  const metrics = calc(draft.model);
  return `${heading('Model / Costs', 'Give every cost a home.', 'Business-wide costs belong here. Delivery costs stay with their offering; payroll stays with people.')}
    <section class="surface"><h2>Overhead and payments</h2><div class="form-grid">
      ${field('Other overhead per month', 'monthlyCosts', draft.model.monthlyCosts)}
      ${field('Processing fee (% of revenue)', 'processingFeePct', draft.model.processingFeePct, { max: 20 })}
      ${field('Flat fee per transaction', 'processingFeePerTransaction', draft.model.processingFeePerTransaction)}
      ${field('Transactions per month', 'transactionsPerMonth', draft.model.transactionsPerMonth)}
    </div><details open><summary>Expense rows · ${(draft.model.expenses || []).length} in use</summary>
      ${(draft.model.expenses || []).length ? `<ul class="review-list">${draft.model.expenses.map(expense => `<li><div><strong>${html(expense.name)}</strong><p class="muted">${html(expense.category)} · ${money(expense.amount)} · ${expense.frequency}</p></div></li>`).join('')}</ul>` : '<p class="muted">No expense rows in this example.</p>'}
      <p class="hint">Prototype: expense rows are read-only examples. The production expense editor will move here.</p>
    </details><p style="margin-top:20px">Annual payroll: <strong>${money(metrics.annualPayroll)}</strong> · ${link('#model/capacity', 'Edit people')}</p>
    <p class="hint">Profit spreads one-time purchases over their useful life. Year 1 cash flow includes full purchases and loan principal.</p></section>`;
}
function capacity() {
  return `${heading('Model / People & capacity', 'What can you deliver?', 'Separate paid time from productive time. Rooms and equipment can limit capacity too.')}
    <section class="surface"><div class="form-grid">
      ${field('Full-time people', 'fullTimeEmployees', draft.model.fullTimeEmployees)}
      ${field('Annual pay per full-time person', 'fullTimeEmployeePay', draft.model.fullTimeEmployeePay)}
      ${field('Part-time people', 'partTimeEmployees', draft.model.partTimeEmployees)}
      ${field('Annual pay per part-time person', 'partTimeEmployeePay', draft.model.partTimeEmployeePay)}
      ${field('Productive time (%)', 'productiveUtilizationPct', draft.model.productiveUtilizationPct, { max: 100, hint: 'Share of paid hours available for service delivery.' })}
      ${field('Forecast target utilization (%)', 'targetUtilizationPct', draft.model.targetUtilizationPct, { max: 150 })}
    </div><details open><summary>Rooms and equipment · ${(draft.model.resources || []).length} in use</summary>
      <ul class="review-list">${(draft.model.resources || []).map(resource => `<li><div><strong>${html(resource.name)}</strong><p class="muted">${resource.hoursPerWeek} hours/week · ${resource.weeksPerYear} weeks/year${resource.staffFree ? ' · no staff time' : ''}</p></div></li>`).join('') || '<li>No additional resources.</li>'}</ul>
      <p class="hint">Prototype: these resources are read-only examples. Their current values still feed the live calculation.</p></details></section>`;
}
function assumptions() {
  return `${heading('Model / Assumptions', 'Know what rests on a guess.', 'Review the inputs behind the answer. Edit each value at its source.')}
    <section class="surface"><ul class="review-list">
    ${draft.model.offerings.map(offering => `<li><div><strong>${html(offering.name)}</strong><p class="muted">${html(offering.confidence || 'Not tagged')} · ${offering.salesLossPct || 0}% expected sales loss${offering.resource ? ' · resource assigned' : ''}</p></div>${link(`#model/offerings/${offering.id}`, 'Edit source')}</li>`).join('') || '<li>Add your first offering to review its assumptions.</li>'}</ul>
    <p class="hint">Forecast is capacity-supported output, not predicted sales. Tax estimates use the current simplified US assumptions.</p></section>`;
}
function results(metrics: CalcResult) {
  const warning = !draft.model.offerings.length ? 'Add an offering before relying on these results.' : metrics.capacityPct > 100 ? 'Modeled demand exceeds productive capacity. Review people, resources, or service mix.' : draft.example ? 'These are example assumptions. Replace them with your business inputs before making a decision.' : 'Demand and sales-loss assumptions are yours. This model does not predict customer behavior.';
  return `${heading('Results / Annual model', 'Does this model work?', `This model produces ${money(metrics.income)} per year before estimated tax, at ${pct(metrics.capacityPct)} of productive capacity.`)}
    <p class="eyebrow">${draft.model.mode === 'forecast' ? 'Forecast' : 'Current'} · ${draft.model.currency} · ${RANGE_CASE_LABELS[getRangeCase()]} case</p>
    <div class="case-picker" aria-label="Scenario case">${(['conservative', 'base', 'optimistic'] as const).map(activeCase => `<button data-case="${activeCase}" aria-pressed="${activeCase === getRangeCase()}">${RANGE_CASE_LABELS[activeCase]}</button>`).join('')}</div>
    <div class="metrics"><div class="metric"><span class="label">Net income before tax</span><strong>${money(metrics.income)}</strong><span class="hint">Per year · after modeled costs</span></div>
      <div class="metric"><span class="label">Revenue</span><strong>${money(metrics.revenue)}</strong><span class="hint">Per year · gross</span></div>
      <div class="metric"><span class="label">Capacity utilization</span><strong>${pct(metrics.capacityPct)}</strong><span class="hint">Busiest productive pool</span></div></div>
    <div class="break-even"><div><strong>Break-even · ${Number.isFinite(metrics.breakEvenClients) ? Math.ceil(metrics.breakEvenClients) : 'No finite number of'} customers</strong><p>${money(metrics.breakEvenRevenue)} annual revenue to cover modeled costs.</p></div><button class="primary" data-action="try" ${hasInvalid() ? 'disabled' : ''}>Try a change</button></div>
    <div class="warning"><p>${warning}${hasInvalid() ? ' Results use the last valid values. Correct the incomplete fields before saving or sharing.' : ''}</p></div>
    <div class="actions">${link(lastModel, 'Edit this model')}${link('#compare', 'Compare saved options')}<button data-action="share" ${hasInvalid() ? 'disabled' : ''}>Review / share</button></div>
    <div class="question-grid"><details><summary>Where does the money go?</summary><table aria-label="Annual cost breakdown"><tbody>
      <tr><th>Payroll</th><td>${money(metrics.annualPayroll)}</td></tr><tr><th>Fixed costs</th><td>${money(metrics.annualFixedCosts)}</td></tr><tr><th>Variable costs</th><td>${money(metrics.variableCosts)}</td></tr><tr><th>Year 1 cash flow</th><td>${money(metrics.yearOneCashFlow)}</td></tr><tr><th>Estimated take-home</th><td>${money(metrics.takeHome)}</td></tr>
    </tbody></table><p class="hint">Take-home follows estimated US federal taxes. Cash flow includes purchases and loan principal; it differs from net income.</p>${link('#model/costs', 'Review costs')}</details>
    <details><summary>Which services contribute most?</summary><ul class="review-list">${metrics.offeringMetrics.slice().sort((a, b) => b.margin - a.margin).map(offering => `<li><div>${html(offering.name)}<p>${money(offering.margin)} annual contribution</p></div></li>`).join('')}</ul>${link('#model/offerings', 'Edit offerings')}</details>
    <details><summary>What limits growth?</summary><ul class="review-list">${metrics.poolUtilization.map(pool => `<li>${html(pool.name)}<strong>${pct(pool.pct)}</strong></li>`).join('')}</ul>${link('#model/capacity', 'Review capacity')}</details>
    <details><summary>What would reach my income target?</summary><p>The existing reverse calculator and What If wizard will live here. Their calculations stay unchanged.</p><p class="hint">Placement preview only; these tools remain available in the current app.</p></details></div>`;
}
function comparison() {
  if (draft.options.length < 2) {
    return `${heading('Compare / Saved options', 'Which change should you make?', 'Keep a baseline, save an alternative, and compare both models.')}
      <section class="surface empty"><h2>Save an option to compare.</h2><p>Save the current draft, then choose “Try a change” to explore an alternative without replacing it.</p><button data-action="save" ${hasInvalid() ? 'disabled' : ''}>Save current option</button><p class="hint">${draft.options.length} of 2 options saved in this prototype tab.</p></section>`;
  }
  compareBase = Math.min(compareBase, draft.options.length - 1);
  compareAlternative = Math.min(compareAlternative, draft.options.length - 1);
  const base = draft.options[compareBase];
  const alternative = draft.options[compareAlternative];
  const first = calc(base.model);
  const second = calc(alternative.model);
  const options = (selectedIndex: number) => draft.options.map((option, index) => `<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${html(option.name)}</option>`).join('');
  return `${heading('Compare / Saved options', 'Put the change in context.', 'Two saved snapshots. Your working draft changes only when you choose an option to edit.')}
    <p class="hint">${RANGE_CASE_LABELS[getRangeCase()]} case applied to both options. Annual values; no currency conversion.</p>
    <div class="compare-selects"><div><label for="compareBase">Baseline</label><select id="compareBase">${options(compareBase)}</select></div><div><label for="compareAlternative">Alternative</label><select id="compareAlternative">${options(compareAlternative)}</select></div></div>
    ${compareBase === compareAlternative ? '<p class="warning">Choose two different options to see a useful comparison.</p>' : ''}
    <div class="surface"><table class="comparison" aria-label="Annual scenario comparison"><thead><tr><th>Annual measure</th><th>Baseline<br>${base.model.currency} · ${base.model.mode}</th><th>Alternative<br>${alternative.model.currency} · ${alternative.model.mode}</th></tr></thead><tbody>
      <tr><th>Net income before tax</th><td>${money(first.income, base.model.currency)}</td><td>${money(second.income, alternative.model.currency)}</td></tr>
      <tr><th>Revenue</th><td>${money(first.revenue, base.model.currency)}</td><td>${money(second.revenue, alternative.model.currency)}</td></tr>
      <tr><th>Capacity utilization</th><td>${pct(first.capacityPct)}</td><td>${pct(second.capacityPct)}</td></tr></tbody></table>
      <div class="actions" style="margin-top:22px"><button data-edit-option="${compareBase}">Edit baseline</button><button data-edit-option="${compareAlternative}">Edit alternative</button><button data-action="share" ${hasInvalid() ? 'disabled' : ''}>Review / share</button></div>
      <p class="hint">Design placement for the existing two-scenario comparison. Richer deltas and a verdict belong to roadmap item 38.</p></div>`;
}
function render(focus = false) {
  const { workspace, section, offeringId } = view();
  root.dataset.workspace = workspace;
  if (workspace === 'entry') root.innerHTML = entry();
  else {
    if (workspace === 'model') {
      selected = section === 'offerings' ? offeringId || '' : '';
      lastModel = location.hash;
    }
    const metrics = calc(draft.model);
    const content = workspace === 'results' ? results(metrics) : workspace === 'compare' ? comparison() :
      section === 'offerings' ? offerings() : section === 'costs' ? costs() : section === 'capacity' ? capacity() : section === 'assumptions' ? assumptions() : business();
    root.innerHTML = `<div class="shell"><aside class="rail"><nav class="primary-nav" aria-label="Workspaces">${link(lastModel, 'Model', workspace === 'model')}${link('#results', 'Results', workspace === 'results')}${link('#compare', 'Compare', workspace === 'compare')}</nav>
      <nav class="section-nav" aria-label="Model sections"><p class="eyebrow" style="padding-left:14px">Your model</p>${sections.map((item, index) => link(`#model/${item}`, sectionLabels[index], workspace === 'model' && item === section)).join('')}</nav>
      <p class="rail-note">One model.<br>Three places to think.<br><br>${link('#entry', 'Examples & entry')}</p></aside>
      <div class="main-column">${context()}<main id="workspace" tabindex="-1">
      ${workspace === 'model' ? `<div class="mobile-section"><label for="modelSection">Model section</label><select id="modelSection">${sections.map((item, index) => `<option value="${item}" ${item === section ? 'selected' : ''}>${sectionLabels[index]}</option>`).join('')}</select></div>` : ''}
      ${content}<p id="editStatus" class="hint" role="status">${hasInvalid() ? 'Results use the last valid values. Correct incomplete fields before saving or sharing.' : ''}</p></main>${workspace === 'model' ? summary(metrics) : ''}</div></div>`;
  }
  if (focus) $('#workspace')?.focus({ preventScroll: true });
}
function record(fieldKey = '') {
  if (!fieldKey || groupedField !== fieldKey) history.push(structuredClone(draft.model));
  groupedField = fieldKey;
}
function refreshLiveResults() {
  const metrics = calc(draft.model);
  document.querySelectorAll<HTMLElement>('[data-metric]').forEach(element => {
    const key = element.dataset.metric as 'income' | 'revenue' | 'capacityPct';
    element.textContent = key === 'capacityPct' ? pct(metrics[key]) : money(metrics[key]);
  });
  const status = $('#editStatus');
  if (status) status.textContent = hasInvalid() ? 'Results use the last valid values. Correct incomplete fields before saving or sharing.' : 'Draft updated. Annual results recalculated.';
  const draftStatus = $('#draftStatus');
  if (draftStatus) draftStatus.textContent = 'Draft retained in this tab · unsaved changes';
  document.querySelectorAll<HTMLButtonElement>('[data-action="save"], [data-action="try"], [data-action="share"]').forEach(button => { button.disabled = hasInvalid(); });
  const undo = $<HTMLButtonElement>('[data-action="undo"]');
  if (undo) undo.disabled = history.length === 0;
  $('.offering-list')?.querySelectorAll<HTMLElement>('[data-row-id]').forEach(element => {
    const offering = draft.model.offerings.find(offering => offering.id === element.dataset.rowId);
    if (offering) element.textContent = `${offering.type || 'subscription'} · ${money(displayPrice(offering))} / ${unit(offering)} · ${draft.model.mode === 'forecast' ? `${offering.mixPct}% mix` : `${offering.currentClients} clients`}`;
  });
}
const modelNumbers = new Set(['monthlyCosts', 'processingFeePct', 'processingFeePerTransaction', 'transactionsPerMonth', 'fullTimeEmployees', 'fullTimeEmployeePay', 'partTimeEmployees', 'partTimeEmployeePay', 'productiveUtilizationPct', 'targetUtilizationPct']);
function updateInput(input: HTMLInputElement) {
  const key = input.dataset.field!;
  const errorKey = `${selected}:${key}`;
  const optionalEmpty = input.dataset.optional === 'true' && input.value === '';
  const valid = optionalEmpty || (input.type === 'text' ? input.value.trim().length > 0 : input.value !== '' && input.validity.valid && Number.isFinite(Number(input.value)));
  if (!valid) invalid.set(errorKey, { text: input.value, message: input.type === 'text' ? 'Enter a name.' : `Enter a value${input.min ? ` of at least ${input.min}` : ''}${input.max ? ` and no more than ${input.max}` : ''}. Results use the last valid value.` });
  else {
    record(errorKey);
    invalid.delete(errorKey);
    const offering = draft.model.offerings.find(offering => offering.id === selected);
    const value = Number(input.value);
    if (offering) {
      if (key === 'name' || key === 'note') offering[key] = input.value;
      else if (key === 'price') offering.priceMonthly = isOneTime(offering) ? value / 12 : isPerSession(offering) ? monthlyFromPerSession(value, offering.sessionsPerYear) : value;
      else if (key === 'sessionsPerYear') {
        if (isPerSession(offering)) offering.priceMonthly = priceMonthlyForNewVisits(offering, value);
        offering.sessionsPerYear = value;
      } else if (optionalEmpty) delete (offering as unknown as Record<string, unknown>)[key];
      else (offering as unknown as Record<string, unknown>)[key] = value;
    } else if (modelNumbers.has(key)) (draft.model as unknown as Record<string, unknown>)[key] = value;
    persist();
  }
  input.setAttribute('aria-invalid', String(!valid));
  const error = document.getElementById(`${input.id}-error`)!;
  error.hidden = valid;
  error.textContent = invalid.get(errorKey)?.message || '';
  refreshLiveResults();
}
function saveOption() {
  if (hasInvalid()) return;
  const option = { name: draft.name, model: structuredClone(draft.model) };
  const index = draft.options.findIndex(option => option.name === draft.name);
  if (index < 0) draft.options.push(option);
  else draft.options[index] = option;
  persist();
  render();
  announce(`Saved ${draft.name} in the prototype tab.`);
}
root.addEventListener('input', event => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.field) updateInput(target);
  if (target instanceof HTMLInputElement && target.id === 'offeringSearch') {
    query = target.value;
    $('.offering-list')!.innerHTML = offeringRows();
  }
  if (target instanceof HTMLTextAreaElement && target.dataset.setting === 'notes') {
    record('notes'); draft.model.notes = target.value; persist(); refreshLiveResults();
  }
});
root.addEventListener('focusout', () => { groupedField = ''; });
root.addEventListener('focusin', event => {
  const target = event.target;
  if (matchMedia('(max-width: 760px)').matches && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
  }
});
root.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.id === 'modelSection') return navigate(`#model/${target.value}`);
  if (target.id === 'typeFilter') { typeFilter = target.value; $('.offering-list')!.innerHTML = offeringRows(); return; }
  if (target.id === 'compareBase') { compareBase = Number(target.value); render(); return; }
  if (target.id === 'compareAlternative') { compareAlternative = Number(target.value); render(); return; }
  record();
  const offering = draft.model.offerings.find(offering => offering.id === selected);
  if (target.dataset.setting === 'mode') draft.model.mode = target.value === 'current' ? 'current' : 'forecast';
  else if (target.dataset.setting === 'currency') draft.model.currency = target.value;
  else if (offering && target.dataset.setting === 'resource') offering.resource = target.value || undefined;
  else if (offering && target.dataset.setting === 'confidence') offering.confidence = ['verified', 'estimated', 'guess'].includes(target.value) ? target.value as AppOffering['confidence'] : undefined;
  else if (offering && target.dataset.setting === 'type') {
    const type = normalizeOfferingType(target.value);
    if (type === 'one-time') { offering.priceMonthly = displayPrice(offering) / 12; offering.sessionsPerYear = 1; offering.hoursPerSession = 0; }
    else if (isOneTime(offering) && offering.hoursPerSession <= 0) offering.hoursPerSession = 1;
    offering.type = type;
  }
  persist(); render();
});
root.addEventListener('click', event => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a');
  if (link?.hash === location.hash) {
    event.preventDefault();
    $('#workspace')?.focus({ preventScroll: true });
    return;
  }
  const target = (event.target as HTMLElement).closest<HTMLElement>('button');
  if (!target) return;
  if (target.dataset.offering) { listScroll = scrollY; return navigate(`#model/offerings/${target.dataset.offering}`); }
  if (target.dataset.case) { setRangeCase(target.dataset.case); render(); return; }
  if (target.dataset.editOption) {
    if (hasInvalid()) { announce('Correct the incomplete fields before loading another option.'); return; }
    const option = draft.options[Number(target.dataset.editOption)];
    if (!option) return;
    record(); draft.model = structuredClone(option.model); draft.name = option.name; persist(); navigate('#model/offerings'); return;
  }
  const action = target.dataset.action;
  if (['fitness', 'hybrid', 'blank'].includes(action || '')) {
    const model = action === 'hybrid' ? hybridFixture() : fitnessFixture();
    if (action === 'blank') { model.offerings = []; model.loadedTemplate = null; model.notes = ''; }
    draft = { model, name: action === 'hybrid' ? 'Hybrid studio example' : action === 'blank' ? 'My business' : 'Fitness example', options: draft.options, example: action !== 'blank' };
    invalid.clear(); history.length = 0; query = ''; typeFilter = ''; setRangeCase('base');
    persist(); navigate('#model/business'); return;
  }
  if (action === 'resume') navigate(lastModel);
  if (action === 'back-list') { returnToOffering = selected; navigate('#model/offerings'); }
  if (action === 'save') saveOption();
  if (action === 'undo') {
    const previous = history.pop();
    if (previous) { draft.model = previous; invalid.clear(); groupedField = ''; persist(); render(); announce('Model edit undone.'); }
  }
  if (action === 'add') {
    record();
    const offering = { ...fitnessFixture().offerings[0], id: `new-${Date.now()}`, name: 'New offering', mixPct: 0, currentClients: 0 };
    draft.model.offerings.push(offering); persist(); navigate(`#model/offerings/${offering.id}`);
  }
  if (action === 'try' && !hasInvalid()) {
    $('#optionDescription')!.textContent = `Keep “${draft.name}” as a saved baseline. Open a separate draft for your alternative.`;
    $<HTMLInputElement>('#optionName')!.value = `${draft.name} · alternative`;
    $<HTMLDialogElement>('#optionDialog')!.showModal();
  }
  if (action === 'share' && !hasInvalid()) {
    const compare = view().workspace === 'compare' && draft.options.length >= 2;
    const included = compare ? [draft.options[compareBase], draft.options[compareAlternative]] : [{ name: draft.name, model: draft.model }];
    $('#shareContent')!.innerHTML = `<p class="eyebrow">${RANGE_CASE_LABELS[getRangeCase()]} case · snapshot preview</p>${included.map(option => `<section><h3>${html(option.name)}</h3><p>${option.model.currency} · ${option.model.mode} · ${money(calc(option.model).income, option.model.currency)} net income/year before tax</p><p>${html(option.model.notes || 'No conclusion added.')}</p></section>`).join('')}<p class="hint">A snapshot does not update after later edits.</p>`;
    $<HTMLDialogElement>('#shareDialog')!.showModal();
  }
});
$('#optionForm')!.addEventListener('submit', event => {
  event.preventDefault();
  const name = $<HTMLInputElement>('#optionName')!.value.trim();
  if (!name || name === draft.name || draft.options.some(option => option.name === name)) {
    $<HTMLInputElement>('#optionName')!.setCustomValidity('Choose a new name for the alternative.');
    $<HTMLInputElement>('#optionName')!.reportValidity();
    return;
  }
  saveOption();
  draft.model = structuredClone(draft.model);
  draft.name = name; persist();
  $<HTMLDialogElement>('#optionDialog')!.close();
  navigate('#model/offerings');
  announce('Alternative draft created. The baseline stays saved.');
});
$('#optionName')!.addEventListener('input', () => $<HTMLInputElement>('#optionName')!.setCustomValidity(''));
document.querySelectorAll<HTMLElement>('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog')!.close()));
$('#theme')!.addEventListener('click', () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; });
$('#detail')!.addEventListener('change', () => { render(); announce('Initial detail changed. All modeled inputs and Compare remain available.'); });
window.addEventListener('hashchange', () => {
  render(true);
  if (returnToOffering) {
    $<HTMLButtonElement>(`[data-offering="${CSS.escape(returnToOffering)}"]`)?.focus({ preventScroll: true });
    scrollTo(0, listScroll);
    returnToOffering = '';
  } else scrollTo(0, 0);
});
// Keep the focused field above the software keyboard; visual-viewport emulation is not a physical-device check.
window.visualViewport?.addEventListener('resize', () => { document.body.classList.toggle('keyboard-open', (window.visualViewport?.height || innerHeight) < innerHeight * .75); });
render();
