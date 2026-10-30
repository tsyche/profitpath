import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { fitnessFixture } from '../../assets/prototypes/fixtures';

async function seed(page: Page) {
  await page.addInitScript(model => {
    localStorage.setItem('profitpath-onboarding-completed', 'true');
    if (localStorage.getItem('decision-fixture')) return;
    const state = { ...model, mode: 'current', currency: 'EUR', monthlyCosts: 123,
      offerings: [{ id: 'studio', name: 'Studio', type: 'per-session', priceMonthly: 60, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 10, laborPctOfPrice: 0, currentClients: 100, mixPct: 100, confidence: 'verified' }] };
    localStorage.setItem('profitpath-state', JSON.stringify(state));
    localStorage.setItem('profitpath-scenarios', JSON.stringify(['Today', 'Raise', 'Stress', 'Fourth'].map((name, i) => ({
      id: 'decision-' + i, name, timestamp: 'now', createdAt: new Date().toISOString(),
      state: { ...state, offerings: state.offerings.map(o => ({ ...o, priceMonthly: i ? 75 : 60, salesLossPct: i ? 10 : 0, salesLossPctHigh: i ? 30 : 0, confidence: i ? 'guess' : 'verified' })), monthlyCosts: i === 2 ? 400 : 123 }
    }))));
    localStorage.setItem('decision-fixture', '1');
  }, fitnessFixture());
}

for (const layout of ['legacy', 'workspaces']) {
  for (const width of [1440, 375]) {
    test(`${layout} ${width}px: three-option decision, case, goal, exports and isolated recipient`, async ({ page, browser }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await seed(page);
      await page.goto(`/?layout=${layout}`);
      await page.waitForFunction(() => Boolean(window.lastMetrics));
      if (layout === 'workspaces') {
        await page.locator('[data-workspace="compare"]').click();
        await page.locator('#workspaceDecisionButton').click();
      } else {
        await page.evaluate(() => window.openScenarioModal());
        await page.locator('#decisionWorkbenchBtn').click();
      }
      const picker = page.getByRole('dialog', { name: 'Choose decision options' });
      for (const label of ['Today', 'Raise', 'Stress']) await picker.getByRole('checkbox', { name: label, exact: true }).check();
      await picker.getByRole('button', { name: 'Open workbench' }).click();
      const workbench = page.getByRole('dialog', { name: 'Decision workbench', exact: true });
      await expect(workbench.locator('.decision-verdict')).toContainText('Raise');
      await expect(workbench).toContainText('EUR');
      await page.locator('#decisionGoal').fill('60000');
      await expect(workbench).toContainText('Below goal');
      await page.locator('#decisionCase').selectOption('conservative');
      await expect(workbench.locator('.decision-verdict')).toContainText('Today');
      await expect(workbench).toContainText('Conservative case');
      await expect(workbench).toContainText('100.0%');
      const summary = workbench.locator('[aria-label="Decision summary"]');
      await expect(summary.getByRole('columnheader', { name: 'Today (baseline)', exact: true })).toBeVisible();
      const header = await summary.getByRole('columnheader', { name: 'Today (baseline)', exact: true }).boundingBox();
      const firstValue = await summary.locator('tbody tr').first().locator('td').first().boundingBox();
      expect(header).not.toBeNull();
      expect(firstValue).not.toBeNull();
      expect(Math.abs(header!.x - firstValue!.x)).toBeLessThan(2);
      const results = await new AxeBuilder({ page }).include('#decisionResults').analyze();
      expect(results.violations).toEqual([]);
      expect(await workbench.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await workbench.screenshot({ path: testInfo.outputPath('decision-workbench.png') });

      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#decisionCSV').click()]);
      const csv = await readFile((await download.path())!, 'utf8');
      expect(csv).toContain('Conservative case');
      expect(csv).toContain('60000');
      expect(csv).toContain('Revenue change from baseline');
      expect(csv).toContain('Stress');
      expect(csv).toContain('Assumed sales loss %');
      expect(csv).toMatch(/"Studio","Raise",[^\n]*,"30"(?:\n|$)/);
      await page.evaluate(() => {
        window.open = () => {
          const report = { document: { write: (html: string) => { document.body.dataset.decisionPrint = html; }, close() {} }, focus() {}, print() {} };
          return report as unknown as Window;
        };
      });
      await page.locator('#decisionPrint').click();
      const printed = await page.locator('body').getAttribute('data-decision-print');
      expect(printed).toContain('Conservative case');
      expect(printed).toContain('Goal:');
      expect(printed).toMatch(/60[,.]000/);
      expect(printed).toContain('Stress');
      await page.locator('#decisionShare').click();
      const url = await page.locator('#decisionShareURL').inputValue();
      expect(new URL(url).searchParams.get('goal')).toBe('60000');
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const recipient = await context.newPage();
      await recipient.addInitScript(model => {
        localStorage.setItem('profitpath-onboarding-completed', 'true');
        if (!localStorage.getItem('profitpath-state')) {
          localStorage.setItem('profitpath-state', JSON.stringify({ ...model, monthlyCosts: 999 }));
          localStorage.setItem('profitpath-scenarios', '[]');
        }
      }, fitnessFixture());
      await recipient.goto(url);
      await expect(recipient.getByRole('dialog', { name: 'Decision workbench', exact: true })).toContainText('Conservative case');
      await expect(recipient.locator('#decisionGoal')).toHaveValue('60000');
      expect(await recipient.evaluate(() => window.state.monthlyCosts)).toBe(999);
      expect(await recipient.evaluate(() => localStorage.getItem('profitpath-scenarios'))).toBe('[]');
      await recipient.reload();
      await expect(recipient.locator('#decisionGoal')).toHaveValue('60000');
      await recipient.locator('#decisionBaseline').selectOption('1');
      await expect(recipient.locator('.decision-verdict')).toContainText('Today');
      await context.close();
    });
  }
}

test('a three-scenario bundle imports into the same workbench', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.lastMetrics));
  await page.evaluate(() => window.openScenarioModal());
  for (let i = 0; i < 3; i++) await page.locator('.bundle-select').nth(i).check();
  await page.locator('#shareBundleBtn').click();
  const url = await page.locator('#bundleShareUrl').inputValue();
  await page.evaluate(() => localStorage.setItem('profitpath-scenarios', '[]'));
  await page.goto(url);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.evaluate(() => window.openScenarioModal());
  await page.locator('#decisionWorkbenchBtn').click();
  const picker = page.getByRole('dialog', { name: 'Choose decision options' });
  await picker.getByRole('button', { name: 'Open workbench' }).click();
  await expect(picker).toContainText('Choose two to four');
  for (const checkbox of await picker.getByRole('checkbox').all()) await checkbox.check();
  await picker.getByRole('button', { name: 'Open workbench' }).click();
  await expect(page.locator('#decisionResults')).toContainText('Stress');
});

