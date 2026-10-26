import { calc } from '../../src/calculations/index';
import { EXPENSE_CATEGORIES, EXPENSE_FREQUENCIES, DEFAULT_LIFE_YEARS, sanitizeExpenses, costBreakdown } from '../../src/calculations/expenses';
import { fmtMoney0 } from '../../src/calculations/currency';
import { escapeHtml } from '../services/miscService';
import { uuid } from '../utils/helpers';
import { fmtPct1 } from '../utils/format';
import { clearHistoryField, persistState, pushHistory, pushHistoryOnce, state } from '../state/appState';
import { render, updateOutputs, updateValidationDisplay } from '../state/hooks';
import { $ } from '../utils/dom';

/** Expense line items: table, cost breakdown and handlers. */

function addExpense() {
  state.expenses.push({ id: uuid(), name: 'Expense ' + (state.expenses.length + 1), category: 'Other', amount: 0, frequency: 'monthly', lifeYears: DEFAULT_LIFE_YEARS });
  persistState();
  render();
}

// Only shown once there are expense line items; with just the free-form field it would repeat the KPI.
export function renderCostBreakdown() {
  const wrap = $('#costBreakdown');
  const body = $('#costBreakdownBody');
  if (!wrap || !body) return;
  const rows = state.expenses.length ? costBreakdown(state) : [];
  wrap.hidden = rows.length === 0;
  body.innerHTML = rows.map(r => '<tr><td>' + escapeHtml(r.label) + '</td><td class="mono">' + fmtMoney0(r.annual) + '</td><td class="mono">' + fmtPct1(r.pct) + '</td></tr>').join('');
}

export function renderExpenses() {
  const tbody = $('#expensesBody');
  if (!tbody) return;
  const opts = (list: readonly string[], current: string) => list.map(v => '<option value="' + escapeHtml(v) + '"' + (v === current ? ' selected' : '') + '>' + escapeHtml(v) + '</option>').join('');
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

function onExpenseInput(e: Event) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
  const k = el.dataset.k;
  const i = Number(el.dataset.i);
  const row = state.expenses[i];
  if (!k || !row) return;
  // Debounce history like offerings: one undo step per field, not per keystroke
  const fieldKey = `exp-${i}-${k}`;
  pushHistoryOnce(fieldKey);
  if (k === 'name') {
    row.name = el.value.slice(0, 100);
  } else {
    // Per-row sanitizer is the single source of truth for clamping and fallbacks
    const [clean] = sanitizeExpenses([{ ...row, [k]: el.value }], () => row.id);
    (row as unknown as Record<string, unknown>)[k] = (clean as unknown as Record<string, unknown>)[k];
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

function onExpenseClick(e: Event) {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('button[data-action="removeExpense"]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  if (!Number.isFinite(i) || !state.expenses[i]) return;
  pushHistory();
  state.expenses.splice(i, 1);
  persistState();
  render();
}


export function bindExpenses(): void {
  const btn = $('#addExpenseBtn');
  if (btn) btn.addEventListener('click', addExpense);
  const body = $('#expensesBody');
  if (body) {
    body.addEventListener('input', onExpenseInput);
    body.addEventListener('click', onExpenseClick);
    body.addEventListener('blur', clearHistoryField, true);
  }
}
