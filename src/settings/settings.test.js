import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

beforeEach(() => {
  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  // Reset mocks
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})

afterEach(() => {
  // Clean up after each test
  vi.restoreAllMocks()
})

describe('Settings System', () => {
  describe('loadSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const settings = loadSettings()

      expect(settings).toEqual(DEFAULT_SETTINGS)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('profitpath-settings')
    })

    it('should load and merge settings from localStorage', () => {
      const storedSettings = {
        experienceLevel: 'intermediate',
        compactMode: true
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings))

      const settings = loadSettings()

      expect(settings.experienceLevel).toBe('intermediate')
      expect(settings.compactMode).toBe(true)
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme) // Should have default values
    })

    it('should handle invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const settings = loadSettings()

      expect(settings).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      const testSettings = { experienceLevel: 'advanced', compactMode: true }

      saveSettings(testSettings)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'profitpath-settings',
        JSON.stringify(testSettings)
      )
    })
  })

  describe('updateSetting', () => {
    it('should update a single setting', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ experienceLevel: 'beginner' }))

      const result = updateSetting('compactMode', true)

      expect(result.compactMode).toBe(true)
      expect(result.experienceLevel).toBe('beginner')
      expect(localStorageMock.setItem).toHaveBeenCalled()
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
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = setExperienceLevel('invalid')

      expect(consoleSpy).toHaveBeenCalledWith('Invalid experience level: invalid')
      expect(result).toBeUndefined()

      consoleSpy.mockRestore()
    })
  })

  describe('isFeatureEnabled', () => {
    it('should check if a feature is enabled', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        showAdvancedCalculations: true,
        showDebugPanel: false
      }))

      expect(isFeatureEnabled('showAdvancedCalculations')).toBe(true)
      expect(isFeatureEnabled('showDebugPanel')).toBe(false)
      expect(isFeatureEnabled('nonExistentFeature')).toBe(false)
    })
  })

  describe('Feature Gates', () => {
    it('should have correct feature gates for each experience level', () => {
      expect(FEATURE_GATES.beginner.showAdvancedCalculations).toBe(false)
      expect(FEATURE_GATES.beginner.showComparisonTools).toBe(false)

      expect(FEATURE_GATES.intermediate.showAdvancedCalculations).toBe(true)
      expect(FEATURE_GATES.intermediate.showExportOptions).toBe(false)

      expect(FEATURE_GATES.advanced.showDebugPanel).toBe(true)
      expect(FEATURE_GATES.advanced.showExportOptions).toBe(true)
    })
  })

  describe('Default Settings', () => {
    it('should have beginner as default experience level', () => {
      expect(DEFAULT_SETTINGS.experienceLevel).toBe('beginner')
    })

    it('should have most features disabled by default', () => {
      expect(DEFAULT_SETTINGS.showAdvancedCalculations).toBe(false)
      expect(DEFAULT_SETTINGS.showDebugPanel).toBe(false)
    })
  })
})
