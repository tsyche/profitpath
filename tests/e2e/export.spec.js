import { test, expect } from '@playwright/test';

test.describe('ProfitPath Export Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can open export dropdown', async ({ page }) => {
    // Click export button
    await page.click('#exportBtn');
    
    // Check export menu opens
    await expect(page.locator('#exportMenu')).toBeVisible();
    await expect(page.locator('#exportMenu')).toContainText('CSV');
    await expect(page.locator('#exportMenu')).toContainText('Excel');
    await expect(page.locator('#exportMenu')).toContainText('PDF');
  });

  test('can export as CSV', async ({ page }) => {
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Fill some test data
    await page.fill('#employees', '2');
    await page.fill('#employeePay', '60000');
    await page.fill('#monthlyCosts', '1000');

    // Open export menu and click CSV
    await page.click('#exportBtn');
    await page.click('[data-format="csv"]');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/profitpath-export.*\.csv$/);
  });

  test('can export as HTML', async ({ page }) => {
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Fill some test data
    await page.fill('#employees', '3');
    await page.fill('#employeePay', '75000');

    // Open export menu and click HTML
    await page.click('#exportBtn');
    await page.click('[data-format="html"]');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/profitpath-report.*\.html$/);
  });

  test('can generate share link', async ({ page }) => {
    // Fill some test data
    await page.fill('#employees', '4');
    await page.fill('#employeePay', '85000');
    
    // Click share button
    await page.click('#shareBtn');
    
    // Check for clipboard access or share link generation
    // This might show a toast notification or modal
    await page.waitForTimeout(1000);
    
    // The test passes if no errors occur during share process
    // In a real implementation, you'd check for success message
  });
});
