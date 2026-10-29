import type { AppOffering, CalcResult } from '../../src/types';
import { displayPrice, isOneTime, isPerSession } from '../../src/calculations/offeringPrice';
import { fmtMoney0 } from '../../src/calculations/currency';
import { state, clearHistoryField } from '../state/appState';
import { pendingInputKey, restorePendingInputs } from '../state/pendingInputs';
import { escapeHtml } from '../services/miscService';
import { onTableInput, onTableClick } from './OfferingsTable';
import { onRangeInput, onMarketInput } from './RangesMarketPanel';
import { onGroupRunInput } from './GroupRunsPanel';
import { onResourceTagChange } from './ResourcesPanel';

/** Focused and table views share the existing domain handlers and one financial state. */
let selectedId: string | undefined;
let search = '';
let filter = '';
let table = false;
let listScroll = 0;
let deps: { select: (id?: string) => void } | null = null;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const sourceHandlers: Record<string, (event: Event) => void> = {
  offeringsBody: onTableInput, rangesBody: onRangeInput, marketBody: onMarketInput,
  groupRunsBody: onGroupRunInput, resourceTagBody: onResourceTagChange
};
const priceUnit = (offering: AppOffering) => isOneTime(offering) ? '/sale' : isPerSession(offering) ? '/session' : '/month';

function rowHtml(offering: AppOffering, index: number, metrics: CalcResult): string {
  return `<button class="workspace-offering-row" type="button" data-offering-id="${escapeHtml(offering.id)}" aria-pressed="${offering.id === selectedId}">
    <strong>${escapeHtml(offering.name)}</strong><span>${escapeHtml(offering.type || 'subscription')} · ${fmtMoney0(displayPrice(offering))}${priceUnit(offering)}</span>
    <span>${state.mode === 'forecast' ? `${offering.mixPct}% customer mix` : `${offering.currentClients} current clients`} · ${fmtMoney0(metrics.offeringMetrics[index]?.margin || 0)} contribution/year</span></button>`;
}

export function refreshOfferingList(metrics: CalcResult) {
  const list = $('#workspaceOfferingList');
  if (!list) return;
  list.innerHTML = state.offerings.map((offering, index) => ({ offering, index }))
    .filter(({ offering }) => offering.name.toLowerCase().includes(search.toLowerCase()) && (!filter || (offering.type || 'subscription') === filter))
    .map(({ offering, index }) => rowHtml(offering, index, metrics)).join('') || '<p class="smallprint">No matching offerings. Try another name or type.</p>';
  const result = $('#workspaceOfferingResult');
  const metric = metrics.offeringMetrics[state.offerings.findIndex(offering => offering.id === selectedId)];
  if (result && metric) result.textContent = `${fmtMoney0(metric.margin)} annual contribution before business-wide costs · ${metric.clients.toFixed(1)} modeled clients`;
}

function fields(destination: string, body: string, index: number, keys?: string[]) {
  const target = $(destination);
  const offering = state.offerings[index];
  if (!target || !offering) return;
  const sources = [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`#${body} input[data-i="${index}"], #${body} select[data-i="${index}"]`)];
  const ordered = keys ? keys.flatMap(key => sources.filter(source => source.dataset.k === key || body === 'groupRunsBody' && key === 'costPerRun' || body === 'resourceTagBody' && key === 'resource')) : sources;
  for (const source of ordered) {
    const key = source.dataset.k || (body === 'groupRunsBody' ? 'costPerRun' : 'resource');
    const clone = source.cloneNode(true) as HTMLInputElement | HTMLSelectElement;
    clone.id = `workspace-edit-${body}-${key}`;
    clone.dataset.editorSource = body;
    clone.dataset.pendingKey = pendingInputKey(source);
    clone.dataset.k = key;
    clone.removeAttribute('aria-describedby');
    clone.removeAttribute('aria-invalid');
    const value = key === 'pricePerSession' ? displayPrice(offering) : (offering as unknown as Record<string, unknown>)[key];
    clone.value = value === undefined ? (body === 'rangesBody' || body === 'marketBody' || key === 'resource' ? '' : source.value) : String(value);
    const wrapper = document.createElement('div');
    wrapper.className = 'workspace-editor-field';
    const label = document.createElement('label');
    label.htmlFor = clone.id;
    const originalLabel = source.getAttribute('aria-label') || key;
    label.textContent = originalLabel.includes(' for ') ? originalLabel.replace(/ for .+$/, ` for ${offering.name}`) : originalLabel.startsWith('Resource used by ') ? `Resource used by ${offering.name}` : originalLabel;
    clone.setAttribute('aria-label', label.textContent);
    wrapper.append(label, clone);
    target.appendChild(wrapper);
  }
}

