import { test, expect } from '@playwright/test';

test.describe('ProfitPath Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('has correct title and loads main elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/ProfitPath/);

    // Check main heading exists
    await expect(page.locator('h1')).toContainText('ProfitPath');

    // Check that main form elements are visible
    await expect(page.locator('#employees')).toBeVisible();
    await expect(page.locator('#employeePay')).toBeVisible();
    await expect(page.locator('#monthlyCosts')).toBeVisible();
  });

  test('can input business parameters', async ({ page }) => {
    // Fill in basic business parameters
    await page.fill('#employees', '3');
    await page.fill('#employeePay', '75000');
    await page.fill('#monthlyCosts', '2000');

    // Verify values were entered
    await expect(page.locator('#employees')).toHaveValue('3');
    await expect(page.locator('#employeePay')).toHaveValue('75000');
    await expect(page.locator('#monthlyCosts')).toHaveValue('2000');
  });

  test('can add and remove service offerings', async ({ page }) => {
    // Get initial count of offerings
    const initialOfferings = await page.locator('#offeringsBody tr').count();
    
    // Add a new offering
    await page.click('#addOfferingBtn');
    
    // Verify one more offering exists
    const newOfferings = await page.locator('#offeringsBody tr').count();
    expect(newOfferings).toBe(initialOfferings + 1);

    // Remove the last offering
    await page.click('#offeringsBody tr:last-child button[data-action="removeOffering"]');
    
    // Verify count is back to original
    const finalOfferings = await page.locator('#offeringsBody tr').count();
    expect(finalOfferings).toBe(initialOfferings);
  });

  test('calculates basic metrics', async ({ page }) => {
    // Fill in test data
    await page.fill('#employees', '2');
    await page.fill('#employeePay', '60000');
    await page.fill('#monthlyCosts', '1000');
    
    // Update first offering
    await page.fill('#offeringsBody tr:first-child input[data-k="name"]', 'Test Service');
    await page.fill('#offeringsBody tr:first-child input[data-k="priceMonthly"]', '500');
    await page.fill('#offeringsBody tr:first-child input[data-k="mixPct"]', '100');

    // Wait for calculations to update
    await page.waitForTimeout(500);

    // Check that metrics are displayed (not empty)
    const revenueElement = page.locator('#kpiRevenue');
    await expect(revenueElement).toBeVisible();
    await expect(revenueElement).not.toHaveText('$0');
  });

  test('can switch between forecast and current modes', async ({ page }) => {
    // Check default mode is forecast
    await expect(page.locator('#modeSelect')).toHaveValue('forecast');
    
    // Switch to current mode
    await page.selectOption('#modeSelect', 'current');
    await expect(page.locator('#modeSelect')).toHaveValue('current');
    
    // Verify target utilization field is hidden in current mode
    await expect(page.locator('#targetUtilizationPct')).toBeHidden();
    
    // Switch back to forecast mode
    await page.selectOption('#modeSelect', 'forecast');
    await expect(page.locator('#targetUtilizationPct')).toBeVisible();
  });

  test('can open scenarios modal', async ({ page }) => {
    // Click scenarios button
    await page.click('#scenariosBtn');
    
    // Check modal opens
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-content')).toContainText('Scenarios');
    
    // Close modal
    await page.click('.modal-close');
    await expect(page.locator('.modal-overlay')).toBeHidden();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu button is visible
    await expect(page.locator('#hamburgerBtn')).toBeVisible();
    
    // Open mobile menu
    await page.click('#hamburgerBtn');
    await expect(page.locator('#mobileMenuOverlay')).toBeVisible();
    
    // Check menu items are accessible
    await expect(page.locator('#mobileMenuOverlay')).toContainText('Scenarios');
  });
});
