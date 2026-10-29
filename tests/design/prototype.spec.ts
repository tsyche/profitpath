import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fitnessFixture, hybridFixture } from '../../assets/prototypes/fixtures';
import { calc } from '../../src/calculations/index';

const path = '/docs/plans/prototypes/product-flow.html';
async function start(page: Page, model = 'fitness') {
  await page.goto(path);
  await page.locator(`[data-action="${model}"]`).click();
  await expect(page.getByRole('main')).toContainText('Start with the question.');
}
async function section(page: Page, name: string) {
  if (await page.locator('#modelSection').isVisible()) await page.locator('#modelSection').selectOption(name);
  else await page.getByRole('navigation', { name: 'Model sections' }).locator(`a[href="#model/${name}"]`).click();
}
async function offering(page: Page, id: string) {
  await section(page, 'offerings');
  await page.locator(`[data-offering="${id}"]`).click();
  await expect(page.getByRole('region', { name: 'Offering editor' })).toBeVisible();
}
for (const width of [1440, 375]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width === 375 ? 812 : 900 } });
    test('template to live edit, Results, alternative, Compare, and share preview', async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(path);
      await page.screenshot({ path: info.outputPath('entry.png') });
      await page.getByRole('button', { name: 'Use Fitness example', exact: true }).click();
      await expect(page.locator('.context')).toContainText('Example data');
      await offering(page, 'fitness-0');
      const summary = await page.locator('.live-summary').boundingBox();
      expect(summary!.y + summary!.height).toBeLessThanOrEqual(width === 375 ? 812 : 900);
      const before = await page.locator('[data-metric="income"]').textContent();
      const price = page.getByLabel('Price per month (USD)', { exact: true });
      await price.fill('350');
      await expect(page.locator('[data-metric="income"]')).not.toHaveText(before!);
      const edited = await page.locator('[data-metric="income"]').textContent();
      await page.screenshot({ path: info.outputPath('offering-editor.png') });
      await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Results', exact: true }).click();
      await expect(page.getByRole('main')).toContainText(edited!);
      await page.screenshot({ path: info.outputPath('results.png') });
      await page.getByRole('main').getByRole('link', { name: 'Edit this model', exact: true }).click();
      await expect(page.getByLabel('Price per month (USD)', { exact: true })).toHaveValue('350');
      await page.locator('.context').getByRole('button', { name: 'Try a change', exact: true }).click();
      await page.getByLabel('Alternative name', { exact: true }).fill('Higher price');
      await page.getByRole('button', { name: 'Create alternative', exact: true }).click();
      await page.locator('[data-offering="fitness-0"]').click();
      await page.getByLabel('Price per month (USD)', { exact: true }).fill('400');
      await page.getByText('Pricing assumptions · try a price change', { exact: true }).click();
      await page.getByLabel('Expected sales lost (%)', { exact: true }).fill('10');
      await page.getByRole('button', { name: 'Save option', exact: true }).click();
      await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Compare', exact: true }).click();
      await expect(page.getByRole('table', { name: 'Annual scenario comparison' })).toBeVisible();
      await page.screenshot({ path: info.outputPath('compare.png') });
      const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('profitpath-design-prototype-v1')!).options);
      expect(saved[0].model.offerings[0].priceMonthly).toBe(350);
      expect(saved[1].model.offerings[0].priceMonthly).toBe(400);
      await page.locator('.context').getByRole('button', { name: 'Review / share', exact: true }).click();
      await expect(page.getByRole('dialog')).toContainText('Higher price');
      await expect(page.getByRole('dialog')).toContainText('Fitness example');
      await expect(page.getByRole('dialog')).toContainText('snapshot');
      await page.getByRole('button', { name: 'Back to workspace' }).click();
      await page.getByRole('button', { name: 'Edit alternative', exact: true }).click();
      await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Compare', exact: true }).click();
      await expect(page.getByLabel('Alternative', { exact: true })).toHaveValue('1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(errors).toEqual([]);
    });

    for (const mode of ['forecast', 'current']) test(`dense ${mode} model search, focused fields, invalid value, undo, history, and reload`, async ({ page }) => {
      await start(page, 'hybrid');
      await page.getByLabel('Business mode', { exact: true }).selectOption(mode);
      await section(page, 'offerings');
      await page.getByRole('searchbox', { name: 'Find an offering' }).fill('practice');
      await expect(page.locator('.offering-row')).toHaveCount(1);
      await page.locator('[data-offering="hybrid-5"]').click();
      await page.getByText('Delivery and costs · in use', { exact: true }).click();
      await expect(page.getByLabel('Capacity resource', { exact: true })).toHaveValue('booth');
      await page.getByLabel('Price per session (USD)', { exact: true }).fill('');
      await expect(page.getByRole('button', { name: 'Save option', exact: true })).toBeDisabled();
      await expect(page.locator('#editStatus')).toContainText('last valid');
      await expect(page.getByLabel('Price per session (USD)', { exact: true })).toHaveValue('');
      const persisted = await page.evaluate(() => JSON.parse(sessionStorage.getItem('profitpath-design-prototype-v1')!).model);
      expect(persisted.offerings[5].priceMonthly).toBe(240);
      await page.getByLabel('Price per session (USD)', { exact: true }).fill('70');
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect(page.getByLabel('Price per session (USD)', { exact: true })).toHaveValue('60');
      await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Results', exact: true }).click();
      await page.goBack();
      await expect(page.getByLabel('Price per session (USD)', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('Price per session (USD)', { exact: true })).toHaveValue('60');
      expect(await page.evaluate(() => localStorage.getItem('profitpath-state'))).toBeNull();
      if (width === 375) {
        await page.getByRole('button', { name: 'Back to offerings', exact: true }).click();
        await expect(page.locator('[data-offering="hybrid-5"]')).toBeFocused();
        await expect(page.getByRole('searchbox', { name: 'Find an offering' })).toHaveValue('');
      }
    });
  });
}

for (const theme of ['light', 'dark']) {
  test(`keyboard flow and axe across prototype workspaces in ${theme}`, async ({ page }) => {
    await start(page);
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch color theme' }).click();
    for (const workspace of ['Model', 'Results', 'Compare']) {
      const link = page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: workspace, exact: true });
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);
    }
    await section(page, 'offerings');
    await page.locator('[data-offering="fitness-1"]').click();
    await page.getByText('Delivery and costs · in use', { exact: true }).click();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);
  });
}

test('prototype uses the canonical calculator for unchanged synthetic inputs', async ({ page }) => {
  await start(page, 'hybrid');
  const expected = calc(hybridFixture(), { ignoreCase: true });
  const text = await page.locator('[data-metric="income"]').textContent();
  expect(text).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(expected.income));
  const template = fitnessFixture();
  expect(calc(template, { ignoreCase: true }).revenue).toBeGreaterThan(0);
});
