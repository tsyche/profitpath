import type { AppOffering, CalcResult, OfferingMetric } from '../../src/types';
import { calc } from '../../src/calculations/index';
import { floorStatus, rankOfferings } from '../../src/calculations/offeringRanking';
import { displayPrice, isOneTime, isPerSession } from '../../src/calculations/offeringPrice';
import { bandMoves, calcRange, calcRangeDrivers, suggestRanges, sanitizeOfferingRange } from '../../src/calculations/ranges';
import type { RangeMetric } from '../../src/calculations/ranges';
import { getRangeCase } from '../../src/calculations/rangeCase';
import { marketBadge, sanitizeOfferingMarket } from '../../src/calculations/marketPosition';
import { CONFIDENCE_LEVELS, CONFIDENCE_LABELS, MAX_NOTE_LENGTH, sanitizeOfferingMeta } from '../../src/calculations/offeringMeta';
import { fmtMoney0 } from '../../src/calculations/currency';
import { escapeHtml } from '../services/miscService';
import { fmtInt, fmtPct1 } from '../utils/format';
import { getSpreads, initRangeCase, initSpreadInputs, renderRangeCase, syncConfidenceBadge } from './RangeCasePanel';
import { clearHistoryField, persistState, pushHistory, pushHistoryOnce, state } from '../state/appState';
import { render } from '../state/hooks';
import { $ } from '../utils/dom';

/** Offering ranking, range band, ranges table and market table. */

const FLOOR_LABELS = { ok: 'OK', thin: 'Thin', loss: 'Below cost' };
const FLOOR_COLORS = { ok: 'var(--good)', thin: 'var(--warn)', loss: 'var(--bad)' };

/** Loose string-keyed view for dynamic field writes from data-k inputs. */
type Bag = Record<string, unknown>;

export function renderOfferingRanking(metrics: CalcResult) {
  const wrap = $('#offeringRanking');
  const body = $('#offeringRankingBody');
  if (!wrap || !body) return;
  const rows = rankOfferings(metrics?.offeringMetrics || []);
  wrap.hidden = rows.length === 0;
  body.innerHTML = rows.map(r => '<tr><td>' + escapeHtml(r.name) + '</td><td class="mono">' + (r.hourFree ? 'n/a' : fmtMoney0(r.marginPerHour) + '/hr') + '</td><td class="mono">' + (r.discountPct > 0 && !r.hourFree ? fmtMoney0(r.discountedMarginPerHour) + '/hr (' + fmtPct1(r.discountPct) + ' off)' : '—') + '</td><td class="mono">' + fmtPct1(r.maxDiscountPct) +
    '</td><td data-status="' + r.status + '" style="color:' + FLOOR_COLORS[r.status] + '">' + FLOOR_LABELS[r.status] + '</td></tr>').join('');
}

const RANGE_ROWS: { metric: RangeMetric; label: string; fmt: (n: number) => string }[] = [
  { metric: 'revenue', label: 'Annual revenue', fmt: fmtMoney0 },
  { metric: 'income', label: 'Net profit', fmt: fmtMoney0 },
  { metric: 'clients', label: 'Clients', fmt: fmtInt },
  { metric: 'capacityPct', label: 'Utilization', fmt: fmtPct1 },
  { metric: 'breakEvenClients', label: 'Break-even clients', fmt: (n: number) => (Number.isFinite(n) ? fmtInt(n) : '∞') }
];

