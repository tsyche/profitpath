import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('What-if wizard', () => {
  const open = async (page, level = 'beginner') => {
    await page.addInitScript((l) => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: l }));
      } catch { /* ignore */ }
    }, level);
    await page.goto('/');
    await waitForPageReady(page);
    // The header button can be hidden at narrow widths; the drawer entry calls the same function
    await page.evaluate(() => (window as any).openWhatIfWizard());
    await expect(page.locator('#whatIfModal')).toBeVisible();
  };
  const priceOf = (page) => page.locator('#offeringsBody tr').first().locator('input[data-k="priceMonthly"]');

  test('available at beginner level and lists the scenarios', async ({ page }) => {
    await open(page);
    await expect(page.locator('#whatIfBody [data-wi]')).toHaveCount(5);
  });

  test('previewing changes nothing until Apply, then Apply updates inputs and is undoable', async ({ page }) => {
    await open(page);
    const before = Number(await priceOf(page).inputValue());
    await page.locator('[data-wi="price"]').click();
    await page.locator('#wiValue').fill('20');
    await expect(page.locator('#wiResults')).toContainText('Take-home');
    await expect(page.locator('#wiResults')).not.toContainText(/NaN|Infinity|undefined/);
    expect(Number(await priceOf(page).inputValue())).toBe(before);

    await page.locator('#wiApply').click();
    await expect(page.locator('#whatIfModal')).toBeHidden();
    await expect.poll(async () => Number(await priceOf(page).inputValue())).toBe(Math.round(before * 1.2));

    await page.locator('#undoBtn').click();
    await expect.poll(async () => Number(await priceOf(page).inputValue())).toBe(before);
  });

  // Regression: hiring patched a legacy field calc() ignores, so the preview showed no change at all
  test('hire preview shows a real impact and Apply raises the full-time headcount', async ({ page }) => {
    await open(page);
    const ft = page.locator('#fullTimeEmployees');
    const before = Number(await ft.inputValue());
    await page.locator('[data-wi="hire"]').click();
    await expect(page.locator('#wiResults tbody tr').first().locator('td').last()).not.toHaveText('$0');
    await page.locator('#wiApply').click();
    await expect.poll(async () => Number(await ft.inputValue())).toBe(before + 1);
  });

  test('slider and number stay in sync and results update live', async ({ page }) => {
    await open(page);
    await page.locator('[data-wi="costs"]').click();
    const first = await page.locator('#wiResults').innerText();
    await page.locator('#wiRange').fill('40');
    await expect(page.locator('#wiValue')).toHaveValue('40');
    await expect(page.locator('#wiResults')).not.toHaveText(first);
  });

  test('goal scenario previews a result and Back returns to the list', async ({ page }) => {
    await open(page);
    await page.locator('[data-wi="goal"]').click();
    await expect(page.locator('#wiResults')).toContainText('Take-home');
    await page.locator('#wiValue').fill('1');
    await expect(page.locator('#wiResults')).toContainText('already exceed');
    await expect(page.locator('#wiApply')).toBeDisabled();
    await page.locator('[data-wi-back]').click();
    await expect(page.locator('#whatIfBody [data-wi]')).toHaveCount(5);
  });
});
