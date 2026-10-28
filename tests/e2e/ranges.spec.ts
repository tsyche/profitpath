import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Ranged inputs (low / high)', () => {
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

  const band = (page: Page) => page.locator('#rangeBand');
  const lowFill = (page: Page) => page.locator('#rangesBody input[data-k="fillPctLow"]').first();
  const highFill = (page: Page) => page.locator('#rangesBody input[data-k="fillPctHigh"]').first();

  async function makeFirstRowGroup(page: Page) {
    await page.locator('#offeringsBody tr').first().locator('select[data-k="type"]').selectOption('group');
    await page.locator('#offeringsBody tr').first().locator('input[data-k="seats"]').fill('8');
    await page.locator('#offeringsBody tr').first().locator('input[data-k="fillPct"]').fill('60');
    await page.locator('#rangesSection summary').click();
  }

  test('band is hidden until a bound is set, then shows min <= base <= max and survives reload', async ({ page }) => {
    await makeFirstRowGroup(page);
    await expect(band(page)).toBeHidden();

    await lowFill(page).fill('30');
    await highFill(page).fill('100');
    await expect(band(page)).toBeVisible();

    const nums = async (metric: any) => page.locator(`#rangeBandBody tr[data-metric="${metric}"] td.mono`).allTextContents();
    const toN = (t: any) => Number(t.replace(/[^0-9.-]/g, ''));
    const [min, base, max] = (await nums('revenue')).map(toN);
    expect(min).toBeLessThan(base);
    expect(base).toBeLessThan(max);

    await page.reload();
    await waitForPageReady(page);
    await page.locator('#rangesSection summary').click();
    await expect(lowFill(page)).toHaveValue('30');
    await expect(highFill(page)).toHaveValue('100');
    await expect(band(page)).toBeVisible();
  });

  test('fill-from-confidence sets bounds for tagged rows and names the biggest driver', async ({ page }) => {
    await makeFirstRowGroup(page);
    await expect(page.locator('#rangeDrivers')).toBeHidden();

    await page.locator('#rangesBody select[data-k="confidence"]').first().selectOption('guess');
    await page.locator('#suggestRangesBtn').click();

    await expect(lowFill(page)).toHaveValue('42');
    await expect(highFill(page)).toHaveValue('78');
    await expect(band(page)).toBeVisible();
    await expect(page.locator('#rangeDrivers')).toContainText('(Guess)');

    // A typed bound survives a second fill
    await lowFill(page).fill('10');
    await page.locator('#suggestRangesBtn').click();
    await expect(lowFill(page)).toHaveValue('10');
  });

  test('clearing both bounds hides the band again', async ({ page }) => {
    await makeFirstRowGroup(page);
    await lowFill(page).fill('30');
    await expect(band(page)).toBeVisible();
    await lowFill(page).fill('');
    await expect(band(page)).toBeHidden();
  });

  test('current mode shows client bounds, not fill bounds', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).state.mode = 'current';
      (window as any).render?.();
    });
    await page.locator('#rangesSection summary').click();
    await expect(page.locator('#rangesBody input[data-k="fillPctLow"]')).toHaveCount(0);
    const lo = page.locator('#rangesBody input[data-k="currentClientsLow"]').first();
    await lo.fill('0');
    await expect(band(page)).toBeVisible();
    await expect(page.locator('#rangeBandBody tr[data-metric="clients"]')).toBeVisible();
  });
});

test.describe('Confidence tags and notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'intermediate' }));
      } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.locator('#rangesSection summary').click();
  });

  const sel = (page: Page) => page.locator('#rangesBody select[data-k="confidence"]').first();
  const note = (page: Page) => page.locator('#rangesBody input[data-k="note"]').first();

  test('tag and note persist across reload and a hostile note stays inert text', async ({ page }) => {
    await sel(page).selectOption('guess');
    await expect(sel(page)).toHaveAttribute('data-confidence', 'guess');
    await note(page).fill('<img src=x onerror=window.__pwned=1> from site');
    await page.reload();
    await waitForPageReady(page);
    await page.locator('#rangesSection summary').click();
    await expect(sel(page)).toHaveValue('guess');
    await expect(note(page)).toHaveValue('<img src=x onerror=window.__pwned=1> from site');
    expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
  });

  test('choosing Untagged clears the tag', async ({ page }) => {
    await sel(page).selectOption('verified');
    await sel(page).selectOption('');
    expect(await page.evaluate(() => 'confidence' in (window as any).state.offerings[0])).toBe(false);
  });
});

