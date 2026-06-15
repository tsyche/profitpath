import { test, expect } from '@playwright/test';

/*
 * Regression coverage for the header/menu redesign (modernize-ui).
 *
 * These tests exist because a whole class of bugs slipped through the unit
 * suite: white modals on the dark theme, gated/missing export options, the
 * mode toggle not syncing, the wordmark vanishing from the mobile drawer, and
 * uneven experience-level buttons. They're all DOM/CSS-level issues that only a
 * real browser surfaces — so they live here in Playwright.
 */

// Treat a computed background colour as "dark" when its channels are low. We
// compare the modal surface against the theme so a white-on-dark (or
// dark-on-light) modal fails loudly.
function channels(rgb) {
  const m = (rgb || '').match(/\d+(\.\d+)?/g);
  if (!m) return null;
  return { r: +m[0], g: +m[1], b: +m[2] };
}
function isDark(rgb) {
  const c = channels(rgb);
  if (!c) return false;
  return c.r + c.g + c.b < 300; // ~<100 avg per channel
}
function isLight(rgb) {
  const c = channels(rgb);
  if (!c) return false;
  return c.r + c.g + c.b > 600; // ~>200 avg per channel
}

async function setup(page, { theme = 'dark', width, height } = {}) {
  if (width && height) await page.setViewportSize({ width, height });
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('profitpath-theme', t);
      localStorage.setItem('onboardingCompleted', 'true');
    } catch { /* ignore */ }
  }, theme);
  await page.goto('/');
  await page.waitForSelector('.appbar', { state: 'visible' });
  // settle initial render
  await page.waitForTimeout(300);
}

test.describe('Header redesign — chrome', () => {
  test('logo is the original pp-logo image (not an inline placeholder)', async ({ page }) => {
    await setup(page);
    const logo = page.locator('.appbar .ab-logo img.ab-sun');
    await expect(logo).toHaveAttribute('src', /pp-logo2-final\.svg/);
  });

  test('undo/redo and theme toggle live together and stay visible (desktop)', async ({ page }) => {
    await setup(page, { width: 1280, height: 800 });
    await expect(page.locator('.ab-right #undoBtn')).toBeVisible();
    await expect(page.locator('.ab-right #redoBtn')).toBeVisible();
    await expect(page.locator('.ab-right #themeToggleBtn')).toBeVisible();
  });

  test('undo/redo and theme toggle stay visible on mobile too', async ({ page }) => {
    await setup(page, { width: 390, height: 780 });
    await expect(page.locator('.ab-right #undoBtn')).toBeVisible();
    await expect(page.locator('.ab-right #redoBtn')).toBeVisible();
    await expect(page.locator('.ab-right #themeToggleBtn')).toBeVisible();
  });

  test('mode badge toggles Forecast/Current and stays in sync with #modeSelect', async ({ page }) => {
    await setup(page);
    const badge = page.locator('#modeBadgeBtn');
    const select = page.locator('#modeSelect');

    await expect(select).toHaveValue('forecast');
    await expect(badge.locator('.ab-badge-text')).toHaveText('Forecast');

    await badge.click();
    await expect(select).toHaveValue('current');
    await expect(badge.locator('.ab-badge-text')).toHaveText('Current');

    // and the other direction: changing the dropdown updates the badge
    await select.selectOption('forecast');
    await expect(badge.locator('.ab-badge-text')).toHaveText('Forecast');
  });
});

test.describe('Header redesign — modals open & are theme-matched (dark)', () => {
  test('Scenarios modal opens dark, not white', async ({ page }) => {
    await setup(page, { theme: 'dark' });
    await page.locator('#desktopScenariosBtn').click();
    const modal = page.locator('#scenariosModal');
    await expect(modal).toBeVisible();
    const bg = await modal.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isDark(bg), `scenarios modal bg ${bg} should be dark`).toBeTruthy();
  });

  test('Templates modal opens dark and lists all six industries', async ({ page }) => {
    await setup(page, { theme: 'dark' });
    await page.locator('#templatesBtn').click();
    const card = page.locator('#templatesModal .pp-sheet-card');
    await expect(card).toBeVisible();
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isDark(bg), `templates card bg ${bg} should be dark`).toBeTruthy();
    await expect(page.locator('#templatesModal .tmpl-card')).toHaveCount(6);
  });

  test('Settings modal opens dark with equal-width experience options', async ({ page }) => {
    await setup(page, { theme: 'dark' });
    await page.locator('#appMenuBtn').click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'Settings' }).click();
    const card = page.locator('#settingsModal .pp-sheet-card');
    await expect(card).toBeVisible();
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isDark(bg), `settings card bg ${bg} should be dark`).toBeTruthy();

    const widths = await page.locator('#settingsModal .exp-card').evaluateAll(
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().width))
    );
    expect(widths.length).toBe(3);
    expect(new Set(widths).size, `experience option widths uneven: ${widths}`).toBe(1);
  });

  test('At-a-glance modal opens and shows all five metrics', async ({ page }) => {
    await setup(page, { theme: 'dark' });
    await page.locator('.ab-kpis').click();
    const modal = page.locator('#glanceModal');
    await expect(modal).toBeVisible();
    for (const id of ['glRevenue', 'glIncome', 'glClients', 'glSessions', 'glUtil']) {
      await expect(page.locator(`#${id}`)).not.toHaveText('—');
    }
  });

  test('Feedback modal opens dark, not white', async ({ page }) => {
    await setup(page, { theme: 'dark' });
    await page.locator('#appMenuBtn').click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'feedback' }).click();
    const content = page.locator('.feedback-content');
    await expect(content).toBeVisible();
    const bg = await content.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isDark(bg), `feedback content bg ${bg} should be dark`).toBeTruthy();
  });

  test('View Analytics opens the analytics dashboard (header themed dark)', async ({ page }) => {
    await setup(page, { theme: 'dark' });
    await page.locator('#appMenuBtn').click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'Settings' }).click();
    await page.locator('#settingsMenu button', { hasText: 'View Analytics' }).click();
    const header = page.locator('#analyticsModal .modal-header');
    await expect(header).toBeVisible();
    const bg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isLight(bg), `analytics header bg ${bg} should NOT be white`).toBeFalsy();
  });
});