test('two and four options, keyboard selection, and untrusted names remain usable', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.lastMetrics));
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('profitpath-scenarios')!);
    saved[3].name = '=1+1<img src=x onerror="window.decisionXSS=1">';
    localStorage.setItem('profitpath-scenarios', JSON.stringify(saved));
    window.openScenarioModal();
  });
  await page.locator('#decisionWorkbenchBtn').click();
  const picker = page.getByRole('dialog', { name: 'Choose decision options' });
  const checks = picker.getByRole('checkbox');
  for (let i = 0; i < 2; i++) { await checks.nth(i).focus(); await page.keyboard.press('Space'); }
  await picker.getByRole('button', { name: 'Open workbench' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#decisionResults [aria-label="Decision summary"] thead th')).toHaveCount(3);
  await page.getByRole('dialog', { name: 'Decision workbench', exact: true }).getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('#decisionWorkbenchBtn').click();
  const newPicker = page.getByRole('dialog', { name: 'Choose decision options' });
  for (const checkbox of await newPicker.getByRole('checkbox').all()) await checkbox.check();
  await newPicker.getByRole('button', { name: 'Open workbench' }).click();
  await expect(page.locator('#decisionResults [aria-label="Decision summary"] thead th')).toHaveCount(5);
  await expect(page.locator('#decisionResults img')).toHaveCount(0);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#decisionCSV').click()]);
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain("'=1+1<img");
  await page.locator('#decisionShare').click();
  const url = await page.locator('#decisionShareURL').inputValue();
  await page.goto(url);
  await expect(page.locator('#decisionResults [aria-label="Decision summary"] thead th')).toHaveCount(5);
  await expect(page.locator('#decisionResults img')).toHaveCount(0);
});

test('membership plans drive live floor status and profile-specific value warnings', async ({ page }) => {
  await seed(page);
  await page.goto('/?layout=workspaces&view=results');
  await page.waitForFunction(() => Boolean(window.lastMetrics));
  await page.evaluate(() => {
    window.state.membershipPlans = [
      { id: 'p1', name: 'Basic', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 0, eligible: ['studio'] },
      { id: 'p2', name: 'Plus', monthlyFee: 120, creditsPerMonth: 120, memberDiscountPct: 0, eligible: ['studio'] }
    ];
    window.state.memberProfiles = [{ id: 'm', name: 'Two visits', visits: { studio: 2 } }];
    window.render();
  });
  const details = page.locator('.workspace-question').filter({ has: page.locator('summary', { hasText: 'How do customer plans work?' }) });
  await details.locator('summary').click();
  await page.locator('#membershipToggle').click();
  await expect(page.locator('#membershipResults')).toContainText('Single-service full redemption');
  await expect(page.locator('.membership-value-warnings')).toContainText('Basic costs');
  await expect(page.locator('#offeringRankingBody')).toContainText('Basic · membership stress price');
  const before = await page.evaluate(() => window.calc(window.state).income);
  await page.getByRole('spinbutton', { name: 'Monthly fee for Basic', exact: true }).fill('0');
  await expect(page.locator('#offeringRankingBody [data-status="loss"]')).toHaveCount(1);
  expect(await page.evaluate(() => window.calc(window.state).income)).toBe(before);
  await page.getByRole('spinbutton', { name: 'Monthly fee for Basic', exact: true }).fill('100');
  await expect(page.locator('#offeringRankingBody [data-status="loss"]')).toHaveCount(0);
  await page.evaluate(() => {
    Object.assign(window.state.offerings[0], { sessionsPerYearLow: 6, variableCostPerSession: 70, marketLow: 50, marketAvg: 60, marketHigh: 70 });
    Object.assign(window.state.membershipPlans[0], { creditsPerMonth: 0, includedVisits: { studio: 2 } });
    window.render();
  });
  await page.locator('[data-case="optimistic"]').click();
  await expect(page.locator('#offeringRankingBody [data-status="loss"]')).toHaveCount(1);
  await expect(page.locator('#marketBody [data-level="red"]')).toHaveCount(1);
});
