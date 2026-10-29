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

async function settings(page: Page) {
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.locator('.app-drawer .drawer-item', { hasText: 'Settings' }).click();
  return page.getByRole('dialog', { name: 'Settings', exact: true });
}

async function classic(page: Page) {
  await expect(page.locator('body')).not.toHaveClass(/workspace-layout/);
  await page.waitForFunction(() => Boolean(window.lastMetrics));
}

for (const width of [1440, 375]) {
  test(`layout choice keeps the model, selected case and saved scenarios at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await open(page);
    await page.getByLabel('Scenario name', { exact: true }).fill('Layout baseline');
    await page.getByRole('button', { name: 'Save scenario', exact: true }).click();
    await page.goto('/?layout=workspaces&view=results&keep=value');
    await page.locator('[data-case="conservative"]').click();
    const before = await page.evaluate(() => ({
      state: JSON.stringify(window.state),
      income: window.calc(window.state).income,
      scenarios: localStorage.getItem('profitpath-scenarios')
    }));
    await (await settings(page)).getByLabel('Layout', { exact: true }).selectOption('legacy');
    await classic(page);
    await expect(page.locator('#controls')).toBeVisible();
    expect(new URL(page.url()).searchParams.get('keep')).toBe('value');
    expect(await page.evaluate(() => window.calc(window.state).income)).toBeCloseTo(before.income, 8);
    await page.reload();
    await classic(page);
    expect(await page.evaluate(() => window.calc(window.state).income)).toBeCloseTo(before.income, 8);
    await (await settings(page)).getByLabel('Layout', { exact: true }).selectOption('workspaces');
    await expect(page.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
    expect(await page.evaluate(() => window.calc(window.state).income)).toBeCloseTo(before.income, 8);
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify(window.state))).toBe(before.state);
    expect(await page.evaluate(() => localStorage.getItem('profitpath-scenarios'))).toBe(before.scenarios);
    await page.goto('/?layout=legacy');
    await classic(page);
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
    await (await settings(page)).getByLabel('Layout', { exact: true }).selectOption('legacy');
    await classic(page);
    await page.goto('/');
    await classic(page);
    await page.goto('/?layout=workspaces');
    await expect(page.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
  });
}

test('layout switching keeps incomplete edits visible and blocks reload on a draft-save failure', async ({ page }) => {
  await open(page);
  await page.goto('/?layout=workspaces&view=model/offerings');
  await page.locator('[data-offering-id="hybrid-0"]').click();
  const price = page.locator('#workspaceOfferingEditor input[data-k="priceMonthly"]');
  await price.fill('');
  await (await settings(page)).getByLabel('Layout', { exact: true }).selectOption('legacy');
  await expect(price).toBeFocused();
  await expect(price).toHaveValue('');
  expect(new URL(page.url()).searchParams.get('layout')).toBe('workspaces');
  await price.fill('180');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'profitpath-state') throw new DOMException('Storage full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  const dialog = await settings(page);
  await dialog.getByLabel('Layout', { exact: true }).selectOption('legacy');
  await expect(dialog.getByLabel('Layout', { exact: true })).toHaveValue('workspaces');
  expect(new URL(page.url()).searchParams.get('layout')).toBe('workspaces');
});

test('switching layouts preserves a shared read-only model across reloads', async ({ page, browser }) => {
  await open(page);
  const url = await page.evaluate(() => window.encodeScenarioToURL(window.state, { readonly: true }));
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.addInitScript(() => localStorage.setItem('profitpath-onboarding-completed', 'true'));
  await recipient.goto(url!);
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  const before = await recipient.evaluate(() => JSON.stringify(window.state));
  await (await settings(recipient)).getByLabel('Layout', { exact: true }).selectOption('legacy');
  await classic(recipient);
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  expect(new URL(recipient.url()).searchParams.get('readonly')).toBe('1');
  await recipient.reload();
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  await (await settings(recipient)).getByLabel('Layout', { exact: true }).selectOption('workspaces');
  await expect(recipient.getByRole('navigation', { name: 'Workspaces' })).toBeVisible();
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  expect(await recipient.evaluate(() => JSON.stringify(window.state))).toBe(before);
  await context.close();
});

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
