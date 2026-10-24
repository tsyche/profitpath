import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Group offerings', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const row = (page) => page.locator('#offeringsBody tr').first();
  const typeSelect = (page) => row(page).locator('select[data-k="type"]');
  const seats = (page) => row(page).locator('input[data-k="seats"]');
  const fill = (page) => row(page).locator('input[data-k="fillPct"]');

  test('seats and fill only appear once the row is a group', async ({ page }) => {
    await expect(seats(page)).toHaveCount(0);
    await typeSelect(page).selectOption('group');
    await expect(seats(page)).toBeVisible();
  });

  test('group type, seats and fill survive reload; fill hides in current mode', async ({ page }) => {
    await typeSelect(page).selectOption('group');
    await seats(page).fill('8');
    await seats(page).blur();
    await fill(page).fill('50');
    await fill(page).blur();

    await page.reload();
    await waitForPageReady(page);
    await expect(typeSelect(page)).toHaveValue('group');
    await expect(seats(page)).toHaveValue('8');
    await expect(fill(page)).toHaveValue('50');

    await page.evaluate(() => {
      (window as any).state.mode = 'current';
      (window as any).render?.();
    });
    await expect.poll(() => fill(page).count()).toBe(0);
  });

  test('under-filled forecast class lowers client capacity', async ({ page }) => {
    await typeSelect(page).selectOption('group');
    await seats(page).fill('10');
    await seats(page).blur();
    const clients = () => page.evaluate(() => (window as any).calc((window as any).state).clients);
    await fill(page).fill('100');
    await fill(page).blur();
    const full = await clients();
    await fill(page).fill('50');
    await fill(page).blur();
    await expect.poll(clients).toBeLessThan(full);
  });
});
