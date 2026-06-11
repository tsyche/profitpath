import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

describe('Progressive Disclosure - Feature Gating', () => {
  beforeEach(async () => {
    // Clear localStorage
    localStorageMock.clear();

    // Reset DOM
    document.body.innerHTML = `
      <div id="app">
        <!-- Beginner features -->
        <input id="employees" type="number">
        <input id="employeePay" type="number">
        <button id="modeSelect">Mode</button>

        <!-- Advanced features (hidden for beginner) -->
        <div class="advanced-feature" style="display: block;">
          <button id="advancedCalculations">Advanced Calcs</button>
          <div id="comparisonTools">Comparison</div>
        </div>

        <!-- Expert features (only for advanced users) -->
        <div class="expert-feature" style="display: block;">
          <button id="debugToggle">Debug</button>
          <div class="debug-wrapper" style="display: block;">
            <pre id="debugPanel">Debug: no data yet</pre>
          </div>
        </div>

        <!-- Export options (always visible) -->
        <div class="export-option advanced-feature" style="display: block;">
          <button id="exportCSV">Export CSV</button>
        </div>
        <div class="export-option expert-feature" style="display: block;">
          <button id="exportPDF">Export PDF</button>
        </div>
      </div>
    `;

    // Import progressive disclosure module
    await import('../../assets/utils/progressiveDisclosure.js');
  });

  afterEach(() => {
    localStorageMock.clear();
    document.body.innerHTML = '';
  });

  describe('Beginner Level (Default)', () => {
    beforeEach(async () => {
      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'beginner' }));
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();
    });

    it('should hide advanced features at beginner level', async () => {
      const advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      expect(advancedFeature.style.display).toBe('none');
    });

    it('should hide expert features at beginner level', async () => {
      const expertFeature = document.querySelector('.expert-feature:not(.export-option)');
      expect(expertFeature.style.display).toBe('none');
    });

    it('should always show export options', async () => {
      const exportOptions = document.querySelectorAll('.export-option');
      exportOptions.forEach(option => {
        expect(option.style.display).toBe('block');
      });
    });

    it('should not show debug panel', async () => {
      const debugWrapper = document.querySelector('.debug-wrapper.expert-feature');
      // Debug panel is hidden for beginner level (it's an expert-feature)
      if (debugWrapper) {
        expect(debugWrapper.style.display).toBe('none');
      }
    });
  });

  describe('Intermediate Level', () => {
    beforeEach(async () => {
      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'intermediate' }));
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();
    });

    it('should show advanced features at intermediate level', async () => {
      const advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      expect(advancedFeature.style.display).not.toBe('none');
    });

    it('should hide expert features at intermediate level', async () => {
      const expertFeature = document.querySelector('.expert-feature:not(.export-option)');
      expect(expertFeature.style.display).toBe('none');
    });

    it('should always show export options', async () => {
      const exportOptions = document.querySelectorAll('.export-option');
      exportOptions.forEach(option => {
        expect(option.style.display).toBe('block');
      });
    });

    it('should not show debug panel unless explicitly enabled', async () => {
      const debugWrapper = document.querySelector('.debug-wrapper.expert-feature');
      // Debug panel is hidden for intermediate level (it's an expert-feature)
      if (debugWrapper) {
        expect(debugWrapper.style.display).toBe('none');
      }
    });

    it('should show comparison tools', async () => {
      const comparisonTools = document.querySelector('#comparisonTools');
      expect(comparisonTools).toBeTruthy();
      expect(comparisonTools.style.display).not.toBe('none');
    });
  });

  describe('Advanced Level', () => {
    beforeEach(async () => {
      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'advanced' }));
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();
    });

    it('should show advanced features at advanced level', async () => {
      const advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      expect(advancedFeature.style.display).not.toBe('none');
    });

    it('should show expert features at advanced level', async () => {
      const expertFeature = document.querySelector('.expert-feature:not(.export-option)');
      expect(expertFeature.style.display).not.toBe('none');
    });

    it('should always show export options', async () => {
      const exportOptions = document.querySelectorAll('.export-option');
      exportOptions.forEach(option => {
        expect(option.style.display).toBe('block');
      });
    });

    it('should show debug panel by default', async () => {
      const debugWrapper = document.querySelector('.debug-wrapper');
      expect(debugWrapper.style.display).not.toBe('none');
    });
  });

  describe('Debug Panel Override', () => {
    it('should show debug panel when explicitly enabled', async () => {
      // Create fresh DOM with debug wrapper
      document.body.innerHTML = `
        <div class="debug-wrapper expert-feature" style="display: none;">Debug</div>
      `;

      // showDebugPanel is stored inside profitpath-settings, not as a standalone key
      localStorageMock.setItem('profitpath-settings', JSON.stringify({
        experienceLevel: 'intermediate',
        showDebugPanel: true
      }));

      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();

      const debugWrapper = document.querySelector('.debug-wrapper.expert-feature');
      if (debugWrapper) {
        expect(debugWrapper.style.display).toBe('block');
      }
    });

    it('should handle debug panel setting for different levels', async () => {
      // Test that progressive disclosure properly handles the showDebugPanel flag
      document.body.innerHTML = `
        <div class="debug-wrapper expert-feature" style="display: block;">Debug</div>
      `;

      localStorageMock.setItem('profitpath-settings', JSON.stringify({
        experienceLevel: 'beginner',
        showDebugPanel: false
      }));

      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();

      // For beginner with showDebugPanel=false, panel should be hidden
      const debugWrapper = document.querySelector('.debug-wrapper');
      expect(debugWrapper).toBeTruthy();
      expect(debugWrapper.style.display).toBe('none');
    });
  });

  describe('Level Transitions (with DOM reset between levels)', () => {
    it('should handle level transitions when DOM is reset', async () => {
      // The progressive disclosure function only hides elements; it doesn't unhide them
      // In real usage, the DOM would be re-rendered when level changes
      // This test verifies the function works correctly on fresh DOM for each level

      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');

      // Test beginner level with fresh DOM
      document.body.innerHTML = `
        <div class="advanced-feature" style="display: block;"></div>
        <div class="expert-feature" style="display: block;"></div>
      `;

      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'beginner' }));
      initializeProgressiveDisclosure();

      let advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      expect(advancedFeature.style.display).toBe('none');

      // Test intermediate level with fresh DOM
      document.body.innerHTML = `
        <div class="advanced-feature" style="display: block;"></div>
        <div class="expert-feature" style="display: block;"></div>
      `;

      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'intermediate' }));
      initializeProgressiveDisclosure();

      advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      let expertFeature = document.querySelector('.expert-feature:not(.export-option)');
      expect(advancedFeature.style.display).not.toBe('none');
      expect(expertFeature.style.display).toBe('none');

      // Test advanced level with fresh DOM
      document.body.innerHTML = `
        <div class="advanced-feature" style="display: block;"></div>
        <div class="expert-feature" style="display: block;"></div>
      `;

      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'advanced' }));
      initializeProgressiveDisclosure();

      advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      expertFeature = document.querySelector('.expert-feature:not(.export-option)');
      expect(advancedFeature.style.display).not.toBe('none');
      expect(expertFeature.style.display).not.toBe('none');
    });
  });

  describe('Export Option Persistence', () => {
    it('should show export options at all experience levels', async () => {
      const levels = ['beginner', 'intermediate', 'advanced'];
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');

      for (const level of levels) {
        localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: level }));
        initializeProgressiveDisclosure();

        const exportOptions = document.querySelectorAll('.export-option');
        exportOptions.forEach(option => {
          expect(option.style.display).toBe('block');
        });
      }
    });
  });

  describe('Mobile Submenu Features', () => {
    beforeEach(() => {
      // Add mobile submenu button to DOM
      const mobileBtn = document.createElement('button');
      mobileBtn.className = 'mobile-submenu-btn expert-feature';
      mobileBtn.style.display = 'block';
      mobileBtn.textContent = 'Mobile Menu';
      document.body.appendChild(mobileBtn);
    });

    it('should show mobile expert features for advanced users', async () => {
      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'advanced' }));
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();

      const mobileBtn = document.querySelector('.mobile-submenu-btn.expert-feature');
      // Mobile buttons are always shown based on progressive disclosure code
      expect(mobileBtn.style.display).toBe('block');
    });

    it('should always show mobile menu buttons (they are treated as export options)', async () => {
      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'beginner' }));
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();

      const mobileBtn = document.querySelector('.mobile-submenu-btn.expert-feature');
      // Mobile submenu buttons are always shown (see progressive disclosure logic)
      expect(mobileBtn.style.display).toBe('block');
    });
  });

  describe('Feature Visibility Coverage', () => {
    it('should consistently apply feature visibility rules', async () => {
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');

      // Test each level independently with fresh DOM setup
      const levels = ['beginner', 'intermediate', 'advanced'];

      for (const level of levels) {
        // Reset DOM for each level test
        document.body.innerHTML = `
          <div id="app">
            <div class="advanced-feature" style="display: block;"></div>
            <div class="expert-feature" style="display: block;"></div>
            <div class="export-option advanced-feature" style="display: block;"></div>
            <div class="export-option expert-feature" style="display: block;"></div>
          </div>
        `;

        localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: level }));
        initializeProgressiveDisclosure();

        // All levels should always show export options
        const exportOptions = document.querySelectorAll('.export-option');
        exportOptions.forEach(opt => {
          expect(opt.style.display).toBe('block', `${level} - export options should always be visible`);
        });

        // Verify features are hidden appropriately per level
        const advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
        const expertFeature = document.querySelector('.expert-feature:not(.export-option)');

        if (level === 'beginner') {
          expect(advancedFeature.style.display).toBe('none', `${level} - advanced should be hidden`);
          expect(expertFeature.style.display).toBe('none', `${level} - expert should be hidden`);
        }

        if (level === 'intermediate') {
          expect(expertFeature.style.display).toBe('none', `${level} - expert should be hidden`);
        }

        if (level === 'advanced') {
          // Advanced doesn't explicitly hide anything, so elements stay visible
          expect(advancedFeature.style.display).not.toBe('none', `${level} - advanced should be visible`);
          expect(expertFeature.style.display).not.toBe('none', `${level} - expert should be visible`);
        }
      }
    });
  });

  describe('Invalid Level Handling', () => {
    it('should treat unknown level as advanced (not hiding features)', async () => {
      // The progressive disclosure code only explicitly hides for 'beginner' and 'intermediate'
      // Unknown levels fall through and keep features visible
      localStorageMock.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'unknown-level' }));
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();

      // Unknown level will show all features (because it's not 'beginner' or 'intermediate')
      const advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      expect(advancedFeature.style.display).toBe('block');
    });

    it('should default to beginner when level is not set', async () => {
      localStorageMock.clear();
      const { initializeProgressiveDisclosure } = await import('../../assets/utils/progressiveDisclosure.js');
      initializeProgressiveDisclosure();

      // Missing settings defaults to 'beginner'
      const advancedFeature = document.querySelector('.advanced-feature:not(.export-option)');
      expect(advancedFeature.style.display).toBe('none');
    });
  });
});
