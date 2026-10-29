import { test, expect, type Page } from '@playwright/test';
import { fitnessFixture, hybridFixture } from '../../assets/prototypes/fixtures';
import { readFile } from 'node:fs/promises';
import { readXLSX } from '../../assets/utils/xlsx';
import { calc } from '../../src/calculations/index';
import { applyRangeCase } from '../../src/calculations/rangeCase';
import { fmtMoney0 } from '../../src/calculations/currency';

async function open(page: Page) {
  await page.addInitScript(model => {
    if (!localStorage.getItem('profitpath-state')) localStorage.setItem('profitpath-state', JSON.stringify(model));
    localStorage.setItem('profitpath-onboarding-completed', 'true');
  }, hybridFixture());
  await page.goto('/?layout=workspaces&view=results');
  await expect(page.locator('#workspaceResults')).toBeVisible();
}
test('a shared case preserves the conclusion and raw assumptions', async ({ page, browser }) => {
  await open(page);
  await page.locator('[data-case="conservative"]').click();
  const expected = await page.evaluate(() => ({ income: window.calc(window.state).income, inputs: JSON.stringify(window.state.offerings) }));
  const url = await page.evaluate(() => window.encodeScenarioToURL(window.state));
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.addInitScript(() => localStorage.setItem('profitpath-onboarding-completed', 'true'));
  await recipient.goto(url!);
  await expect(recipient.locator('#kpiIncome')).toBeVisible();
  expect(await recipient.evaluate(() => window.calc(window.state).income)).toBeCloseTo(expected.income, 8);
  expect(await recipient.evaluate(() => JSON.stringify(window.state.offerings))).toBe(expected.inputs);
  await context.close();
});

test('a Classic snapshot keeps the selected case and read-only lock for a fresh recipient', async ({ page, browser }) => {
  await open(page);
  await page.goto('/?layout=legacy&case=conservative');
  await page.waitForFunction(() => Boolean(window.lastMetrics));
  const expected = await page.evaluate(() => ({
    income: window.calc(window.state).income,
    inputs: JSON.stringify(window.state.offerings),
    url: window.encodeScenarioToURL(window.state, { readonly: true })
  }));
  expect(new URL(expected.url!).searchParams.get('case')).toBe('conservative');
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.addInitScript(() => localStorage.setItem('profitpath-onboarding-completed', 'true'));
  await recipient.goto(expected.url!);
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  expect(await recipient.evaluate(() => window.calc(window.state).income)).toBeCloseTo(expected.income, 8);
  expect(await recipient.evaluate(() => JSON.stringify(window.state.offerings))).toBe(expected.inputs);
  await recipient.reload();
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  expect(await recipient.evaluate(() => window.calc(window.state).income)).toBeCloseTo(expected.income, 8);
  await context.close();
});

test('opening a shared snapshot asks before replacing a local draft', async ({ page }) => {
  await open(page);
  const url = await page.evaluate(() => window.encodeScenarioToURL({ ...window.state, monthlyCosts: 999 }));
  await page.goto(url!);
  await expect(page.getByRole('dialog', { name: 'Open shared snapshot?' })).toBeVisible();
  expect(await page.evaluate(() => window.state.monthlyCosts)).toBe(200);
  await page.getByRole('button', { name: 'Keep my draft', exact: true }).click();
  expect(await page.evaluate(() => window.state.monthlyCosts)).toBe(200);
});

test('primary results and all specialist tools have reachable homes at Beginner', async ({ page }) => {
  await open(page);
  for (const metric of ['#kpiIncome', '#kpiRevenue', '#kpiCapacity']) {
    await expect(page.locator('#workspacePrimaryMetrics').locator(metric)).toBeVisible();
  }
  const tools = [
    ['Which services contribute most?', '#mixOptimizerToggle'],
    ['What would reach my income target?', '#reverseToggle'],
    ['What would reach my income target?', '#insightsToggle'],
    ['How do customer plans work?', '#membershipToggle'],
    ['How do customer plans work?', '#customerAnalyticsToggle'],
    ['Explore price and capacity assumptions', '#advancedChartsToggle'],
    ['Explore price and capacity assumptions', '#sensitivityToggle']
  ];
  for (const [question, selector] of tools) {
    const details = page.locator('.workspace-question').filter({ has: page.locator('summary', { hasText: question }) });
    await details.locator('summary').click();
    await expect(page.locator(selector)).toBeVisible();
    await details.locator('summary').click();
  }
});

