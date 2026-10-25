import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Undo / redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const edit = async (page, value: string) => {
    const f = page.locator('#fullTimeEmployees');
    await f.fill(value);
  };

  test('one Ctrl+Z undoes exactly one change', async ({ page }) => {
    await edit(page, '2');
    await edit(page, '3');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('Control+z');
    await expect(page.locator('#fullTimeEmployees')).toHaveValue('2');
  });

  test('one undo button click undoes exactly one change', async ({ page }) => {
    await edit(page, '2');
    await edit(page, '3');
    await page.locator('#undoBtn').evaluate((b: HTMLElement) => b.click());
    await expect(page.locator('#fullTimeEmployees')).toHaveValue('2');
  });
});
