import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Header KPIs stay in sync with Outputs (roadmap 12i)', () => {
  test('after a rapid batch of typed edits across many offerings', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);

    // Add offerings, then type prices into all of them with no pauses
    for (let i = 0; i < 9; i++) await page.locator('#addOfferingBtn').click();
    await page.evaluate(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('#offeringsBody input[data-k="priceMonthly"]');
      inputs.forEach((el, i) => {
        el.value = String(100 + i * 37);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    const header = await page.locator('#abkRevenue').textContent();
    const outputs = await page.locator('#kpiRevenue').textContent();
    expect(header).toBe(outputs);
    const income = [await page.locator('#abkIncome').textContent(), await page.locator('#kpiIncome').textContent()];
    expect(income[0]).toBe(income[1]);
  });
});