test('reviewed CSV keeps the selected case when reimported', async ({ page }) => {
  await open(page);
  await page.locator('[data-case="conservative"]').click();
  const expected = await page.evaluate(() => window.calc(window.state).income);
  await page.locator('.workspace-context').getByRole('button', { name: 'Share / export', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Review your conclusion' })).toContainText('Conservative');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'CSV spreadsheet', exact: true }).click()
  ]);
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('Range case: Conservative case');
  await page.locator('[data-case="base"]').click();
  await page.evaluate(() => { window.state.monthlyCosts = 999; window.render(); });
  await page.locator('#csvFileInput').setInputFiles({ name: 'conclusion.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect.poll(() => page.evaluate(() => window.calc(window.state).income)).toBeCloseTo(expected, 6);
  await expect(page.locator('#workspaceContext')).toContainText('Conservative');
});

test('shared read-only fields stay locked after rendering and reload; Try a change creates an editable copy', async ({ page, browser }) => {
  await open(page);
  const url = await page.evaluate(() => window.encodeScenarioToURL(window.state, { readonly: true }));
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.addInitScript(() => localStorage.setItem('profitpath-onboarding-completed', 'true'));
  await recipient.goto(url!);
  await expect(recipient.locator('#workspaceResults')).toBeVisible();
  await recipient.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Model', exact: true }).click();
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  const ids = await recipient.evaluate(() => window.state.offerings.map(offering => offering.id));
  await recipient.reload();
  expect(await recipient.evaluate(() => window.state.offerings.map(offering => offering.id))).toEqual(ids);
  await expect(recipient.locator('#modeSelect')).toBeDisabled();
  await recipient.locator('#workspaceTryChange').click();
  await recipient.getByLabel('Alternative name', { exact: true }).fill('My editable copy');
  await recipient.getByRole('button', { name: 'Create alternative', exact: true }).click();
  await recipient.locator('[data-offering-id="hybrid-0"]').click();
  await expect(recipient.locator('#workspaceOfferingEditor input[data-k="priceMonthly"]')).toBeEnabled();
  expect(new URL(recipient.url()).searchParams.has('readonly')).toBe(false);
  await context.close();
});

test('the 375px Results screen shows all three primary figures without horizontal scroll', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('workspace-results-mobile.png') });
  const actionRows = await page.locator('.workspace-context .workspace-actions').evaluate(element =>
    [...element.children].map(action => action.getBoundingClientRect().top)
  );
  expect(new Set(actionRows).size, 'Primary actions must fit above the Results without an extra row').toBe(1);
  const bounds = await page.locator('#workspacePrimaryMetrics').boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(754);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(375);
});

test('comparison embed carries both snapshots to a fresh recipient', async ({ page, browser }) => {
  const base = fitnessFixture();
  await page.addInitScript(model => {
    localStorage.setItem('profitpath-scenarios', JSON.stringify([
      { id: 'base', name: 'Baseline', state: model },
      { id: 'alternative', name: 'Higher overhead', state: { ...model, monthlyCosts: 500 } }
    ]));
  }, base);
  await open(page);
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Compare', exact: true }).click();
  await page.getByLabel('Baseline', { exact: true }).selectOption('base');
  await page.getByLabel('Alternative', { exact: true }).selectOption('alternative');
  await page.locator('.workspace-context').getByRole('button', { name: 'Share / export', exact: true }).click();
  await page.getByRole('button', { name: 'Embed comparison', exact: true }).click();
  const embed = await page.locator('.modal-overlay textarea').inputValue();
  const src = await page.evaluate(markup => new DOMParser().parseFromString(markup, 'text/html').querySelector('iframe')!.src, embed);
  expect(new URL(src).searchParams.has('compareStates')).toBe(true);
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.goto(src);
  await expect(recipient.getByRole('dialog')).toContainText('Baseline');
  await expect(recipient.getByRole('dialog')).toContainText('Higher overhead');
  await context.close();
});

