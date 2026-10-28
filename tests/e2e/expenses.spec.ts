import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Fixed expenses table', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
  });

  const rows = (page: Page) => page.locator('#expensesBody tr');
  const fixedCosts = (page: Page) => page.evaluate(() => (window as any).calc((window as any).state).annualFixedCosts);
  const yearOneCash = (page: Page) => page.evaluate(() => (window as any).calc((window as any).state).yearOneCashFlow);

  test('flat processing fees use an explicit transaction count', async ({ page }) => {
    const before = await fixedCosts(page);
    await page.locator('#processingFeePerTransaction').fill('0.3');
    await page.locator('#transactionsPerMonth').fill('100');
    await expect.poll(() => fixedCosts(page)).toBe(before + 360);
    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#processingFeePerTransaction')).toHaveValue('0.3');
    await expect(page.locator('#transactionsPerMonth')).toHaveValue('100');
    await expect.poll(() => fixedCosts(page)).toBe(before + 360);
  });

  test('a weekly expense adds weekly x52 to fixed costs and survives reload', async ({ page }) => {
    const before = await fixedCosts(page);
    await page.locator('#addExpenseBtn').click();
    await expect(rows(page)).toHaveCount(1);
    await rows(page).first().locator('input[data-k="amount"]').fill('100');
    await rows(page).first().locator('select[data-k="frequency"]').selectOption('weekly');
    await expect.poll(() => fixedCosts(page)).toBe(before + 5200);

    await page.reload();
    await waitForPageReady(page);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('select[data-k="frequency"]')).toHaveValue('weekly');
    expect(await fixedCosts(page)).toBe(before + 5200);
  });

  test('a one-time purchase is spread over its life and the life input only enables for one-time', async ({ page }) => {
    const before = await fixedCosts(page);
    await page.locator('#addExpenseBtn').click();
    const row = rows(page).first();
    await row.locator('input[data-k="amount"]').fill('3000');
    await expect(row.locator('input[data-k="lifeYears"]')).toBeDisabled();
    await row.locator('select[data-k="frequency"]').selectOption('one-time');
    await expect(row.locator('input[data-k="lifeYears"]')).toBeEnabled();
    await expect.poll(() => fixedCosts(page)).toBe(before + 1000);
    await row.locator('input[data-k="lifeYears"]').fill('5');
    await expect.poll(() => fixedCosts(page)).toBe(before + 600);

    await page.reload();
    await waitForPageReady(page);
    await expect(rows(page).first().locator('input[data-k="lifeYears"]')).toHaveValue('5');
    expect(await fixedCosts(page)).toBe(before + 600);
    expect(await yearOneCash(page)).toBeLessThan(await page.evaluate(() => (window as any).calc((window as any).state).income));
  });

  test('a loan row subtracts interest from profit and principal from year-one cash flow', async ({ page }) => {
    await page.locator('#addExpenseBtn').click();
    const row = rows(page).first();
    await row.locator('select[data-k="category"]').selectOption('Loan Payments');
    await row.locator('input[data-k="amount"]').fill('10000');
    await row.locator('input[data-k="loanAprPct"]').fill('12');
    await row.locator('input[data-k="lifeYears"]').fill('10');
    const values = await page.evaluate(() => {
      const r = (window as any).calc((window as any).state);
      return { income: r.income, cash: r.yearOneCashFlow, costs: r.annualFixedCosts };
    });
    expect(values.costs).toBeGreaterThan(0);
    expect(values.cash).toBeLessThan(values.income);
  });

  test('removing a row drops its cost', async ({ page }) => {
    const before = await fixedCosts(page);
    await page.locator('#addExpenseBtn').click();
    await rows(page).first().locator('input[data-k="amount"]').fill('50');
    await expect.poll(() => fixedCosts(page)).toBe(before + 600);
    await rows(page).first().locator('button[data-action="removeExpense"]').click();
    await expect(rows(page)).toHaveCount(0);
    expect(await fixedCosts(page)).toBe(before);
  });

  test('importing a CSV with an empty expenses section clears existing expenses', async ({ page }) => {
    await page.locator('#addExpenseBtn').click();
    await rows(page).first().locator('input[data-k="amount"]').fill('50');
    await expect(rows(page)).toHaveCount(1);

    const offerings = 'Offerings\nName,Price,Sessions,Hours,Var,Mix,Clients\nA,100,12,1,0,100,0\n';
    const importCsv = (csv: string) => page.locator('#csvFileInput').setInputFiles({
      name: 'in.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
    });

    // Legacy CSV (no expenses section) keeps existing expenses
    await importCsv(offerings);
    await expect(page.locator('.toast', { hasText: 'Imported' }).first()).toBeVisible();
    await expect(rows(page)).toHaveCount(1);

    // An explicit empty section clears them
    await importCsv(offerings + 'FIXED EXPENSES\nName,Category,Amount,Frequency\n');
    await expect(rows(page)).toHaveCount(0);
  });

  test('survives a share link', async ({ page }) => {
    await page.locator('#addExpenseBtn').click();
    await rows(page).first().locator('input[data-k="amount"]').fill('75');
    await rows(page).first().locator('select[data-k="category"]').selectOption('Insurance');
    const url = await page.evaluate(() => (window as any).encodeScenarioToURL((window as any).state));
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    await waitForPageReady(page);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('select[data-k="category"]')).toHaveValue('Insurance');
  });

  test('cost breakdown appears with expenses, groups by category, and ties out to fixed costs', async ({ page }) => {
    await page.evaluate(() => {
      const w = window as any;
      w.state.monthlyCosts = 0;
      w.render();
    });
    await expect(page.locator('#costBreakdown')).toBeHidden();
    await page.locator('#addExpenseBtn').click();
    await rows(page).first().locator('input[data-k="amount"]').fill('100');
    await rows(page).first().locator('select[data-k="category"]').selectOption('Marketing');
    await expect(page.locator('#costBreakdown')).toBeVisible();
    await expect(page.locator('#costBreakdownBody tr', { hasText: 'Marketing' })).toContainText('$1,200');
    await rows(page).first().locator('button[data-action="removeExpense"]').click();
    await expect(page.locator('#costBreakdown')).toBeHidden();
  });

  test('expense cards use the available width in the responsive grid', async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 900 });
    await page.locator('#addExpenseBtn').click();
    await page.locator('#addExpenseBtn').click();
    const columns = await page.locator('#expensesBody').evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns.split(' ').length
    );
    expect(columns).toBeGreaterThan(1);
  });
});