export function renderOfferingEditor(id: string | undefined, metrics: CalcResult) {
  const host = $('#workspaceFocusedOffering');
  if (!host) return;
  const previous = selectedId;
  selectedId = id && state.offerings.some(offering => offering.id === id) ? id : undefined;
  const focused = host.contains(document.activeElement) ? (document.activeElement as HTMLElement).id : '';
  const expanded = new Set([...host.querySelectorAll<HTMLDetailsElement>('details[open]')].map(details => details.dataset.editorGroup));
  host.classList.toggle('has-selection', Boolean(selectedId));
  $('#workspaceOfferingBrowser')?.classList.toggle('has-selection', Boolean(selectedId));
  $('#setupOfferings')!.hidden = !table;
  $('#setupOfferings')!.classList.toggle('workspace-dense-table', table);
  $('#workspaceOfferingBulk')!.hidden = !table;
  $('#workspaceOfferingBrowser')!.hidden = table;
  const toggle = $('#workspaceOfferingView');
  if (toggle) { toggle.textContent = table ? 'Use focused editor' : 'Use table view'; toggle.setAttribute('aria-pressed', String(table)); }
  if (table) return;
  refreshOfferingList(metrics);
  const offering = state.offerings.find(offering => offering.id === selectedId);
  if (!offering) {
    host.innerHTML = '<div class="workspace-offering-prompt"><h2>Choose an offering</h2><p>Details appear here. Your annual results stay visible while you edit.</p></div>';
    return;
  }
  const index = state.offerings.indexOf(offering);
  host.innerHTML = `<section id="workspaceOfferingEditor" aria-label="Offering editor"><button type="button" class="btn workspace-back-list" id="workspaceBackToOfferings">Back to offerings</button>
    <p class="workspace-eyebrow">Focused editor</p><h2>${escapeHtml(offering.name)}</h2><p class="smallprint" id="workspaceOfferingResult"></p>
    <div class="workspace-editor-fields" id="workspaceOfferingCore"></div>
    <details data-editor-group="delivery"><summary>Delivery and costs${offering.resource || offering.costPerRun || offering.laborPctOfPrice ? ' · in use' : ''}</summary><div class="workspace-editor-fields" id="workspaceOfferingDelivery"></div><p class="smallprint"><button class="btn" type="button" data-model-link="capacity">Review people and capacity</button></p></details>
    <details data-editor-group="pricing"><summary>Pricing assumptions${offering.salesLossPct || offering.discountPct ? ' · in use' : ''}</summary><p class="smallprint">Change the price above, then estimate sales lost. Profitability is modeled from your assumptions; the app does not predict customer behavior.</p><div class="workspace-editor-fields" id="workspaceOfferingPricing"></div></details>
    <details data-editor-group="uncertainty"><summary>Uncertainty and context · ${escapeHtml(offering.confidence || 'untagged')}</summary><p class="smallprint">Low/high cases are scenario envelopes, not statistical confidence intervals.</p><div class="workspace-editor-fields" id="workspaceOfferingUncertainty"></div></details>
    <details data-editor-group="market"><summary>Market comparison${offering.marketAvg || offering.marketLow || offering.marketHigh ? ' · in use' : ''}</summary><p class="smallprint">Use the same price unit as this offering: ${priceUnit(offering)}.</p><div class="workspace-editor-fields" id="workspaceOfferingMarket"></div></details>
    <div class="workspace-actions" id="workspaceOfferingActions"></div></section>`;
  fields('#workspaceOfferingCore', 'offeringsBody', index, ['name', 'type', 'priceMonthly', 'pricePerSession', 'sessionsPerYear', 'hoursPerSession', state.mode === 'forecast' ? 'mixPct' : 'currentClients']);
  fields('#workspaceOfferingDelivery', 'offeringsBody', index, ['variableCostPerSession', 'laborPctOfPrice', 'seats', 'fillPct']);
  fields('#workspaceOfferingDelivery', 'groupRunsBody', index, ['costPerRun']);
  fields('#workspaceOfferingDelivery', 'resourceTagBody', index, ['resource']);
  fields('#workspaceOfferingPricing', 'offeringsBody', index, ['discountPct']);
  fields('#workspaceOfferingPricing', 'rangesBody', index, ['salesLossPctLow', 'salesLossPct', 'salesLossPctHigh']);
  fields('#workspaceOfferingUncertainty', 'rangesBody', index, ['confidence', 'note', 'fillPctLow', 'fillPctHigh', 'currentClientsLow', 'currentClientsHigh', 'sessionsPerYearLow', 'sessionsPerYearHigh']);
  fields('#workspaceOfferingMarket', 'marketBody', index);
  for (const source of document.querySelectorAll<HTMLButtonElement>(`#offeringsBody button[data-i="${index}"]`)) {
    const clone = source.cloneNode(true) as HTMLButtonElement;
    clone.dataset.editorAction = 'true';
    $('#workspaceOfferingActions')!.appendChild(clone);
  }
  if (previous === selectedId) {
    host.querySelectorAll<HTMLDetailsElement>('details').forEach(details => { details.open = expanded.has(details.dataset.editorGroup); });
  } else {
    try {
      if (JSON.parse(localStorage.getItem('profitpath-settings') || '{}').experienceLevel === 'advanced') {
        host.querySelector<HTMLDetailsElement>('[data-editor-group="delivery"]')!.open = true;
      }
    } catch { /* basic detail is a safe default */ }
  }
  restorePendingInputs(host);
  refreshOfferingList(metrics);
  if (focused && previous === selectedId) document.getElementById(focused)?.focus({ preventScroll: true });
}

