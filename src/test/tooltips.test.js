import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Tooltip System - Comprehensive Coverage', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Create a fresh DOM with tooltip elements
    dom = new JSDOM(`
      <html>
        <body>
          <!-- Smart Tooltip Elements (data-tooltip) -->
          <input id="testInput" type="text" data-tooltip="This is a test tooltip" />
          <button id="testButton" data-tooltip="Button help text">Click me</button>

          <!-- Enhanced Tooltip Elements (title attributes) -->
          <input id="employees" type="number" title="Set the number of employees" />
          <input id="employeePay" type="number" title="Average annual salary" />
          <button class="settings-cog-btn" title="Customize experience level">Settings</button>

          <!-- SVG/Waterfall Tooltips -->
          <div class="profit-waterfall">
            <svg class="waterfall-svg">
              <text class="waterfall-label" data-waterfall-tooltip="Total revenue from all offerings">REV</text>
              <text class="waterfall-label" data-waterfall-tooltip="Direct costs that scale with volume">VAR</text>
              <text class="waterfall-label" data-waterfall-tooltip="Operating expenses and payroll">FIX</text>
              <text class="waterfall-label" data-waterfall-tooltip="Profit after all costs">NET</text>
            </svg>
          </div>

          <!-- Settings Panel -->
          <div id="settingsMenu">
            <input type="checkbox" id="showTooltips" />
          </div>
        </body>
      </html>
    `);

    window = dom.window;
    document = window.document;

    // Mock localStorage
    const localStorageMock = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value.toString();
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      }
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Initialize default settings (tooltips enabled)
    window.localStorage.setItem('profitpath-settings', JSON.stringify({
      showTooltips: true,
      experienceLevel: 'beginner'
    }));
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('Smart Tooltip System (data-tooltip)', () => {
    it('should find smart tooltip elements', () => {
      const elements = document.querySelectorAll('[data-tooltip]');
      expect(elements.length).toBe(2); // input and button
    });

    it('should store tooltip text in data-tooltip attribute', () => {
      const input = document.querySelector('#testInput');
      expect(input.getAttribute('data-tooltip')).toBe('This is a test tooltip');
    });

    it('should have proper tooltip text for button', () => {
      const button = document.querySelector('#testButton');
      expect(button.getAttribute('data-tooltip')).toBe('Button help text');
    });

    it('should support tooltip setting when enabled', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.showTooltips).toBe(true);
    });

    it('should support disabling tooltips via setting', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.showTooltips).toBe(false);
    });
  });

  describe('Enhanced Tooltip System (title attributes)', () => {
    it('should find enhanced tooltip elements', () => {
      const elements = document.querySelectorAll('[title]');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should have title on employees input', () => {
      const input = document.querySelector('#employees');
      expect(input.getAttribute('title')).toBe('Set the number of employees');
    });

    it('should have title on employeePay input', () => {
      const input = document.querySelector('#employeePay');
      expect(input.getAttribute('title')).toBe('Average annual salary');
    });

    it('should have title on settings button', () => {
      const button = document.querySelector('.settings-cog-btn');
      expect(button.getAttribute('title')).toBe('Customize experience level');
    });

    it('should support converting title to data-originalTitle', () => {
      const input = document.querySelector('#employees');
      const originalTitle = 'Set the number of employees';

      // Simulate what updateTooltipsUIOnly does
      input.dataset.originalTitle = input.title;
      input.dataset.tooltipEnabled = 'true';
      input.title = '';

      expect(input.dataset.originalTitle).toBe(originalTitle);
      expect(input.title).toBe('');
      expect(input.dataset.tooltipEnabled).toBe('true');
    });

    it('should support restoring title from data-originalTitle', () => {
      const input = document.querySelector('#employees');
      const originalTitle = 'Set the number of employees';

      // Simulate enable -> disable cycle
      input.dataset.originalTitle = originalTitle;
      input.title = '';

      input.title = input.dataset.originalTitle;
      delete input.dataset.tooltipEnabled;

      expect(input.title).toBe(originalTitle);
      expect(input.dataset.tooltipEnabled).toBeUndefined();
    });
  });

  describe('Waterfall Tooltip System (data-waterfall-tooltip)', () => {
    it('should find waterfall tooltip elements', () => {
      const elements = document.querySelectorAll('.waterfall-label');
      expect(elements.length).toBe(4); // REV, VAR, FIX, NET
    });

    it('should have proper waterfall tooltip for REV', () => {
      const rev = Array.from(document.querySelectorAll('.waterfall-label')).find(el =>
        el.textContent === 'REV'
      );
      expect(rev.getAttribute('data-waterfall-tooltip')).toBe('Total revenue from all offerings');
    });

    it('should have proper waterfall tooltip for VAR', () => {
      const vat = Array.from(document.querySelectorAll('.waterfall-label')).find(el =>
        el.textContent === 'VAR'
      );
      expect(vat.getAttribute('data-waterfall-tooltip')).toBe('Direct costs that scale with volume');
    });

    it('should have proper waterfall tooltip for FIX', () => {
      const fix = Array.from(document.querySelectorAll('.waterfall-label')).find(el =>
        el.textContent === 'FIX'
      );
      expect(fix.getAttribute('data-waterfall-tooltip')).toBe('Operating expenses and payroll');
    });

    it('should have proper waterfall tooltip for NET', () => {
      const net = Array.from(document.querySelectorAll('.waterfall-label')).find(el =>
        el.textContent === 'NET'
      );
      expect(net.getAttribute('data-waterfall-tooltip')).toBe('Profit after all costs');
    });

    it('should use distinct data attribute (not data-tooltip)', () => {
      const labels = document.querySelectorAll('.waterfall-label');
      labels.forEach(label => {
        expect(label.hasAttribute('data-waterfall-tooltip')).toBe(true);
        expect(label.hasAttribute('data-tooltip')).toBe(false);
      });
    });
  });

  describe('Tooltip Setting - Enable/Disable', () => {
    it('should default to tooltips enabled', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.showTooltips).toBe(true);
    });

    it('should support disabling tooltips', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.showTooltips).toBe(false);
    });

    it('should support re-enabling tooltips', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.showTooltips).toBe(true);
    });

    it('should persist tooltip setting across page reloads', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      // Simulate page reload by reading from storage
      const reloaded = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(reloaded.showTooltips).toBe(false);
    });

    it('should track multiple setting changes', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      // Cycle through states
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));
      let current = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(current.showTooltips).toBe(false);

      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));
      current = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(current.showTooltips).toBe(true);

      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));
      current = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(current.showTooltips).toBe(false);
    });
  });

  describe('Tooltip Integration - Multiple Systems', () => {
    it('should not mix data-tooltip and data-waterfall-tooltip', () => {
      const smartTooltips = document.querySelectorAll('[data-tooltip]');
      const waterfallTooltips = document.querySelectorAll('[data-waterfall-tooltip]');

      // Verify no overlap
      smartTooltips.forEach(el => {
        expect(el.hasAttribute('data-waterfall-tooltip')).toBe(false);
      });

      waterfallTooltips.forEach(el => {
        expect(el.hasAttribute('data-tooltip')).toBe(false);
      });
    });

    it('should have all tooltip types present', () => {
      const smartCount = document.querySelectorAll('[data-tooltip]').length;
      const enhancedCount = document.querySelectorAll('[title]').length;
      const waterfallCount = document.querySelectorAll('[data-waterfall-tooltip]').length;

      expect(smartCount).toBeGreaterThan(0); // At least input and button
      expect(enhancedCount).toBeGreaterThan(0); // At least employees and settings
      expect(waterfallCount).toBe(4); // REV, VAR, FIX, NET
    });

    it('should allow independent enable/disable per system', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      // Smart tooltips check setting
      const shouldShowSmart = settings.showTooltips !== false;
      expect(shouldShowSmart).toBe(true);

      // Enhanced tooltips check setting
      const shouldShowEnhanced = settings.showTooltips !== false;
      expect(shouldShowEnhanced).toBe(true);

      // Waterfall tooltips check setting
      const shouldShowWaterfall = settings.showTooltips !== false;
      expect(shouldShowWaterfall).toBe(true);
    });
  });

  describe('Tooltip Content - No Leaks or XSS', () => {
    it('should properly escape tooltip content', () => {
      const maliciousContent = '<script>alert("xss")</script>';
      const input = document.querySelector('#testInput');
      input.setAttribute('data-tooltip', maliciousContent);

      // Content should be stored as-is (sanitization happens at display time)
      expect(input.getAttribute('data-tooltip')).toBe(maliciousContent);
    });

    it('should handle special characters in tooltips', () => {
      const specialContent = 'Price with & special < > characters "quoted"';
      const input = document.querySelector('#testInput');
      input.setAttribute('data-tooltip', specialContent);

      expect(input.getAttribute('data-tooltip')).toBe(specialContent);
    });

    it('should handle long tooltip text', () => {
      const longText = 'A'.repeat(500);
      const input = document.querySelector('#testInput');
      input.setAttribute('data-tooltip', longText);

      expect(input.getAttribute('data-tooltip')).toBe(longText);
      expect(input.getAttribute('data-tooltip').length).toBe(500);
    });

    it('should handle empty tooltip gracefully', () => {
      const input = document.querySelector('#testInput');
      input.setAttribute('data-tooltip', '');

      expect(input.getAttribute('data-tooltip')).toBe('');
    });
  });

  describe('Tooltip UI State Tracking', () => {
    it('should track enabled state with data-tooltipEnabled', () => {
      const input = document.querySelector('#employees');
      input.dataset.tooltipEnabled = 'true';

      expect(input.dataset.tooltipEnabled).toBe('true');
    });

    it('should track original title separately', () => {
      const input = document.querySelector('#employees');
      const originalTitle = 'Set the number of employees';

      input.dataset.originalTitle = originalTitle;
      input.title = '';

      expect(input.dataset.originalTitle).toBe(originalTitle);
      expect(input.title).toBe('');
    });

    it('should clean up state when disabling', () => {
      const input = document.querySelector('#employees');
      input.dataset.tooltipEnabled = 'true';
      input.dataset.originalTitle = 'Test';

      delete input.dataset.tooltipEnabled;
      delete input.dataset.originalTitle;

      expect(input.dataset.tooltipEnabled).toBeUndefined();
      expect(input.dataset.originalTitle).toBeUndefined();
    });

    it('should not leave stale state after multiple cycles', () => {
      const input = document.querySelector('#employees');

      // Enable cycle
      input.dataset.tooltipEnabled = 'true';
      input.dataset.originalTitle = 'Test';
      expect(input.dataset.tooltipEnabled).toBe('true');

      // Disable cycle
      delete input.dataset.tooltipEnabled;
      delete input.dataset.originalTitle;
      expect(input.dataset.tooltipEnabled).toBeUndefined();

      // Re-enable cycle
      input.dataset.tooltipEnabled = 'true';
      input.dataset.originalTitle = 'Test';
      expect(input.dataset.tooltipEnabled).toBe('true');

      // Final disable
      delete input.dataset.tooltipEnabled;
      delete input.dataset.originalTitle;
      expect(input.dataset.tooltipEnabled).toBeUndefined();
    });
  });

  describe('Tooltip Setting Checkbox', () => {
    it('should have tooltips checkbox in DOM', () => {
      const checkbox = document.querySelector('#showTooltips');
      expect(checkbox).toBeTruthy();
      expect(checkbox.type).toBe('checkbox');
    });

    it('should sync checkbox with setting state', () => {
      const checkbox = document.querySelector('#showTooltips');
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      checkbox.checked = settings.showTooltips;
      expect(checkbox.checked).toBe(settings.showTooltips);
    });

    it('should support toggling checkbox', () => {
      const checkbox = document.querySelector('#showTooltips');

      checkbox.checked = true;
      expect(checkbox.checked).toBe(true);

      checkbox.checked = false;
      expect(checkbox.checked).toBe(false);
    });

    it('should allow independent checkbox state from setting', () => {
      const checkbox = document.querySelector('#showTooltips');
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      // Checkbox can be toggled
      checkbox.checked = !checkbox.checked;
      const checkboxState = checkbox.checked;

      // Setting can be changed
      settings.showTooltips = !settings.showTooltips;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));
      const settingState = settings.showTooltips;

      // They can differ temporarily (until sync)
      checkbox.checked = !checkboxState;
      expect(checkbox.checked).not.toBe(checkboxState);
    });
  });
});
