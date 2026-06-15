import { test, expect } from '@playwright/test';

/** Open the drawer, expand the Appearance section, and select a palette. */
async function openDrawerAndSelectPalette(page, palette) {
  await page.locator('#appMenuBtn').click();
  await expect(page.locator('#appDrawer')).toBeVisible();

  const appearanceToggle = page.locator('#appDrawer button.drawer-item', { hasText: 'Appearance' });
  const isExpanded = await appearanceToggle.getAttribute('aria-expanded');
  if (isExpanded !== 'true') {
    await appearanceToggle.click();
  }
  await expect(page.locator('#dwAppearance')).toBeVisible();

  await page.locator(`#dwAppearance .palette-dot[data-palette="${palette}"]`).click();
  await page.waitForFunction(
    (p) => document.documentElement.getAttribute('data-palette') === p,
    palette
  );
}

test.describe('Color palette switcher (drawer)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(300);
  });

  test('no palette trigger in the header', async ({ page }) => {
    await expect(page.locator('#paletteTrigger')).not.toBeAttached();
    await expect(page.locator('.palette-picker')).not.toBeAttached();
  });

  test('Appearance item is visible in the drawer', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await expect(page.locator('#appDrawer')).toBeVisible();
    await expect(page.locator('#appDrawer button.drawer-item', { hasText: 'Appearance' })).toBeVisible();
  });

  test('Appearance expands five swatches then Toggle light/dark mode', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Appearance' }).click();
    await expect(page.locator('#dwAppearance')).toBeVisible();
    for (const p of ['sky', 'emerald', 'indigo', 'amber', 'rose']) {
      await expect(page.locator(`#dwAppearance .palette-dot[data-palette="${p}"]`)).toBeVisible();
    }
    await expect(page.locator('#dwAppearance button', { hasText: 'Toggle light/dark mode' })).toBeVisible();
  });

  test('Toggle light/dark mode sub-item fires theme toggle', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Appearance' }).click();
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.locator('#dwAppearance button', { hasText: 'Toggle light/dark mode' }).click();
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).not.toBe(before);
  });

  test('selecting a palette sets the data-palette attribute', async ({ page }) => {
    await openDrawerAndSelectPalette(page, 'indigo');
    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-palette'));
    expect(attr).toBe('indigo');
  });

  test('palette choice persists in localStorage', async ({ page }) => {
    await openDrawerAndSelectPalette(page, 'amber');
    const stored = await page.evaluate(() => localStorage.getItem('profitpath-palette'));
    expect(stored).toBe('amber');
  });

  test('palette persists across page reload', async ({ page }) => {
    await openDrawerAndSelectPalette(page, 'rose');
    await page.reload();
    await page.waitForTimeout(300);
    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-palette'));
    expect(attr).toBe('rose');
  });

  test('emerald is active by default on fresh load', async ({ page }) => {
    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-palette'));
    expect(attr).toBe('emerald');
  });

  test('active swatch has visible ring', async ({ page }) => {
    await openDrawerAndSelectPalette(page, 'sky');
    const dot = page.locator('#dwAppearance .palette-dot[data-palette="sky"]');
    await expect(dot).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.querySelector('#dwAppearance .palette-dot[data-palette="sky"]');
      return el && window.getComputedStyle(el).borderColor !== 'rgba(0, 0, 0, 0)';
    });
    const borderColor = await dot.evaluate(el => window.getComputedStyle(el).borderColor);
    expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
