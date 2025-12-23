/**
 * User Settings & Feature Gating System
 * Manages user preferences and feature visibility for progressive disclosure
 */

// Default settings - beginner-friendly defaults
export const DEFAULT_SETTINGS = {
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

  // Advanced features
  enableCaching: true,
  enableDebugMode: false,
  showPerformanceMetrics: false
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
    showTooltips: true
  },

  // Advanced: All features
  advanced: {
    showAdvancedCalculations: true,
    showDetailedBreakdown: true,
    showComparisonTools: true,
    showExportOptions: true,
    showDebugPanel: true,
    showPerformanceMetrics: true,
    showTooltips: true
  }
};

/**
 * Load user settings from localStorage
 * @returns {Object} User settings merged with defaults
 */
export function loadSettings() {
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
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
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
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
export function updateSetting(key, value) {
  const currentSettings = loadSettings();
  const newSettings = { ...currentSettings, [key]: value };

  // If changing experience level, apply feature gates
  if (key === 'experienceLevel' && FEATURE_GATES[value]) {
    Object.assign(newSettings, FEATURE_GATES[value]);
  }

  saveSettings(newSettings);
  return newSettings;
}

/**
 * Check if a feature is enabled based on current settings
 * @param {string} featureKey - Feature key to check
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(featureKey) {
  const settings = loadSettings();
  return settings[featureKey] === true;
}

/**
 * Get current experience level
 * @returns {string} Current experience level
 */
export function getExperienceLevel() {
  const settings = loadSettings();
  return settings.experienceLevel;
}

/**
 * Set experience level and apply appropriate feature gates
 * @param {string} level - Experience level ('beginner' | 'intermediate' | 'advanced')
 */
export function setExperienceLevel(level) {
  if (!FEATURE_GATES[level]) {
    console.warn(`Invalid experience level: ${level}`);
    return;
  }

  const newSettings = {
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
 * @returns {Object} Settings summary
 */
export function getSettingsSummary() {
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
