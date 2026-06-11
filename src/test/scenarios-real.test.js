/**
 * Tests for Scenario Save and Load Functionality - Real Implementation Tests
 * These tests verify that scenarios actually save and load the calculation state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveScenario, loadScenario, deleteScenario } from '../../assets/services/scenarioService.js';
import { calc } from '../../src/calculations/index.js';
import { setTestMode, clearGlobalState, clearVitestState, ensureElementRemove } from './test-utils.js';

// Mock DOM elements
const mockElements = {};

beforeEach(() => {
  // Mock document.getElementById
  global.document = {
    getElementById: vi.fn((id) => mockElements[id] || null),
    createElement: vi.fn(() => ({
      style: {},
      appendChild: vi.fn(),
      remove: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn()
      },
      querySelector: vi.fn(() => null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  };

  // Mock localStorage
  const localStorageMock = {
    data: {},
    getItem: vi.fn((key) => localStorageMock.data[key] || null),
    setItem: vi.fn((key, value) => { localStorageMock.data[key] = value; }),
    removeItem: vi.fn((key) => { delete localStorageMock.data[key]; }),
    clear: vi.fn(() => { localStorageMock.data = {}; })
  };
  global.localStorage = localStorageMock;

  // Mock window
  global.window = {
    location: { origin: 'http://localhost:3000', pathname: '/' },
    open: vi.fn(),
    alert: vi.fn()
  };

  // Mock navigator
  global.navigator = {
    clipboard: {
      writeText: vi.fn().mockResolvedValue()
    }
  };

  // Create mock elements
  mockElements.scenarioNameInput = {
    value: '',
    focus: vi.fn(),
    select: vi.fn()
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

// Mock modalService to prevent toast DOM manipulation
vi.mock('../../assets/services/modalService.js', () => ({
  showToast: vi.fn(),
  showModal: vi.fn(),
  hideModal: vi.fn(),
}));

describe('Scenario Save and Load - Real Implementation', () => {
  beforeEach(() => {
    // Set up test environment
    setTestMode();
    clearGlobalState();
    clearVitestState();
    ensureElementRemove();

    // Clear localStorage completely
    localStorage.clear();
    localStorage.removeItem('profitpath-scenarios');

    // Clear DOM completely
    document.body.innerHTML = '';

    // Mock basic DOM structure
    document.body.innerHTML = `
      <input id="scenarioNameInput" />
      <div id="scenariosList"></div>
    `;

    // Mock window.state
    window.state = {
      employees: 5,
      employeePay: 50000,
      monthlyCosts: 0,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 75,
      lockMix: false,
      offerings: [
        {
          name: 'Basic Service',
          priceMonthly: 1000,
          hoursPerClient: 10
        }
      ]
    };
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.removeItem('profitpath-scenarios');
  });

  // Import after mocking
  let saveScenario, loadScenario, deleteScenario;

  beforeEach(async () => {
    const scenarioService = await import('../../assets/services/scenarioService.js');
    saveScenario = scenarioService.saveScenario;
    loadScenario = scenarioService.loadScenario;
    deleteScenario = scenarioService.deleteScenario;

    // Enable test mode to bypass confirmation dialogs
    globalThis.__TEST_MODE__ = true;
    window.__TEST_MODE__ = true;
  });

  describe('Save Functionality', () => {
    it('should save the current calculation state when clicking save button', async () => {
      const scenarioName = 'Test Scenario';
      const input = document.getElementById('scenarioNameInput');
      input.value = scenarioName;

      // Call saveScenario
      saveScenario(scenarioName);

      // Verify scenario was saved to localStorage
      const savedScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(savedScenarios).toHaveLength(1);
      expect(savedScenarios[0].name).toBe(scenarioName);

      // Verify the saved scenario contains the calculation state
      expect(savedScenarios[0].state).toBeDefined();
      expect(savedScenarios[0].state.employees).toBe(5);
      expect(savedScenarios[0].state.employeePay).toBe(50000);
      expect(savedScenarios[0].state.monthlyCosts).toBe(0);
      expect(savedScenarios[0].state.productiveUtilizationPct).toBe(80);
      expect(savedScenarios[0].state.targetUtilizationPct).toBe(75);
      expect(savedScenarios[0].state.lockMix).toBe(false);
      expect(savedScenarios[0].state.offerings).toHaveLength(1);
      expect(savedScenarios[0].state.offerings[0].name).toBe('Basic Service');
      expect(savedScenarios[0].state.offerings[0].priceMonthly).toBe(1000);
    });

    it('should save multiple scenarios with unique IDs', async () => {
      saveScenario('Scenario 1');
      saveScenario('Scenario 2');

      const savedScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(savedScenarios).toHaveLength(2);
      expect(savedScenarios[0].id).not.toBe(savedScenarios[1].id);
      expect(savedScenarios[0].name).toBe('Scenario 1');
      expect(savedScenarios[1].name).toBe('Scenario 2');
    });
  });

  describe('Load Functionality', () => {
    it('should load and restore the calculation state from a saved scenario', async () => {
      // First, save a scenario with specific state
      const scenarioName = 'Test Scenario';
      const input = document.getElementById('scenarioNameInput');
      input.value = scenarioName;

      // Modify state to specific values
      window.state.employees = 10;
      window.state.employeePay = 90000;
      window.state.monthlyCosts = 1000;
      window.state.productiveUtilizationPct = 90;
      window.state.targetUtilizationPct = 85;
      window.state.lockMix = true;
      window.state.offerings[0].name = 'Premium Consulting';
      window.state.offerings[0].priceMonthly = 2000;

      saveScenario(scenarioName);

      // Get the saved scenario ID
      const savedScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(savedScenarios).toHaveLength(1);
      const scenarioId = savedScenarios[0].id;

      // Now modify the state to different values
      window.state.employees = 1;
      window.state.employeePay = 30000;
      window.state.monthlyCosts = 500;

      // Load the saved scenario
      loadScenario(scenarioId);

      // Verify the state was restored. Legacy employees/employeePay fields are
      // mapped onto the current fullTime fields by sanitizeScenarioState.
      expect(window.state.fullTimeEmployees).toBe(10);
      expect(window.state.fullTimeEmployeePay).toBe(90000);
      expect(window.state.monthlyCosts).toBe(1000);
      expect(window.state.productiveUtilizationPct).toBe(90);
      expect(window.state.targetUtilizationPct).toBe(85);
      expect(window.state.lockMix).toBe(true);
      expect(window.state.offerings[0].name).toBe('Premium Consulting');
      expect(window.state.offerings[0].priceMonthly).toBe(2000);
    });

    it('should handle loading a non-existent scenario gracefully', async () => {
      // Should not throw when trying to load non-existent scenario
      expect(() => loadScenario('non-existent-id')).not.toThrow();
    });
  });
});
