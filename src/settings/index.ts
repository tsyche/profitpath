/**
 * User Settings & Feature Gating System
 * Manages user preferences and feature visibility for progressive disclosure
 */

import type { ExperienceLevel, Settings } from '../types';

// Default settings - beginner-friendly defaults
export const DEFAULT_SETTINGS: Settings = {
  // Experience level
  experienceLevel: 'beginner', // 'beginner' | 'intermediate' | 'advanced'

  // Feature toggles
  showAdvancedCalculations: false,
  showDetailedBreakdown: false,
  showComparisonTools: false,
  showExportOptions: false,
  showDebugPanel: false,

  // UI preferences
  theme: 'auto', // 'light' | 'dark' | 'auto'
  compactMode: false,
  showTooltips: true,

  // Localization & Formatting
  currency: 'USD', // 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'
  locale: 'en-US', // 'en-US' | 'de-DE' | 'en-GB' | 'en-CA' | 'en-AU'
  decimalPrecision: 2, // 0-4 decimal places for metrics
  thousandsSeparator: true,

  // Advanced features
  enableCaching: true,
  enableDebugMode: false,
  showPerformanceMetrics: false,
  showSensitivityAnalysis: false,
  showMixOptimizer: false,
  showInsights: false,
  showReverseCalculator: false,
  showAdvancedCharts: false
};

// Settings key for localStorage
const SETTINGS_KEY = 'profitpath-settings';

// Feature gating rules based on experience level
export const FEATURE_GATES = {
  // Beginner: Only basic features
  beginner: {
    showAdvancedCalculations: false,
    showDetailedBreakdown: false,
    showComparisonTools: false,
    showExportOptions: false,
    showDebugPanel: false,
    showPerformanceMetrics: false,
    showSensitivityAnalysis: false,
    showMixOptimizer: false,
    showInsights: false,
    showReverseCalculator: false,
    showAdvancedCharts: false,
    showTooltips: true
  },

  // Intermediate: Some advanced features
  intermediate: {
    showAdvancedCalculations: true,
    showDetailedBreakdown: true,
    showComparisonTools: true,
    showExportOptions: false,
    showDebugPanel: false,
    showPerformanceMetrics: false,
    showSensitivityAnalysis: true,
    showMixOptimizer: true,
    showInsights: true,
    showReverseCalculator: true,
    showAdvancedCharts: false,
    showTooltips: true
  },

  // Advanced: All features (tooltips disabled for power users)
  advanced: {
    showAdvancedCalculations: true,
    showDetailedBreakdown: true,
    showComparisonTools: true,
    showExportOptions: true,
    showDebugPanel: true,
    showPerformanceMetrics: true,
    showSensitivityAnalysis: true,
    showMixOptimizer: true,
    showInsights: true,
    showReverseCalculator: true,
    showAdvancedCharts: true,
    showTooltips: false
  }
};

/**
 * Load user settings from localStorage
 * @returns User settings merged with defaults
 */
export function loadSettings(): import('../types').Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsedSettings };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save user settings to localStorage
 * @param settings - Settings object to save
 */
export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Dispatch custom event to notify UI of settings changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
    }
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
}

/**
 * Update a specific setting
 * @param key - Setting key
 * @param value - Setting value
 */
export function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const currentSettings = loadSettings();
  const newSettings: Settings = { ...currentSettings, [key]: value };

  // If changing experience level, apply feature gates
  if (key === 'experienceLevel' && FEATURE_GATES[value as ExperienceLevel]) {
    Object.assign(newSettings, FEATURE_GATES[value as ExperienceLevel]);
  }

  saveSettings(newSettings);
  return newSettings;
}

/**
 * Check if a feature is enabled based on current settings
 * @param featureKey - Feature key to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(featureKey: string): boolean {
  const settings = loadSettings();
  return (settings as unknown as Record<string, unknown>)[featureKey] === true;
}

/**
 * Get current experience level
 * @returns Current experience level
 */
export function getExperienceLevel(): ExperienceLevel {
  const settings = loadSettings();
  return settings.experienceLevel;
}

/**
 * Set experience level and apply appropriate feature gates
 * @param level - Experience level ('beginner' | 'intermediate' | 'advanced')
 */
function isExperienceLevel(level: string): level is ExperienceLevel {
  return Object.prototype.hasOwnProperty.call(FEATURE_GATES, level);
}

export function setExperienceLevel(level: string) {
  if (!isExperienceLevel(level)) {
    console.warn('Invalid experience level: ' + level);
    return;
  }

  const newSettings: Settings = {
    ...DEFAULT_SETTINGS,
    experienceLevel: level,
    ...FEATURE_GATES[level]
  };

  saveSettings(newSettings);
  return newSettings;
}

/**
 * Reset settings to defaults
 */
export function resetSettings() {
  saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

/**
 * Get settings summary for debugging
 * @returns Settings summary
 */
export function getSettingsSummary(): { experienceLevel: ExperienceLevel; enabledFeatures: string[]; totalSettings: number } {
  const settings = loadSettings();
  const enabledFeatures = Object.entries(settings)
    .filter(([key, value]) => value === true && key.startsWith('show'))
    .map(([key]) => key);

  return {
    experienceLevel: settings.experienceLevel,
    enabledFeatures,
    totalSettings: Object.keys(settings).length
  };
}
