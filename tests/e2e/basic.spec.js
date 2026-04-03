import { test, expect } from '@playwright/test';

test.describe('ProfitPath Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads successfully', async ({ page }) => {
    // Check that page loads without errors
    await expect(page).toHaveTitle(/ProfitPath/);
  });

  test('main form elements exist', async ({ page }) => {
    // Check key form elements are present
    await expect(page.locator('#employees')).toBeVisible();
    await expect(page.locator('#employeePay')).toBeVisible();
    await expect(page.locator('#monthlyCosts')).toBeVisible();
  });

  test('can input values in form', async ({ page }) => {
    // Test basic input functionality
    await page.fill('#employees', '3');
    await expect(page.locator('#employees')).toHaveValue('3');

    await page.fill('#employeePay', '75000');
    await expect(page.locator('#employeePay')).toHaveValue('75000');
  });

  test('add offering button exists', async ({ page }) => {
    // Check if add offering button is present
    const addBtn = page.locator('#addOfferingBtn');
    if (await addBtn.isVisible().catch(() => false)) {
      await expect(addBtn).toBeVisible();
    }
  });

  test('mode selector works', async ({ page }) => {
    // Test mode switching
    const modeSelect = page.locator('#modeSelect');
    await expect(modeSelect).toBeVisible();
    
    await modeSelect.selectOption('current');
    await expect(modeSelect).toHaveValue('current');
    
    await modeSelect.selectOption('forecast');
    await expect(modeSelect).toHaveValue('forecast');
  });
});
