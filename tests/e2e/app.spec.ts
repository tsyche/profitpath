import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('ProfitPath App', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check page title
    await expect(page).toHaveTitle(/ProfitPath/);

    // Check the app bar exists
    await expect(page.locator('.appbar')).toBeVisible();

    // Check that the logo image is present
    await expect(page.locator('.appbar .ab-logo img.ab-sun')).toBeVisible();
  });

  test('should render the main controls and outputs sections', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check Inputs section exists
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#controls h2')).toContainText('Inputs');

    // Check Outputs section exists
    const outputs = page.locator('aside.card h2');
    await expect(outputs.first()).toContainText('Outputs');
  });

  test('should allow basic user interaction - add offering', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Click "Add offering" button
    const addOfferingBtn = page.locator('#addOfferingBtn');
    await expect(addOfferingBtn).toBeVisible();
    await addOfferingBtn.click();

    // Check that a new row was added to the offerings table
    const offeringsTable = page.locator('#offeringsTable tbody tr');
    const count = await offeringsTable.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display KPI values in the outputs section', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Check that KPI elements are rendered
    await expect(page.locator('#kpiIncome')).toBeVisible();
    await expect(page.locator('#kpiClients')).toBeVisible();
    await expect(page.locator('#kpiRevenue')).toBeVisible();

    // All should contain some text content
    const income = await page.locator('#kpiIncome').textContent();
    const clients = await page.locator('#kpiClients').textContent();
    const revenue = await page.locator('#kpiRevenue').textContent();

    expect(income).toBeTruthy();
    expect(clients).toBeTruthy();
    expect(revenue).toBeTruthy();
  });

  test('should open the settings modal from the drawer', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Settings now lives in the menu drawer and opens as a modal
    await page.locator('#appMenuBtn').click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'Settings' }).click();

    // Check that the settings modal appears
    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#settingsMenu')).toBeVisible();
  });
});
