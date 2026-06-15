import { test, expect } from '@playwright/test';

async function setup(page, { theme = 'dark' } = {}) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('profitpath-theme', t);
      localStorage.setItem('onboardingCompleted', 'true');
    } catch { /* */ }
  }, theme);
  await page.goto('/');
  await page.waitForSelector('.appbar', { state: 'visible' });
  await page.waitForTimeout(300);
}

// #helpBtn lives in #actionSources (hidden delegate container) — trigger via evaluate
async function openHelpMenu(page) {
  await page.evaluate(() => document.getElementById('helpBtn').click());
  await page.waitForSelector('.help-menu-btn', { timeout: 3000 });
}

test.describe('Help & Onboarding', () => {
  test('Help menu opens and contains all four options including Quick Reference', async ({ page }) => {
    await setup(page);
    await openHelpMenu(page);
    const actions = await page.locator('.help-menu-btn').evaluateAll(
      (els) => els.map((el) => el.dataset.action)
    );
    expect(actions).toContain('tour');
    expect(actions).toContain('faq');
    expect(actions).toContain('industry');
    expect(actions).toContain('tooltips');
  });

  test('Quick Reference opens a modal with formula content', async ({ page }) => {
    await setup(page);
    await openHelpMenu(page);
    await page.locator('.help-menu-btn[data-action="faq"]').click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 3000 });
    const text = await modal.innerText();
    expect(text).toContain('Forecast');
    expect(text).toContain('contribution margin');
    expect(text).toContain('Break-even');
  });

  test('KPI help button for utilization opens an explanatory modal', async ({ page }) => {
    await setup(page);
    await page.locator('.kpi-help-btn[data-topic="utilization"]').click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 3000 });
    const text = await modal.innerText();
    expect(text.toLowerCase()).toContain('utilization');
    expect(text).toContain('2,080');
  });

  test('KPI help button for contribution margin opens an explanatory modal', async ({ page }) => {
    await setup(page);
    await page.locator('.kpi-help-btn[data-topic="contribution-margin"]').click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 3000 });
    const text = await modal.innerText();
    expect(text.toLowerCase()).toContain('contribution margin');
    expect(text.toLowerCase()).toContain('fixed costs');
  });

  test('KPI help button for break-even opens an explanatory modal', async ({ page }) => {
    await setup(page);
    await page.locator('.kpi-help-btn[data-topic="break-even"]').click();
    const modal = page.locator('.modal-overlay .modal-content');
    await expect(modal).toBeVisible({ timeout: 3000 });
    const text = await modal.innerText();
    expect(text.toLowerCase()).toContain('break-even');
    expect(text.toLowerCase()).toContain('fixed costs');
  });

  test('Guided tour starts and highlights the logo area', async ({ page }) => {
    await setup(page);
    await openHelpMenu(page);
    await page.locator('.help-menu-btn[data-action="tour"]').click();
    // Tour should render a tooltip/overlay
    await page.waitForSelector('.onboarding-tooltip', { timeout: 5000 });
    await expect(page.locator('.onboarding-tooltip')).toBeVisible();
    // First step title
    const title = await page.locator('.onboarding-tooltip').innerText();
    expect(title).toContain('Welcome');
  });

  test('Welcome dialog appears for new users (no onboardingCompleted)', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('onboardingCompleted');
        localStorage.setItem('profitpath-theme', 'dark');
      } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(600);
    // Should show the welcome dialog
    const welcomeDialog = page.locator('.onboarding-dialog-card');
    await expect(welcomeDialog).toBeVisible({ timeout: 5000 });
    const text = await welcomeDialog.innerText();
    expect(text).toContain('Welcome');
  });

  test('KPI help buttons are visible and themed correctly in dark mode', async ({ page }) => {
    await setup(page, { theme: 'dark' });
    const btn = page.locator('.kpi-help-btn[data-topic="utilization"]');
    await expect(btn).toBeVisible();
    // Should not be white-on-white or invisible
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    // background should not be pure white (#fff = rgb(255,255,255))
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });
});
