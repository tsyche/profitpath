import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Scenario currency', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const pickEuro = (page) => page.evaluate(() => {
    const el = document.querySelector('#currencySelect') as HTMLSelectElement;
    el.value = 'EUR';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  test('selecting EUR re-renders the KPIs without a dollar sign', async ({ page }) => {
    await expect(page.locator('#kpiRevenue')).toContainText('$');
    await pickEuro(page);
    await expect(page.locator('#kpiRevenue')).toContainText('€');
    await expect(page.locator('#kpiRevenue')).not.toContainText('$');
  });

  test('the tax section says US rules apply once the currency is not USD', async ({ page }) => {
    await expect(page.locator('#taxDisclaimer')).not.toContainText('US tax rules applied');
    await pickEuro(page);
    await expect(page.locator('#taxDisclaimer')).toContainText('US tax rules applied to EUR amounts');
  });

  test('the Excel export uses the selected currency', async ({ page }) => {
    await pickEuro(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => (window as any).exportAsExcel())
    ]);
    const chunks: Buffer[] = [];
    for await (const c of await download.createReadStream()) chunks.push(c as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    expect(text).toContain('€');
    expect(text).not.toContain('$');
  });

  test('the choice survives a reload', async ({ page }) => {
    await pickEuro(page);
    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#currencySelect')).toHaveValue('EUR');
    await expect(page.locator('#kpiRevenue')).toContainText('€');
  });
});
