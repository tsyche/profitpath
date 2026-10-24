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

test.describe('Best-case discount', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('offerings table has a header cell for every data cell', async ({ page }) => {
    const heads = await page.locator('#offeringsTable thead th').count();
    const cells = await page.locator('#offeringsBody tr').first().locator('td').count();
    expect(heads).toBe(cells);
  });

  test('a deep discount flips the floor flag live, never moves revenue, and survives reload', async ({ page }) => {
    const row = page.locator('#offeringsBody tr').first();
    const flag = page.locator('#offeringRankingBody td[data-status]');
    const rev = () => row.locator('td[data-label="Annual Revenue"]').textContent();
    // Zero out the cost side so headroom is exactly 100% and the flag starts OK
    await page.evaluate(() => {
      const w = window as any;
      Object.assign(w.state.offerings[0], { variableCostPerSession: 0, laborPctOfPrice: 0 });
      w.state.offerings.slice(1).forEach((o) => Object.assign(o, { variableCostPerSession: 0, laborPctOfPrice: 0 }));
      w.persistState?.();
      w.render();
    });
    const before = await rev();
    await row.locator('input[data-k="discountPct"]').fill('100');
    await expect(flag.filter({ hasText: 'Below cost' })).toHaveCount(1);
    await expect(page.locator('#offeringRankingBody')).toContainText('100.0% off');
    expect(await rev()).toBe(before);

    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#offeringsBody tr').first().locator('input[data-k="discountPct"]')).toHaveValue('100');
  });
});
