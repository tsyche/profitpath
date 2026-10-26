import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

async function open(page: Page, experienceLevel: string) {
  await page.addInitScript((level) => {
    try {
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: level }));
    } catch { /* ignore */ }
  }, experienceLevel);
  await page.goto('/');
  await waitForPageReady(page);
}

// One per-session offering: lists at $60 a visit (60 x 12 / 12), $10 variable cost, 1 staff hour.
async function seedStudio(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.state.offerings = [{ id: 'studio', name: 'Studio hour', priceMonthly: 60, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 10, laborPctOfPrice: 0, type: 'per-session', mixPct: 100, currentClients: 0 }];
    w.state.membershipPlans = [];
    w.state.memberProfiles = [];
    w.persistState();
    w.render();
  });
}

const openPanel = async (page: Page) => {
  await page.locator('#membershipToggle').click();
  await expect(page.locator('#membershipBody')).toBeVisible();
};

test.describe('Membership what-if', () => {
  test('hidden for beginners, shown from intermediate up', async ({ page }) => {
    await open(page, 'beginner');
    await expect(page.locator('#membershipWrapper')).toBeHidden();
    const page2 = await page.context().newPage();
    await page2.addInitScript(() => localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'intermediate' })));
    await page2.goto('/');
    await waitForPageReady(page2);
    await expect(page2.locator('#membershipWrapper')).toBeVisible();
  });

  test('worked example: $100 fee, $120 credits, one $60 hour', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await openPanel(page);

    await page.locator('#addMembershipPlanBtn').click();
    const plan = page.locator('#membershipPlansBody tr').first();
    await plan.locator('input[data-k="monthlyFee"]').fill('100');
    await plan.locator('input[data-k="creditsPerMonth"]').fill('120');
    await page.locator('#addMemberProfileBtn').click();
    await page.locator('#membershipVisitsBody input[data-kind="visits"]').first().fill('1');

    const cell = page.locator('.membership-results tbody td').first();
    await expect(page.locator('.membership-results thead')).toContainText('Headline: credits minus fee = +$20');
    await expect(cell).toContainText('Member pays $100 vs $60 regular');
    await expect(cell).toContainText('Member pays $40 more (66.7% of regular spend)');
    await expect(cell).toContainText('Credits unused $60 (50.0% of credits granted)');
    await expect(cell).toContainText('You keep $90 of $100 revenue (90.0% margin on revenue)');
    await expect(cell).toContainText('1.0 staff h/month');
  });

  test('stacking is opt-in: the checkbox lets credits redeem at the member price', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.membershipPlans = [{ id: 'p', name: 'Gold', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 25, creditsAtMemberPrice: false, eligible: ['studio'] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 4 } }];
      w.render();
    });
    await openPanel(page);
    const cell = page.locator('.membership-results tbody td').first();
    // Default: credits at list cover 2 visits, 2 more at $45 cash -> member pays 100 + 90 = $190 vs $240 regular
    await expect(cell).toContainText('Member saves $50 (20.8% of regular spend)');
    await page.locator('#membershipPlansBody input[data-k="creditsAtMemberPrice"]').check();
    // Stacked: credits at $45 cover 2.67 visits, rest in cash -> $100 + $60 = $160, saves $80
    await expect(cell).toContainText('Member saves $80 (33.3% of regular spend)');
  });

  test('caps at 3 plans, survives reload, and Remove works', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await openPanel(page);
    for (let i = 0; i < 3; i++) await page.locator('#addMembershipPlanBtn').click();
    await expect(page.locator('#membershipPlansBody tr')).toHaveCount(3);
    await expect(page.locator('#addMembershipPlanBtn')).toBeDisabled();
    await page.locator('#membershipPlansBody tr').first().locator('input[data-k="name"]').fill('Keeper');

    await page.reload();
    await waitForPageReady(page);
    await openPanel(page);
    await expect(page.locator('#membershipPlansBody tr')).toHaveCount(3);
    await expect(page.locator('#membershipPlansBody tr').first().locator('input[data-k="name"]')).toHaveValue('Keeper');

    await page.locator('#membershipPlansBody button[data-action="removePlan"]').first().click();
    await expect(page.locator('#membershipPlansBody tr')).toHaveCount(2);
    await expect(page.locator('#addMembershipPlanBtn')).toBeEnabled();
  });

  test('a hostile plan name is rendered as text', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.membershipPlans = [{ id: 'p', name: '<img src=x onerror="window.__pwn=1">', monthlyFee: 0, creditsPerMonth: 0, memberDiscountPct: 0, eligible: [] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: {} }];
      w.render();
    });
    await openPanel(page);
    await expect(page.locator('.membership-results thead')).toContainText('<img src=x');
    expect(await page.evaluate(() => (window as any).__pwn)).toBeUndefined();
  });

  test('three plans and profiles do not overflow a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.membershipPlans = [1, 2, 3].map((n) => ({ id: 'p' + n, name: 'Plan ' + n, monthlyFee: 50 * n, creditsPerMonth: 60 * n, memberDiscountPct: 10, eligible: ['studio'] }));
      w.state.memberProfiles = [1, 2, 3].map((n) => ({ id: 'm' + n, name: 'Member ' + n, visits: { studio: n } }));
      w.render();
    });
    await openPanel(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
