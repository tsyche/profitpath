import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Share dialog', () => {
  test('warns that links are point-in-time snapshots', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.evaluate(() => document.getElementById('shareBtn')!.click());
    await expect(page.locator('.share-snapshot-note')).toContainText('snapshots');
    await expect(page.locator('#shareViewOnlyBtn')).toBeVisible();
  });
});
