import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Market position badge', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    // Cost-free first offering at a known price so the floor is never the reason for a badge
    await page.evaluate(() => {
      const w = window as any;
      Object.assign(w.state.offerings[0], { priceMonthly: 150, variableCostPerSession: 0, laborPctOfPrice: 0, discountPct: 0 });
      w.persistState?.();
      w.render();
    });
    await page.locator('#marketSection summary').click();
  });

  const field = (page, k) => page.locator(`#marketBody input[data-k="${k}"]`).first();
  const badge = (page) => page.locator('#marketBody tr').first().locator('.market-badge');

  test('no badge until market numbers are entered, then it tracks the price live', async ({ page }) => {
    await expect(badge(page)).toHaveText('—');
    await field(page, 'marketLow').fill('100');
    await field(page, 'marketHigh').fill('200');
    await expect(badge(page).locator('[data-level="green"]')).toBeVisible();

    await field(page, 'marketHigh').fill('120');
    await expect(badge(page).locator('[data-level="red"]')).toContainText('▲');

    // editing the price in the offerings table updates the badge too
    await page.locator('#offeringsBody tr').first().locator('input[data-k="priceMonthly"]').fill('50');
    await expect(badge(page).locator('[data-level="red"]')).toContainText('▼');
  });

  test('a discount that breaks the floor turns an in-range price red, and values survive reload', async ({ page }) => {
    await field(page, 'marketLow').fill('100');
    await field(page, 'marketHigh').fill('200');
    await field(page, 'marketNote').fill('Studio X, 2026-10');
    await expect(badge(page).locator('[data-level="green"]')).toBeVisible();

    await page.locator('#offeringsBody tr').first().locator('input[data-k="discountPct"]').fill('100');
    await expect(badge(page).locator('[data-level="red"]')).toBeVisible();

    await page.reload();
    await waitForPageReady(page);
    await page.locator('#marketSection summary').click();
    await expect(field(page, 'marketLow')).toHaveValue('100');
    await expect(field(page, 'marketNote')).toHaveValue('Studio X, 2026-10');
  });

  test('clearing every market number removes the badge', async ({ page }) => {
    await field(page, 'marketLow').fill('100');
    await expect(badge(page).locator('[data-level]')).toBeVisible();
    await field(page, 'marketLow').fill('');
    await expect(badge(page)).toHaveText('—');
    expect(await page.evaluate(() => 'marketLow' in (window as any).state.offerings[0])).toBe(false);
  });
});