test.describe('Header redesign — modals are theme-matched (light)', () => {
  test('Scenarios modal opens light in the light theme', async ({ page }) => {
    await setup(page, { theme: 'light' });
    await page.locator('#desktopScenariosBtn').click();
    const modal = page.locator('#scenariosModal');
    await expect(modal).toBeVisible();
    const bg = await modal.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isLight(bg), `scenarios modal bg ${bg} should be light`).toBeTruthy();
  });

  test('Templates modal opens light in the light theme', async ({ page }) => {
    await setup(page, { theme: 'light' });
    await page.locator('#templatesBtn').click();
    const card = page.locator('#templatesModal .pp-sheet-card');
    await expect(card).toBeVisible();
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isLight(bg), `templates card bg ${bg} should be light`).toBeTruthy();
  });
});

test.describe('Header redesign — export options & mobile drawer', () => {
  test('all seven export formats are present and visible (no gating in the menu)', async ({ page }) => {
    await setup(page);
    await page.locator('#appMenuBtn').click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'Export' }).click();
    const items = page.locator('#dwExport .drawer-subitem');
    await expect(items).toHaveCount(7);
    for (const fmt of ['csv', 'excel', 'pdf', 'html', 'email', 'embed', 'schedule']) {
      await expect(
        page.locator(`#dwExport .drawer-subitem[onclick*="${fmt}"]`)
      ).toBeVisible();
    }
  });

  test('mobile bottom bar exposes Scenarios, Templates, Settings, More', async ({ page }) => {
    await setup(page, { width: 390, height: 780 });
    const bar = page.locator('.bottombar');
    await expect(bar).toBeVisible();
    for (const label of ['Scenarios', 'Templates', 'Settings', 'More']) {
      await expect(bar.locator('.bb-item', { hasText: label })).toBeVisible();
    }
  });

  test('drawer keeps the ProfitPath wordmark on mobile', async ({ page }) => {
    await setup(page, { width: 390, height: 780 });
    await page.locator('#appMenuBtn').click();
    const word = page.locator('.app-drawer .ab-word');
    await expect(word).toBeVisible();
    await expect(word).toHaveText('ProfitPath');
  });

  test('mobile bottom tabs open their modal directly (Templates)', async ({ page }) => {
    await setup(page, { width: 390, height: 780 });
    await page.locator('.bottombar .bb-item', { hasText: 'Templates' }).click();
    await expect(page.locator('#templatesModal')).toBeVisible();
    // and it bottom-docks (sheet style) rather than centering
    const align = await page.locator('#templatesModal').evaluate(
      (el) => getComputedStyle(el).alignItems
    );
    expect(align).toBe('end');
  });
});

test.describe('KPI visual indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForFunction(() => !!document.getElementById('kpiCapacity'), { timeout: 5000 });
  });

  test('Utilization KPI renders an SVG ring, not plain text', async ({ page }) => {
    const info = await page.evaluate(() => {
      const v = document.getElementById('kpiCapacity');
      return {
        hasSvg: !!v.querySelector('svg'),
        hasRingWrap: !!v.querySelector('.kpi-ring-wrap'),
      };
    });
    expect(info.hasSvg).toBe(true);
    expect(info.hasRingWrap).toBe(true);
  });

  test('KPI card status classes applied (utilization and break-even)', async ({ page }) => {
    // Load a scenario with known utilization > 0
    await page.evaluate(() => {
      const s = document.getElementById('employees');
      if (s) { s.value = '2'; s.dispatchEvent(new Event('input', { bubbles: true })); }
      const c = document.getElementById('targetClients');
      if (c) { c.value = '20'; c.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(300);

    const info = await page.evaluate(() => {
      const capCard = document.getElementById('kpiCapacity')?.closest('.kpi');
      const beCard = document.getElementById('kpiBreakEvenClients')?.closest('.kpi');
      const pill = document.getElementById('kpiIncome')?.closest('.pill');
      return {
        capHasStatus: capCard ? [...capCard.classList].some(c => c.startsWith('kpi--')) : false,
        beHasStatus: beCard ? [...beCard.classList].some(c => c.startsWith('kpi--')) : false,
        pillHasStatus: pill ? [...pill.classList].some(c => c.startsWith('pill--')) : false,
        beBarExists: !!beCard?.querySelector('.kpi-be-bar'),
      };
    });
    expect(info.capHasStatus).toBe(true);
    expect(info.beHasStatus).toBe(true);
    expect(info.pillHasStatus).toBe(true);
    expect(info.beBarExists).toBe(true);
  });
});
