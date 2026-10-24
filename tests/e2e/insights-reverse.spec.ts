import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Insights and Reverse Calculator panels', () => {
  const open = async (page, settings: Record<string, unknown>) => {
    await page.addInitScript((s) => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify(s));
      } catch { /* ignore */ }
    }, settings);
    await page.goto('/');
    await waitForPageReady(page);
  };
  const gated = { experienceLevel: 'intermediate', showInsights: true, showReverseCalculator: true };

  test('hidden at beginner level', async ({ page }) => {
    await open(page, { experienceLevel: 'beginner', showInsights: false, showReverseCalculator: false });
    await expect(page.locator('#insightsToggle')).toBeHidden();
    await expect(page.locator('#reverseToggle')).toBeHidden();
  });

  test('insights panel lists alerts and what-ifs, and a hostile offering name stays inert text', async ({ page }) => {
    await open(page, gated);
    await page.locator('#offeringsBody tr').first().locator('input[data-k="name"]').fill('<img src=x onerror=window.__pwned=1>');
    await page.locator('#insightsToggle').click();

    await expect(page.locator('#insightsResults')).toContainText('What if');
    await expect(page.locator('#insightsResults tbody tr')).toHaveCount(4);
    await expect(page.locator('#insightsResults')).not.toContainText(/NaN|Infinity|undefined/);
    expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
    await expect(page.locator('#insightsResults img')).toHaveCount(0);
  });

  test('insights refresh when inputs change while open', async ({ page }) => {
    await open(page, gated);
    await page.locator('#insightsToggle').click();
    const before = await page.locator('#insightsResults').innerText();
    await page.locator('#offeringsBody tr').first().locator('input[data-k="priceMonthly"]').fill('1');
    await expect(page.locator('#insightsResults')).not.toHaveText(before);
  });

  test('reverse calculator: rejects blank input, then solves all four levers', async ({ page }) => {
    await open(page, gated);
    await page.locator('#reverseToggle').click();
    await page.locator('#reverseRun').click();
    await expect(page.locator('#reverseResults')).toContainText('above zero');

    await page.locator('#reverseTarget').fill('80000');
    await page.locator('#reverseRun').click();
    await expect(page.locator('#reverseResults li')).toHaveCount(4);
    await expect(page.locator('#reverseResults')).not.toContainText(/NaN|Infinity|undefined/);
    await expect(page.locator('#reverseResults li[data-strategy="pricing"]')).toContainText('take-home');
  });

  test('reverse calculator: an absurd target is reported as not realistic, never as Recommended', async ({ page }) => {
    await open(page, gated);
    await page.locator('#reverseToggle').click();
    await page.locator('#reverseTarget').fill('50000000');
    await page.locator('#reverseTarget').press('Enter');
    await expect(page.locator('#reverseResults')).not.toContainText('Recommended');
    await expect(page.locator('#reverseResults li[data-feasible="false"]').first()).toBeVisible();
  });
});
