import { test, expect } from '@playwright/test';

test.describe('ProfitPath App Tests', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ProfitPath/);
  });

  test('loads main content', async ({ page }) => {
    await page.goto('/');
    
    // Check that main elements are present
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test('no JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    
    await page.goto('/');
    
    // Wait a bit for any errors to surface
    await page.waitForTimeout(2000);
    
    expect(errors).toHaveLength(0);
  });
});
