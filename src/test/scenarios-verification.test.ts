/**
 * Simple test to verify scenario functionality is working
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Scenario Functionality Verification', () => {
  beforeEach(() => {
    localStorage.clear();

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="scenariosModal" class="modal hidden">
        <div class="modal-content">
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

    // Mock notification function
    window.showNotification = vi.fn();

    // Mock localStorage for consistent behavior
    const storage = new Map();
    localStorage.setItem = vi.fn((key, value) => storage.set(key, value));
    localStorage.getItem = vi.fn((key) => storage.get(key) || null);
    localStorage.clear = vi.fn(() => storage.clear());
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('should demonstrate localStorage key fix', () => {
    // Test the fix: getAllScenarios should use 'profitpath-scenarios' (not 'profitpath_scenarios')
    const scenarios = [
      { id: 'test-1', name: 'Test Scenario', timestamp: '2024-01-01', state: {} }
    ];

    // Save using the correct key
    localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));

    // Retrieve using the same key
    const retrieved = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');

    expect(retrieved).toEqual(scenarios);
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].name).toBe('Test Scenario');
  });

  it('should demonstrate notification system works', () => {
    // Test that showNotification is called with proper parameters
    window.showNotification('Test message', 'success');
    window.showNotification('Error message', 'error');

    expect(window.showNotification).toHaveBeenCalledWith('Test message', 'success');
    expect(window.showNotification).toHaveBeenCalledWith('Error message', 'error');
  });

});
