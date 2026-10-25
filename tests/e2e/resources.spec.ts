import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

async function open(page, experienceLevel: string) {
  await page.addInitScript((level) => {
    try {
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: level }));
    } catch { /* ignore */ }
  }, experienceLevel);
  await page.goto('/');
  await waitForPageReady(page);
}

const rows = (page) => page.locator('#resourcesBody tr');

test.describe('Capacity resources', () => {
  test('hidden for beginners, shown from intermediate up', async ({ page }) => {
    await open(page, 'beginner');
    await expect(page.locator('#resourcesSection')).toBeHidden();
    await expect(page.locator('#rangesSection')).toBeHidden();
    await expect(page.locator('#marketSection')).toBeHidden();
  });

  test('pool percentages match hand-computed hours', async ({ page }) => {
    await open(page, 'intermediate');
    // 1 FT employee: 2080 h x 80% productive = 1664 staff h. One subscription offering, 12 sessions x 1 h = 12 h per client.
    // Booth: 1 h/wk x 52 wk = 52 h, 75% target = 39 h -> floor(39 / 12) = 3 clients = 36 h -> 69.2% booth, 36 / 1664 = 2.2% staff.
    await page.evaluate(() => {
      const w = window as any;
      Object.assign(w.state, {
        mode: 'forecast', fullTimeEmployees: 1, partTimeEmployees: 0, productiveUtilizationPct: 80, targetUtilizationPct: 75,
        resources: [{ id: 'booth', name: 'Booth', hoursPerWeek: 1, weeksPerYear: 52 }]
      });
      w.state.offerings = [{ id: 'a', name: 'Coaching', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, laborPctOfPrice: 0, type: 'subscription', mixPct: 100, currentClients: 0, resource: 'booth' }];
      w.render();
    });
    await expect(page.locator('#bottleneckLine')).toHaveText('Bottleneck: Booth at 69.2% (Staff 2.2%)');
    await expect(page.locator('#capacityLabel')).toContainText('69.2%');
    const clients = await page.evaluate(() => (window as any).calc((window as any).state).clients);
    expect(clients).toBe(3);
  });

  test('a tagged booth becomes the bottleneck and survives reload', async ({ page }) => {
    await open(page, 'intermediate');
    await expect(page.locator('#resourcesSection')).toBeVisible();
    await expect(page.locator('#bottleneckLine')).toBeHidden();

    await page.locator('#addResourceBtn').click();
    await expect(rows(page)).toHaveCount(1);
    await rows(page).first().locator('input[data-k="name"]').fill('Booth');
    await rows(page).first().locator('input[data-k="hoursPerWeek"]').fill('1');
    // An active but untagged resource sits at 0%, so staff is still the bottleneck
    await expect(page.locator('#bottleneckLine')).toBeVisible();

    await page.locator('#resourceTagBody select').first().selectOption({ label: 'Booth' });
    await expect(page.locator('#bottleneckLine')).toContainText('Bottleneck: Booth');
    const pools = await page.evaluate(() => (window as any).calc((window as any).state).poolUtilization.map((p) => p.name));
    expect(pools).toEqual(['Staff', 'Booth']);

    await page.reload();
    await waitForPageReady(page);
    await expect(rows(page)).toHaveCount(1);
    await expect(page.locator('#resourceTagBody select').first()).toHaveValue(/.+/);
    await expect(page.locator('#bottleneckLine')).toContainText('Bottleneck: Booth');
  });

  test('removing a resource clears its tags and the bottleneck line', async ({ page }) => {
    await open(page, 'intermediate');
    await page.locator('#addResourceBtn').click();
    await page.locator('#resourceTagBody select').first().selectOption({ index: 1 });
    await rows(page).first().getByRole('button', { name: /Remove/ }).click();
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('#resourceTagWrap')).toBeHidden();
    await expect(page.locator('#bottleneckLine')).toBeHidden();
    const tagged = await page.evaluate(() => (window as any).state.offerings.filter((o) => o.resource).length);
    expect(tagged).toBe(0);
  });
  test('staff-free checkbox drops staff hours for tagged offerings and survives reload', async ({ page }) => {
    await open(page, 'intermediate');
    // Same setup as the hand-computed test: booth caps at 3 clients x 12 h = 36 h, which is 2.2% of staff time until the box is ticked
    await page.evaluate(() => {
      const w = window as any;
      Object.assign(w.state, {
        mode: 'forecast', fullTimeEmployees: 1, partTimeEmployees: 0, productiveUtilizationPct: 80, targetUtilizationPct: 75,
        resources: [{ id: 'booth', name: 'Booth', hoursPerWeek: 1, weeksPerYear: 52 }]
      });
      w.state.offerings = [{ id: 'a', name: 'Coaching', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, laborPctOfPrice: 0, type: 'subscription', mixPct: 100, currentClients: 0, resource: 'booth' }];
      w.render();
    });
    await expect(page.locator('#bottleneckLine')).toHaveText('Bottleneck: Booth at 69.2% (Staff 2.2%)');

    await rows(page).first().locator('input[data-k="staffFree"]').check();
    await expect(page.locator('#bottleneckLine')).toHaveText('Bottleneck: Booth at 69.2% (Staff 0.0%)');
    const clients = await page.evaluate(() => (window as any).calc((window as any).state).clients);
    expect(clients).toBe(3);

    await page.reload();
    await waitForPageReady(page);
    await expect(rows(page).first().locator('input[data-k="staffFree"]')).toBeChecked();
    await expect(page.locator('#bottleneckLine')).toContainText('Staff 0.0%');
  });
});
