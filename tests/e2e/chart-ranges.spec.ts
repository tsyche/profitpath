import { test, expect } from '@playwright/test';

for (const layout of ['legacy', 'workspaces']) {
  test(`${layout}: chart ranges follow edits and case changes without losing the base`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('profitpath-onboarding-completed', 'true');
      localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'intermediate' }));
      if (!localStorage.getItem('profitpath-state')) localStorage.setItem('profitpath-state', JSON.stringify({
        mode: 'current', fullTimeEmployees: 1, partTimeEmployees: 0, fullTimeEmployeePay: 60000,
        productiveUtilizationPct: 80, targetUtilizationPct: 75, monthlyCosts: 0,
        offerings: [{
          id: 'service', name: 'Service', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1,
          variableCostPerSession: 10, mixPct: 100, currentClients: 40,
          currentClientsLow: 10, currentClientsHigh: 80
        }]
      }));
    });
    await page.goto(`/?layout=${layout}&view=results`);
    await page.waitForFunction(() => Boolean(window.lastMetrics));
    if (layout === 'workspaces') await page.locator('#workspaceQuestion-money summary').click();
    const revenue = page.locator('.chart-range[data-metric="revenue"]');
    const profit = page.locator('.chart-range[data-metric="income"]');
    const utilization = page.locator('.chart-range[data-metric="capacityPct"]');
    for (const chart of [revenue, profit, utilization]) await expect(chart).toBeVisible();
    await expect(revenue).toHaveAttribute('data-base', '48000');
    await expect(profit).toHaveAttribute('data-min', '-49200');
    await expect(profit).toHaveAttribute('data-max', '26400');
    await page.locator('[data-case="conservative"]').click();
    await expect(revenue).toHaveAttribute('data-current', '12000');
    await expect(revenue).toHaveAttribute('data-base', '48000');
    await page.locator('[data-case="optimistic"]').click();
    await expect(revenue).toHaveAttribute('data-current', '96000');
    await page.reload();
    await page.waitForFunction(() => Boolean(window.lastMetrics));
    if (layout === 'workspaces') await page.locator('#workspaceQuestion-money summary').click();
    await expect(revenue).toBeVisible();
    await expect(revenue).toHaveAttribute('data-base', '48000');
    await page.evaluate(() => {
      delete window.state.offerings[0].currentClientsLow;
      delete window.state.offerings[0].currentClientsHigh;
      window.render();
    });
    await expect(page.locator('.chart-range')).toHaveCount(0);
  });
}
