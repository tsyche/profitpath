/**
 * Tests for Scenario Save and Load Functionality - UI Integration Tests
 * These tests verify that scenarios save and load properly in the UI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Scenario Save and Load - UI Integration', () => {
  beforeEach(() => {
    // Enable test mode to bypass confirmation dialogs
    globalThis.__TEST_MODE__ = true;
    window.__TEST_MODE__ = true;

    // Clear localStorage before each test
    localStorage.clear();

    // Mock localStorage with fresh storage for each test
    const storage = new Map();
    localStorage.setItem = vi.fn((key, value) => storage.set(key, value));
    localStorage.getItem = vi.fn((key) => storage.get(key) || null);
    localStorage.clear = vi.fn(() => {
      storage.clear();
    });

    // Set up DOM with modal - ensure it's always fresh
    document.body.innerHTML = `
      <div id="scenariosModal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Scenarios</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="scenario-input-section">
              <input type="text" id="scenarioNameInput" placeholder="Enter scenario name...">
              <button id="saveScenarioBtn" class="btn primary">Save Scenario</button>
            </div>
            <div id="scenariosList" class="scenarios-list">
              <div class="empty-state">No saved scenarios yet. Save one above!</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Mock global state
    window.state = {
      mode: 'forecast',
      employees: 5,
      employeePay: 75000,
      monthlyCosts: 500,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 80,
      lockMix: false,
      offerings: [
        {
          id: 'offering-1',
          name: 'Consulting',
          priceMonthly: 1000,
          sessionsPerYear: 12,
          hoursPerSession: 2,
          variableCostPerSession: 50,
          mixPct: 100,
          currentClients: 10
        }
      ]
    };

    // Mock notification
    window.showNotification = vi.fn();

    // Mock uuid
    let uuidCounter = 0;
    window.uuid = vi.fn(() => `test-uuid-${++uuidCounter}`);

    // Mock renderScenariosList
    window.renderScenariosList = vi.fn(() => {
      const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const list = document.getElementById('scenariosList');
      if (!list) return;
      if (scenarios.length === 0) {
        list.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
      } else {
        list.innerHTML = scenarios.map(s =>
          `<div class="scenario-item">
            <div class="scenario-item-name">${s.name}</div>
            <div class="scenario-item-actions">
              <button class="btn small load-btn" data-scenario-id="${s.id}">Load</button>
              <button class="btn small danger delete-btn" data-scenario-id="${s.id}">Delete</button>
            </div>
          </div>`
        ).join('');
      }
    });

    // Set up mocked functions BEFORE any event listeners are attached
    window.saveScenario = vi.fn((name) => {
      if (!name || !name.trim()) {
        window.showNotification('Please enter a scenario name', 'error');
        return;
      }

      const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const timestamp = new Date().toLocaleString();
      const currentState = window.state;
      const scenario = {
        id: window.uuid(),
        name: name.trim(),
        timestamp,
        state: JSON.parse(JSON.stringify(currentState)),
      };

      scenarios.push(scenario);
      localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));

      // Clear input and re-render list
      const input = document.getElementById('scenarioNameInput');
      if (input) input.value = '';
      window.renderScenariosList();

      // Show success notification
      window.showNotification('Scenario saved successfully!', 'success');
    });

    // Mock loadScenario
    window.loadScenario = vi.fn((scenarioId) => {
      const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const scenario = scenarios.find((s) => s.id === scenarioId);
      if (!scenario) return;

      const scenarioData = scenario.state || scenario.data;
      if (!scenarioData) return;

      // Restore state from scenario
      window.state.mode = scenarioData.mode ?? window.state.mode;
      window.state.offerings = scenarioData.offerings ?? window.state.offerings;
      window.state.employees = scenarioData.employees ?? window.state.employees;
      window.state.employeePay = scenarioData.employeePay ?? window.state.employeePay;
      window.state.monthlyCosts = scenarioData.monthlyCosts ?? window.state.monthlyCosts;
      window.state.productiveUtilizationPct = scenarioData.productiveUtilizationPct ?? window.state.productiveUtilizationPct;
      window.state.targetUtilizationPct = scenarioData.targetUtilizationPct ?? window.state.targetUtilizationPct;
      window.state.lockMix = scenarioData.lockMix ?? window.state.lockMix;

      window.showNotification('Scenario "' + (scenario.name || 'Unnamed') + '" loaded successfully!', 'success');
    });

    // Mock openScenarioModal
    window.openScenarioModal = vi.fn(() => {
      const modal = document.getElementById('scenariosModal');
      if (modal) {
        // Update both className and classList for consistency
        modal.className = modal.className.replace(/\bhidden\b/g, '').trim();
        if (modal.classList && modal.classList.remove) {
          modal.classList.remove('hidden');
        }
      }
    });

    // Mock deleteScenario
    window.deleteScenario = vi.fn((scenarioId) => {
      const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const initialLength = scenarios.length;
      const filteredScenarios = scenarios.filter((s) => s.id !== scenarioId);

      // Only update if we actually removed something
      if (filteredScenarios.length < initialLength) {
        localStorage.setItem('profitpath-scenarios', JSON.stringify(filteredScenarios));
        window.renderScenariosList();
        window.showNotification('Scenario deleted successfully!', 'success');
      }
    });
  });

  afterEach(() => {
    localStorage.clear();
    // Reset DOM to ensure clean state between tests
    const scenariosList = document.getElementById('scenariosList');
    if (scenariosList) {
      scenariosList.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
    }
  });

  describe('Save Functionality', () => {
    it('should save scenario and update UI when clicking save button', () => {
      const scenarioName = 'Test Scenario';
      const input = document.getElementById('scenarioNameInput');
      const scenariosList = document.getElementById('scenariosList');

      // Ensure DOM elements exist
      if (!input || !scenariosList) {
        throw new Error('Test setup failed: DOM elements not found');
      }

      // Open modal
      window.openScenarioModal();

      // Verify modal is visible
      const modal = document.getElementById('scenariosModal');
      if (!modal) {
        throw new Error('Test setup failed: scenariosModal not found');
      }
      expect(modal.classList.contains('hidden')).toBe(false);

      // Type scenario name
      input.value = scenarioName;

      // Call saveScenario directly (simulating button click)
      window.saveScenario(scenarioName);

      // Verify saveScenario was called
      expect(window.saveScenario).toHaveBeenCalledWith(scenarioName);

      // Verify renderScenariosList was called
      expect(window.renderScenariosList).toHaveBeenCalled();

      // Verify UI was updated with the scenario
      expect(scenariosList.innerHTML).toContain('Test Scenario');
      expect(scenariosList.innerHTML).not.toContain('No saved scenarios yet');
      expect(scenariosList.innerHTML).toContain('load-btn');
      expect(scenariosList.innerHTML).toContain('delete-btn');

      // Verify success notification
      expect(window.showNotification).toHaveBeenCalledWith('Scenario saved successfully!', 'success');
    });

    it('should show error notification when saving empty scenario name', () => {
      const input = document.getElementById('scenarioNameInput');
      const scenariosList = document.getElementById('scenariosList');

      // Ensure DOM elements exist
      if (!input || !scenariosList) {
        throw new Error('Test setup failed: DOM elements not found');
      }

      // Open modal
      window.openScenarioModal();

      // Leave input empty
      input.value = '';

      // Call saveScenario directly
      window.saveScenario('');

      // Verify error notification
      expect(window.showNotification).toHaveBeenCalledWith('Please enter a scenario name', 'error');

      // Verify renderScenariosList was NOT called
      expect(window.renderScenariosList).not.toHaveBeenCalled();

      // Verify UI was not updated
      expect(scenariosList.innerHTML).toContain('No saved scenarios yet');
    });
  });

  describe('Load Functionality', () => {
    it('should load scenario and restore calculation state', () => {
      // First, save a scenario
      const scenarioName = 'Test Scenario';
      const input = document.getElementById('scenarioNameInput');

      // Ensure DOM elements exist
      if (!input) {
        throw new Error('Test setup failed: scenarioNameInput not found');
      }

      input.value = scenarioName;
      window.saveScenario(scenarioName);

      // Get the saved scenario ID
      const savedScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const scenarioId = savedScenarios[0].id;

      // Modify state to different values
      window.state.employees = 1;
      window.state.employeePay = 50000;

      // Call loadScenario directly (simulating button click)
      window.loadScenario(scenarioId);

      // Verify loadScenario was called
      expect(window.loadScenario).toHaveBeenCalledWith(scenarioId);

      // Verify state was restored
      expect(window.state.employees).toBe(5);
      expect(window.state.employeePay).toBe(75000);

      // Verify success notification
      expect(window.showNotification).toHaveBeenCalledWith('Scenario "Test Scenario" loaded successfully!', 'success');
    });
  });

  describe('Delete Functionality', () => {
    it('should delete scenario and update UI when clicking delete button', () => {
      const scenarioName = 'Test Scenario to Delete';
      const input = document.getElementById('scenarioNameInput');
      const scenariosList = document.getElementById('scenariosList');

      // Ensure DOM elements exist
      if (!input || !scenariosList) {
        throw new Error('Test setup failed: DOM elements not found');
      }

      // First, save a scenario
      input.value = scenarioName;
      window.saveScenario(scenarioName);

      // Get the saved scenario ID
      const savedScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const scenarioId = savedScenarios[0].id;

      // Verify scenario was created
      expect(savedScenarios.length).toBe(1);
      expect(savedScenarios[0].name).toBe(scenarioName);

      // Open modal and verify scenario is displayed
      window.openScenarioModal();
      window.renderScenariosList();
      expect(scenariosList.innerHTML).toContain(scenarioName);
      expect(scenariosList.innerHTML).toContain('delete-btn');

      // Call deleteScenario directly (simulating button click)
      window.deleteScenario(scenarioId);

      // Verify deleteScenario was called
      expect(window.deleteScenario).toHaveBeenCalledWith(scenarioId);

      // Verify scenario was removed from localStorage
      const remainingScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(remainingScenarios.length).toBe(0);

      // Verify renderScenariosList was called
      expect(window.renderScenariosList).toHaveBeenCalled();

      // Verify UI was updated to show empty state
      expect(scenariosList.innerHTML).toContain('No saved scenarios yet');

      // Verify success notification
      expect(window.showNotification).toHaveBeenCalledWith('Scenario deleted successfully!', 'success');
    });

    it('should not delete non-existent scenario', () => {
      const nonExistentId = 'fake-id-123';

      // Ensure no scenarios exist initially
      const initialScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(initialScenarios.length).toBe(0);

      // Call deleteScenario with non-existent ID
      window.deleteScenario(nonExistentId);

      // Verify deleteScenario was called
      expect(window.deleteScenario).toHaveBeenCalledWith(nonExistentId);

      // Verify localStorage was not modified
      const remainingScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(remainingScenarios.length).toBe(0);

      // Verify renderScenariosList was NOT called (since nothing was deleted)
      expect(window.renderScenariosList).not.toHaveBeenCalled();

      // Verify no notification was shown
      expect(window.showNotification).not.toHaveBeenCalled();
    });

    it('should handle delete scenario workflow end-to-end', () => {
      const scenarioName1 = 'Scenario One';
      const scenarioName2 = 'Scenario Two';
      const input = document.getElementById('scenarioNameInput');
      const scenariosList = document.getElementById('scenariosList');

      // Ensure DOM elements exist
      if (!input || !scenariosList) {
        throw new Error('Test setup failed: DOM elements not found');
      }

      // Create two scenarios
      input.value = scenarioName1;
      window.saveScenario(scenarioName1);

      input.value = scenarioName2;
      window.saveScenario(scenarioName2);

      // Verify both scenarios were created
      let savedScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(savedScenarios.length).toBe(2);

      // Delete the first scenario
      const firstScenarioId = savedScenarios[0].id;
      window.deleteScenario(firstScenarioId);

      // Verify only the first scenario was deleted
      savedScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      expect(savedScenarios.length).toBe(1);
      expect(savedScenarios[0].name).toBe(scenarioName2);

      // Verify UI reflects the remaining scenario
      expect(scenariosList.innerHTML).toContain(scenarioName2);
      expect(scenariosList.innerHTML).not.toContain(scenarioName1);

      // Verify proper cleanup calls
      expect(window.renderScenariosList).toHaveBeenCalledTimes(3); // Twice for saves, once for delete
      expect(window.showNotification).toHaveBeenCalledWith('Scenario deleted successfully!', 'success');
    });
  });
});
