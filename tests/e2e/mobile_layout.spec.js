import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

// Mobile-viewport regressions for the layout/theme cleanups:
//  - tight header-to-content gap (no empty band under the app bar)
//  - Feedback and Help surfaces dock to the bottom like every other sheet
//  - Help dialog text respects the active (dark) theme
//  - Scenarios modal has no redundant footer "Close" button (the X handles it)
test.describe('Mobile layout & modal consistency', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('header sits close to the first content card (no large gap)', async ({ page }) => {
    const gap = await page.evaluate(() => {
      const bar = document.getElementById('appbar').getBoundingClientRect();
      const card = document.querySelector('.grid .card')?.getBoundingClientRect();
      return card ? Math.round(card.top - bar.bottom) : null;
    });
    expect(gap).not.toBeNull();
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(40); // used to be ~90px
  });

  test('Feedback modal docks to the bottom of the screen', async ({ page }) => {
    // Feedback UI initializes asynchronously; wait for it, then open it the same
    // way the app does. (Avoids the button's racy retry loop in a fast test.)
    await page.waitForFunction(() => !!window.feedbackUI, { timeout: 5000 });
    await page.evaluate(() => window.feedbackUI.openFeedbackModal());
    await page.waitForSelector('.feedback-content', { timeout: 5000 });
    // Let the entrance animation (scale 0.95 -> 1) settle before measuring geometry.
    await page.waitForTimeout(350);
    const info = await page.evaluate(() => {
      const modal = document.querySelector('.feedback-modal');
      const content = document.querySelector('.feedback-content');
      const r = content.getBoundingClientRect();
      return {
        align: getComputedStyle(modal).alignItems,
        bottomGap: Math.round(window.innerHeight - r.bottom),
        topRadius: getComputedStyle(content).borderTopLeftRadius,
      };
    });
    expect(info.align).toBe('flex-end');
    expect(info.bottomGap).toBeLessThanOrEqual(2);
    expect(parseInt(info.topRadius, 10)).toBeGreaterThan(0);
  });

  test('Help dialog docks to the bottom and uses theme-aware text in dark mode', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.evaluate(() => document.getElementById('helpBtn').click());
    await page.waitForSelector('.onboarding-dialog-card', { timeout: 5000 });
    const info = await page.evaluate(() => {
      const overlay = document.querySelector('.onboarding-dialog-overlay');
      const h2 = document.querySelector('.onboarding-dialog-card h2');
      const m = getComputedStyle(h2).color.match(/\d+/g).map(Number);
      // Relative luminance of the heading text — should be light on a dark sheet.
      const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
      return { align: getComputedStyle(overlay).alignItems, lum };
    });
    expect(info.align).toBe('flex-end');
    expect(info.lum).toBeGreaterThan(0.6);

    // Parity with the rest of the app's modals: Escape closes it.
    await page.keyboard.press('Escape');
    await expect(page.locator('.onboarding-dialog-card')).toHaveCount(0);
  });

  test('Scenarios modal has the X but no redundant footer Close button', async ({ page }) => {
    await page.evaluate(() => document.getElementById('desktopScenariosBtn').click());
    await page.waitForSelector('#scenariosModal', { timeout: 5000 });
    const info = await page.evaluate(() => {
      const modal = document.getElementById('scenariosModal');
      const footer = modal.querySelector('.modal-footer');
      const footerCloseButtons = footer
        ? [...footer.querySelectorAll('button')].filter(b => /close/i.test(b.textContent || '')).length
        : 0;
      return { hasX: !!modal.querySelector('.modal-close'), footerCloseButtons };
    });
    expect(info.hasX).toBe(true);
    expect(info.footerCloseButtons).toBe(0);
  });
});
