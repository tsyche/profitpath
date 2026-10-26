import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Mix % entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.mode = 'forecast';
      w.state.lockMix = false;
      w.state.offerings = [{ id: 'o1', name: 'Plan', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, laborPctOfPrice: 0, mixPct: 50, currentClients: 5 }];
      w.render();
    });
  });

  const mixOf = (page: Page) => page.evaluate(() => (window as any).state.offerings[0].mixPct);

  for (const [typed, stored] of [['150', 100], ['-5', 0]] as const) {
    test(`typing ${typed} stores ${stored}`, async ({ page }) => {
      await page.locator('#offeringsBody tr').first().locator('input[data-k="mixPct"]').fill(typed);
      await expect.poll(() => mixOf(page)).toBe(stored);
    });
  }
});
