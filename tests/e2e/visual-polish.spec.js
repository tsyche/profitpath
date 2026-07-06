import { test, expect } from '@playwright/test';

// Regression coverage for the KPI/section-header gradient polish and the
// tightened line-height on those headings (no visible layout shift, text stays legible).
test.describe('KPI & section header visual polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/?testScenario=multi-service');
    await page.waitForTimeout(300);
  });

  test('KPI boxes carry a subtle accent-tinted gradient in dark mode', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const info = await page.evaluate(() => {
      const kpi = document.querySelector('.kpi');
      const style = getComputedStyle(kpi);
      return { backgroundImage: style.backgroundImage };
    });
    expect(info.backgroundImage).toContain('gradient');
  });

  test('KPI boxes carry the same gradient treatment in light mode', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const info = await page.evaluate(() => {
      const kpi = document.querySelector('.kpi');
      return getComputedStyle(kpi).backgroundImage;
    });
    expect(info).toContain('gradient');
  });

  test('card section headers (INPUTS/OUTPUTS) carry a gradient wash', async ({ page }) => {
    const info = await page.evaluate(() => {
      const header = document.querySelector('.card .card-h');
      return getComputedStyle(header).backgroundImage;
    });
    expect(info).toContain('gradient');
  });

  test('KPI value text stays legible against the gradient in dark mode', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    // .kpi .v has `transition: color 0.3s ease` for the value-change flash effect;
    // give it time to settle so we read the resolved color, not a mid-transition frame.
    await page.waitForTimeout(400);
    const lum = await page.evaluate(() => {
      const v = document.querySelector('.kpi .v');
      const m = getComputedStyle(v).color.match(/\d+/g).map(Number);
      return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    });
    expect(lum).toBeGreaterThan(0.5);
  });

  test('card section header heading has tightened line-height for rhythm', async ({ page }) => {
    const lineHeight = await page.evaluate(() => {
      const h2 = document.querySelector('.card .card-h h2');
      return getComputedStyle(h2).lineHeight;
    });
    // 13px font-size * 1.2 line-height = 15.6px, well under the loose 1.6 body rhythm
    expect(parseFloat(lineHeight)).toBeLessThan(18);
  });
});
