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

  test('negative net income uses the danger color in both header chips', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.evaluate(() => {
      const w = window as any;
      Object.assign(w.state, { fullTimeEmployees: 1, fullTimeEmployeePay: 100000, partTimeEmployees: 0 });
      w.state.offerings = [{ id: 'a', name: 'Service', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 1 }];
      w.render();
    });
    const colors = await page.evaluate(() => [
      getComputedStyle(document.querySelector('#abkIncome')!).color,
      getComputedStyle(document.querySelector('#glIncome')!).color,
      getComputedStyle(document.querySelector('#kpiIncome')!).color
    ]);
    expect(colors[0]).toBe(colors[2]);
    expect(colors[1]).toBe(colors[2]);
    expect(colors[0]).not.toBe(getComputedStyle(document.documentElement).getPropertyValue('--accent-ink').trim());
  });
});
