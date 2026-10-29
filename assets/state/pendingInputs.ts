import { usesWorkspaces } from '../../src/ui/workspaceNavigation';

/** Transient invalid text belongs to the UI, never to persisted financial inputs. */
const pending = new Map<string, { value: string; message: string }>();
let nextErrorId = 0;
let resolveKey: (input: HTMLInputElement | HTMLSelectElement) => string = input => input.id;

export function initPendingInputs(resolver: typeof resolveKey) { resolveKey = resolver; }
export function pendingInputKey(input: HTMLInputElement | HTMLSelectElement): string {
  return input.dataset.pendingKey || resolveKey(input);
}
export function hasPendingInputs(): boolean { return pending.size > 0; }
export function isPendingInput(key: string): boolean { return pending.has(key); }

function changed() { window.dispatchEvent(new CustomEvent('profitpath:pending-inputs')); }
export function clearPendingInputs(prefix = '') {
  if (!pending.size) return;
  for (const key of pending.keys()) if (key.startsWith(prefix)) pending.delete(key);
  changed();
}

function paint(input: HTMLInputElement | HTMLSelectElement, key: string) {
  const error = pending.get(key);
  input.dataset.pendingKey = key;
  input.setAttribute('aria-invalid', String(Boolean(error)));
  input.setCustomValidity(error?.message || '');
  let message = input.parentElement?.querySelector<HTMLElement>(':scope > .pending-input-error');
  if (error && !message) {
    message = document.createElement('p');
    message.className = 'pending-input-error';
    input.parentElement?.appendChild(message);
  }
  if (message) {
    message.id ||= `pending-error-${++nextErrorId}`;
    message.textContent = error?.message || '';
    message.hidden = !error;
    input.setAttribute('aria-describedby', message.id);
  }
}

export function validatePendingInput(input: HTMLInputElement | HTMLSelectElement, optional = false): boolean {
  if (!usesWorkspaces() || input instanceof HTMLSelectElement || input.type === 'checkbox') return true;
  const key = pendingInputKey(input);
  if (!key) return true;
  input.setCustomValidity('');
  const value = input.value;
  const field = input.dataset.k;
  let message = '';
  if (!optional && value.trim() === '') message = 'Enter a value. Results use the last valid value.';
  else if (input.type === 'number' && value !== '') {
    const n = Number(value);
    if (!Number.isFinite(n) || input.validity.badInput) message = 'Enter a number. Results use the last valid value.';
    else if (input.validity.rangeUnderflow || input.validity.rangeOverflow) message = `Use a value${input.min ? ` from ${input.min}` : ''}${input.max ? ` to ${input.max}` : ''}. Results use the last valid value.`;
    else if (['priceMonthly', 'pricePerSession', 'sessionsPerYear', 'hoursPerSession'].includes(field || '') && n <= 0) message = 'Use a value greater than zero. Results use the last valid value.';
  }
  if (message) pending.set(key, { value, message });
  else pending.delete(key);
  paint(input, key);
  changed();
  return !message;
}

export function restorePendingInputs(root: ParentNode = document) {
  if (!usesWorkspaces()) return;
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select').forEach(input => {
    const key = pendingInputKey(input);
    if (!key) return;
    const invalid = pending.get(key);
    if (invalid) input.value = invalid.value;
    if (invalid || input.dataset.pendingKey) paint(input, key);
  });
}

export function ensureValidInputs(): boolean {
  if (!pending.size) return true;
  const key = pending.keys().next().value!;
  window.dispatchEvent(new CustomEvent('profitpath:reveal-input', { detail: key }));
  const field = [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')]
    .find(input => pendingInputKey(input) === key && input.getClientRects().length > 0);
  field?.focus();
  changed();
  return false;
}
