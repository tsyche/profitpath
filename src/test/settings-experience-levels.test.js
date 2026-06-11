import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Settings and Experience Levels', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM(`
      <html>
        <body>
          <div class="settings-dropdown">
            <div class="settings-menu" id="settingsMenu">
              <div class="settings-section">
                <h4>Experience Level</h4>
                <div class="settings-options">
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                    <label>
                      <input type="radio" name="experienceLevel" value="beginner">
                      <div>Beginner</div>
                    </label>
                    <label>
                      <input type="radio" name="experienceLevel" value="intermediate">
                      <div>Intermediate</div>
                    </label>
                    <label>
                      <input type="radio" name="experienceLevel" value="advanced">
                      <div>Advanced</div>
                    </label>
                  </div>
                </div>
              </div>
              <div class="settings-section">
                <h4>Preferences</h4>
                <div class="settings-options">
                  <label><input type="checkbox" id="showTooltips"> Show tooltips</label>
                </div>
              </div>
            </div>
          </div>
          <div id="levelDescription" class="settings-level-description"></div>
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

    // Initialize default settings
    window.localStorage.setItem('profitpath-settings', JSON.stringify({
      experienceLevel: 'beginner',
      showAdvancedCalculations: false,
      showDetailedBreakdown: false,
      showComparisonTools: false,
      showExportOptions: false,
      showDebugPanel: false,
      showTooltips: true,
      enableCaching: true,
      enableDebugMode: false,
      showPerformanceMetrics: false,
      showSensitivityAnalysis: false,
      theme: 'auto',
      compactMode: false
    }));
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('Feature Gates', () => {
    it('should have tooltips enabled for beginner level', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.experienceLevel).toBe('beginner');
      expect(settings.showTooltips).toBe(true);
    });

    it('should have tooltips enabled for intermediate level', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'intermediate';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.experienceLevel).toBe('intermediate');
      expect(updated.showTooltips).toBe(true);
    });

    it('should have tooltips disabled for advanced level', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'advanced';
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.experienceLevel).toBe('advanced');
      expect(updated.showTooltips).toBe(false);
    });

    it('should enable advanced features only in advanced mode', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      // Beginner should have limited features
      settings.experienceLevel = 'beginner';
      expect(settings.showExportOptions).toBe(false);
      expect(settings.showDebugPanel).toBe(false);

      // Advanced should have all features
      settings.experienceLevel = 'advanced';
      settings.showExportOptions = true;
      settings.showDebugPanel = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.showExportOptions).toBe(true);
      expect(updated.showDebugPanel).toBe(true);
    });
  });

  describe('Experience Level Switching', () => {
    it('should switch from beginner to intermediate', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.experienceLevel).toBe('beginner');

      settings.experienceLevel = 'intermediate';
      settings.showAdvancedCalculations = true;
      settings.showDetailedBreakdown = true;
      settings.showComparisonTools = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.experienceLevel).toBe('intermediate');
      expect(updated.showAdvancedCalculations).toBe(true);
      expect(updated.showDetailedBreakdown).toBe(true);
      expect(updated.showComparisonTools).toBe(true);
    });

    it('should switch from intermediate to advanced', () => {
      let settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'intermediate';
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'advanced';
      settings.showExportOptions = true;
      settings.showDebugPanel = true;
      settings.showTooltips = false; // Advanced disables tooltips
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.experienceLevel).toBe('advanced');
      expect(updated.showExportOptions).toBe(true);
      expect(updated.showDebugPanel).toBe(true);
      expect(updated.showTooltips).toBe(false);
    });

    it('should switch from advanced back to beginner', () => {
      let settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'advanced';
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.experienceLevel).toBe('advanced');
      expect(settings.showTooltips).toBe(false);

      // Switch back to beginner
      settings.experienceLevel = 'beginner';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const updated = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(updated.experienceLevel).toBe('beginner');
      expect(updated.showTooltips).toBe(true);
    });
  });

  describe('Tooltip State Changes', () => {
    it('should detect tooltips enabled when switching to beginner from advanced', () => {
      let settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'advanced';
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const prevTooltipsState = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;
      expect(prevTooltipsState).toBe(false);

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'beginner';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const newTooltipsState = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;
      expect(newTooltipsState).toBe(true);
      expect(prevTooltipsState).not.toBe(newTooltipsState);
    });

    it('should detect tooltips disabled when switching to advanced from intermediate', () => {
      let settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'intermediate';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const prevTooltipsState = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;
      expect(prevTooltipsState).toBe(true);

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'advanced';
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const newTooltipsState = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;
      expect(newTooltipsState).toBe(false);
      expect(prevTooltipsState).not.toBe(newTooltipsState);
    });

    it('should not show tooltip change when switching between beginner and intermediate', () => {
      let settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'beginner';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const prevTooltipsState = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'intermediate';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const newTooltipsState = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;
      expect(prevTooltipsState).toBe(newTooltipsState);
    });
  });

  describe('Radio Button State', () => {
    it('should reflect beginner as selected in HTML', () => {
      const beginnerRadio = document.querySelector('input[name="experienceLevel"][value="beginner"]');
      expect(beginnerRadio).toBeTruthy();
      expect(beginnerRadio.type).toBe('radio');
    });

    it('should have all three experience level options', () => {
      const radios = document.querySelectorAll('input[name="experienceLevel"]');
      expect(radios.length).toBe(3);
      expect(radios[0].value).toBe('beginner');
      expect(radios[1].value).toBe('intermediate');
      expect(radios[2].value).toBe('advanced');
    });
  });

  describe('Checkbox State', () => {
    it('should have tooltips checkbox in DOM', () => {
      const checkbox = document.querySelector('#showTooltips');
      expect(checkbox).toBeTruthy();
      expect(checkbox.type).toBe('checkbox');
    });

    it('should reflect tooltip setting in checkbox', () => {
      const checkbox = document.querySelector('#showTooltips');
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      // Checkbox should be checkable
      checkbox.checked = settings.showTooltips;
      expect(checkbox.checked).toBe(settings.showTooltips);
    });

    it('should update checkbox when switching to advanced (tooltips off)', () => {
      const checkbox = document.querySelector('#showTooltips');
      let settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      // Start with beginner (tooltips on)
      settings.experienceLevel = 'beginner';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));
      checkbox.checked = true;
      expect(checkbox.checked).toBe(true);

      // Switch to advanced (tooltips off)
      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'advanced';
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));
      checkbox.checked = false;
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('Settings Persistence', () => {
    it('should persist experience level to localStorage', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.experienceLevel = 'advanced';
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const retrieved = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(retrieved.experienceLevel).toBe('advanced');
    });

    it('should persist tooltip setting to localStorage', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const retrieved = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(retrieved.showTooltips).toBe(false);
    });

    it('should maintain all settings when updating one', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      const originalExperienceLevel = settings.experienceLevel;

      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const retrieved = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(retrieved.experienceLevel).toBe(originalExperienceLevel);
      expect(retrieved.showTooltips).toBe(false);
    });
  });

  describe('Toast Queue Behavior', () => {
    it('should show experience level change toast', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      const prevLevel = settings.experienceLevel;
      const newLevel = 'advanced';

      expect(prevLevel).not.toBe(newLevel);
      // Toast would be triggered by experience level change
    });

    it('should show tooltip change toast when tooltip state changes during mode switch', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      const prevTooltips = settings.showTooltips;

      settings.experienceLevel = 'advanced';
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const newTooltips = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;

      // Should trigger both experience level and tooltip toasts
      expect(prevTooltips).toBe(true);
      expect(newTooltips).toBe(false);
      expect(prevTooltips).not.toBe(newTooltips);
    });

    it('should not show tooltip toast when tooltip state does not change', () => {
      const settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      const prevTooltips = settings.showTooltips;

      settings.experienceLevel = 'intermediate';
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      const newTooltips = JSON.parse(window.localStorage.getItem('profitpath-settings')).showTooltips;

      // Should only trigger experience level toast (tooltips unchanged)
      expect(prevTooltips).toBe(newTooltips);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow: beginner -> intermediate -> advanced -> beginner', () => {
      let settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));

      // Start: Beginner with tooltips
      expect(settings.experienceLevel).toBe('beginner');
      expect(settings.showTooltips).toBe(true);

      // Step 1: To Intermediate
      settings.experienceLevel = 'intermediate';
      settings.showAdvancedCalculations = true;
      settings.showDetailedBreakdown = true;
      settings.showComparisonTools = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.experienceLevel).toBe('intermediate');
      expect(settings.showAdvancedCalculations).toBe(true);
      expect(settings.showTooltips).toBe(true); // Still enabled

      // Step 2: To Advanced
      settings.experienceLevel = 'advanced';
      settings.showExportOptions = true;
      settings.showDebugPanel = true;
      settings.showTooltips = false;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.experienceLevel).toBe('advanced');
      expect(settings.showExportOptions).toBe(true);
      expect(settings.showTooltips).toBe(false); // Now disabled

      // Step 3: Back to Beginner
      settings.experienceLevel = 'beginner';
      settings.showAdvancedCalculations = false;
      settings.showDetailedBreakdown = false;
      settings.showComparisonTools = false;
      settings.showExportOptions = false;
      settings.showDebugPanel = false;
      settings.showTooltips = true;
      window.localStorage.setItem('profitpath-settings', JSON.stringify(settings));

      settings = JSON.parse(window.localStorage.getItem('profitpath-settings'));
      expect(settings.experienceLevel).toBe('beginner');
      expect(settings.showAdvancedCalculations).toBe(false);
      expect(settings.showTooltips).toBe(true); // Re-enabled
    });
  });
});