// Hidden unless some bound actually moves a headline number (e.g. client bounds in Forecast mode do nothing).
export function renderRangeBand() {
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
export function renderRangesTable() {
  const tbody = $('#rangesBody');
  if (!tbody) return;
  const isForecast = state.mode === 'forecast';
  const cell = (o: AppOffering, idx: number, k: string, label: string, on: boolean) => on
    ? '<td class="cell-edit" data-label="' + label + '"><input aria-label="' + label + ' for ' + escapeHtml(o.name) + '" type="number" min="' + (k.startsWith('fill') ? 1 : 0) +
      '"' + (k.startsWith('fill') ? ' max="100"' : '') + ' step="1" placeholder="none" value="' + ((o as unknown as Bag)[k] ?? '') + '" data-k="' + k + '" data-i="' + idx + '"/></td>'
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

function marketBadgeHtml(o: AppOffering, metric?: OfferingMetric) {
  const status = metric ? floorStatus(metric.maxDiscountPct, o.discountPct || 0) : 'ok';
  const b = marketBadge(Number(displayPrice(o)) || 0, o, status);
  if (!b) return '<span class="muted">—</span>';
  const arrow = b.direction === 'below' ? ' ▼' : b.direction === 'above' ? ' ▲' : '';
  return '<span data-level="' + b.level + '" style="color:' + BADGE_COLORS[b.level] + '">' + BADGE_LABELS[b.level] + arrow + '</span>';
}

export function renderMarketTable(metrics: CalcResult) {
  const tbody = $('#marketBody');
  if (!tbody) return;
  const num = (o: AppOffering, idx: number, k: string, label: string) => '<td class="cell-edit" data-label="' + label + '"><input aria-label="Market ' + label.toLowerCase() + ' for ' + escapeHtml(o.name) +
    '" type="number" min="0" step="1" placeholder="none" value="' + ((o as unknown as Bag)[k] ?? '') + '" data-k="' + k + '" data-i="' + idx + '"/></td>';
  tbody.innerHTML = state.offerings.map((o, idx) => '<tr><td data-label="Offering">' + escapeHtml(o.name) + '</td>' +
    '<td class="mono" data-label="Your price">' + fmtMoney0(displayPrice(o)) + (isOneTime(o) ? '/sale' : isPerSession(o) ? '/session' : '/mo') + '</td>' +
    num(o, idx, 'marketLow', 'Low') + num(o, idx, 'marketAvg', 'Avg') + num(o, idx, 'marketHigh', 'High') +
    '<td class="cell-edit" data-label="Source / date"><input aria-label="Market source for ' + escapeHtml(o.name) + '" type="text" maxlength="' + MAX_NOTE_LENGTH +
    '" placeholder="Source, date" value="' + escapeHtml(o.marketNote || '') + '" data-k="marketNote" data-i="' + idx + '"/></td>' +
    '<td data-label="Badge" class="market-badge">' + marketBadgeHtml(o, metrics?.offeringMetrics?.[idx]) + '</td></tr>').join('');
}

function onMarketInput(e: Event) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;
  const k = el.dataset.k;
  const idx = Number(el.dataset.i);
  const o = state.offerings[idx] as unknown as Bag;
  if (!k || !o) return;
  const fieldKey = `mkt-${idx}-${k}`;
  pushHistoryOnce(fieldKey);
  const clean = sanitizeOfferingMarket({ [k]: el.value }) as unknown as Bag;
  if (clean[k] === undefined) delete o[k];
  else o[k] = clean[k];
  persistState();
  try {
    const cell = el.closest('tr')?.querySelector('.market-badge');
    if (cell) cell.innerHTML = marketBadgeHtml(state.offerings[idx], calc(state).offeringMetrics[idx]);
  } catch (err) {
    console.warn('Failed to refresh market badge:', err);
  }
}

function onRangeInput(e: Event) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
  const k = el.dataset.k;
  const o = state.offerings[Number(el.dataset.i)] as unknown as Bag;
  if (!k || !o) return;
  const fieldKey = `rng-${el.dataset.i}-${k}`;
  pushHistoryOnce(fieldKey);
  // The shared sanitizer is the single source of truth; blank or junk clears the bound
  const isMeta = k === 'confidence' || k === 'note';
  const clean = (isMeta ? sanitizeOfferingMeta({ [k]: el.value }) : sanitizeOfferingRange({ [k]: el.value })) as unknown as Bag;
  if (clean[k] === undefined) delete o[k];
  else o[k] = clean[k];
  if (k === 'confidence') {
    el.dataset.confidence = String(clean[k] || '');
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


export function bindRangesMarket(): void {
  const market = $('#marketBody');
  if (market) {
    market.addEventListener('input', onMarketInput);
    market.addEventListener('blur', clearHistoryField, true);
  }
  initSpreadInputs();
  initRangeCase(() => render());
  const btn = $('#suggestRangesBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      pushHistory();
      clearHistoryField();
      state.offerings.forEach(o => Object.assign(o, suggestRanges(o, state.mode, getSpreads())));
      persistState();
      render();
    });
  }
  const ranges = $('#rangesBody');
  if (ranges) {
    ranges.addEventListener('input', onRangeInput);
    ranges.addEventListener('blur', clearHistoryField, true);
  }
}
