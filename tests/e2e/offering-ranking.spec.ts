import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Offerings by profit per staff hour', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const statuses = (page) => page.locator('#offeringRankingBody td[data-status]');

  test('lists every offering and flags one priced below its delivery cost', async ({ page }) => {
    await expect(page.locator('#offeringRanking')).toBeVisible();
    const count = await page.evaluate(() => (window as any).state.offerings.length);
    await expect(page.locator('#offeringRankingBody tr')).toHaveCount(count);

    await page.evaluate(() => {
      const w = window as any;
      w.state.offerings[0].priceMonthly = 1;
      w.state.offerings[0].variableCostPerSession = 500;
      w.persistState?.();
      w.render();
    });
    await expect(statuses(page).filter({ hasText: 'Below cost' })).toHaveCount(1);
    // ranked last
    await expect(statuses(page).last()).toHaveText('Below cost');
  });
});
