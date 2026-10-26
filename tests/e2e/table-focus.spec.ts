import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

// With lockMix on, every mix keystroke re-renders the offerings table. Focus must survive that
// re-render, or a second digit can never be typed.
test.describe('Offerings table focus across re-render', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.evaluate(() => {
      const w = window as any;
      const row = (id: string, mixPct: number) => ({ id, name: id, priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, laborPctOfPrice: 0, mixPct, currentClients: 5 });
      w.state.mode = 'forecast';
      w.state.lockMix = true;
      w.state.offerings = [row('A', 50), row('B', 50)];
      w.render();
    });
  });

  test('typing a two-digit mix keeps focus in the same cell', async ({ page }) => {
    const input = page.locator('#offeringsBody tr').first().locator('input[data-k="mixPct"]');
    await input.click();
    await input.press('ControlOrMeta+a');
    await page.keyboard.type('25');
    const focused = page.locator('#offeringsBody tr').first().locator('input[data-k="mixPct"]');
    await expect(focused).toBeFocused();
    await expect(focused).toHaveValue('25');
    // The locked mix still rebalances the other rows
    await expect(page.locator('#offeringsBody tr').nth(1).locator('input[data-k="mixPct"]')).toHaveValue('75.0');
  });
});
