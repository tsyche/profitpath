import { test, expect } from '@playwright/test';

const isScrollLocked = (page) =>
  page.evaluate(() => document.body.classList.contains('scroll-locked'));

test.describe('Background scroll lock', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(300);
  });

  test('no scroll lock on fresh page load', async ({ page }) => {
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('templates modal locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('#templatesBtn').click();
    await expect(page.locator('#templatesModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#templatesModal .pp-sheet-x').click();
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('templates modal releases scroll when scrim is clicked', async ({ page }) => {
    await page.locator('#templatesBtn').click();
    await expect(page.locator('#templatesModal')).toBeVisible();
    // Scrim is behind the card — trigger its onclick directly
    await page.evaluate(() => document.querySelector('#templatesModal .pp-sheet-scrim').click());
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('scenarios modal (Modal.js) locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Scenarios' }).click();
    await expect(page.locator('#scenariosModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#scenariosModal .modal-close').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('feedback modal locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Give feedback' }).click();
    await expect(page.locator('#feedbackModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#feedbackModal .feedback-close').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('drawer locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await expect(page.locator('#appDrawer')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#drawerScrim').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('scroll stays locked when drawer opens a modal, releases only after modal closes', async ({ page }) => {
    // Open scenarios via drawer (drawer opens first, then modal)
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Scenarios' }).click();
    await expect(page.locator('#scenariosModal')).toBeVisible();
    // Drawer is closed by ppDelegate, modal is open — should still be locked
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#scenariosModal .modal-close').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
  });
});
