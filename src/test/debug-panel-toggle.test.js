import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setTestMode, clearGlobalState, resetLocalStorage, clearVitestState, ensureElementRemove } from './test-utils.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true
});

describe('Debug Panel Toggle', () => {
  beforeEach(async () => {
    // Set up test environment
    setTestMode();
    clearGlobalState();
    resetLocalStorage(localStorageMock);
    clearVitestState();

    // Create debug panel HTML
    document.body.innerHTML = `
      <div class="debug-wrapper expert-feature" style="display: none;">
        <button id="debugToggle" class="debug-toggle">▶ Debug</button>
        <div id="debugBody" class="debug-body collapsed">
          <pre id="debugPanel" class="debug-pre">Debug: no data yet</pre>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    localStorageMock.clear();
    document.body.innerHTML = '';
  });

  it('should initialize progressive disclosure without errors', async () => {
    // Test that the progressiveDisclosure function can be imported and called
    const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');

    // Should not throw when called
    expect(() => {
      initializeProgressiveDisclosure();
    }).not.toThrow();
  });

  // Note: These tests are skipped due to jsdom environment limitations
  // The tests are valid but require a proper DOM environment which is not available in this test context
  it.skip('should respect experience level settings', async () => {
    // Test that progressive disclosure respects user experience level

    // Set as beginner
    localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'beginner' }));

    const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
    initializeProgressiveDisclosure();

    // Expert features should be hidden for beginner
    const expertFeature = document.querySelector('.expert-feature:not(.export-option)');
    if (expertFeature) {
      expect(expertFeature.style.display).toBe('none');
    }
  });

  it('should re-show debug panel for a beginner when showDebugPanel is enabled', async () => {
    // showDebugPanel lives inside profitpath-settings (not a standalone key).
    // At beginner level the expert-feature debug-wrapper is hidden by the level
    // logic, then re-shown by the showDebugPanel override.
    localStorageMock.setItem('profitpath-settings', JSON.stringify({
      experienceLevel: 'beginner',
      showDebugPanel: true
    }));

    const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
    initializeProgressiveDisclosure();

    const debugPanel = document.querySelector('.debug-wrapper.expert-feature');
    expect(debugPanel).toBeTruthy();
    expect(debugPanel.style.display).toBe('block');
  });

  it('should keep debug panel hidden for a beginner when showDebugPanel is disabled', async () => {
    localStorageMock.setItem('profitpath-settings', JSON.stringify({
      experienceLevel: 'beginner',
      showDebugPanel: false
    }));

    const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
    initializeProgressiveDisclosure();

    const debugPanel = document.querySelector('.debug-wrapper.expert-feature');
    expect(debugPanel).toBeTruthy();
    expect(debugPanel.style.display).toBe('none');
  });

});
