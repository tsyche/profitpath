import { test, expect, type Page } from '@playwright/test';
import { hybridFixture } from '../../assets/prototypes/fixtures';

async function open(page: Page) {
  await page.addInitScript(model => {
    if (!localStorage.getItem('profitpath-state')) localStorage.setItem('profitpath-state', JSON.stringify(model));
    localStorage.setItem('profitpath-onboarding-completed', 'true');
  }, hybridFixture());
  await page.goto('/?layout=workspaces');
  await expect(page.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
}

for (const width of [1440, 375]) {
  test(`workspace navigation keeps state, undo, URL parameters and focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const before = await page.evaluate(() => JSON.stringify(window.state));
    const nav = page.getByRole('navigation', { name: 'Workspaces' });
    await nav.getByRole('link', { name: 'Results', exact: true }).click();
    await expect(page.locator('#workspaceResults')).toBeVisible();
    await expect(page.locator('#workspaceModel')).toBeHidden();
    await expect(page.locator('#workspaceResults')).toBeFocused();
    expect(new URL(page.url()).searchParams.get('layout')).toBe('workspaces');
    expect(await page.evaluate(() => JSON.stringify(window.state))).toBe(before);
    await page.goBack();
    await expect(page.locator('#workspaceModel')).toBeVisible();
    await nav.getByRole('link', { name: 'Compare', exact: true }).click();
    await expect(page.locator('#workspaceCompare')).toBeVisible();
    await page.reload();
    await expect(page.locator('#workspaceCompare')).toBeVisible();
    expect(await page.evaluate(() => window.calc(window.state).revenue)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.locator('#undoBtn').isDisabled()).toBe(true);
  });
}

test('same destination works with the keyboard and invalid destinations fall back', async ({ page }) => {
  await open(page);
  const model = page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Model', exact: true });
  await model.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#workspaceModel')).toBeFocused();
  await page.goto('/?layout=workspaces&view=unknown&keep=value');
  await expect(page.locator('#workspaceModel')).toBeVisible();
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Results', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('keep')).toBe('value');
});

test('saved scenarios remain available and the comparison destination has an honest empty state', async ({ page }) => {
  await open(page);
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Compare', exact: true }).click();
  await expect(page.locator('#workspaceCompare')).toContainText('Save an option');
  await page.getByLabel('Scenario name', { exact: true }).fill('Baseline');
  await page.getByRole('button', { name: 'Save scenario', exact: true }).click();
  expect(await page.evaluate(() => window.getAllScenarios().map(scenario => scenario.name))).toEqual(['Baseline']);
  await expect(page.locator('#workspaceSaveStatus')).toContainText('Matches saved scenario');
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Model', exact: true }).click();
  await page.getByRole('navigation', { name: 'Model sections' }).getByRole('link', { name: 'Costs', exact: true }).click();
  await page.locator('#monthlyCosts').fill('500');
  await expect(page.locator('#workspaceSaveStatus')).toContainText('Draft saved on this device');
  await expect(page.locator('#workspaceSaveStatus')).toContainText('named scenario unchanged');
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Results', exact: true }).click();
  await page.locator('#undoBtn').click();
  expect(await page.evaluate(() => window.state.monthlyCosts)).toBe(200);
});
