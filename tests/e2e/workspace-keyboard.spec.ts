import { test, expect, type Locator, type Page } from '@playwright/test';

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const visited: string[] = [];
  for (let step = 0; step < 90; step++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    visited.push(await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      return element.id || `${element.tagName}:${element.textContent?.trim().slice(0, 45)}`;
    }));
    const backwards = await target.evaluate(element =>
      Boolean(element.compareDocumentPosition(document.activeElement!) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
  }
  throw new Error(`Keyboard cannot reach ${await target.getAttribute('id') || await target.textContent()}; visited ${visited.slice(-20).join(', ')}`);
}

async function activate(page: Page, target: Locator) {
  await tabTo(page, target);
  await page.keyboard.press('Enter');
}

async function typeValue(page: Page, target: Locator, value: string) {
  await tabTo(page, target);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  if (value) await page.keyboard.type(value);
  await page.keyboard.press('Tab');
}

for (const width of [1440, 375]) {
  test(`a complete template, alternative, comparison and share journey works with only the keyboard at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?layout=workspaces');
    await activate(page, page.getByRole('button', { name: 'Use an example', exact: true }));
    await tabTo(page, page.getByLabel('Business example', { exact: true }));
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await activate(page, page.getByRole('button', { name: 'Use this example', exact: true }));
    await expect(page.locator('#workspaceModel')).toBeFocused();
    await typeValue(page, page.getByLabel('Scenario name', { exact: true }), 'Keyboard baseline');
    await activate(page, page.getByRole('button', { name: 'Save scenario', exact: true }));
    await expect(page.locator('#workspaceSaveStatus')).toContainText('Matches saved scenario');
    await activate(page, page.locator('#workspaceTryChange'));
    await typeValue(page, page.getByLabel('Alternative name', { exact: true }), 'Keyboard alternative');
    await activate(page, page.getByRole('button', { name: 'Create alternative', exact: true }));
    await activate(page, page.getByRole('button', { name: /^Personal Training Sessions subscription/ }));
    const price = page.locator('#workspaceOfferingEditor input[data-k="priceMonthly"]');
    await typeValue(page, price, '');
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#workspaceSave')).toBeDisabled();
    await typeValue(page, price, '320');
    await activate(page, page.locator('[data-editor-group="pricing"] > summary'));
    await typeValue(page, page.locator('#workspaceOfferingPricing input[data-k="salesLossPct"]'), '10');
    await activate(page, page.getByRole('button', { name: 'Save scenario', exact: true }));
    const nav = page.getByRole('navigation', { name: 'Workspaces' });
    await activate(page, nav.getByRole('link', { name: 'Results', exact: true }));
    await expect(page.locator('#workspaceResults')).toBeFocused();
    await expect(page.locator('#workspacePrimaryMetrics')).toContainText('Net income before tax');
    await activate(page, nav.getByRole('link', { name: 'Compare', exact: true }));
    await tabTo(page, page.getByLabel('Baseline', { exact: true }));
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await tabTo(page, page.getByLabel('Alternative', { exact: true }));
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await activate(page, page.getByRole('button', { name: 'Compare options', exact: true }));
    await expect(page.getByRole('dialog')).toContainText('Keyboard baseline');
    await expect(page.getByRole('dialog')).toContainText('Keyboard alternative');
    await page.keyboard.press('Escape');
    await expect(page.locator('#workspaceCompareButton')).toBeFocused();
    await activate(page, page.locator('.workspace-context').getByRole('button', { name: 'Share / export', exact: true }));
    await expect(page.getByRole('dialog', { name: 'Review your conclusion', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.workspace-context').getByRole('button', { name: 'Share / export', exact: true })).toBeFocused();
    const saved = await page.evaluate(() => window.getAllScenarios().map(scenario => ({
      name: scenario.name, price: scenario.state.offerings?.[0]?.priceMonthly
    })));
    expect(saved).toEqual([
      { name: 'Keyboard baseline', price: 300 },
      { name: 'Keyboard alternative', price: 320 }
    ]);
  });
}
