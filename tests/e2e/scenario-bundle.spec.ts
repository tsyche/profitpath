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
