import { test, expect } from '@playwright/test';

test.describe('ProfitPath Scenarios Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can save a scenario', async ({ page }) => {
    // Fill in some test data
    await page.fill('#employees', '3');
    await page.fill('#employeePay', '75000');
    await page.fill('#monthlyCosts', '2000');
    
    // Update first offering
    await page.fill('#offeringsBody tr:first-child input[data-k="name"]', 'Test Consulting');
    await page.fill('#offeringsBody tr:first-child input[data-k="priceMonthly"]', '1000');
    await page.fill('#offeringsBody tr:first-child input[data-k="mixPct"]', '100');

    // Open scenarios modal
    await page.click('#scenariosBtn');
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Save scenario
    await page.fill('#scenarioNameInput', 'Test Scenario');
    await page.click('#saveScenarioBtn');

    // Wait for save to complete (brief delay)
    await page.waitForTimeout(500);

    // Check if scenario appears in list
    await expect(page.locator('.scenarios-list')).toContainText('Test Scenario');
  });

  test('can load a saved scenario', async ({ page }) => {
    // First save a scenario
    await page.fill('#employees', '5');
    await page.fill('#employeePay', '80000');
    await page.click('#scenariosBtn');
    await page.fill('#scenarioNameInput', 'Load Test Scenario');
    await page.click('#saveScenarioBtn');
    await page.waitForTimeout(500);

    // Close modal
    await page.click('.modal-close');

    // Change values to different ones
    await page.fill('#employees', '1');
    await page.fill('#employeePay', '50000');

    // Reopen modal and load the scenario
    await page.click('#scenariosBtn');
    await page.click('.load-btn[data-scenario-id]');

    // Verify values were restored
    await expect(page.locator('#employees')).toHaveValue('5');
    await expect(page.locator('#employeePay')).toHaveValue('80000');
  });

  test('can delete a scenario', async ({ page }) => {
    // First save a scenario
    await page.click('#scenariosBtn');
    await page.fill('#scenarioNameInput', 'Delete Test Scenario');
    await page.click('#saveScenarioBtn');
    await page.waitForTimeout(500);

    // Delete the scenario
    await page.click('.delete-btn[data-scenario-id]');
    
    // Handle confirmation dialog (if present)
    const confirmBtn = page.locator('.modal-btn.primary').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Wait for deletion to complete
    await page.waitForTimeout(500);

    // Verify scenario is no longer in list
    await expect(page.locator('.scenarios-list')).not.toContainText('Delete Test Scenario');
  });

  test('can compare two scenarios', async ({ page }) => {
    // This test assumes we have some scenarios to compare
    // In a real scenario, you'd set up test data first
    
    await page.click('#scenariosBtn');
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Check comparison controls exist
    await expect(page.locator('#compareScenario1')).toBeVisible();
    await expect(page.locator('#compareScenario2')).toBeVisible();
    await expect(page.locator('#compareBtn')).toBeVisible();

    // If scenarios exist, test comparison
    const scenarioOptions = await page.locator('#compareScenario1 option').count();
    if (scenarioOptions > 1) {
      await page.selectOption('#compareScenario1', { index: 1 });
      await page.selectOption('#compareScenario2', { index: 2 });
      await page.click('#compareBtn');

      // Check comparison results appear
      await expect(page.locator('#comparisonResults')).toBeVisible();
    }
  });
});
