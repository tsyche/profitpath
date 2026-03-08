import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadSettings,
  saveSettings,
  updateSetting,
  setExperienceLevel,
  isFeatureEnabled,
  resetSettings,
  DEFAULT_SETTINGS,
  FEATURE_GATES
} from './index.js'

describe('Settings System', () => {
  let mockStore = {};

  beforeEach(() => {
    // Clear mock store
    mockStore = {};

    // Mock localStorage to use our mock store
    const localStorageMock = {
      getItem: (key) => mockStore[key] || null,
      setItem: (key, value) => { mockStore[key] = value; },
      removeItem: (key) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; }
    };

    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    mockStore = {};
  });

  describe('loadSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      const settings = loadSettings()

      expect(settings).toEqual(DEFAULT_SETTINGS)
    })

    it('should load and merge settings from localStorage', () => {
      const storedSettings = {
        experienceLevel: 'intermediate',
        compactMode: true
      }
      localStorage.setItem('profitpath-settings', JSON.stringify(storedSettings))

      const settings = loadSettings()

      expect(settings.experienceLevel).toBe('intermediate')
      expect(settings.compactMode).toBe(true)
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme) // Should have default values
    })

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('profitpath-settings', 'invalid json');

      const settings = loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  })

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      const testSettings = { experienceLevel: 'advanced', compactMode: true }

      saveSettings(testSettings)

      const saved = localStorage.getItem('profitpath-settings')
      expect(saved).toBe(JSON.stringify(testSettings))
    })
  })

  describe('updateSetting', () => {
    it('should update a single setting', () => {
      localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'beginner' }))

      const result = updateSetting('compactMode', true)

      expect(result.compactMode).toBe(true)
      expect(result.experienceLevel).toBe('beginner')
    })
  })

  describe('setExperienceLevel', () => {
    it('should set experience level and apply feature gates', () => {
      const result = setExperienceLevel('intermediate')

      expect(result.experienceLevel).toBe('intermediate')
      expect(result.showAdvancedCalculations).toBe(true) // From FEATURE_GATES.intermediate
      expect(result.showComparisonTools).toBe(true)
      expect(result.showExportOptions).toBe(false) // Not enabled for intermediate
    })

    it('should warn for invalid experience level', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

      const result = setExperienceLevel('invalid')

      expect(consoleSpy).toHaveBeenCalledWith('Invalid experience level: invalid')
      expect(result).toBeUndefined()

      consoleSpy.mockRestore()
    })
  })

  describe('isFeatureEnabled', () => {
    it('should check if a feature is enabled', () => {
      localStorage.setItem('profitpath-settings', JSON.stringify({
        showAdvancedCalculations: true,
        showDebugPanel: false
      }))

      expect(isFeatureEnabled('showAdvancedCalculations')).toBe(true)
      expect(isFeatureEnabled('showDebugPanel')).toBe(false)
      expect(isFeatureEnabled('nonExistentFeature')).toBe(false)
    })
  })
})
