import { test, expect, type Page } from '@playwright/test';
import { fitnessFixture } from '../../assets/prototypes/fixtures';

async function ready(page: Page, workspace: boolean) {
  await page.waitForFunction(() => Boolean(window.lastMetrics));
  if (workspace) await expect(page.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
  else await expect(page.locator('body')).not.toHaveClass(/workspace-layout/);
}

for (const layout of ['legacy', 'workspaces']) {
  test(`${layout} reloads, edits and switches layouts offline with the production service worker`, async ({ page, context }) => {
    await page.addInitScript(model => {
      if (!localStorage.getItem('profitpath-state')) localStorage.setItem('profitpath-state', JSON.stringify(model));
      localStorage.setItem('profitpath-onboarding-completed', 'true');
    }, fitnessFixture());
    await page.goto('/?layout=' + layout);
    await ready(page, layout === 'workspaces');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      }
    });
    // Warm hashed assets under the controlling worker before disconnecting.
    await page.reload();
    await ready(page, layout === 'workspaces');
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.evaluate(async () => {
      const cache = await caches.open('profitpath-v0.8.0-beta');
      const urls = (await cache.keys()).map(request => request.url);
      return ['.js', '.css'].every(extension => urls.some(url => url.endsWith(extension)));
    })).toBe(true);
    const before = await page.evaluate(() => window.calc(window.state).income);
    await context.setOffline(true);
    await page.reload();
    await ready(page, layout === 'workspaces');
    // Firefox may reuse its font cache without a worker fetch. Verify the font
    // still loads offline instead of requiring it in a particular cache.
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() =>
      [...document.fonts].some(font => font.family.includes('Inter var') && font.status === 'loaded')
    )).toBe(true);
    expect(await page.evaluate(() => window.calc(window.state).income)).toBeCloseTo(before, 8);
    if (layout === 'workspaces') {
      await page.getByRole('navigation', { name: 'Model sections' }).getByRole('link', { name: 'Costs', exact: true }).click();
    }
    await page.locator('#monthlyCosts').fill('1500');
    const edited = await page.evaluate(() => window.calc(window.state).income);
    expect(edited).not.toBe(before);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.locator('.app-drawer .drawer-item', { hasText: 'Settings' }).click();
    const target = layout === 'legacy' ? 'workspaces' : 'legacy';
    await page.getByRole('dialog', { name: 'Settings', exact: true }).getByLabel('Layout', { exact: true }).selectOption(target);
    await page.waitForURL(url => url.searchParams.get('layout') === target);
    await ready(page, target === 'workspaces');
    expect(await page.evaluate(() => window.calc(window.state).income)).toBeCloseTo(edited, 8);
    await page.reload();
    await ready(page, target === 'workspaces');
    expect(await page.evaluate(() => window.state.monthlyCosts)).toBe(1500);
    // Decision calculation, selection and sharing also stay available without a network.
    await page.evaluate(() => {
      localStorage.setItem('profitpath-scenarios', JSON.stringify([0, 1].map(i => ({
        id: 'offline-' + i, name: i ? 'Alternative' : 'Baseline', timestamp: '', createdAt: '',
        state: { ...window.state, monthlyCosts: 100 + i * 100 }
      }))));
      window.openScenarioModal();
    });
    await page.locator('#decisionWorkbenchBtn').click();
    const picker = page.getByRole('dialog', { name: 'Choose decision options' });
    for (const checkbox of await picker.getByRole('checkbox').all()) await checkbox.check();
    await picker.getByRole('button', { name: 'Open workbench' }).click();
    await expect(page.locator('.decision-verdict')).toContainText('Baseline');
    await page.locator('#decisionShare').click();
    await expect(page.locator('#decisionShareURL')).toHaveValue(/decision=1/);
  });
}
