/**
 * Tests for Scenarios Modal Dropdown Population
 * Tests that comparison dropdowns are populated correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM environment
import { JSDOM } from 'jsdom';

describe('Scenarios Modal Dropdown Population', () => {
  let dom;
  let populateComparisonDropdowns;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="scenariosModal">
            <select id="compareScenario1" class="scenario-select">
              <option value="">Select first scenario...</option>
            </select>
            <select id="compareScenario2" class="scenario-select">
              <option value="">Select second scenario...</option>
            </select>
          </div>
        </body>
      </html>
    `);
    
    global.document = dom.window.document;
    global.window = dom.window;
    
    // Clear localStorage
    localStorage.clear();
    
    // Add test scenarios
    const testScenarios = [
      {
        id: 'test1',
        name: 'Test Scenario 1',
        timestamp: '2024-01-01',
        state: { employees: 5, employeePay: 50000 }
      },
      {
        id: 'test2',
        name: 'Test Scenario 2',
        timestamp: '2024-01-02',
        state: { employees: 10, employeePay: 60000 }
      }
    ];
    localStorage.setItem('profitpath-scenarios', JSON.stringify(testScenarios));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should populate comparison dropdowns with scenarios', async () => {
    // Import the function to test
    const miscService = await import('../../assets/services/miscService.js');
    populateComparisonDropdowns = miscService.populateComparisonDropdowns;
    
    // Call the function
    populateComparisonDropdowns();
    
    // Check that dropdowns are populated
    const dropdown1 = document.getElementById('compareScenario1');
    const dropdown2 = document.getElementById('compareScenario2');
    
    expect(dropdown1).toBeTruthy();
    expect(dropdown2).toBeTruthy();
    
    // Should have placeholder + 2 scenarios = 3 options
    expect(dropdown1.options.length).toBe(3);
    expect(dropdown2.options.length).toBe(3);
    
    // Check scenario names are in dropdowns
    const optionTexts1 = Array.from(dropdown1.options).map(opt => opt.textContent);
    const optionTexts2 = Array.from(dropdown2.options).map(opt => opt.textContent);
    
    expect(optionTexts1).toContain('Test Scenario 1');
    expect(optionTexts1).toContain('Test Scenario 2');
    expect(optionTexts2).toContain('Test Scenario 1');
    expect(optionTexts2).toContain('Test Scenario 2');
  });

  it('should handle empty scenarios list', async () => {
    // Clear scenarios
    localStorage.removeItem('profitpath-scenarios');
    
    // Import the function to test
    const miscService = await import('../../assets/services/miscService.js');
    populateComparisonDropdowns = miscService.populateComparisonDropdowns;
    
    // Call the function
    populateComparisonDropdowns();
    
    // Should only have placeholder option
    const dropdown1 = document.getElementById('compareScenario1');
    const dropdown2 = document.getElementById('compareScenario2');
    
    expect(dropdown1.options.length).toBe(1);
    expect(dropdown2.options.length).toBe(1);
    expect(dropdown1.options[0].textContent).toBe('Select first scenario...');
    expect(dropdown2.options[0].textContent).toBe('Select second scenario...');
  });

  it('should find dropdowns when not initially in DOM', async () => {
    // Remove dropdowns from DOM
    const dropdown1 = document.getElementById('compareScenario1');
    const dropdown2 = document.getElementById('compareScenario2');
    dropdown1.remove();
    dropdown2.remove();
    
    // Import the function to test
    const miscService = await import('../../assets/services/miscService.js');
    populateComparisonDropdowns = miscService.populateComparisonDropdowns;
    
    // Call the function - should not crash
    expect(() => populateComparisonDropdowns()).not.toThrow();
  });
});
