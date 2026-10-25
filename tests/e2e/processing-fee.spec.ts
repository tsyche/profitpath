import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Processing fee input', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('typing a percent raises variable costs and survives reload', async ({ page }) => {
    const readVar = () => page.evaluate(() => (window as any).calc((window as any).state).variableCosts);
    const before = await readVar();
    await page.fill('#processingFeePct', '3');
    await page.locator('#processingFeePct').blur();
    await expect.poll(readVar).toBeGreaterThan(before);

    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#processingFeePct')).toHaveValue('3');
  });
});
