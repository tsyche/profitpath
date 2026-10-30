import { expect, test, type Page } from '@playwright/test';
import { fitnessFixture } from '../../assets/prototypes/fixtures';
import AxeBuilder from '@axe-core/playwright';

async function open(page: Page) {
  await page.addInitScript(model => {
    localStorage.setItem('profitpath-onboarding-completed', 'true');
    if (!localStorage.getItem('profitpath-state')) localStorage.setItem('profitpath-state', JSON.stringify(model));
  }, fitnessFixture());
  await page.goto('/?layout=workspaces');
  await expect(page.locator('#workspaceModel')).toBeVisible();
}

test('a returning mobile model keeps guidance optional and summary totals readable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  const guide = page.locator('.workspace-getting-started');
  await expect.soft(guide).not.toHaveAttribute('open');
  await page.locator('#modeSelect').selectOption('current');
  const figures = await page.locator('.workspace-summary strong').evaluateAll(elements => elements.map(el => ({
    name: el.id, content: el.scrollWidth, width: el.clientWidth
  })));
  for (const figure of figures) expect.soft(figure.content, figure.name).toBeLessThanOrEqual(figure.width);
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Results', exact: true }).click();
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Model', exact: true }).click();
  await expect(guide).not.toHaveAttribute('open');
});

for (const width of [1440, 375]) {
  test(`the model overflow aligns, dismisses and restores focus at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 812 });
    await open(page);
    const more = page.locator('.workspace-context-more');
    await more.locator('summary').click();
    await expect(more).toHaveAttribute('open', '');
    const bounds = await more.getByRole('group', { name: 'More model actions' }).boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath('workspace-menu.png') });
    await page.locator('#workspaceModelTitle').click();
    await expect(more).not.toHaveAttribute('open');
    await more.locator('summary').click();
    await page.keyboard.press('Escape');
    await expect(more).not.toHaveAttribute('open');
    await expect(more.locator('summary')).toBeFocused();
    await more.locator('summary').click();
    await more.getByRole('button', { name: 'Saved scenarios', exact: true }).click();
    const scenarios = page.locator('#scenariosModal');
    await expect(scenarios).toBeVisible();
    await expect(more).not.toHaveAttribute('open');
    const list = await scenarios.locator('#scenariosList').boundingBox();
    const actions = await scenarios.locator('.scenario-bundle-actions').boundingBox();
    expect(actions!.y - list!.y - list!.height).toBeGreaterThanOrEqual(12);
    await page.screenshot({ path: info.outputPath('workspace-scenarios.png') });
    await page.locator('#scenariosModal .modal-close').click();
    await expect(more.locator('summary')).toBeFocused();
  });
}

for (const width of [1440, 375]) {
  test(`workspace context has equal tabs, intentional actions, click-to-rename and clear modes at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 812 });
    await open(page);
    const nav = page.getByRole('navigation', { name: 'Workspaces' });
    const boxes = await nav.getByRole('link').evaluateAll(links => links.map(link => {
      const rect = link.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    expect(Math.max(...boxes.map(b => b.width)) - Math.min(...boxes.map(b => b.width))).toBeLessThan(1);
    expect(Math.max(...boxes.map(b => b.height)) - Math.min(...boxes.map(b => b.height))).toBeLessThan(1);
    await expect(page.locator('#workspaceName')).toBeHidden();
    await expect(page.locator('#workspaceRename')).toContainText('Name your model');
    await page.locator('#workspaceSave').click();
    await expect(page.getByLabel('Model name', { exact: true })).toBeFocused();
    expect(await page.evaluate(() => window.getAllScenarios())).toEqual([]);
    await page.keyboard.press('Escape');
    await page.locator('#workspaceRename').click();
    await page.getByLabel('Model name', { exact: true }).fill('My studio');
    await page.keyboard.press('Enter');
    await expect(page.locator('#workspaceName')).toBeHidden();
    await expect(page.locator('#workspaceRename')).toContainText('My studio');
    await page.reload();
    await expect(page.locator('#workspaceRename')).toContainText('My studio');
    await page.locator('#workspaceRename').click();
    await page.getByLabel('Model name', { exact: true }).fill('Discard this rename');
    await page.keyboard.press('Escape');
    await expect(page.locator('#workspaceRename')).toContainText('My studio');
    await page.getByRole('button', { name: 'Save scenario', exact: true }).click();
    expect(await page.evaluate(() => window.getAllScenarios().map(s => s.name))).toEqual(['My studio']);
    await expect(page.locator('#workspaceModeBadge')).toContainText('Forecast');
    await expect(page.locator('#workspaceModeDescription')).toContainText('capacity');
    await page.locator('#modeSelect').selectOption('current');
    await expect(page.locator('#workspaceModeBadge')).toContainText('Current');
    await expect(page.locator('#workspaceModeDescription')).toContainText('existing');
    const settings = page.locator('#workspaceBusinessSettings');
    await expect(settings.getByLabel('Currency')).toBeVisible();
    const bounds = await settings.boundingBox();
    const currency = await settings.getByLabel('Currency').boundingBox();
    expect(currency!.y - bounds!.y).toBeGreaterThanOrEqual(16);
    expect(bounds!.y + bounds!.height - currency!.y - currency!.height).toBeGreaterThanOrEqual(16);
    if (width === 375) {
      const actions = await page.locator('.workspace-context-actions > :is(button,details)').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().y));
      expect(Math.max(...actions) - Math.min(...actions)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    const axe = await new AxeBuilder({ page }).include('#workspaceApp').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.locator('#workspaceModel').focus();
    await page.mouse.move(0, 0);
    await page.getByText('Scenario saved successfully!', { exact: true }).waitFor({ state: 'hidden' });
    await page.screenshot({ path: info.outputPath('workspace-context.png') });
    await settings.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('workspace-business.png') });
  });
}

for (const layout of ['workspaces', 'legacy']) {
  test(`the page scrolls once: body is not a nested scroll container (${layout})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 812 });
    await page.addInitScript(model => {
      localStorage.setItem('profitpath-onboarding-completed', 'true');
      if (!localStorage.getItem('profitpath-state')) localStorage.setItem('profitpath-state', JSON.stringify(model));
    }, fitnessFixture());
    await page.goto(`/?layout=${layout}`);
    await expect(page.locator('#offeringsBody, #workspaceModel').first()).toBeAttached();
    const nested = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return /(auto|scroll)/.test(style.overflowY) && document.body.scrollHeight > document.body.clientHeight + 1;
    });
    expect(nested).toBe(false);
  });
}
