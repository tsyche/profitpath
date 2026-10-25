import { calc } from '../../src/calculations/index';
import { sanitizeResources } from '../../src/calculations/resources';
import { escapeHtml } from '../services/miscService';
import { uuid } from '../utils/helpers';
import { clearHistoryField, persistState, pushHistory, pushHistoryOnce, state } from '../state/appState';
import { render, updateOutputs, updateValidationDisplay } from '../state/hooks';
import { $ } from '../utils/dom';

/** Extra capacity pools (booth, room): table, offering tags and handlers. */

function addResource() {
  const list = state.resources || (state.resources = []);
  pushHistory();
  list.push({ id: uuid(), name: 'Resource ' + (list.length + 1), hoursPerWeek: 40, weeksPerYear: 52 });
  persistState();
  render();
}

export function renderResources() {
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

export function renderResourceTags() {
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

export function refreshAfterResourceEdit() {
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

function onResourceInput(e: any) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;
  const k = el.dataset.k;
  const row = ((state.resources || [])[Number(el.dataset.i)] as any);
  if (!k || !row) return;
  const fieldKey = `res-${el.dataset.i}-${k}`;
  pushHistoryOnce(fieldKey);
  // Per-row sanitizer is the single source of truth for clamping and fallbacks
  const clean = (sanitizeResources([{ ...row, [k]: el.type === 'checkbox' ? el.checked : el.value }], () => row.id)[0] as any);
  if (clean[k] === undefined) delete row[k];
  else row[k] = clean[k];
  refreshAfterResourceEdit();
}

function onResourceTagChange(e: any) {
  const el = e.target;
  if (!(el instanceof HTMLSelectElement)) return;
  const o = (state.offerings[Number(el.dataset.i)] as any);
  if (!o) return;
  pushHistory();
  // Only ids that exist are accepted; anything else clears the tag
  if ((state.resources || []).some(r => r.id === el.value)) o.resource = el.value;
  else delete o.resource;
  refreshAfterResourceEdit();
}

function onResourceClick(e: any) {
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


export function bindResources(): void {
  const btn = $('#addResourceBtn');
  if (btn) btn.addEventListener('click', addResource);
  const body = $('#resourcesBody');
  if (body) {
    body.addEventListener('input', onResourceInput);
    body.addEventListener('click', onResourceClick);
    // A rename only lands in the tag dropdowns once editing finishes, so typing keeps focus
    body.addEventListener('change', renderResourceTags);
    body.addEventListener('blur', clearHistoryField, true);
  }
  const tagBody = $('#resourceTagBody');
  if (tagBody) tagBody.addEventListener('change', onResourceTagChange);
}
