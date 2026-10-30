/**
 * Test Utilities
 * Common utilities for test setup and isolation
 */
import { sanitizeScenarioState } from '../../assets/services/miscService';
import { calc } from '../calculations/index';
import type { AppState, CalcResult } from '../types';

/** Fail at the fixture boundary instead of dereferencing a missing test element. */
export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Required test fixture is missing');
  return value;
}

/** Normalize legacy/partial scenario fixtures through the same boundary as real imports. */
export function appStateFixture(data: object): AppState {
  const clean = required(sanitizeScenarioState({ ...data }));
  return {
    processingFeePct: 0,
    processingFeePerTransaction: 0,
    transactionsPerMonth: 0,
    ...clean,
    offerings: clean.offerings.map(offering => ({ ...offering, id: required(offering.id) }))
  };
}

/** Start metric fixtures with a complete result from the real calculator. */
export function calcResultFixture(overrides: Partial<CalcResult> = {}): CalcResult {
  return { ...calc({ offerings: [] }), ...overrides };
}

// Set test mode flag globally to prevent module initialization
export function setTestMode() {
  if (typeof window !== 'undefined') {
    window.__TEST_MODE__ = true;
  }
}

// Clear all possible global state that could interfere with tests
export function clearGlobalState() {
  // Clear analytics global instance
  if (typeof window !== 'undefined') {
    Reflect.deleteProperty(window, 'profitPathAnalytics');
    Reflect.deleteProperty(window, 'feedbackUI');
  }
}

// Reset localStorage mock completely
export function resetLocalStorage(mock: { clear: () => void }) {
  mock.clear();
}

// Unmock common analytics modules. vi.unmock is hoisted by Vitest to the top of
// the module and runs once at load time regardless of where it's written, so it
// must live at top level (nesting it inside a function is a future Vitest error).
vi.unmock('../../src/analytics/analytics');
vi.unmock('../../src/analytics/feedback');
vi.unmock('../../src/analytics/feedback-ui');

// Clear all Vitest mocks
export function clearVitestState() {
  vi.clearAllMocks();
}

// Ensure Element.remove is available in JSDOM
export function ensureElementRemove() {
  if (typeof Element !== 'undefined' && !Element.prototype.remove) {
    Object.defineProperty(Element.prototype, 'remove', {
      value: function () {
        if (this.parentNode) {
          this.parentNode.removeChild(this);
        }
      },
      writable: true,
      configurable: true
    });
  }
}
