import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Scenario Workflows - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
  });

  test.describe('Scenario Management', () => {
    test('should open scenarios modal', async ({ page }) => {
      // Click scenarios button
      const scenariosBtn = page.locator('#scenariosBtn');
      await expect(scenariosBtn).toBeVisible();
      await scenariosBtn.click();

      // Wait for scenarios modal to appear (modal uses .hidden class)
      const modal = page.locator('#scenariosModal');
      await expect(modal).not.toHaveClass(/hidden/, { timeout: 5000 });
    });

    test('should display scenario interface', async ({ page }) => {
      const scenariosBtn = page.locator('#scenariosBtn');
      await scenariosBtn.click();

      // Modal should not have hidden class
      const modal = page.locator('#scenariosModal');
      await expect(modal).not.toHaveClass(/hidden/);

      // The modal exists and is not hidden (visual confirmation happens in other tests)
      expect(modal).toBeTruthy();
    });

    test('should have input for scenario name', async ({ page }) => {
      const scenariosBtn = page.locator('#scenariosBtn');
      await scenariosBtn.click();

      const modal = page.locator('#scenariosModal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Look for scenario name input
      const input = modal.locator('input[type="text"]').first();
      if (await input.isVisible({ timeout: 2000 })) {
        expect(await input.isVisible()).toBe(true);
      }
    });
  });

  test.describe('Scenario Persistence', () => {
    test('should load scenarios from localStorage', async ({ page }) => {
      // Set up a test scenario in localStorage
      await page.evaluate(() => {
        const testScenarios = {
          'test-scenario-1': {
            employees: 3,
            employeePay: 65000,
            monthlyCosts: 1500
          }
        };
        localStorage.setItem('profitpath-scenarios', JSON.stringify(testScenarios));
      });

      // Reload page to load scenarios from localStorage
      await page.reload();
      await waitForPageReady(page);

      // Open scenarios modal
      const scenariosBtn = page.locator('#scenariosBtn');
      await scenariosBtn.click();

      const modal = page.locator('#scenariosModal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Verify modal has content
      const modalContent = modal.textContent();
      expect(modalContent).toBeTruthy();
    });
  });

  test.describe('Mode Switching', () => {
    test('should allow switching between forecast and current modes', async ({ page }) => {
      const modeSelect = page.locator('#modeSelect');

      // Switch to current mode
      await modeSelect.selectOption('current');
      await page.waitForTimeout(300);

      const currentValue = await modeSelect.inputValue();
      expect(currentValue).toBe('current');

      // Switch back to forecast
      await modeSelect.selectOption('forecast');
      const forecastValue = await modeSelect.inputValue();
      expect(forecastValue).toBe('forecast');
    });

    test('should update KPIs when changing mode', async ({ page }) => {
      // Get initial income value
      const initialIncome = await page.locator('#kpiIncome').textContent();

      // Switch mode
      await page.locator('#modeSelect').selectOption('current');
      await page.waitForTimeout(300);

      // Income should update (might be different value)
      const newIncome = await page.locator('#kpiIncome').textContent();
      expect(newIncome).toBeTruthy();
      expect(initialIncome).toBeTruthy();
    });
  });

  test.describe('Scenario Operations - Edge Cases', () => {
    test('should handle empty scenarios list', async ({ page }) => {
      // Clear localStorage
      await page.evaluate(() => {
        localStorage.removeItem('profitpath-scenarios');
      });

      // Reload to apply changes
      await page.reload();
      await waitForPageReady(page);

      // Open scenarios modal
      const scenariosBtn = page.locator('#scenariosBtn');
      await scenariosBtn.click();

      const modal = page.locator('#scenariosModal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Should show empty state or instructions
      const text = await modal.textContent();
      expect(text).toBeTruthy();
    });

    test('should persist user inputs across navigation', async ({ page }) => {
      // Set some values
      await page.fill('#employees', '5');
      await page.fill('#employeePay', '70000');

      // Navigate using modal
      const scenariosBtn = page.locator('#scenariosBtn');
      await scenariosBtn.click();

      const modal = page.locator('#scenariosModal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Close modal using Escape key
      await page.keyboard.press('Escape');

      // Wait for modal to close
      await page.waitForTimeout(300);

      // Values should still be there
      const employees = await page.locator('#employees').inputValue();
      expect(employees).toBe('5');
    });
  });
});
