import * as businessLogic from '../services/businessLogic';
import type { AppState } from '../../src/types';
import { clearPendingInputs, hasPendingInputs } from './pendingInputs';

/** Core app state, localStorage persistence and the undo/redo history. */

export const state: AppState = {
  mode: 'forecast', // 'forecast' | 'current'
  offerings: businessLogic.defaultOfferings(),
  fullTimeEmployees: 1, // 40 hours/week
  partTimeEmployees: 0, // 20 hours/week
  fullTimeEmployeePay: 60000,
  partTimeEmployeePay: 30000,
  monthlyCosts: 250,
  processingFeePct: 0, // card/payment fee as % of revenue
  processingFeePerTransaction: 0,
  transactionsPerMonth: 0,
  expenses: [],
  resources: [], // extra capacity pools (booth, room) offerings can be tagged with
  membershipPlans: [], // membership what-if inputs (display only, never feed calc)
  memberProfiles: [],
  productiveUtilizationPct: 80, // percent of hours available for service delivery
  targetUtilizationPct: 75, // forecasting target
  lockMix: false, // forecasting-only: keep Mix % totals at 100 by adjusting other offerings
  loadedTemplate: null, // Track which template was loaded (null if custom scenario)
  notes: '', // Presentation notes — embedded in shared URLs for context
  currency: 'USD', // display currency for this scenario (never affects calculations)
};

// Make state accessible to calculations module
(globalThis as unknown as { state: typeof state }).state = state;

const undoStack: string[] = [];
const redoStack: string[] = [];
const MAX_HISTORY = 50;
let lastHistoryField: string | null = null; // Track last field edited for debounce

interface AppStateDeps {
  render: () => void;
  showToast: (message: string, type?: string, duration?: number) => void;
}

let deps: AppStateDeps | null = null;

export function initAppState(d: AppStateDeps): void {
  deps = d;
  window.addEventListener('profitpath:pending-inputs', updateUndoRedoButtons);
}

// Persist state to localStorage (global helper so other modules can call it)
export function persistState(): boolean {
  try {
    localStorage.setItem('profitpath-state', JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('profitpath:draft-status', { detail: true }));
    return true;
  } catch (e) {
    console.warn('Failed to persist state:', e);
    window.dispatchEvent(new CustomEvent('profitpath:draft-status', { detail: false }));
    return false;
  }
}

export function updateUndoRedoButtons(): void {
  const undoBtn = document.querySelector<HTMLButtonElement>('#undoBtn');
  const redoBtn = document.querySelector<HTMLButtonElement>('#redoBtn');
  const readOnly = document.body.classList.contains('pp-readonly');
  if (undoBtn) undoBtn.disabled = readOnly || undoStack.length === 0 && !hasPendingInputs();
  if (redoBtn) redoBtn.disabled = readOnly || redoStack.length === 0;
}

export function pushHistory(): void {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0; // Clear redo on new action
  updateUndoRedoButtons();
}

/** Debounce history: only push on the first keystroke of a field. */
export function pushHistoryOnce(fieldKey: string): void {
  if (fieldKey === lastHistoryField) return;
  pushHistory();
  lastHistoryField = fieldKey;
}

/** Forget the tracked field so the next edit starts a new undo step. */
export function clearHistoryField(): void {
  lastHistoryField = null;
}

export function undo(): void {
  if (document.body.classList.contains('pp-readonly')) return;
  const incomplete = hasPendingInputs();
  clearPendingInputs();
  const prev = undoStack.pop();
  if (prev === undefined) {
    if (incomplete) { deps!.render(); updateUndoRedoButtons(); }
    return;
  }
  redoStack.push(JSON.stringify(state));
  Object.assign(state, JSON.parse(prev));
  persistState();
  deps!.render();
  updateUndoRedoButtons();
  deps!.showToast('Undone', 'info', 1500);
}

export function redo(): void {
  if (document.body.classList.contains('pp-readonly')) return;
  clearPendingInputs();
  const next = redoStack.pop();
  if (next === undefined) return;
  undoStack.push(JSON.stringify(state));
  Object.assign(state, JSON.parse(next));
  persistState();
  deps!.render();
  updateUndoRedoButtons();
  deps!.showToast('Redone', 'info', 1500);
}
