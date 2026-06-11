/**
 * Tests for Scenarios Comparison Functionality
 * Tests that scenario comparison works correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM environment
import { JSDOM } from 'jsdom';

describe('Scenarios Comparison Functionality', () => {
  let dom;
  let performComparison;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="scenariosModal">
            <select id="compareScenario1" class="scenario-select"></select>
            <select id="compareScenario2" class="scenario-select"></select>
            <div id="comparisonResults" style="display: none;">
              <div class="comparison-table-wrap">
                <table class="comparison-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th class="scenario-col">Scenario 1</th>
                      <th class="scenario-col">Scenario 2</th>
                      <th class="difference-col">Difference</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    global.document = dom.window.document;
    global.window = dom.window;
    
    // Clear localStorage
    localStorage.clear();
    
    // Add test scenarios with different values
    const testScenarios = [
      {
        id: 'scenario1',
        name: 'Scenario 1',
        timestamp: '2024-01-01',
        state: {
          employees: 5,
          employeePay: 50000,
          monthlyCosts: 1000,
          productiveUtilizationPct: 80,
          targetUtilizationPct: 75,
          lockMix: false,
          offerings: [
            { name: 'Service A', priceMonthly: 1000, hoursPerClient: 10 },
            { name: 'Service B', priceMonthly: 2000, hoursPerClient: 20 }
          ]
        }
      },
      {
        id: 'scenario2',
        name: 'Scenario 2',
        timestamp: '2024-01-02',
        state: {
          employees: 10,
          employeePay: 60000,
          monthlyCosts: 2000,
          productiveUtilizationPct: 85,
          targetUtilizationPct: 80,
          lockMix: true,
          offerings: [
            { name: 'Service A', priceMonthly: 1500, hoursPerClient: 15 },
            { name: 'Service B', priceMonthly: 2500, hoursPerClient: 25 }
          ]
        }
      }
    ];
    localStorage.setItem('profitpath-scenarios', JSON.stringify(testScenarios));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should perform comparison between two scenarios', async () => {
    // Import the function to test
    const uiHelpers = await import('../../assets/components/UIHelpers.js');
    performComparison = uiHelpers.performComparison;
    
    // Call the comparison function
    performComparison('scenario1', 'scenario2');
    
    // Check that comparison results are displayed
    const resultsDiv = document.getElementById('comparisonResults');
    expect(resultsDiv.style.display).toBe('block');
    
    // Check that comparison table has content
    const tbody = document.querySelector('.comparison-table tbody');
    expect(tbody.children.length).toBeGreaterThan(0);
    
    // Check that key metrics are compared
    const rows = Array.from(tbody.children);
    const metricNames = rows.map(row => row.cells[0].textContent);
    
    expect(metricNames).toContain('Employees');
    expect(metricNames).toContain('Employee Pay');
    expect(metricNames).toContain('Monthly Costs');
  });

  it('should show correct differences in comparison', async () => {
    // Import the function to test
    const uiHelpers = await import('../../assets/components/UIHelpers.js');
    performComparison = uiHelpers.performComparison;
    
    // Call the comparison function
    performComparison('scenario1', 'scenario2');
    
    // Get comparison rows
    const tbody = document.querySelector('.comparison-table tbody');
    const rows = Array.from(tbody.children);
    
    // Find employees row
    const employeesRow = rows.find(row => row.cells[0].textContent === 'Employees');
    expect(employeesRow).toBeTruthy();
    
    // Scenario 1 has 5, Scenario 2 has 10, difference should be +5
    expect(employeesRow.cells[1].textContent).toBe('5');
    expect(employeesRow.cells[2].textContent).toBe('10');
    expect(employeesRow.cells[3].textContent).toContain('+5');
  });

  it('should handle comparison with non-existent scenario', async () => {
    // Import the function to test
    const uiHelpers = await import('../../assets/components/UIHelpers.js');
    performComparison = uiHelpers.performComparison;
    
    // Call with non-existent scenario - should not crash
    expect(() => performComparison('scenario1', 'nonexistent')).not.toThrow();
  });

  it('should hide comparison results when no scenarios selected', async () => {
    // Import the function to test
    const uiHelpers = await import('../../assets/components/UIHelpers.js');
    performComparison = uiHelpers.performComparison;
    
    // Initially hidden
    const resultsDiv = document.getElementById('comparisonResults');
    expect(resultsDiv.style.display).toBe('none');
    
    // Call with empty scenario IDs
    performComparison('', '');
    
    // Should remain hidden
    expect(resultsDiv.style.display).toBe('none');
  });
});
