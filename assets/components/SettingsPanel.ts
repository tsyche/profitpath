import { loadSettings, setExperienceLevel, updateSetting } from '../services/miscService';
import { showToast } from '../services/modalService';
import { setTooltipsEnabled } from '../utils/tooltipManager';
import { updateTooltipsUIOnly } from './Onboarding';
import { $ } from '../utils/dom';

/** Settings modal: experience level, feature toggles and the feature-gated sections. */

// Function to refresh desktop settings dropdown with current values
function refreshDesktopSettings() {
  if (typeof document === 'undefined') return; // guard when running in non-DOM environments
  try {
    const settings = loadSettings();

    // Update experience level radios
    const experienceRadios = document.querySelectorAll<HTMLInputElement>('input[name="experienceLevel"]');
    experienceRadios.forEach(radio => {
      radio.checked = radio.value === settings.experienceLevel;
    });

    // Update feature checkboxes
    const checkboxes = document.querySelectorAll<HTMLInputElement>('#settingsMenu input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const settingKey = checkbox.id;
      checkbox.checked = settings[settingKey];
    });
  } catch (error) {
    console.warn('Error refreshing desktop settings:', error);
  }
}

// Level description panel
function updateLevelDescription(level: string) {
  const descriptions: Record<string, { enabled: string[]; locked: string[] }> = {
    beginner: {
      enabled: ['Basic calculations', 'Simple exports', 'Tooltips', 'Scenario management'],
      locked: ['Advanced calculations', 'Detailed breakdowns', 'Scenario comparison', 'Full export suite', 'Debug panel']
    },
    intermediate: {
      enabled: ['Basic calculations', 'Advanced calculations', 'Detailed breakdowns', 'Scenario comparison', 'Tooltips', 'Simple exports'],
      locked: ['Full export suite (Excel, PDF, Email)', 'Debug panel']
    },
    advanced: {
      enabled: ['Basic calculations', 'Advanced calculations', 'Detailed breakdowns', 'Scenario comparison', 'Sensitivity analysis', 'Tooltips', 'CSV import', 'Undo/Redo', 'Full export suite (Excel, PDF, HTML, Email)', 'Debug panel', 'Performance metrics', 'Scenario comparison tools'],
      locked: []
    }
  };

  const desc = descriptions[level] || descriptions.beginner;
  const container = document.getElementById('levelDescription');
  if (!container) return;

  let html = '<div style="font-size: 12px;">';

  if (desc.enabled.length > 0) {
    html += '<div style="margin-bottom: 6px;"><div style="font-weight: 500; color: var(--good); margin-bottom: 2px;">✓ Enabled:</div>';
    desc.enabled.forEach(feature => {
      html += `<div style="color: var(--text); margin-left: 18px; line-height: 1.4;">${feature}</div>`;
    });
    html += '</div>';
  }

  if (desc.locked.length > 0) {
    html += '<div><div style="font-weight: 500; color: var(--muted); margin-bottom: 2px;">🔒 Locked:</div>';
    desc.locked.forEach(feature => {
      html += `<div style="color: var(--muted); margin-left: 18px; line-height: 1.4; font-size: 11px;">${feature}</div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// Settings management
let settingsInitialized = false;

function initializeSettings() {
  // Only attach event listeners once to prevent duplicates
  if (!settingsInitialized) {
    settingsInitialized = true;

    // Set experience level radio buttons
    const experienceRadios = document.querySelectorAll<HTMLInputElement>('input[name="experienceLevel"]');
    experienceRadios.forEach(radio => {
      radio.addEventListener('change', (e: Event) => {
        const prevSettings = loadSettings();
        const level = (e.target as HTMLInputElement).value;

        // Only show toast if level actually changed
        if (prevSettings.experienceLevel !== level) {
          const prevTooltipsState = prevSettings.showTooltips;

          setExperienceLevel(level);

          // Get new settings to check if tooltips changed
          const newSettings = loadSettings();
          const newTooltipsState = newSettings.showTooltips;

          // Show toast notification for level change
          const labels: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
          const hints: Record<string, string> = {
            beginner: 'Core features active.',
            intermediate: 'Advanced calculations and scenario tools unlocked.',
            advanced: 'All features enabled, including export suite and debug panel.'
          };
          showToast(`${labels[level]} mode — ${hints[level]}`, 'info', 1800);

          // Show toast for tooltips change if it occurred
          if (prevTooltipsState !== newTooltipsState) {
            if (newTooltipsState) {
              showToast('Contextual tooltips enabled! Hover over elements to see help.', 'info', 1800);
            } else {
              showToast('Contextual tooltips disabled.', 'info', 1800);
            }
          }

          // Update level description panel
          updateLevelDescription(level);

          // Delay UI update slightly to ensure settings are saved first
          setTimeout(() => {
            updateUIForSettings();
          }, 50);
        }
      });
    });

    // Set feature toggles
    const checkboxes: string[] = [
      'showAdvancedCalculations',
      'showDetailedBreakdown',
      'showComparisonTools',
      'showExportOptions',
      'showDebugPanel',
      'showTooltips'
    ];

    checkboxes.forEach(key => {
      const checkbox = $('#' + key);
      if (checkbox) {
        checkbox.addEventListener('change', (e: Event) => {
          const prevSettings = loadSettings();
          const newValue = (e.target as HTMLInputElement).checked;

          // Only update if value actually changed
          if (prevSettings[key] !== newValue) {
            updateSetting(key, newValue);
            updateUIForSettings();
          }
        });
      }
    });
  }

  // Update checkbox states and level description (runs every time)
  const settings2 = loadSettings();

  const experienceRadios = document.querySelectorAll<HTMLInputElement>('input[name="experienceLevel"]');
  experienceRadios.forEach(radio => {
    radio.checked = radio.value === settings2.experienceLevel;
  });

  const checkboxes: string[] = [
    'showAdvancedCalculations',
    'showDetailedBreakdown',
    'showComparisonTools',
    'showExportOptions',
    'showDebugPanel',
    'showTooltips'
  ];

  checkboxes.forEach(key => {
    const checkbox = $('#' + key);
    if (checkbox) {
      // Force update by setting checked state based on current settings
      const shouldBeChecked = settings2[key] === true;
      if (checkbox.checked !== shouldBeChecked) {
        checkbox.checked = shouldBeChecked;
      }
    }
  });

  // Update level description panel on initialization
  updateLevelDescription(settings2.experienceLevel || 'beginner');
}

function updateUIForSettings() {
  const settings = loadSettings();

  // Show/hide elements based on feature gates
  const elementsToToggle = [
    { selector: '.advanced-calculations', setting: 'showAdvancedCalculations' },
    { selector: '.detailed-breakdown', setting: 'showDetailedBreakdown' },
    { selector: '.comparison-tools', setting: 'showComparisonTools' },
    { selector: '.export-options', setting: 'showExportOptions' },
    { selector: '.debug-wrapper', setting: 'showDebugPanel' },
    { selector: '.perf-wrapper', setting: 'showPerformanceMetrics' },
    { selector: '.sensitivity-wrapper', setting: 'showSensitivityAnalysis' },
    { selector: '.mix-optimizer-wrapper', setting: 'showMixOptimizer' },
    { selector: '.insights-wrapper', setting: 'showInsights' },
    { selector: '.reverse-calculator-wrapper', setting: 'showReverseCalculator' },
    { selector: '.advanced-charts-wrapper', setting: 'showAdvancedCharts' }
  ];

  elementsToToggle.forEach(({ selector, setting }) => {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    elements.forEach(el => {
      el.style.display = settings[setting] ? 'block' : 'none';
    });
  });

  // Update tooltips checkbox state
  const tooltipCheckbox = $('#showTooltips');
  if (tooltipCheckbox) {
    tooltipCheckbox.checked = settings.showTooltips === true;
  }

  // Update tooltips visibility - silent mode (no toast)
  if (settings.showTooltips) {
    updateTooltipsUIOnly(true);
    setTooltipsEnabled(true);
  } else {
    updateTooltipsUIOnly(false);
    setTooltipsEnabled(false);
  }
}


export function initSettings(): void {
  // Global settings change listener-refresh desktop settings when any setting changes
  window.addEventListener('settingsChanged', () => {
    setTimeout(refreshDesktopSettings, 10); // Small delay to ensure settings are saved
  });

  // Initialize desktop settings on page load
  setTimeout(refreshDesktopSettings, 100);

  // Settings Cog Button — opens the #settingsModal (consistent with Scenarios /
  // Templates). Refresh values first so radios/checkboxes reflect saved settings.
  const appVersionEl = $('#appVersion');
  if (appVersionEl) appVersionEl.textContent = 'ProfitPath v' + __APP_VERSION__;

  const settingsCogBtn = $('#settingsCogBtn');
  if (settingsCogBtn) {
    settingsCogBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      refreshDesktopSettings();
      if (typeof window.ppOpenModal === 'function') window.ppOpenModal('settingsModal');
    });
  }
  initializeSettings();
}
