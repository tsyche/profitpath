import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Per-session pricing type', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    // One offering, one client, so annual revenue per client is directly readable
    await page.evaluate(() => {
      const w = window as any;
      w.state.mode = 'current';
      w.state.offerings = [{ id: 'o1', name: 'Podcast', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, laborPctOfPrice: 0, mixPct: 100, currentClients: 1 }];
      w.render();
    });
  });

  const row = (page) => page.locator('#offeringsBody tr').first();
  const revenue = (page) => page.evaluate(() => (window as any).calc((window as any).state).revenue);

  test('price per session x visits drives revenue and visits keep the per-visit price fixed', async ({ page }) => {
    await row(page).locator('select[data-k="type"]').selectOption('per-session');
    const price = row(page).locator('input[data-k="pricePerSession"]');
    await expect(price).toHaveValue('100');
    await expect(row(page).locator('input[data-k="priceMonthly"]')).toHaveCount(0);

    await price.fill('80');
    await row(page).locator('input[data-k="sessionsPerYear"]').fill('10');
    await expect.poll(() => revenue(page)).toBeCloseTo(800, 6);

    await row(page).locator('input[data-k="sessionsPerYear"]').fill('20');
    await expect(price).toHaveValue('80');
    await expect.poll(() => revenue(page)).toBeCloseTo(1600, 6);
  });

  test('switching back to subscription keeps the monthly equivalent', async ({ page }) => {
    const type = row(page).locator('select[data-k="type"]');
    await type.selectOption('per-session');
    await row(page).locator('input[data-k="pricePerSession"]').fill('60');
    await row(page).locator('input[data-k="sessionsPerYear"]').fill('12');
    await type.selectOption('subscription');
    await expect(row(page).locator('input[data-k="priceMonthly"]')).toHaveValue('60');
  });
});
