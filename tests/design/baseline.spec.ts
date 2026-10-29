import { test, expect, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fitnessFixture, hybridFixture } from '../../assets/prototypes/fixtures';

async function record(info: TestInfo, name: string, value: unknown) {
  const path = info.outputPath(name);
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
  await info.attach(name, { path, contentType: 'application/json' });
}

for (const width of [1440, 375]) {
  for (const level of ['beginner', 'advanced']) {
    test(`baseline ${level} at ${width}px`, async ({ page }, info) => {
      const fixture = level === 'beginner' ? fitnessFixture() : hybridFixture();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      await page.addInitScript(({ model, experienceLevel }) => {
        localStorage.setItem('profitpath-onboarding-completed', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel }));
        localStorage.setItem('profitpath-state', JSON.stringify(model));
      }, { model: fixture, experienceLevel: level });
      await page.goto('/');
      await expect(page.locator('#offeringsBody tr')).toHaveCount(fixture.offerings.length);
      await expect(page.locator('#setupSummaryIncome')).not.toHaveText('—');
      const report = await page.evaluate(() => {
        const visible = (element: Element) => {
          const r = element.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(element).visibility !== 'hidden';
        };
        const positions = Object.fromEntries(['setupOfferings', 'setupCosts', 'analysisTabs', 'kpiRevenue', 'kpiIncome', 'rangesSection', 'resourcesSection'].map(id => {
          const element = document.getElementById(id);
          return [id, element && visible(element) ? Math.round(element.getBoundingClientRect().top + scrollY) : null];
        }));
        return {
          version: document.querySelector('#appVersion')?.textContent ?? '0.8.58-beta',
          viewport: { width: innerWidth, height: innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          bodyWidth: document.body.scrollWidth,
          bodyHeight: document.body.scrollHeight,
          visibleSpecialistControls: [...document.querySelectorAll('.advanced-feature, .expert-feature')].filter(visible).length,
          positions, state: window.state, metrics: window.calc(window.state),
          onboardingVisible: Boolean(document.querySelector('.onboarding-dialog-overlay'))
        };
      });
      expect(errors).toEqual([]);
      expect(report.onboardingVisible).toBe(false);
      await record(info, 'baseline.json', { ...report, errors });
      await page.screenshot({ path: info.outputPath('first-screen.png') });
      await page.locator('#setupOfferings > summary').evaluate(element => {
        element.scrollIntoView({ block: 'start' });
        document.body.scrollBy(0, -150);
      });
      await page.screenshot({ path: info.outputPath('offerings.png') });
      await page.locator('#kpiRevenue').scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('results.png') });

      // Record the current input contract; Phase 3 must replace coercion with last-valid-value editing.
      const input = page.locator('#offeringsBody input[data-k="priceMonthly"]').first();
      await input.fill('');
      const invalidEdit = await page.evaluate(() => ({
        typed: document.querySelector<HTMLInputElement>('#offeringsBody input[data-k="priceMonthly"]')?.value,
        canonical: window.state.offerings[0].priceMonthly,
        persisted: JSON.parse(localStorage.getItem('profitpath-state') || '{}').offerings[0].priceMonthly
      }));
      await record(info, 'invalid-edit.json', invalidEdit);
    });
  }
}

test('fresh onboarding and reload interaction', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('.onboarding-dialog-overlay')).toBeVisible();
  // Current onboarding attaches its handlers 100ms after inserting actionable-looking controls.
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Choose Industry', exact: true }).click();
  await page.waitForTimeout(150);
  await page.locator('[data-industry="fitness"]').click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Explore on My Own', exact: true }).click();
  await expect(page.locator('#offeringsBody tr')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.onboarding-dialog-overlay')).toBeVisible();
  const welcomeReturns = true;
  await record(info, 'onboarding.json', { welcomeReturns, handlerAttachmentDelayMs: 100 });
  await page.screenshot({ path: info.outputPath('reload.png') });
});

test('case sharing and unchanged-model golden results', async ({ page }, info) => {
  const model = hybridFixture();
  await page.addInitScript(model => {
    localStorage.setItem('profitpath-onboarding-completed', 'true');
    localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'advanced' }));
    localStorage.setItem('profitpath-state', JSON.stringify(model));
  }, model);
  await page.goto('/');
  await expect(page.locator('#rangeCaseToggle')).toBeVisible();
  const golden = [];
  for (const mode of ['forecast', 'current'] as const) {
    await page.locator('#modeSelect').selectOption(mode);
    for (const activeCase of ['base', 'conservative', 'optimistic']) {
      await page.locator(`[data-case="${activeCase}"]`).click();
      golden.push(await page.evaluate(({ mode, activeCase }) => {
        const m = window.calc(window.state);
        return { mode, activeCase, revenue: m.revenue, income: m.income, capacityPct: m.capacityPct, takeHome: m.takeHome, poolUtilization: m.poolUtilization, yearOneCashFlow: m.yearOneCashFlow };
      }, { mode, activeCase }));
    }
  }
  await record(info, 'golden.json', golden);
  await page.locator('[data-case="conservative"]').click();
  const url = await page.evaluate(() => window.encodeScenarioToURL(window.state));
  expect(url).toBeTruthy();
  await page.goto(url!);
  await expect(page.locator('[data-case="base"]')).toHaveAttribute('aria-checked', 'true');
  const share = await page.evaluate(() => ({ state: window.state, metrics: window.calc(window.state) }));
  await record(info, 'share.json', { requestedCase: 'conservative', receivedCase: 'base', ...share });
});
