import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForPageReady } from './helpers';

// ROADMAP 32: axe-core scan of the whole app at each experience level, collapsible panels expanded.
// Fails on Critical/Serious, both themes, full rule set. Roadmap 34 re-tuned the light palette (deep status
// inks, AA-safe muted/accent, faint section/row/cell tints) so the light theme no longer skips color-contrast.
// Shrink the scan's tolerance never; grow it only with a roadmap entry saying why.

async function open(page: Page, experienceLevel: string, theme?: string) {
  await page.addInitScript(([level, t]) => {
    try {
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: level }));
      if (t) localStorage.setItem('theme', t);
    } catch { /* ignore */ }
  }, [experienceLevel, theme ?? '']);
  await page.goto('/');
  await waitForPageReady(page);
}

async function expandPanels(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLButtonElement>('button.debug-toggle[aria-expanded="false"]').forEach((b) => { if (b.offsetParent) b.click(); });
  });
  // Panels fade in; scanning mid-transition reads half-transparent text as low contrast
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
}

async function scan(page: Page, skip: string[] = []) {
  const b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules(skip);
  const { violations } = await b.analyze();
  return violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });
    for (const level of ['beginner', 'intermediate', 'advanced']) {
      test(`no critical or serious axe violations at ${level} level`, async ({ page }) => {
        await open(page, level);
        await expandPanels(page);
        expect(await scan(page)).toEqual([]);
      });
    }
  });
}

test.describe('sheets and drawer (dark theme)', () => {
  test.use({ colorScheme: 'dark' });
  for (const id of ['templatesModal', 'whatIfModal', 'glanceModal', 'settingsModal']) {
    test(`${id} has no critical or serious axe violations`, async ({ page }) => {
      await open(page, 'advanced');
      await page.evaluate((m) => (window as unknown as { ppOpenModal: (id: string) => void }).ppOpenModal(m), id);
      await expect(page.locator('#' + id)).toBeVisible();
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
      expect(await scan(page)).toEqual([]);
    });
  }

  test('open menu drawer has no critical or serious axe violations', async ({ page }) => {
    await open(page, 'advanced');
    await page.evaluate(() => (window as unknown as { openDrawer: () => void }).openDrawer());
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
    expect(await scan(page)).toEqual([]);
  });

  test('closed menu drawer is inert so keyboard users cannot tab into it', async ({ page }) => {
    await open(page, 'beginner');
    expect(await page.locator('#appDrawer').evaluate((el) => (el as HTMLElement).inert)).toBe(true);
    await page.evaluate(() => (window as unknown as { openDrawer: () => void }).openDrawer());
    expect(await page.locator('#appDrawer').evaluate((el) => (el as HTMLElement).inert)).toBe(false);
    await page.evaluate(() => (window as unknown as { closeDrawer: () => void }).closeDrawer());
    expect(await page.locator('#appDrawer').evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  });
});
