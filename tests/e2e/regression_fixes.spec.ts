import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Regression Fixes - UI & Logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('Payroll KPI should include the owner (1 employee != $0 payroll)', async ({ page }) => {
    // Set 1 employee and some pay
    await page.fill('#fullTimeEmployees', '1');
    await page.fill('#fullTimeEmployeePay', '60000');
    await page.fill('#partTimeEmployees', '0');

    // Check Annual Payroll KPI
    const payrollKpi = page.locator('#kpiPayroll');
    await expect(payrollKpi).toContainText('$60,000');
  });

  test('Per-offering Annual Profit matches the calculated margin (not a constant $0)', async ({ page }) => {
    const expected = await page.evaluate(() => Math.round(window.calc(window.state).offeringMetrics[0].margin));
    expect(expected).not.toBe(0);

    const cell = page.locator('td[data-label="Annual Profit"]').first();
    await expect(cell).toBeVisible();
    const shown = Number((await cell.innerText()).replace(/[^0-9-]/g, ''));
    expect(shown).toBe(expected);
  });

  test('Share Scenario opens a two-option share modal', async ({ page }) => {
    // Share now lives in the menu drawer
    await page.locator('#appMenuBtn').click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'Share' }).click();

    // Modal should appear with both share options
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#shareViewOnlyBtn')).toBeVisible();
    await expect(modal.locator('#shareEditableBtn')).toBeVisible();
    // View-only URL should contain &readonly=1
    const viewInput = modal.locator('.share-url-input').first();
    await expect(viewInput).toHaveValue(/readonly=1/);
  });

  test('Undo/Redo buttons should be in the badge area', async ({ page }) => {
    const undoBtn = page.locator('.undo-redo-compact #undoBtn');
    const redoBtn = page.locator('.undo-redo-compact #redoBtn');

    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();

    // Verify they are SVG-based now
    const undoSvg = undoBtn.locator('svg');
    await expect(undoSvg).toBeVisible();
  });

  async function openImportFromDrawer(page: Page) {
    await page.locator('#appMenuBtn').click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'Import CSV' }).click();
  }

  test('Import Modal should close in one click', async ({ page }) => {
    await openImportFromDrawer(page);

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 20000 });

    const closeBtn = modal.locator('.modal-close');
    await closeBtn.waitFor({ state: 'visible' });
    await closeBtn.click({ force: true });

    await expect(modal).not.toBeVisible({ timeout: 15000 });
  });

  test('Import Modal dropzone should trigger file input', async ({ page }) => {
    await openImportFromDrawer(page);

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 15000 });

    const dropZone = page.locator('#csvDropZone');
    await dropZone.waitFor({ state: 'visible' });
    await expect(dropZone).toBeVisible();

    // We can't easily verify the native file picker opening, 
    // but we can verify no console errors are thrown on click
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await dropZone.click();
    expect(errors.length).toBe(0);
  });
});
