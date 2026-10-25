import { RANGE_CASES, RANGE_CASE_LABELS, getRangeCase, rangeCaseTag, setRangeCase } from '../../src/calculations/rangeCase';
import { sanitizeSpreads, type ConfidenceSpreads } from '../../src/calculations/ranges';
import { CONFIDENCE_LABELS } from '../../src/calculations/offeringMeta';
import type { Confidence } from '../../src/types';
import { escapeHtml } from '../services/miscService';

/**
 * Range UI that is not the bounds table (ROADMAP 22 + 24): the Conservative / Base / Optimistic
 * toggle and its chips, the editable confidence spreads, and the per-offering confidence badge.
 * The case itself lives in rangeCase.ts and is applied inside calc(), so this file only draws it.
 */

const SPREADS_KEY = 'profitpath-range-spreads';

const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

/** Draws the toggle and chips. A case with no band to show (no moving bounds) snaps back to base. */
export function renderRangeCase(available: boolean): void {
  if (!available) setRangeCase('base');
  const active = getRangeCase();
  document.querySelectorAll<HTMLElement>('#rangeCaseToggle [data-case]').forEach((b) => {
    const on = b.dataset.case === active;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
    b.classList.toggle('active', on);
  });
  const tag = rangeCaseTag();
  document.querySelectorAll<HTMLElement>('.range-case-chip').forEach((chip) => {
    chip.hidden = tag === '';
    chip.textContent = tag;
  });
}

/** `onChange` must recalculate and redraw everything (the app's render()). */
export function initRangeCase(onChange: () => void): void {
  const group = $('#rangeCaseToggle');
  if (!group) return;
  group.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-case]');
    if (!btn) return;
    setRangeCase(btn.dataset.case);
    onChange();
  });
  group.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = RANGE_CASES.indexOf(getRangeCase());
    const next = RANGE_CASES[(i + (e.key === 'ArrowRight' ? 1 : RANGE_CASES.length - 1)) % RANGE_CASES.length];
    setRangeCase(next);
    onChange();
    document.querySelector<HTMLElement>(`#rangeCaseToggle [data-case="${next}"]`)?.focus();
  });
  group.querySelectorAll<HTMLElement>('[data-case]').forEach((b) => {
    b.textContent = RANGE_CASE_LABELS[b.dataset.case as keyof typeof RANGE_CASE_LABELS];
  });
}

/** Saved spreads, defaulted and clamped. Storage can be blocked or hold junk, so never trust it. */
export function getSpreads(): ConfidenceSpreads {
  try {
    return sanitizeSpreads(JSON.parse(localStorage.getItem(SPREADS_KEY) || 'null'));
  } catch {
    return sanitizeSpreads(null);
  }
}

function saveSpreads(s: ConfidenceSpreads): void {
  try {
    localStorage.setItem(SPREADS_KEY, JSON.stringify(s));
  } catch {
    // Private mode or quota: the spreads just reset next load.
  }
}

/** Wires the Estimated / Guess ± % inputs next to "Fill ranges from confidence". */
export function initSpreadInputs(): void {
  const fields: Array<[string, Confidence]> = [['#spreadEstimated', 'estimated'], ['#spreadGuess', 'guess']];
  const spreads = getSpreads();
  for (const [sel, key] of fields) {
    const el = $(sel);
    if (!(el instanceof HTMLInputElement)) continue;
    el.value = String(spreads[key]);
    el.addEventListener('change', () => {
      const next = sanitizeSpreads({ ...getSpreads(), [key]: el.value });
      el.value = String(next[key]);
      saveSpreads(next);
    });
  }
}

/** Display only: shows how much to trust a row beside its name. It never weights a number. */
export function confidenceBadgeHtml(confidence: unknown): string {
  if (typeof confidence !== 'string' || !(confidence in CONFIDENCE_LABELS)) return '';
  const label = CONFIDENCE_LABELS[confidence as Confidence];
  return '<span class="conf-badge" data-confidence="' + escapeHtml(confidence) + '" title="Confidence: ' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>';
}

/** Redraws one row's badge in place when its tag changes, so the main table needn't rebuild (and drop focus). */
export function syncConfidenceBadge(idx: number, confidence: unknown): void {
  const cell = document.querySelector<HTMLElement>(`#offeringsBody tr:nth-child(${idx + 1}) td`);
  if (!cell) return;
  cell.querySelector('.conf-badge')?.remove();
  cell.insertAdjacentHTML('beforeend', confidenceBadgeHtml(confidence));
}