test.describe('Range case lens, spreads and badge', () => {
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

  const band = (page: Page) => page.locator('#rangeBand');
  const lowFill = (page: Page) => page.locator('#rangesBody input[data-k="fillPctLow"]').first();
  const highFill = (page: Page) => page.locator('#rangesBody input[data-k="fillPctHigh"]').first();

  async function makeFirstRowGroup(page: Page) {
    await page.locator('#offeringsBody tr').first().locator('select[data-k="type"]').selectOption('group');
    await page.locator('#offeringsBody tr').first().locator('input[data-k="seats"]').fill('8');
    await page.locator('#offeringsBody tr').first().locator('input[data-k="fillPct"]').fill('60');
    await page.locator('#rangesSection summary').click();
  }

  const kpiRevenue = (page: Page) => page.locator('#kpiRevenue');
  const money = async (loc: any) => Number((await loc.textContent())!.replace(/[^0-9.-]/g, ''));

  test('case toggle drives every output, tags it, and never rewrites the typed inputs', async ({ page }) => {
    await makeFirstRowGroup(page);
    await lowFill(page).fill('30');
    await highFill(page).fill('100');
    const baseRev = await money(kpiRevenue(page));

    await page.locator('#rangeCaseToggle [data-case="conservative"]').click();
    const lowRev = await money(kpiRevenue(page));
    expect(lowRev).toBeLessThan(baseRev);
    await expect(page.locator('.range-case-chip').first()).toHaveText('Conservative case');
    // calc() itself follows the case, so anything built on it (exports, charts, insights) agrees with the KPI
    expect(await page.evaluate(() => Math.round((window as any).calc((window as any).state).revenue))).toBe(lowRev);
    // The editable fill cell still shows what was typed, not the swapped value
    await expect(page.locator('#offeringsBody tr').first().locator('input[data-k="fillPct"]')).toHaveValue('60');

    await page.locator('#rangeCaseToggle [data-case="optimistic"]').click();
    expect(await money(kpiRevenue(page))).toBeGreaterThan(baseRev);

    await page.locator('#rangeCaseToggle [data-case="base"]').click();
    expect(await money(kpiRevenue(page))).toBe(baseRev);
    await expect(page.locator('.range-case-chip').first()).toBeHidden();
  });

  test('sales-loss assumptions reduce price-change demand in both base and conservative cases', async ({ page }) => {
    await page.locator('#rangesSection summary').click();
    const row = page.locator('#rangesBody tr').first();
    await row.locator('input[data-k="salesLossPct"]').fill('20');
    await row.locator('input[data-k="salesLossPctLow"]').fill('5');
    await row.locator('input[data-k="salesLossPctHigh"]').fill('40');

    const baseClients = await page.evaluate(() => (window as any).calc((window as any).state).clients);
    await page.locator('#rangeCaseToggle [data-case="conservative"]').click();
    const conservativeClients = await page.evaluate(() => (window as any).calc((window as any).state).clients);
    await page.locator('#rangeCaseToggle [data-case="optimistic"]').click();
    const optimisticClients = await page.evaluate(() => (window as any).calc((window as any).state).clients);

    expect(conservativeClients).toBeLessThan(baseClients);
    expect(optimisticClients).toBeGreaterThan(baseClients);
  });

  test('a case snaps back to base when the bounds go away, and never survives a reload', async ({ page }) => {
    await makeFirstRowGroup(page);
    await lowFill(page).fill('30');
    const baseRev = await money(kpiRevenue(page));
    await page.locator('#rangeCaseToggle [data-case="conservative"]').click();
    await expect(page.locator('.range-case-chip').first()).toBeVisible();

    await lowFill(page).fill('');
    await expect(band(page)).toBeHidden();
    await expect(page.locator('.range-case-chip').first()).toBeHidden();
    expect(await money(kpiRevenue(page))).toBe(baseRev);

    await lowFill(page).fill('30');
    await page.locator('#rangeCaseToggle [data-case="conservative"]').click();
    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('.range-case-chip').first()).toBeHidden();
    expect(await money(kpiRevenue(page))).toBe(baseRev);
  });

  test('configurable spreads feed the fill button and persist', async ({ page }) => {
    await makeFirstRowGroup(page);
    await page.locator('#rangesBody select[data-k="confidence"]').first().selectOption('guess');
    await page.locator('#spreadGuess').fill('50');
    await page.locator('#spreadGuess').blur();
    await page.locator('#suggestRangesBtn').click();
    await expect(lowFill(page)).toHaveValue('30');
    await expect(highFill(page)).toHaveValue('90');

    await page.locator('#spreadGuess').fill('999');
    await page.locator('#spreadGuess').blur();
    await expect(page.locator('#spreadGuess')).toHaveValue('100');

    await page.reload();
    await waitForPageReady(page);
    await page.locator('#rangesSection summary').click();
    await expect(page.locator('#spreadGuess')).toHaveValue('100');
    await expect(page.locator('#spreadEstimated')).toHaveValue('15');
  });

  test('a tagged offering shows its confidence badge in the main table', async ({ page }) => {
    await page.locator('#rangesSection summary').click();
    await expect(page.locator('#offeringsBody .conf-badge')).toHaveCount(0);
    await page.locator('#rangesBody select[data-k="confidence"]').first().selectOption('estimated');
    await page.locator('#offeringsBody tr').first().locator('input[data-k="priceMonthly"]').fill('123');
    await expect(page.locator('#offeringsBody tr').first().locator('.conf-badge')).toHaveText('Estimated');
  });
});

