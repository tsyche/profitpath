import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Mix Optimizer, Advanced Charts and version display', () => {
  const open = async (page: Page) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'advanced' }));
      } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.locator('#analysisAnalyzeTab').click();
  };

  test('mix optimizer: toggle, run, and a hostile offering name stays inert text', async ({ page }) => {
    await open(page);
    await page.locator('#offeringsBody tr').first().locator('input[data-k="name"]').fill('<img src=x onerror=window.__pwned=1>');
    await page.locator('#advisorToggle').click();
    await page.locator('#mixOptimizerToggle').click();
    await expect(page.locator('#mixOptimizerToggle')).toHaveAttribute('aria-expanded', 'true');

    for (const objective of ['profit', 'utilization']) {
      await page.locator('#mixOptimizerObjective').selectOption(objective);
      await page.locator('#mixOptimizerRun').click();
      await expect(page.locator('#mixOptimizerResults tbody tr').first()).toBeVisible();
      await expect(page.locator('#mixOptimizerResults')).not.toContainText(/NaN|Infinity|undefined/);
      await expect(page.locator('#mixOptimizerResults img')).toHaveCount(0);
    }
    expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
    await expect(page.locator('#mixOptimizerResults')).toContainText('<img');
  });

  test('advanced charts: opening renders heat map, radar and funnel', async ({ page }) => {
    await open(page);
    await page.locator('#advisorToggle').click();
    await page.locator('#advancedChartsToggle').click();
    await expect(page.locator('#advancedChartsToggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#heatmapContainer .heatmap-table tbody tr').first()).toBeVisible();
    await expect(page.locator('#radarContainer .radar-svg')).toBeVisible();
    await expect(page.locator('#funnelContainer .funnel-row').first()).toBeVisible();
    await expect(page.locator('#advancedChartsPanel')).not.toContainText(/NaN|Infinity|undefined/);
  });

  test('Advisor shows four paths and opens the full tool', async ({ page }) => {
    await open(page);
    await page.locator('#advisorToggle').click();
    await expect(page.locator('#advisorSummary .advisor-item')).toHaveCount(4);
    await expect(page.locator('#advisorSummary')).toContainText('Offering mix');
    await page.locator('[data-advisor-target="insightsToggle"]').click();
    await expect(page.locator('#insightsToggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#insightsResults')).toBeVisible();
  });

  test('settings shows the app version from package.json', async ({ page }) => {
    await open(page);
    // #settingsCogBtn is a hidden delegate target, so invoke it directly
    await page.evaluate(() => document.getElementById('settingsCogBtn')!.click());
    await expect(page.locator('#appVersion')).toHaveText(/^ProfitPath v\d+\.\d+\.\d+/);
  });
});
