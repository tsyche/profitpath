import { expect, test } from '@playwright/test';
import { waitForPageReady } from './helpers';

test('selected saved scenarios travel in one link and import without replacing existing work', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('onboardingCompleted', 'true'));
  await page.goto('/');
  await waitForPageReady(page);
  await page.evaluate(() => {
    const w = window as any;
    const current = structuredClone(w.state);
    const saved = ['Today', 'Option B'].map((name, index) => ({
      id: `saved-${index}`, name, timestamp: 'now', createdAt: new Date().toISOString(),
      state: { ...current, monthlyCosts: index ? 500 : 250 }
    }));
    localStorage.setItem('profitpath-scenarios', JSON.stringify(saved));
  });
  await page.evaluate(() => (window as any).openScenarioModal());
  await expect(page.locator('.bundle-select')).toHaveCount(2);
  await page.locator('.bundle-select').first().check();
  await page.locator('.bundle-select').last().check();
  await page.locator('#shareBundleBtn').click();
  const url = await page.locator('#bundleShareUrl').inputValue();
  expect(url).toContain('?bundle=v1.');

  await page.evaluate(() => {
    localStorage.setItem('profitpath-scenarios', '[]');
    localStorage.setItem('profitpath-state', JSON.stringify({ ...((window as any).state), monthlyCosts: 999 }));
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('.modal-content', { hasText: 'Import saved scenarios' })).toBeVisible();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const result = await page.evaluate(() => ({
    scenarios: (window as any).getAllScenarios(),
    currentCost: (window as any).state.monthlyCosts
  }));
  expect(result.scenarios.map((scenario: { name: string }) => scenario.name)).toEqual(['Today', 'Option B']);
  expect(result.currentCost).toBe(999);
  expect(new URL(page.url()).searchParams.has('bundle')).toBe(false);
});

test('mobile bundle review lists every selected snapshot and supports keyboard copying', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?layout=workspaces');
  await waitForPageReady(page);
  const names = ['Baseline <img src=x onerror=alert(1)>', 'Alternative ' + 'A'.repeat(108)];
  await page.evaluate(savedNames => {
    const state = structuredClone(window.state);
    localStorage.setItem('profitpath-scenarios', JSON.stringify(savedNames.map((name, i) => ({
      id: `review-${i}`, name, timestamp: 'now', createdAt: new Date().toISOString(), state
    }))));
    window.openScenarioModal();
  }, names);
  for (const checkbox of await page.locator('.bundle-select').all()) await checkbox.check();
  await page.locator('#shareBundleBtn').click();
  const dialog = page.getByRole('dialog', { name: 'Share saved scenarios', exact: true });
  const list = dialog.getByRole('list', { name: 'Included scenarios' });
  await expect(list.getByRole('listitem')).toHaveText(names);
  await expect(list.locator('img')).toHaveCount(0);
  await expect(dialog).toContainText('Later edits require a new link.');
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  for (const item of await list.getByRole('listitem').all()) {
    const bounds = await item.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  }
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { document.body.dataset.copiedBundle = text; }
    } });
  });
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('textbox', { name: 'Scenario bundle link' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Copy link' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-copied-bundle', await page.locator('#bundleShareUrl').inputValue());
});
