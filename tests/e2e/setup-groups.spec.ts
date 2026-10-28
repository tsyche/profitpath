import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

async function open(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'advanced' }));
  });
  await page.goto('/');
  await waitForPageReady(page);
}

test.describe('Setup groups', () => {
  test('uses useful defaults and persists a changed group', async ({ page }) => {
    await open(page);
    await expect(page.locator('#setupBasics')).toHaveAttribute('open', '');
    await expect(page.locator('#setupOfferings')).toHaveAttribute('open', '');
    await expect(page.locator('#setupCosts')).toHaveAttribute('open', '');
    await expect(page.locator('#setupNotes')).not.toHaveAttribute('open', '');
    await expect(page.locator('#resourcesSection')).not.toHaveAttribute('open', '');

    await page.locator('#setupNotes > summary').click();
    await expect(page.locator('#setupNotes')).toHaveAttribute('open', '');
    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#setupNotes')).toHaveAttribute('open', '');
  });

  test('opens a group containing an invalid field', async ({ page }) => {
    await open(page);
    await page.locator('#setupBasics > summary').click();
    await expect(page.locator('#setupBasics')).not.toHaveAttribute('open', '');
    await page.locator('#monthlyCosts').evaluate((input) => {
      const field = input as HTMLInputElement;
      field.setCustomValidity('Test validation error');
      field.reportValidity();
      field.setCustomValidity('');
    });
    await expect(page.locator('#setupBasics')).toHaveAttribute('open', '');
  });

  test('mobile summaries meet the 44px touch target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);
    const heights = await page.locator('.setup-group > summary').evaluateAll((summaries) =>
      summaries.map((summary) => summary.getBoundingClientRect().height)
    );
    expect(heights.every((height) => height >= 44)).toBe(true);
  });
});
