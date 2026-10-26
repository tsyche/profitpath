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
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test('no JavaScript errors', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', error => errors.push(error));
    
    await page.goto('/');
    
    // Wait a bit for any errors to surface
    await page.waitForTimeout(2000);
    
    expect(errors).toHaveLength(0);
  });

  // updateOutputs catches render errors and only console.warns them, so pageerror alone never sees a broken render
  test('no swallowed render errors on load or re-render', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', msg => { if (/updateOutputs error|render.*error/i.test(msg.text())) warnings.push(msg.text()); });

    await page.goto('/');
    await page.waitForFunction(() => typeof window.render === 'function');
    await page.evaluate(() => window.render());
    await page.waitForTimeout(500);

    expect(warnings).toEqual([]);
  });
});
