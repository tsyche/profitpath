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

test.describe('Duplicating a scenario', () => {
  test('clones state under a new name and id from the Scenarios modal', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.notes = 'baseline';
      w.saveScenario('Base');
    });

    await page.locator('#desktopScenariosBtn').click();
    await page.locator('.scenario-item', { hasText: 'Base' }).locator('.duplicate-btn').click();

    await expect(page.locator('.scenario-item', { hasText: 'Base copy' })).toBeVisible();
    const all = await page.evaluate(() => JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]'));
    expect(all.map((s) => s.name).sort()).toEqual(['Base', 'Base copy']);
    const [orig, copy] = ['Base', 'Base copy'].map((n) => all.find((s) => s.name === n));
    expect(copy.id).not.toBe(orig.id);
    expect(copy.state.notes).toBe('baseline');
  });
});
