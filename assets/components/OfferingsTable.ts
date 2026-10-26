import { calc, normalizeOfferingType } from '../../src/calculations/index';
import { displayPrice, isOneTime, isPerSession, monthlyFromPerSession, priceMonthlyForNewVisits } from '../../src/calculations/offeringPrice';
import * as businessLogic from '../services/businessLogic';
import { showToast } from '../services/modalService';
import { clamp, safeParseNumber, uuid } from '../utils/helpers';
import { clearHistoryField, persistState, pushHistory, pushHistoryOnce, state } from '../state/appState';
import { render, updateOutputs, updateValidationDisplay } from '../state/hooks';
import { $ } from '../utils/dom';

/** Main offerings table: input and click handlers, add offering. */

export function onTableInput(e: Event) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;

  const k = el.dataset.k;
  const i = Number(el.dataset.i);
  if (!k || !Number.isFinite(i)) return;

  // Debounce history: only push on first keystroke of a field
  const fieldKey = `${i}-${k}`;
  pushHistoryOnce(fieldKey);

  const o = state.offerings[i];
  if (!o) return;

  // Validate and sanitize input based on field type
  let value: string | number = el.value;
  let validationError = null;

  if (k === 'priceMonthly' || k === 'pricePerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Price must be greater than $0';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'variableCostPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed < 0) {
      validationError = 'Variable costs cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'laborPctOfPrice' || k === 'discountPct') {
    value = Math.min(100, Math.max(0, safeParseNumber(value, 0)));
  } else if (k === 'type') {
    value = normalizeOfferingType(value);
  } else if (k === 'seats') {
    value = Math.max(1, Math.floor(safeParseNumber(value, 1)));
  } else if (k === 'fillPct') {
    value = Math.min(100, Math.max(1, safeParseNumber(value, 100)));
  } else if (k === 'sessionsPerYear') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed <= 0) {
      validationError = 'Must have at least 1 session per year';
      value = 1;
    } else {
      value = parsed;
    }
  } else if (k === 'hoursPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Session must take at least 0.1 hours';
      value = 0.1;
    } else {
      value = parsed;
    }
  } else if (k === 'currentClients') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed < 0) {
      validationError = 'Client count cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'mixPct') {
    value = clamp(safeParseNumber(value, 0), 0, 100);
  }

  // Show validation error if any and provide auto-fix for some cases
  if (validationError) {
    // Validation error handled-value has been sanitized

    // Auto-fix common issues
    if (k === 'priceMonthly' && value === 0 && o.priceMonthly === 0) {
      // Suggest a reasonable default price
    }

  }

  if (k === 'name') {
    o.name = el.value;
  } else if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    businessLogic.rebalanceMix(i, value);
  } else if (k === 'pricePerSession') {
    // Entry lens only: priceMonthly stays the canonical price everything else reads
    o.priceMonthly = monthlyFromPerSession(Number(value), isOneTime(o) ? 1 : o.sessionsPerYear);
  } else if (k === 'type') {
    const wasOneTime = isOneTime(o);
    if (value === 'one-time') {
      // The price shown today carries over as the price per sale
      o.priceMonthly = displayPrice(o) / 12;
      o.sessionsPerYear = 1;
      o.hoursPerSession = 0;
    } else if (wasOneTime && !(o.hoursPerSession > 0)) {
      o.hoursPerSession = 1;
    }
    o.type = normalizeOfferingType(value);
  } else if (k === 'sessionsPerYear' && isPerSession(o)) {
    // Visits are an assumption separate from the per-visit price, which stays put
    o.priceMonthly = priceMonthlyForNewVisits(o, Number(value));
    o.sessionsPerYear = Number(value);
  } else {
    (o as unknown as Record<string, unknown>)[k] = value;
  }

  // Update state and outputs in-place without re-rendering the entire table to preserve focus.
  try {
    persistState();
  } catch (e) {
    console.warn('Failed to persist state on input:', e);
  }
  try {
    const metrics = calc(state);
    window.lastMetrics = metrics;
    updateOutputs(metrics);
    updateValidationDisplay(); // Update validation messages after calculations
  } catch (e) {
    console.warn('Failed to refresh outputs on input:', e);
  }
  if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    // A re-render would rebuild the input being typed in; sync the other rows' mix inputs in place
    document.querySelectorAll<HTMLInputElement>('#offeringsBody input[data-k="mixPct"]').forEach((input) => {
      const idx = Number(input.dataset.i);
      if (idx !== i) input.value = (state.offerings[idx]?.mixPct ?? 0).toFixed(1);
    });
  } else if (k === 'type') {
    render();
  }
}

export function onTableClick(e: Event) {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === 'removeOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i) && state.offerings[i]) {
      // The calc and every persistence path need at least one offering; refuse rather than swap in demo data
      if (state.offerings.length === 1) {
        showToast('Keep at least one offering: edit or rename this one instead', 'info', 3000);
        return;
      }
      pushHistory();
      state.offerings.splice(i, 1);
      render();
    }
  }
  if (action === 'duplicateOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i) && state.offerings[i]) {
      pushHistory();
      state.offerings.splice(i + 1, 0, businessLogic.duplicateOffering(state.offerings[i], state.offerings, uuid));
      render();
    }
  }
}

export function addOffering() {
  state.offerings.push({
    id: uuid(),
    name: 'Offering ' + (state.offerings.length + 1),
    priceMonthly: 100,
    sessionsPerYear: 12,
    hoursPerSession: 1.0,
    variableCostPerSession: 0,
    laborPctOfPrice: 0,
    discountPct: 0,
    type: 'subscription',
    seats: 1,
    fillPct: 100,
    mixPct: businessLogic.remainingMix(state.offerings),
    currentClients: 0,
  });
  render();
}


export function bindOfferingsTable(): void {
  const body = $('#offeringsBody');
  body!.addEventListener('input', onTableInput);
  body!.addEventListener('blur', clearHistoryField, true); // Capture blur to clear field tracking
  body!.addEventListener('click', onTableClick);
  // Save state when table content changes
  body!.addEventListener('input', persistState);
  body!.addEventListener('click', () => setTimeout(persistState, 0));
  const btn = $('#addOfferingBtn');
  if (btn) btn.addEventListener('click', addOffering);
}
