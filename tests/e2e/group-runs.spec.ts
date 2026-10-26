import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Group runs (cost per run, break-even fill)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'intermediate' }));
      } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const row = (page: Page) => page.locator('#offeringsBody tr').first();
  const runCost = (page: Page) => page.locator('#groupRunsBody input').first();
  const breakEven = (page: Page) => page.locator('#groupRunsBody td[data-be]').first();

  test('shows a hint until a row is a group', async ({ page }) => {
    await page.locator('#groupRunsSection summary').click();
    await expect(page.locator('#groupRunsBody')).toContainText('Set an offering');
    await row(page).locator('select[data-k="type"]').selectOption('group');
    await expect(runCost(page)).toBeVisible();
  });

  test('cost per run drives break-even seats and survives reload', async ({ page }) => {
    await page.evaluate(() => {
      const s = (window as any).state;
      Object.assign(s.offerings[0], { type: 'group', priceMonthly: 100, sessionsPerYear: 10, variableCostPerSession: 0, laborPctOfPrice: 0, seats: 8, fillPct: 100 });
      (window as any).render();
    });
    await page.locator('#groupRunsSection summary').click();
    // 1200 revenue per seat a year: a 2400 run needs 2 seats
    await runCost(page).fill('2400');
    await expect(breakEven(page)).toContainText('2 of 8 seats');

    await runCost(page).fill('20000');
    await expect(breakEven(page)).toContainText('only 8');

    await runCost(page).fill('2400');
    await runCost(page).blur();
    await page.reload();
    await waitForPageReady(page);
    await page.locator('#groupRunsSection summary').click();
    await expect(runCost(page)).toHaveValue('2400');
  });

  test('cost per run raises delivery cost in Outputs', async ({ page }) => {
    await page.evaluate(() => {
      const s = (window as any).state;
      Object.assign(s.offerings[0], { type: 'group', seats: 8, fillPct: 100 });
      (window as any).render();
    });
    const cost = () => page.evaluate(() => (window as any).calc((window as any).state).variableCosts);
    const before = await cost();
    await page.locator('#groupRunsSection summary').click();
    await runCost(page).fill('1000');
    await expect.poll(cost).toBeGreaterThan(before);
  });
});
