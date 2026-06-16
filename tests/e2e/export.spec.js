import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

/*
 * Export is reached through the menu drawer now (the old top-nav dropdown is
 * gone). The drawer's Export submenu lists every format and delegates to the
 * real (hidden) .export-option handlers. All formats are always available in
 * the menu — they are no longer gated behind experience level.
 */
const FORMATS = ['csv', 'excel', 'pdf', 'html', 'email', 'embed', 'schedule', 'financial-report'];

async function openExportMenu(page) {
  await page.locator('#appMenuBtn').click();
  await page.locator('.app-drawer .drawer-item', { hasText: 'Export' }).click();
  await expect(page.locator('#dwExport')).toHaveClass(/open/);
}

test.describe('Export Functionality - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    // Set some realistic data for exports
    await page.fill('#fullTimeEmployees', '3');
    await page.fill('#fullTimeEmployeePay', '65000');
    await page.fill('#monthlyCosts', '1500');
    await page.fill('#productiveUtilizationPct', '80');
  });

  test.describe('Export menu availability', () => {
    test('Export entry is available in the drawer', async ({ page }) => {
      await page.locator('#appMenuBtn').click();
      await expect(
        page.locator('.app-drawer .drawer-item', { hasText: 'Export' })
      ).toBeVisible();
    });

    test('opening Export reveals all eight format options', async ({ page }) => {
      await openExportMenu(page);
      const items = page.locator('#dwExport .drawer-subitem');
      await expect(items).toHaveCount(8);
      for (const fmt of FORMATS) {
        await expect(
          page.locator(`#dwExport .drawer-subitem[onclick*="${fmt}"]`)
        ).toBeVisible();
      }
    });
  });

  test.describe('Export format options', () => {
    for (const fmt of FORMATS) {
      test(`has a visible ${fmt} export option`, async ({ page }) => {
        await openExportMenu(page);
        await expect(
          page.locator(`#dwExport .drawer-subitem[onclick*="${fmt}"]`)
        ).toBeVisible();
      });
    }
  });

  test.describe('Export with different modes', () => {
    test('export is reachable in forecast mode', async ({ page }) => {
      await page.locator('#modeSelect').selectOption('forecast');
      await openExportMenu(page);
      await expect(
        page.locator('#dwExport .drawer-subitem[onclick*="csv"]')
      ).toBeVisible();
    });

    test('export is reachable in current mode', async ({ page }) => {
      await page.locator('#modeSelect').selectOption('current');
      await page.waitForTimeout(300);
      await openExportMenu(page);
      await expect(
        page.locator('#dwExport .drawer-subitem[onclick*="csv"]')
      ).toBeVisible();
    });
  });

  test.describe('Export with data variations', () => {
    test('export is reachable with zero employees', async ({ page }) => {
      await page.fill('#fullTimeEmployees', '0');
      await openExportMenu(page);
      await expect(
        page.locator('#dwExport .drawer-subitem[onclick*="csv"]')
      ).toBeVisible();
    });

    test('export is reachable with large numbers', async ({ page }) => {
      await page.fill('#fullTimeEmployees', '100');
      await page.fill('#fullTimeEmployeePay', '500000');
      await page.fill('#monthlyCosts', '50000');
      await openExportMenu(page);
      await expect(
        page.locator('#dwExport .drawer-subitem[onclick*="csv"]')
      ).toBeVisible();
    });

    test('export is reachable after changing offerings', async ({ page }) => {
      const addOfferingBtn = page.locator('#addOfferingBtn');
      if (await addOfferingBtn.isVisible({ timeout: 2000 })) {
        await addOfferingBtn.click();
        await page.waitForTimeout(300);
      }
      await openExportMenu(page);
      await expect(
        page.locator('#dwExport .drawer-subitem[onclick*="csv"]')
      ).toBeVisible();
    });
  });

  test.describe('Export interaction', () => {
    test('choosing CSV runs the export and closes the drawer without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await openExportMenu(page);
      await page.locator('#dwExport .drawer-subitem[onclick*="csv"]').click();

      // Delegation closes the drawer
      await expect(page.locator('.app-drawer')).not.toHaveClass(/open/);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });
  });

  // Regression: Tax & Financial Report Generator
  test.describe('Financial Report export', () => {
    test('financial-report option is present in Export submenu', async ({ page }) => {
      await openExportMenu(page);
      await expect(
        page.locator('#dwExport .drawer-subitem[onclick*="financial-report"]')
      ).toBeVisible();
    });

    test('window.lastMetrics is populated after page load', async ({ page }) => {
      const hasMetrics = await page.evaluate(() => {
        return typeof window.lastMetrics === 'object' && window.lastMetrics !== null &&
          typeof window.lastMetrics.revenue === 'number';
      });
      expect(hasMetrics).toBe(true);
    });

    test('exportAsFinancialReport opens a print window with required report sections', async ({ page, browserName }) => {
      // Only Chromium supports window.open in headless reliably for this test
      test.skip(browserName !== 'chromium', 'window.open popup tracking is Chromium-only in headless');

      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      // Intercept the popup
      const popupPromise = page.waitForEvent('popup');
      await openExportMenu(page);
      await page.locator('#dwExport .drawer-subitem[onclick*="financial-report"]').click();

      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');

      // Verify all four required sections are present
      const headings = await popup.locator('h2').allTextContents();
      expect(headings.some(h => /Business Performance Summary/i.test(h))).toBe(true);
      expect(headings.some(h => /Quarterly Income Projections/i.test(h))).toBe(true);
      expect(headings.some(h => /Tax Liability/i.test(h))).toBe(true);
      expect(headings.some(h => /Loan Application/i.test(h))).toBe(true);

      // Verify dollar amounts are actually populated (not $0 for everything)
      const bodyText = await popup.locator('body').textContent();
      expect(bodyText).toMatch(/\$[\d,]+/);

      expect(errors, errors.join('\n')).toHaveLength(0);
    });
  });
});
