import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

async function open(page: import('@playwright/test').Page, level: 'beginner' | 'intermediate') {
  await page.addInitScript((experienceLevel) => {
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel }));
  }, level);
  await page.goto('/');
  await waitForPageReady(page);
}

test.describe('Output detail tabs', () => {
  test('beginner keeps Overview uncluttered', async ({ page }) => {
    await open(page, 'beginner');
    await expect(page.locator('#analysisTabs')).toBeHidden();
    await expect(page.locator('#kpiRevenue')).toBeVisible();
  });

  test('intermediate users can switch Analyze and Customers with the keyboard', async ({ page }) => {
    await open(page, 'intermediate');
    await expect(page.locator('#analysisAnalyzeTab')).toBeVisible();
    await expect(page.locator('#analysisCustomersTab')).toBeVisible();

    await page.locator('#analysisAnalyzeTab').click();
    await expect(page.locator('#analysisAnalyzePanel')).toBeVisible();
    await expect(page.locator('#analysisCustomersPanel')).toBeHidden();

    await page.locator('#analysisAnalyzeTab').press('ArrowRight');
    await expect(page.locator('#analysisCustomersTab')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#analysisCustomersPanel')).toBeVisible();

    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#analysisCustomersPanel')).toBeVisible();
  });
});
