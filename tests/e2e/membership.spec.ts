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
  await page.locator('#analysisCustomersTab').click();
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
    await page2.locator('#analysisCustomersTab').click();
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
    await expect(page.locator('.membership-results thead')).toContainText('Fee $100 / month · credits $120 / month');
    await expect(cell).toContainText('Member pays $100 vs $60 regular');
    await expect(cell).toContainText('Member pays $40 more (66.7% of regular spend)');
    await expect(cell).toContainText('Credits unused $60 (50.0% of credits granted)');
    await expect(cell).toContainText('You keep $90 of $100 revenue (90.0% margin on revenue)');
    await expect(cell).toContainText('1.0 staff h/month');
  });

  test('processing fees reduce the business keep and fee recommendation', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.processingFeePct = 2.9;
      w.state.membershipPlans = [{ id: 'p', name: 'Gold', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 0, eligible: ['studio'] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 1 } }];
      w.render();
    });
    await openPanel(page);
    const cell = page.locator('.membership-results tbody td').first();
    await expect(cell).toContainText('You keep $87 of $97 revenue (89.7% margin on revenue)');
    await page.locator('#membershipTargetMargin').fill('50');
    await expect(page.locator('.membership-fee').first()).toContainText('Fee for 50.0% margin: $21 / month');
  });

  test('included service visits apply before credits and survive reload', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.membershipPlans = [{ id: 'p', name: 'Gold', monthlyFee: 0, creditsPerMonth: 60, memberDiscountPct: 0, eligible: ['studio'], includedVisits: { studio: 1 } }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 2 } }];
      w.persistState();
      w.render();
    });
    await openPanel(page);
    const cell = page.locator('.membership-results tbody td').first();
    await expect(cell).toContainText('1.0 included visits used');
    await expect(cell).toContainText('Credits unused $0');
    await expect(cell).toContainText('You keep -$20 of $0 revenue');

    await page.reload();
    await waitForPageReady(page);
    await openPanel(page);
    await expect(page.locator('#membershipIncludedVisitsBody input').first()).toHaveValue('1');
    await expect(page.locator('.membership-results tbody td').first()).toContainText('1.0 included visits used');
  });

  test('visit ranges widen the result and survive reload', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.membershipPlans = [{ id: 'p', name: 'Gold', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 0, creditsAtMemberPrice: false, eligible: ['studio'] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 1 } }];
      w.render();
    });
    await openPanel(page);
    const cell = page.locator('.membership-results tbody td').first();
    await expect(cell).not.toContainText('Visit range');

    await page.locator('#membershipEditor summary', { hasText: 'Visit ranges' }).click();
    await page.locator('#membershipRangeBody input[data-kind="visitsLow"]').first().fill('0');
    await page.locator('#membershipRangeBody input[data-kind="visitsHigh"]').first().fill('3');
    // 0 / 1 / 3 visits: member nets -$100 to +$20, you keep $90 to $130, 0 to 3 staff hours
    await expect(cell).toContainText('Visit range: member saves -$100 to +$20; you keep $90 to $130; 0.0 to 3.0 staff h/month');

    await page.reload();
    await waitForPageReady(page);
    await openPanel(page);
    await expect(page.locator('#membershipRangeBody input[data-kind="visitsHigh"]').first()).toHaveValue('3');
    await page.locator('#membershipRangeBody input[data-kind="visitsHigh"]').first().fill('');
    await page.locator('#membershipRangeBody input[data-kind="visitsLow"]').first().fill('');
    await expect(cell).not.toContainText('Visit range');
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
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem('profitpath-state') || '{}').membershipPlans?.[0]?.name
    )).toBe('Keeper');

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

  test('shows how many members fit and which pool binds first', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.mode = 'current';
      w.state.targetUtilizationPct = 100;
      w.state.resources = [{ id: 'booth', name: 'Booth', hoursPerWeek: 1, weeksPerYear: 52 }];
      w.state.offerings[0].resource = 'booth';
      w.state.membershipPlans = [{ id: 'p', name: 'Plan', monthlyFee: 100, creditsPerMonth: 0, memberDiscountPct: 0, eligible: [] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 1 } }];
      w.persistState();
      w.render();
    });
    await openPanel(page);
    // 1 visit a month = 12 h a year against 52 booth hours: 4 members, booth binds
    await expect(page.locator('.membership-fit').first()).toContainText('Fits 4 members before Booth is full');
  });

  test('member capacity subtracts the scenario load from each pool', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.mode = 'current';
      w.state.targetUtilizationPct = 100;
      w.state.resources = [{ id: 'booth', name: 'Booth', hoursPerWeek: 1, weeksPerYear: 52 }];
      w.state.offerings[0].resource = 'booth';
      w.state.offerings[0].currentClients = 2;
      w.state.membershipPlans = [{ id: 'p', name: 'Plan', monthlyFee: 100, creditsPerMonth: 0, memberDiscountPct: 0, eligible: [] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 1 } }];
      w.render();
    });
    await openPanel(page);
    await expect(page.locator('.membership-fit').first()).toContainText('Fits 2 members before Booth is full (after scenario load)');
  });

  test('target margin recommends a fee, or says plainly that none works', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.membershipPlans = [{ id: 'p', name: 'Plan', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 0, eligible: ['studio'] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 1 } }];
      w.render();
    });
    await openPanel(page);
    const fee = page.locator('.membership-fee');
    await expect(fee).toHaveCount(0);
    // $10 cost: 50% margin needs a $20 fee; the member saves anything below $60
    await page.locator('#membershipTargetMargin').fill('50');
    await expect(fee.first()).toContainText('Fee for 50.0% margin: $20 / month');
    await page.locator('#membershipTargetMargin').fill('90');
    await expect(fee.first()).toContainText('No fee reaches 90.0% margin while the member still saves');
    await page.locator('#membershipTargetMargin').fill('');
    await expect(fee).toHaveCount(0);
  });

  test('target margin can recommend credits or discount while holding other terms fixed', async ({ page }) => {
    await open(page, 'intermediate');
    await seedStudio(page);
    await page.evaluate(() => {
      const w = window as any;
      w.state.membershipPlans = [{ id: 'p', name: 'Plan', monthlyFee: 0, creditsPerMonth: 0, memberDiscountPct: 0, eligible: ['studio'] }];
      w.state.memberProfiles = [{ id: 'm', name: 'Regular', visits: { studio: 1 } }];
      w.render();
    });
    await openPanel(page);
    await page.locator('#membershipTargetMargin').fill('50');
    const cell = page.locator('.membership-results tbody td').first();
    await expect(cell).toContainText('Credits for 50.0% margin: $40 / month');
    await expect(cell).toContainText('Discount for 50.0% margin: 66.7%');
  });
});