export function initOfferingEditor(d: NonNullable<typeof deps>) {
  deps = d;
  const panel = document.querySelector<HTMLElement>('[data-model-section="offerings"]')!;
  panel.insertAdjacentHTML('afterbegin', `<div class="workspace-offering-toolbar"><div id="workspaceAddOffering"></div><button type="button" class="btn" id="workspaceOfferingView">Use table view</button></div>
    <div id="workspaceOfferingBrowser"><div class="workspace-offering-list-column"><label class="visually-hidden" for="workspaceOfferingSearch">Find an offering</label><input id="workspaceOfferingSearch" type="search" placeholder="Find an offering…">
      <label class="visually-hidden" for="workspaceOfferingType">Filter offerings by type</label><select id="workspaceOfferingType"><option value="">All types</option><option value="subscription">Subscription</option><option value="group">Group</option><option value="per-session">Per-session</option><option value="one-time">One-time</option></select>
      <div id="workspaceOfferingList"></div></div><div id="workspaceFocusedOffering"></div></div><div id="workspaceOfferingBulk"></div>`);
  $('#workspaceAddOffering')!.appendChild($('#addOfferingBtn')!);
  const tableRegion = document.querySelector<HTMLElement>('#setupOfferings > .table-wrap');
  if (tableRegion) {
    tableRegion.tabIndex = 0;
    tableRegion.setAttribute('role', 'region');
    tableRegion.setAttribute('aria-label', 'All offerings table; scroll horizontally or use the focused editor');
  }
  for (const id of ['rangesSection', 'marketSection', 'groupRunsSection', 'resourceTagWrap']) {
    const element = $('#' + id);
    if (element) $('#workspaceOfferingBulk')!.appendChild(element);
  }
  panel.addEventListener('input', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.id === 'workspaceOfferingSearch') {
      search = input.value; window.dispatchEvent(new CustomEvent('profitpath:refresh-offering-list')); return;
    }
    if (!(input instanceof HTMLInputElement) || !input.dataset.editorSource) return;
    const id = input.id;
    sourceHandlers[input.dataset.editorSource]?.(event);
    document.getElementById(id)?.focus({ preventScroll: true });
  });
  panel.addEventListener('change', event => {
    const input = event.target;
    if (input instanceof HTMLSelectElement && input.id === 'workspaceOfferingType') {
      filter = input.value; window.dispatchEvent(new CustomEvent('profitpath:refresh-offering-list'));
    }
    // Select elements must also work when changed by keyboard or assistive technology without an input event.
    if (input instanceof HTMLSelectElement && input.dataset.editorSource) {
      const source = input.dataset.editorSource;
      const id = input.id;
      sourceHandlers[source]?.(event);
      document.getElementById(id)?.focus({ preventScroll: true });
    }
  });
  panel.addEventListener('blur', clearHistoryField, true);
  panel.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.offeringId) {
      listScroll = document.body.scrollTop || scrollY; deps!.select(button.dataset.offeringId);
    }
    if (button.id === 'workspaceOfferingView') {
      table = !table; window.dispatchEvent(new CustomEvent('profitpath:rendered'));
    }
    if (button.id === 'workspaceBackToOfferings') {
      const id = selectedId; deps!.select();
      $(`[data-offering-id="${CSS.escape(id || '')}"]`)?.focus({ preventScroll: true });
      document.body.scrollTo(0, listScroll); window.scrollTo(0, listScroll);
    }
    if (button.id === 'addOfferingBtn') deps!.select(state.offerings[state.offerings.length - 1]?.id);
    if (button.dataset.editorAction) {
      const index = Number(button.dataset.i);
      onTableClick(event);
      if (button.dataset.action === 'duplicateOffering') deps!.select(state.offerings[index + 1]?.id);
      else if (!state.offerings.some(offering => offering.id === selectedId)) deps!.select();
    }
  });
}
