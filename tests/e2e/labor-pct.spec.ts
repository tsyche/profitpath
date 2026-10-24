import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Labor % of price column', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const input = (page) => page.locator('#offeringsBody input[data-k="laborPctOfPrice"]').first();

  test('typing a percent changes variable costs and survives reload', async ({ page }) => {
    const readVar = () => page.evaluate(() => (window as any).calc((window as any).state).variableCosts);
    const before = await readVar();
    await input(page).fill('40');
    await input(page).blur();
    await expect.poll(readVar).toBeGreaterThan(before);

    await page.reload();
    await waitForPageReady(page);
    await expect(input(page)).toHaveValue('40');
  });

  test('survives a share link', async ({ page }) => {
    await input(page).fill('25');
    await input(page).blur();
    const url = await page.evaluate(() => (window as any).encodeScenarioToURL?.((window as any).state)
      ?? null);
    test.skip(!url, 'encodeScenarioToURL not exposed on window');
    await page.evaluate(() => localStorage.clear());
    await page.goto(url!);
    await waitForPageReady(page);
    await expect(input(page)).toHaveValue('25');
  });
});
