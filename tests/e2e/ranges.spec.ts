import { test, expect } from '@playwright/test';
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

  const band = (page) => page.locator('#rangeBand');
  const lowFill = (page) => page.locator('#rangesBody input[data-k="fillPctLow"]').first();
  const highFill = (page) => page.locator('#rangesBody input[data-k="fillPctHigh"]').first();

  async function makeFirstRowGroup(page) {
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

    const nums = async (metric) => page.locator(`#rangeBandBody tr[data-metric="${metric}"] td.mono`).allTextContents();
    const toN = (t) => Number(t.replace(/[^0-9.-]/g, ''));
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

  const sel = (page) => page.locator('#rangesBody select[data-k="confidence"]').first();
  const note = (page) => page.locator('#rangesBody input[data-k="note"]').first();

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
