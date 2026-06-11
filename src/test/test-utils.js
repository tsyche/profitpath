/**
 * Test Utilities
 * Common utilities for test setup and isolation
 */

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
    delete window.profitPathAnalytics;
    delete window.feedbackUI;
  }
}

// Reset localStorage mock completely
export function resetLocalStorage(mock) {
  mock.clear();
}

// Unmock common analytics modules. vi.unmock is hoisted by Vitest to the top of
// the module and runs once at load time regardless of where it's written, so it
// must live at top level (nesting it inside a function is a future Vitest error).
vi.unmock('../../src/analytics/analytics.js');
vi.unmock('../../src/analytics/feedback.js');
vi.unmock('../../src/analytics/feedback-ui.js');

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