test('a shared comparison keeps its snapshots available for export and closes cleanly', async ({ page }) => {
  const model = fitnessFixture();
  const payload = Buffer.from(JSON.stringify({
    s1: { name: 'Baseline café', state: model },
    s2: { name: 'Higher overhead', state: { ...model, monthlyCosts: 500 } }
  })).toString('base64');
  await page.addInitScript(() => localStorage.setItem('profitpath-onboarding-completed', 'true'));
  await page.goto('/?layout=workspaces&case=conservative&compareStates=' + encodeURIComponent(payload));
  const dialog = page.getByRole('dialog', { name: 'Scenario Comparison: Baseline café vs Higher overhead', exact: true });
  await expect(dialog).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export CSV', exact: false }).click()
  ]);
  expect(await readFile((await download.path())!, 'utf8')).toContain('Baseline café');
  await dialog.getByRole('button', { name: 'Get Embed Code', exact: false }).click();
  const embedDialog = page.getByRole('dialog', { name: 'Embed Comparison', exact: false });
  const embed = await embedDialog.locator('textarea').inputValue();
  expect(embed).toContain('compareStates=');
  await embedDialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('profitpath-scenarios'))).toBeNull();
});

test('comparison CSV and PDF identify the selected case and keep the displayed financial metrics', async ({ page, context }) => {
  await context.addInitScript(() => { window.print = () => {}; });
  const model = fitnessFixture();
  model.offerings[0].sessionsPerYearLow = 24;
  model.offerings[0].sessionsPerYearHigh = 60;
  const alternative = { ...model, monthlyCosts: 500 };
  const payload = Buffer.from(JSON.stringify({
    s1: { name: 'Baseline', state: model },
    s2: { name: 'Higher overhead', state: alternative }
  })).toString('base64');
  await page.addInitScript(() => localStorage.setItem('profitpath-onboarding-completed', 'true'));
  for (const selected of ['base', 'conservative', 'optimistic'] as const) {
    await page.goto('/?layout=workspaces&case=' + selected + '&compareStates=' + encodeURIComponent(payload));
    const dialog = page.getByRole('dialog', { name: 'Scenario Comparison: Baseline vs Higher overhead', exact: true });
    await expect(dialog).toBeVisible();
    const label = selected[0].toUpperCase() + selected.slice(1) + ' case';
    const rows = await dialog.locator('.scenario-diff-row').evaluateAll(elements =>
      elements.slice(0, 8).map(row => [...row.children].map(cell => cell.textContent!.trim()))
    );
    expect(rows.find(row => row[0] === 'Net Income')![1]).toBe(
      fmtMoney0(calc(applyRangeCase(model, selected), { ignoreCase: true }).income)
    );
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Export CSV', exact: false }).click()
    ]);
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv).toContain('Range case: ' + label);
    expect(csv).toContain('Annual results');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      dialog.getByRole('button', { name: 'Export PDF', exact: false }).click()
    ]);
    await expect(popup.locator('body')).toContainText(label);
    await expect(popup.locator('body')).toContainText('Annual results');
    for (const row of rows) {
      for (const cell of row) {
        expect(csv).toContain(cell.replace(/"/g, '""'));
        await expect(popup.locator('body')).toContainText(cell);
      }
    }
    await popup.close();
    await dialog.getByRole('button', { name: 'Get Embed Code', exact: false }).click();
    const embed = await page.getByRole('dialog', { name: 'Embed Comparison', exact: false }).locator('textarea').inputValue();
    expect(embed).toContain('case=' + selected);
  }
});

