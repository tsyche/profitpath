import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Insights and Reverse Calculator panels', () => {
  const open = async (page: Page, settings: Record<string, unknown>) => {
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

  test('reverse calculator: rejects blank input, then solves all five levers', async ({ page }) => {
    await open(page, gated);
    await page.locator('#reverseToggle').click();
    await page.locator('#reverseRun').click();
    await expect(page.locator('#reverseResults')).toContainText('above zero');

    await page.locator('#reverseTarget').fill('80000');
    await page.locator('#reverseRun').click();
    await expect(page.locator('#reverseResults li')).toHaveCount(5);
    await expect(page.locator('#reverseResults li[data-strategy="combined"]')).toContainText('Raise prices');
    await expect(page.locator('#reverseResults')).not.toContainText(/NaN|Infinity|undefined/);
    await expect(page.locator('#reverseResults li[data-strategy="pricing"]')).toContainText('take-home');
  });

  test('reverse calculator: results refresh on their own when inputs change after a run', async ({ page }) => {
    await open(page, gated);
    await page.locator('#reverseToggle').click();
    await page.locator('#reverseTarget').fill('80000');
    await page.locator('#reverseRun').click();
    const pricing = page.locator('#reverseResults li[data-strategy="pricing"]');
    await expect(pricing).toContainText('take-home');
    const before = await pricing.textContent();
    await page.evaluate(() => {
      const w = window as any;
      w.state.offerings.forEach((o: any) => { o.priceMonthly = o.priceMonthly * 0.5; });
      w.render();
    });
    await expect(pricing).not.toHaveText(before as string);
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
