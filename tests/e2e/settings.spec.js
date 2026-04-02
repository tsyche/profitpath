import { test, expect } from '@playwright/test';

test.describe('ProfitPath Settings & Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can open settings menu', async ({ page }) => {
    // Click settings cog button
    await page.click('#settingsCogBtn');
    
    // Check settings menu opens
    await expect(page.locator('.settings-dropdown')).toBeVisible();
    await expect(page.locator('.settings-dropdown')).toContainText('Experience Level');
    await expect(page.locator('.settings-dropdown')).toContainText('Preferences');
  });

  test('can change experience level', async ({ page }) => {
    // Open settings
    await page.click('#settingsCogBtn');
    
    // Change to intermediate level
    await page.click('input[name="experienceLevel"][value="intermediate"]');
    
    // Verify selection
    await expect(page.locator('input[name="experienceLevel"][value="intermediate"]')).toBeChecked();
    
    // Close and reopen to verify persistence
    await page.click('#settingsCogBtn'); // Close
    await page.click('#settingsCogBtn'); // Reopen
    
    await expect(page.locator('input[name="experienceLevel"][value="intermediate"]')).toBeChecked();
  });

  test('can toggle tooltips', async ({ page }) => {
    // Open settings
    await page.click('#settingsCogBtn');
    
    // Toggle tooltips on
    await page.check('#showTooltips');
    await expect(page.locator('#showTooltips')).toBeChecked();
    
    // Close settings
    await page.click('#settingsCogBtn');
    
    // Reopen to verify persistence
    await page.click('#settingsCogBtn');
    await expect(page.locator('#showTooltips')).toBeChecked();
  });

  test('can toggle compact mode', async ({ page }) => {
    // Open settings
    await page.click('#settingsCogBtn');
    
    // Enable compact mode
    await page.check('#compactMode');
    
    // Check body has compact mode class
    await expect(page.locator('body')).toHaveClass(/compact-mode/);
    
    // Disable compact mode
    await page.uncheck('#compactMode');
    await expect(page.locator('body')).not.toHaveClass(/compact-mode/);
  });
});
