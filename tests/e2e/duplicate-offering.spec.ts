import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Duplicate offering and new-row mix', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const rows = (page: Page) => page.locator('#offeringsBody tr');
  const offerings = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((window as any).state.offerings)));

  test('Duplicate inserts a renamed copy right after the source with the same price', async ({ page }) => {
    const before = await offerings(page);
    await rows(page).first().locator('button[data-action="duplicateOffering"]').click();
    await expect(rows(page)).toHaveCount(before.length + 1);
    const after = await offerings(page);
    expect(after[1].name).toBe(before[0].name + ' (copy)');
    expect(after[1].priceMonthly).toBe(before[0].priceMonthly);
    expect(after[1].id).not.toBe(before[0].id);
    expect(after[1].currentClients).toBe(0);
  });

  test('Add offering leaves the mix total at 100 instead of dropping below it', async ({ page }) => {
    // Mid-build state: mix only sums to 40, so the new row should take the other 60
    await page.evaluate(() => {
      const w = window as any;
      w.state.offerings.forEach((o: any, i: number) => { o.mixPct = i === 0 ? 40 : 0; });
      w.render();
    });
    await page.locator('#addOfferingBtn').click();
    const list = await offerings(page);
    const total = list.reduce((s: any, o: any) => s + Number(o.mixPct), 0);
    expect(list[list.length - 1].mixPct).toBe(60);
    expect(total).toBeCloseTo(100, 1);
  });
});
