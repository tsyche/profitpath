import { required } from '../test/test-utils';
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
} from './index'

describe('Settings System', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    // Clear mock store
    mockStore = {};

    // Mock localStorage to use our mock store
    const localStorageMock = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, value: string) => { mockStore[key] = value; },
      removeItem: (key: string) => { delete mockStore[key]; },
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
      const testSettings = { ...DEFAULT_SETTINGS, experienceLevel: 'advanced' as const, compactMode: true }

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

      expect(required(result).experienceLevel).toBe('intermediate')
      expect(required(result).showAdvancedCalculations).toBe(true) // From FEATURE_GATES.intermediate
      expect(required(result).showComparisonTools).toBe(true)
      expect(required(result).showExportOptions).toBe(false) // Not enabled for intermediate
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
