import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Saving a scenario under an existing name', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]'));

  test('updates the existing scenario in place instead of adding a twin', async ({ page }) => {
    await page.evaluate(() => {
      const w = window as any;
      w.state.notes = 'first';
      w.saveScenario('My Plan');
    });
    const [original] = await saved(page);

    await page.evaluate(() => {
      const w = window as any;
      w.state.notes = 'second';
      w.saveScenario('  my plan ');
    });
    const after = await saved(page);

    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(original.id);
    expect(after[0].createdAt).toBe(original.createdAt);
    expect(after[0].state.notes).toBe('second');
  });

  test('different names still save separately', async ({ page }) => {
    await page.evaluate(() => {
      const w = window as any;
      w.saveScenario('A');
      w.saveScenario('B');
    });
    expect(await saved(page)).toHaveLength(2);
  });
});