test('a snapshot remains recoverable after a draft storage quota failure', async ({ page, browser }) => {
  await open(page);
  const url = await page.evaluate(() => window.encodeScenarioToURL(window.state, { readonly: true }));
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'profitpath-state') throw new DOMException('Storage full', 'QuotaExceededError');
      setItem.call(this, key, value);
    };
    localStorage.setItem('profitpath-onboarding-completed', 'true');
  });
  await recipient.goto(url!);
  await expect(recipient.locator('#workspaceSaveStatus')).toContainText('Draft could not be saved');
  expect(new URL(recipient.url()).searchParams.has('scenario')).toBe(true);
  await recipient.reload();
  await expect(recipient.locator('#workspaceSaveStatus')).toContainText('Draft could not be saved');
  expect(await recipient.evaluate(() => window.state.offerings[0].id)).toBe('hybrid-0');
  expect(await recipient.evaluate(() => localStorage.getItem('profitpath-state'))).toBeNull();
  await context.close();
});

test('reviewed downloads and print reports use the active case and current staffing', async ({ page, context }) => {
  await context.addInitScript(() => { window.print = () => {}; });
  await open(page);
  await page.locator('[data-case="conservative"]').click();
  const review = async () => {
    await page.locator('.workspace-context').getByRole('button', { name: 'Share / export', exact: true }).click();
  };
  await review();
  await expect(page.getByRole('button', { name: 'Email report', exact: true })).toBeVisible();
  const expected = await page.evaluate(() => ({
    income: document.querySelector('#kpiIncome')!.textContent!.trim(),
    revenue: document.querySelector('#kpiRevenue')!.textContent!.trim(),
    notes: window.state.notes
  }));
  const [html] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'HTML page', exact: true }).click()
  ]);
  const report = await readFile((await html.path())!, 'utf8');
  expect(report).toContain('Conservative case');
  expect(report).not.toContain('undefined');
  expect(report).toContain('Annual Payroll:');
  expect(report).toContain('Net income before tax');
  expect(report).toContain(expected.income);
  expect(report).toContain(expected.revenue);
  expect(report).toContain(expected.notes);
  expect(report).toContain('$60/session');
  expect(report).toContain('$120/sale');
  await review();
  const [excel] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Excel workbook', exact: true }).click()
  ]);
  const sheets = readXLSX(new Uint8Array(await readFile((await excel.path())!)));
  expect(sheets.find(sheet => sheet.name === 'Report')!.rows.flat().join(' ')).toContain('Conservative case');
  for (const format of ['PDF report', 'Financial report']) {
    await review();
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: format, exact: true }).click()
    ]);
    await expect(popup.locator('body')).toContainText('Conservative case');
    await expect(popup.locator('body')).not.toContainText('undefined');
    await expect(popup.locator('body')).toContainText(expected.income);
    await expect(popup.locator('body')).toContainText(expected.revenue);
    await expect(popup.locator('body')).toContainText(expected.notes);
    await popup.close();
  }
  await review();
  await page.getByRole('button', { name: 'Embed widget', exact: true }).click();
  const embed = await page.locator('#embedCodeText').inputValue();
  const src = await page.evaluate(markup => new DOMParser().parseFromString(markup, 'text/html').querySelector('iframe')!.src, embed);
  expect(new URL(src).searchParams.get('case')).toBe('conservative');
  expect(new URL(src).searchParams.has('scenario')).toBe(true);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await review();
  await page.getByRole('button', { name: 'Scheduling information', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('not yet available');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await review();
  await page.getByRole('button', { name: 'Share snapshot link', exact: true }).click();
  const readonly = new URL(await page.getByRole('textbox', { name: 'View Only link', exact: true }).inputValue());
  expect(readonly.searchParams.get('case')).toBe('conservative');
  expect(readonly.searchParams.get('readonly')).toBe('1');
});
