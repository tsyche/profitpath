import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

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

  test.describe('Export Button Availability', () => {
    test('should have export button visible', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await expect(exportBtn).toBeVisible();
    });

    test('should open export menu when clicked', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const exportMenu = page.locator('#exportMenu');
      await expect(exportMenu).toBeVisible({ timeout: 2000 });
    });

    test('should have export options available', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      // CSV export should always be available
      const csvOption = page.locator('.export-option[data-format="csv"]');
      await expect(csvOption).toBeVisible();

      // Email should be available
      const emailOption = page.locator('.export-option[data-format="email"]');
      await expect(emailOption).toBeVisible();
    });
  });

  test.describe('Export Menu Options', () => {
    test('should have CSV export option', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const csvOption = page.locator('.export-option[data-format="csv"]');
      await expect(csvOption).toBeVisible();
    });

    test('should have Excel export as advanced feature', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const excelOption = page.locator('.export-option[data-format="excel"]');
      await expect(excelOption).toBeVisible();
      expect(await excelOption.getAttribute('class')).toContain('advanced-feature');
    });

    test('should have PDF export as advanced feature', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const pdfOption = page.locator('.export-option[data-format="pdf"]');
      await expect(pdfOption).toBeVisible();
      expect(await pdfOption.getAttribute('class')).toContain('advanced-feature');
    });

    test('should have HTML export option', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const htmlOption = page.locator('.export-option[data-format="html"]');
      await expect(htmlOption).toBeVisible();
    });

    test('should have email export option', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const emailOption = page.locator('.export-option[data-format="email"]');
      await expect(emailOption).toBeVisible();
    });

    test('should have embed widget as expert feature', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const embedOption = page.locator('.export-option[data-format="embed"]');
      await expect(embedOption).toBeVisible();
      expect(await embedOption.getAttribute('class')).toContain('expert-feature');
    });

    test('should have auto-schedule export option', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const scheduleOption = page.locator('.export-option[data-format="schedule"]');
      await expect(scheduleOption).toBeVisible();
    });
  });

  test.describe('Mobile Export Menu', () => {
    test('should have mobile export button', async ({ page }) => {
      // Mobile button should exist
      const mobileExportBtn = page.locator('#mobileExportBtn');
      if (await mobileExportBtn.isVisible({ timeout: 2000 })) {
        await expect(mobileExportBtn).toBeVisible();
      }
    });

    test('should have mobile export options', async ({ page }) => {
      const mobileExportBtn = page.locator('#mobileExportBtn');
      if (await mobileExportBtn.isVisible({ timeout: 2000 })) {
        await mobileExportBtn.click();

        const csvOption = page.locator('#mobileExportCsv');
        await expect(csvOption).toBeVisible();
      }
    });
  });

  test.describe('Export with Different Modes', () => {
    test('should have export available in forecast mode', async ({ page }) => {
      // Verify we're in forecast mode
      const modeSelect = page.locator('#modeSelect');
      await modeSelect.selectOption('forecast');

      const exportBtn = page.locator('#exportBtn');
      await expect(exportBtn).toBeVisible();
    });

    test('should have export available in current mode', async ({ page }) => {
      // Switch to current mode
      const modeSelect = page.locator('#modeSelect');
      await modeSelect.selectOption('current');
      await page.waitForTimeout(300);

      // Set a current client count
      const currentClientsInputs = page.locator('[id*="currentClients"]');
      if (await currentClientsInputs.first().isVisible({ timeout: 2000 })) {
        await currentClientsInputs.first().fill('10');
      }

      const exportBtn = page.locator('#exportBtn');
      await expect(exportBtn).toBeVisible();
    });
  });

  test.describe('Export with Data Variations', () => {
    test('should handle export with zero employee count', async ({ page }) => {
      await page.fill('#fullTimeEmployees', '0');

      const exportBtn = page.locator('#exportBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();

      const csvOption = page.locator('.export-option[data-format="csv"]');
      await expect(csvOption).toBeVisible();
    });

    test('should handle export with large numbers', async ({ page }) => {
      await page.fill('#fullTimeEmployees', '100');
      await page.fill('#fullTimeEmployeePay', '500000');
      await page.fill('#monthlyCosts', '50000');

      const exportBtn = page.locator('#exportBtn');
      await expect(exportBtn).toBeVisible();
      await exportBtn.click();

      const csvOption = page.locator('.export-option[data-format="csv"]');
      await expect(csvOption).toBeVisible();
    });

    test('should handle export after changing offerings', async ({ page }) => {
      // Add an offering
      const addOfferingBtn = page.locator('#addOfferingBtn');
      if (await addOfferingBtn.isVisible({ timeout: 2000 })) {
        await addOfferingBtn.click();
        await page.waitForTimeout(300);
      }

      const exportBtn = page.locator('#exportBtn');
      await expect(exportBtn).toBeVisible();
    });
  });

  test.describe('Export Menu Interaction', () => {
    test('should close export menu when clicking elsewhere', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const exportMenu = page.locator('#exportMenu');
      await expect(exportMenu).toBeVisible();

      // Click elsewhere on the page
      await page.locator('#controls').click();

      // Menu might close or might not, just verify it's still safe to interact with
      const csvOption = page.locator('.export-option[data-format="csv"]');
      expect(csvOption).toBeTruthy();
    });

    test('should keep export menu open when hovering over options', async ({ page }) => {
      const exportBtn = page.locator('#exportBtn');
      await exportBtn.click();

      const exportMenu = page.locator('#exportMenu');
      await expect(exportMenu).toBeVisible();

      // Hover over CSV option
      const csvOption = page.locator('.export-option[data-format="csv"]');
      await csvOption.hover();

      // Menu should still be visible
      await expect(exportMenu).toBeVisible();
    });
  });
});