test.describe('Frequency (sessions/yr) bounds', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'intermediate' }));
      } catch { /* ignore */ }
    });
    await page.goto('/');
    await waitForPageReady(page);
    await page.locator('#rangesSection summary').click();
  });

  const lo = (page: Page) => page.locator('#rangesBody input[data-k="sessionsPerYearLow"]').first();
  const hi = (page: Page) => page.locator('#rangesBody input[data-k="sessionsPerYearHigh"]').first();
  const num = async (page: Page, sel: string) => Number((await page.locator(sel).textContent())!.replace(/[^0-9.-]/g, ''));

  test('band appears, Conservative takes the busier side, and undo clears the bound', async ({ page }) => {
    await expect(page.locator('#rangeBand')).toBeHidden();
    const baseRevenue = await num(page, '#kpiRevenue');
    const baseFreq = await page.locator('#offeringsBody tr').first().locator('input[data-k="sessionsPerYear"]').inputValue();

    await lo(page).fill('1');
    await hi(page).fill(String(Number(baseFreq) * 2));
    await expect(page.locator('#rangeBand')).toBeVisible();
    await expect(page.locator('#rangeDrivers')).toContainText(' to ');

    await page.locator('#rangeCaseToggle [data-case="conservative"]').click();
    // More sessions per client means fewer clients fit the same hours, so revenue falls
    expect(await num(page, '#kpiRevenue')).toBeLessThan(baseRevenue);
    await page.locator('#rangeCaseToggle [data-case="optimistic"]').click();
    expect(await num(page, '#kpiRevenue')).toBeGreaterThan(baseRevenue);
    await page.locator('#rangeCaseToggle [data-case="base"]').click();
    expect(await num(page, '#kpiRevenue')).toBe(baseRevenue);
    // The typed frequency itself is never rewritten by a case
    await expect(page.locator('#offeringsBody tr').first().locator('input[data-k="sessionsPerYear"]')).toHaveValue(baseFreq);

    await page.locator('#undoBtn').click();
    await page.locator('#undoBtn').click();
    await expect(hi(page)).toHaveValue('');
    await expect(lo(page)).toHaveValue('');
    await expect(page.locator('#rangeBand')).toBeHidden();
  });

  test('one-time rows show no frequency inputs', async ({ page }) => {
    await page.locator('#offeringsBody tr').first().locator('select[data-k="type"]').selectOption('one-time');
    await expect(page.locator('#rangesBody tr').first().locator('input[data-k="sessionsPerYearLow"]')).toHaveCount(0);
    await expect(page.locator('#rangesBody tr').nth(1).locator('input[data-k="sessionsPerYearLow"]')).toHaveCount(1);
  });
});
