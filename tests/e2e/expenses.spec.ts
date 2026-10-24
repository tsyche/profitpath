import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Fixed expenses table', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const rows = (page) => page.locator('#expensesBody tr');
  const fixedCosts = (page) => page.evaluate(() => (window as any).calc((window as any).state).annualFixedCosts);

  test('a weekly expense adds weekly x52 to fixed costs and survives reload', async ({ page }) => {
    const before = await fixedCosts(page);
    await page.locator('#addExpenseBtn').click();
    await expect(rows(page)).toHaveCount(1);
    await rows(page).first().locator('input[data-k="amount"]').fill('100');
    await rows(page).first().locator('select[data-k="frequency"]').selectOption('weekly');
    await expect.poll(() => fixedCosts(page)).toBe(before + 5200);

    await page.reload();
    await waitForPageReady(page);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('select[data-k="frequency"]')).toHaveValue('weekly');
    expect(await fixedCosts(page)).toBe(before + 5200);
  });

  test('removing a row drops its cost', async ({ page }) => {
    const before = await fixedCosts(page);
    await page.locator('#addExpenseBtn').click();
    await rows(page).first().locator('input[data-k="amount"]').fill('50');
    await expect.poll(() => fixedCosts(page)).toBe(before + 600);
    await rows(page).first().locator('button[data-action="removeExpense"]').click();
    await expect(rows(page)).toHaveCount(0);
    expect(await fixedCosts(page)).toBe(before);
  });

  test('survives a share link', async ({ page }) => {
    await page.locator('#addExpenseBtn').click();
    await rows(page).first().locator('input[data-k="amount"]').fill('75');
    await rows(page).first().locator('select[data-k="category"]').selectOption('Insurance');
    const url = await page.evaluate(() => (window as any).encodeScenarioToURL((window as any).state));
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    await waitForPageReady(page);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('select[data-k="category"]')).toHaveValue('Insurance');
  });
});
