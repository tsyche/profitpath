import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('One-time offering type', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.mode = 'current';
      w.state.offerings = [{ id: 'o1', name: 'Gift card', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, laborPctOfPrice: 0, mixPct: 100, currentClients: 5 }];
      w.render();
    });
  });

  const row = (page: Page) => page.locator('#offeringsBody tr').first();
  const out = (page: Page) => page.evaluate(() => { const w = window as any; const r = w.calc(w.state); return { revenue: r.revenue, hours: r.serviceHours }; });

  test('price per sale x units sold drives revenue and staff hours drop to zero', async ({ page }) => {
    await row(page).locator('select[data-k="type"]').selectOption('one-time');
    await expect(row(page).locator('input[data-k="sessionsPerYear"]')).toHaveCount(0);
    await expect(row(page).locator('input[data-k="hoursPerSession"]')).toHaveCount(0);
    await row(page).locator('input[data-k="pricePerSession"]').fill('50');
    await expect.poll(() => out(page)).toEqual({ revenue: 250, hours: 0 });
  });

  test('switching back to subscription restores staff hours', async ({ page }) => {
    const type = row(page).locator('select[data-k="type"]');
    await type.selectOption('one-time');
    await type.selectOption('subscription');
    await expect(row(page).locator('input[data-k="hoursPerSession"]')).toHaveValue('1');
  });

  test('ranking table shows n/a per hour for a one-time row', async ({ page }) => {
    await row(page).locator('select[data-k="type"]').selectOption('one-time');
    await expect(page.locator('#offeringRankingBody tr').first().locator('td').nth(1)).toHaveText('n/a');
  });
});
