import { test, expect } from '@playwright/test';

const isScrollLocked = (page) =>
  page.evaluate(() => document.body.classList.contains('scroll-locked'));

const lockCount = (page) =>
  page.evaluate(() => window._ppScrollLocks ?? 0);

// Simulate a vertical touch swipe and return how many pixels the page scrolled.
const touchScrollDelta = async (page, deltaY = 200) => {
  const startY = await page.evaluate(() => window.scrollY);
  await page.evaluate((dy) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const touch = (type, y) => document.dispatchEvent(
      new TouchEvent(type, { cancelable: true, bubbles: true, touches: [new Touch({ identifier: 1, target: document.body, clientX: cx, clientY: y })] })
    );
    touch('touchstart', cy);
    touch('touchmove', cy - dy);
    touch('touchend', cy - dy);
  }, deltaY);
  await page.waitForTimeout(100);
  return page.evaluate((start) => Math.abs(window.scrollY - start), startY);
};

test.describe('Background scroll lock', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* */ }
      try { localStorage.setItem('profitpath-onboarding-completed', 'true'); } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(300);
  });

  test('no scroll lock on fresh page load', async ({ page }) => {
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  // ── pp-sheet modals ──────────────────────────────────────────────────────────

  test('templates modal locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('#templatesBtn').click();
    await expect(page.locator('#templatesModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#templatesModal .pp-sheet-x').click();
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('templates modal releases scroll when scrim is clicked', async ({ page }) => {
    await page.locator('#templatesBtn').click();
    await expect(page.locator('#templatesModal')).toBeVisible();
    await page.evaluate(() => document.querySelector('#templatesModal .pp-sheet-scrim').click());
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('settings modal locks scroll on open, releases on close', async ({ page }) => {
    // #settingsCogBtn is a hidden delegate target — invoke it directly
    await page.evaluate(() => document.getElementById('settingsCogBtn').click());
    await expect(page.locator('#settingsModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#settingsModal .pp-sheet-x').click();
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('settings modal releases scroll when scrim is clicked', async ({ page }) => {
    await page.evaluate(() => document.getElementById('settingsCogBtn').click());
    await expect(page.locator('#settingsModal')).toBeVisible();
    await page.evaluate(() => document.querySelector('#settingsModal .pp-sheet-scrim').click());
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('at-a-glance modal locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('button.ab-kpis').click();
    await expect(page.locator('#glanceModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#glanceModal .pp-sheet-x').click();
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  // ── createModal (UIHelpers / scenarios) ──────────────────────────────────────

  test('scenarios modal locks scroll on open, releases on close (X button)', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Scenarios' }).click();
    await expect(page.locator('#scenariosModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#scenariosModal .modal-close').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('scenarios modal releases scroll when overlay is clicked', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Scenarios' }).click();
    await expect(page.locator('#scenariosModal')).toBeVisible();
    // Click the overlay backdrop (outside the modal card)
    await page.evaluate(() => {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        const rect = overlay.getBoundingClientRect();
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 5, clientY: rect.top + 5 }));
      }
    });
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  // ── analytics modal ───────────────────────────────────────────────────────────

  test('analytics modal locks scroll on open, releases on close', async ({ page }) => {
    await page.evaluate(() => window.profitPathAnalyticsUI?.showAnalyticsDashboard());
    await expect(page.locator('#analyticsModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#analyticsModal .modal-close').click();
    await page.waitForTimeout(400);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('analytics modal releases scroll when overlay is clicked', async ({ page }) => {
    await page.evaluate(() => window.profitPathAnalyticsUI?.showAnalyticsDashboard());
    await expect(page.locator('#analyticsModal')).toBeVisible();
    await page.evaluate(() => {
      const el = document.getElementById('analyticsModal');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  // ── feedback modal ────────────────────────────────────────────────────────────

  test('feedback modal locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Give feedback' }).click();
    await expect(page.locator('#feedbackModal')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#feedbackModal .feedback-close').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  // ── drawer ────────────────────────────────────────────────────────────────────

  test('drawer locks scroll on open, releases on close', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await expect(page.locator('#appDrawer')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    await page.locator('#drawerScrim').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  // ── onboarding / help dialogs (createOnboardingDialog) ───────────────────────

  test('help menu dialog locks scroll on open, releases on close', async ({ page }) => {
    // #helpBtn is a hidden delegate target — invoke it directly
    await page.evaluate(() => document.getElementById('helpBtn').click());
    await expect(page.locator('.onboarding-dialog-overlay')).toBeVisible();
    expect(await isScrollLocked(page)).toBe(true);

    // Close via the Close button
    await page.locator('.onboarding-dialog-overlay .dialog-btn').last().click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('help menu dialog releases scroll when scrim is clicked', async ({ page }) => {
    await page.evaluate(() => document.getElementById('helpBtn').click());
    await expect(page.locator('.onboarding-dialog-overlay')).toBeVisible();
    // Click the scrim (the overlay itself, not the card)
    await page.evaluate(() => {
      const el = document.querySelector('.onboarding-dialog-overlay');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  test('help menu item click releases scroll before next action', async ({ page }) => {
    await page.evaluate(() => document.getElementById('helpBtn').click());
    await expect(page.locator('.onboarding-dialog-overlay')).toBeVisible();
    // Click a non-tour action (tooltips toggle) — should release lock without starting tour
    await page.locator('.help-menu-btn[data-action="tooltips"]').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
  });

  // ── reference-counted lock sanity ─────────────────────────────────────────────

  test('scroll stays locked when drawer opens a modal, releases only after modal closes', async ({ page }) => {
    await page.locator('#appMenuBtn').click();
    await page.locator('#appDrawer button.drawer-item', { hasText: 'Scenarios' }).click();
    await expect(page.locator('#scenariosModal')).toBeVisible();
    // Drawer closed by ppDelegate, modal open — should still be locked at exactly 1
    expect(await isScrollLocked(page)).toBe(true);
    expect(await lockCount(page)).toBe(1);

    await page.locator('#scenariosModal .modal-close').click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
    expect(await lockCount(page)).toBe(0);
  });

  // ── mobile touch-scroll regression ───────────────────────────────────────────
  // These run Chromium-only: Firefox desktop has no TouchEvent constructor, and
  // the real target is the Android WebView (Chromium engine).

  test('touch swipe does not scroll page while settings modal is open', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'TouchEvent only on Chromium');

    // Make page tall enough to be scrollable
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.cssText = 'height: 3000px; pointer-events: none;';
      document.body.appendChild(spacer);
    });

    await page.evaluate(() => document.getElementById('settingsCogBtn').click());
    await expect(page.locator('#settingsModal')).toBeVisible();

    const delta = await touchScrollDelta(page, 300);
    expect(delta).toBe(0);

    await page.locator('#settingsModal .pp-sheet-x').click();
    await page.waitForTimeout(300);
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('touch swipe does not scroll page while analytics modal is open', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'TouchEvent only on Chromium');
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.cssText = 'height: 3000px; pointer-events: none;';
      document.body.appendChild(spacer);
    });

    await page.evaluate(() => window.profitPathAnalyticsUI?.showAnalyticsDashboard());
    await expect(page.locator('#analyticsModal')).toBeVisible();

    const delta = await touchScrollDelta(page, 300);
    expect(delta).toBe(0);

    await page.locator('#analyticsModal .modal-close').click();
    await page.waitForTimeout(400);
    expect(await isScrollLocked(page)).toBe(false);
  });

  test('touch swipe does not scroll page while help dialog is open', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'TouchEvent only on Chromium');
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.cssText = 'height: 3000px; pointer-events: none;';
      document.body.appendChild(spacer);
    });

    await page.evaluate(() => document.getElementById('helpBtn').click());
    await expect(page.locator('.onboarding-dialog-overlay')).toBeVisible();

    const delta = await touchScrollDelta(page, 300);
    expect(delta).toBe(0);

    await page.locator('.onboarding-dialog-overlay .dialog-btn').last().click();
    await page.waitForTimeout(200);
    expect(await isScrollLocked(page)).toBe(false);
  });
});
