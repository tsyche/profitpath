import { test, expect, type Page } from '@playwright/test';
import { hybridFixture } from '../../assets/prototypes/fixtures';

async function open(page: Page, mode: 'forecast' | 'current' = 'forecast') {
  const fixture = hybridFixture(); fixture.mode = mode;
  await page.addInitScript(model => {
    localStorage.setItem('profitpath-state', JSON.stringify(model));
    localStorage.setItem('profitpath-onboarding-completed', 'true');
  }, fixture);
  await page.goto('/?layout=workspaces&view=model/offerings');
  await expect(page.locator('#workspaceModel')).toBeVisible();
}
test('partial price editing preserves the last valid calculation and persisted value', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Use table view', exact: true }).click();
  const price = page.locator('#offeringsBody input[data-k="priceMonthly"]').first();
  await price.fill('');
  expect(await page.evaluate(() => window.state.offerings[0].priceMonthly)).toBe(180);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('profitpath-state')!).offerings[0].priceMonthly)).toBe(180);
});

test('the mobile dense table scrolls within its region and preserves focused editing', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  await page.getByRole('button', { name: 'Use table view', exact: true }).click();
  const region = page.getByRole('region', { name: 'All offerings table; scroll horizontally or use the focused editor', exact: true });
  await region.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  expect(await region.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(375);
  await page.getByRole('button', { name: 'Use focused editor', exact: true }).click();
  await page.locator('[data-offering-id="hybrid-0"]').click();
  await expect(page.locator('#workspaceOfferingEditor')).toBeVisible();
});

test('inline entry previews an example, skips automatic tours, and keeps named scenarios', async ({ page }) => {
  await page.goto('/?layout=workspaces');
  await expect(page.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
  await page.getByRole('button', { name: 'Use an example', exact: true }).click();
  await page.getByLabel('Business example', { exact: true }).selectOption('fitness');
  await expect(page.getByRole('dialog')).toContainText('Personal Training Sessions');
  await page.getByRole('button', { name: 'Use this example', exact: true }).click();
  await expect(page.locator('.workspace-offering-row')).toHaveCount(3);
  await page.locator('#workspaceSave').click();
  const names = await page.evaluate(() => window.getAllScenarios().map(scenario => scenario.name));
  await page.reload();
  await expect(page.locator('.onboarding-dialog-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => window.getAllScenarios().map(scenario => scenario.name))).toEqual(names);
});

test('adding an offering is undoable and named scenarios never receive an incomplete price', async ({ page }) => {
  await open(page);
  await page.locator('#addOfferingBtn').click();
  expect(await page.evaluate(() => window.state.offerings.length)).toBe(13);
  await page.locator('#undoBtn').click();
  expect(await page.evaluate(() => window.state.offerings.length)).toBe(12);
  await page.locator('[data-offering-id="hybrid-0"]').click();
  await page.locator('#workspaceOfferingEditor input[data-k="priceMonthly"]').fill('');
  await expect(page.locator('#workspaceSave')).toBeDisabled();
  await page.evaluate(() => window.saveScenario('Incomplete'));
  expect(await page.evaluate(() => window.getAllScenarios())).toEqual([]);
  expect(await page.evaluate(() => window.encodeScenarioToURL(window.state))).toBeNull();
});

for (const width of [1440, 375]) {
  for (const mode of ['forecast', 'current'] as const) {
    test(`focused ${mode} editing preserves uncertainty, resources, costs, undo and invalid text at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, mode);
      await page.getByRole('searchbox', { name: 'Find an offering' }).fill('practice');
      await expect(page.locator('.workspace-offering-row')).toHaveCount(1);
      await page.locator('[data-offering-id="hybrid-5"]').click();
      const editor = page.locator('#workspaceOfferingEditor');
      await expect(editor).toContainText('Practice booth');
      await editor.getByText(/Delivery and costs/).click();
      await expect(editor.getByLabel('Resource used by Practice booth', { exact: true })).toHaveValue('booth');
      const price = editor.getByLabel('Price per session for Practice booth', { exact: true });
      const before = await page.locator('#setupSummaryIncome').textContent();
      await price.fill('');
      await expect(price).toHaveAttribute('aria-invalid', 'true');
      await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Results', exact: true }).click();
      await page.getByRole('link', { name: 'Edit this model', exact: true }).click();
      await expect(editor.getByLabel('Price per session for Practice booth', { exact: true })).toHaveValue('');
      await editor.getByLabel('Price per session for Practice booth', { exact: true }).fill('70');
      await expect(page.locator('#setupSummaryIncome')).not.toHaveText(before!);
      await editor.getByText(/Pricing assumptions/).click();
      await editor.getByLabel('Sales loss base for Practice booth', { exact: true }).fill('15');
      expect(await page.evaluate(() => window.state.offerings[5].salesLossPct)).toBe(15);
      await page.locator('#undoBtn').click();
      expect(await page.evaluate(() => window.state.offerings[5].salesLossPct)).toBe(5);
      await page.locator('#redoBtn').click();
      expect(await page.evaluate(() => window.state.offerings[5].salesLossPct)).toBe(15);
      expect(await page.evaluate(() => window.state.resources?.find(resource => resource.id === 'booth')?.staffFree)).toBe(true);
      expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}
