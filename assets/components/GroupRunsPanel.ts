import { calc } from '../../src/calculations/index';
import { sanitizeCostPerRun } from '../../src/calculations/groupRuns';
import { escapeHtml } from '../services/miscService';

/**
 * Group runs table (ROADMAP 24b). One row per group offering: the fixed cost of one run and the
 * break-even fill it implies. Cost per run feeds calc(); the break-even cells are read back from it.
 */

type RunOffering = { name?: string; type?: string; seats?: number; costPerRun?: number };

interface RunsDeps {
  getState: () => { offerings: RunOffering[] };
  pushHistory: () => void;
  /** Persist and recalculate Outputs after an edit. */
  refresh: () => void;
}

let deps: RunsDeps | null = null;
let lastHistoryField: string | null = null;

const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

export function initGroupRunsPanel(d: RunsDeps): void {
  deps = d;
  const body = $('#groupRunsBody');
  if (!body) return;
  body.addEventListener('input', onInput);
  body.addEventListener('blur', () => { lastHistoryField = null; }, true);
}

function onInput(e: Event): void {
  const el = e.target;
  if (!deps || !(el instanceof HTMLInputElement)) return;
  const idx = Number(el.dataset.i);
  const o = deps.getState().offerings[idx];
  if (!o) return;
  const fieldKey = `run-${idx}`;
  if (fieldKey !== lastHistoryField) {
    deps.pushHistory();
    lastHistoryField = fieldKey;
  }
  o.costPerRun = sanitizeCostPerRun(el.value);
  deps.refresh();
}

/** Rebuilds the rows; call from the main render, not per keystroke, so typing keeps focus. */
export function renderGroupRunsTable(): void {
  const tbody = $('#groupRunsBody');
  if (!tbody || !deps) return;
  const rows = deps.getState().offerings.map((o, idx) => ({ o, idx })).filter(({ o }) => o.type === 'group');
  tbody.innerHTML = rows.length
    ? rows.map(({ o, idx }) => '<tr><td data-label="Offering">' + escapeHtml(o.name || '') + '</td>' +
      '<td class="cell-edit" data-label="Cost per run"><input aria-label="Cost per run for ' + escapeHtml(o.name || '') +
      '" type="number" min="0" step="1" placeholder="0" value="' + (o.costPerRun || '') + '" data-i="' + idx + '"/></td>' +
      '<td class="mono" data-label="Break-even fill" data-be="' + idx + '"></td></tr>').join('')
    : '<tr><td colspan="3" class="muted">Set an offering\'s Type to Group to enter a cost per run.</td></tr>';
  renderGroupRunResults();
}

/** Fills the break-even cells from calc(); safe to call on every recalculation. */
export function renderGroupRunResults(): void {
  const tbody = $('#groupRunsBody');
  if (!tbody || !deps) return;
  const cells = tbody.querySelectorAll<HTMLElement>('td[data-be]');
  if (!cells.length) return;
  const state = deps.getState();
  const metrics = calc(state as never).offeringMetrics;
  cells.forEach((cell) => {
    const idx = Number(cell.dataset.be);
    const m = metrics[idx];
    const seats = state.offerings[idx]?.seats || 1;
    if (!m || m.breakEvenSeats === undefined) cell.textContent = '—';
    else if (!Number.isFinite(m.breakEvenSeats)) cell.textContent = 'Never: a seat earns nothing after its own costs';
    else if (m.breakEvenSeats > seats) cell.textContent = m.breakEvenSeats + ' seats needed, only ' + seats + ' (a full run still loses money)';
    else cell.textContent = m.breakEvenSeats + ' of ' + seats + ' seats (' + Math.round(m.breakEvenFillPct ?? 0) + '% of seats filled)';
  });
}
