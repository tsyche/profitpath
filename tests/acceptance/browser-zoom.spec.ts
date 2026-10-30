import { test, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { hybridFixture } from '../../assets/prototypes/fixtures';

interface ZoomAPI {
  tabs: {
    query: (query: Record<string, unknown>) => Promise<{ id?: number; url?: string }[]>;
    setZoom: (id: number, factor: number) => Promise<void>;
    getZoom: (id: number) => Promise<number>;
  };
}

async function zoom(worker: Worker, page: Page) {
  return worker.evaluate(async url => {
    const api = (globalThis as unknown as { chrome: ZoomAPI }).chrome;
    const tab = (await api.tabs.query({})).find(tab => tab.url === url);
    if (tab?.id === undefined) throw new Error('The isolated acceptance tab was not found');
    await api.tabs.setZoom(tab.id, 2);
    return api.tabs.getZoom(tab.id);
  }, page.url());
}

async function reflow(page: Page) {
  const bounds = await page.evaluate(() => ({
    width: innerWidth,
    pageWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)
  }));
  expect(bounds.pageWidth, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.width);
  const controls = await page.locator('#workspaceApp :is(input, select, button, a, summary), #decisionWorkbench :is(input, select, button)').evaluateAll(elements =>
    elements.filter(element => element.getClientRects().length > 0).map(element => {
      const rect = element.getBoundingClientRect();
      return { name: element.id || element.textContent?.trim().slice(0, 40), left: rect.left, right: rect.right };
    })
  );
  for (const control of controls) {
    expect(control.left, control.name).toBeGreaterThanOrEqual(-1);
    expect(control.right, control.name).toBeLessThanOrEqual(bounds.width + 1);
  }
}

for (const [width, theme] of [[1440, 'light'], [1280, 'dark']] as const) {
  test(`real 200% browser zoom keeps the ${theme} workspaces usable at a ${width}px window`, async ({ playwright }, info) => {
    const scratch = await mkdtemp(join(tmpdir(), 'profitpath-zoom-'));
    const extension = join(scratch, 'extension');
    await mkdir(extension);
    // A temporary extension exercises Chrome's actual zoom API. CSS zoom,
    // device scale, and a smaller viewport do not establish browser zoom.
    // https://playwright.dev/docs/chrome-extensions
    // https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom
    await writeFile(join(extension, 'manifest.json'), JSON.stringify({
      manifest_version: 3, name: 'ProfitPath acceptance zoom', version: '1.0',
      permissions: ['tabs'], background: { service_worker: 'background.js' }
    }));
    await writeFile(join(extension, 'background.js'), 'chrome.runtime.onInstalled.addListener(() => {});\n');
    let context: BrowserContext | undefined;
    try {
      context = await playwright.chromium.launchPersistentContext(join(scratch, 'profile'), {
        channel: 'chromium', headless: true, viewport: null,
        args: [`--window-size=${width},1000`, `--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
      });
      const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
      await context.addInitScript(({ model, theme }) => {
        localStorage.setItem('profitpath-state', JSON.stringify(model));
        localStorage.setItem('profitpath-onboarding-completed', 'true');
        localStorage.setItem('profitpath-theme', theme);
        localStorage.setItem('profitpath-scenarios', JSON.stringify([0, 1, 2].map(i => ({
          id: 'zoom-' + i, name: ['Today', 'Option A', 'Option B'][i], timestamp: '', createdAt: '',
          state: { ...model, monthlyCosts: model.monthlyCosts + i * 100 }
        }))));
      }, { model: hybridFixture(), theme });
      const page = context.pages()[0] || await context.newPage();
      await page.goto('http://127.0.0.2:3124/?layout=workspaces&view=model/offerings');
      await expect(page.locator('#workspaceModel')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const original = await page.evaluate(() => ({ width: innerWidth, pixelRatio: devicePixelRatio }));
      expect(await zoom(worker, page)).toBe(2);
      await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(original.pixelRatio * 2);
      await expect.poll(() => page.evaluate(() => innerWidth)).toBeCloseTo(original.width / 2, 0);
      await page.locator('[data-offering-id="hybrid-2"]').click();
      for (const summary of await page.locator('#workspaceOfferingEditor details > summary').all()) {
        await summary.click();
      }
      await reflow(page);
      await page.evaluate(() => { document.body.scrollTo(0, 0); window.scrollTo(0, 0); });
      // Capture the native window: CSS-sized screenshot clips can cut off half
      // the viewport when the browser itself is zoomed.
      const cdp = await context.newCDPSession(page);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(info.outputPath('offering-200-percent.png'), Buffer.from(data, 'base64'));
      await cdp.detach();
      const nav = page.getByRole('navigation', { name: 'Workspaces' });
      for (const workspace of ['Results', 'Compare', 'Model']) {
        await nav.getByRole('link', { name: workspace, exact: true }).click();
        await reflow(page);
        if (workspace === 'Compare') {
          await page.locator('#workspaceDecisionButton').click();
          const picker = page.getByRole('dialog', { name: 'Choose decision options' });
          for (const checkbox of await picker.getByRole('checkbox').all()) await checkbox.check();
          await picker.getByRole('button', { name: 'Open workbench' }).click();
          await expect(page.locator('#decisionWorkbench')).toBeVisible();
          await expect(page.locator('#decisionResults thead').first()).toBeVisible();
          await reflow(page);
          const decisionAxe = await new AxeBuilder({ page }).include('#decisionWorkbench').analyze();
          expect(decisionAxe.violations).toEqual([]);
          await page.locator('#decisionWorkbench .modal-close').click();
        }
      }
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.locator('.app-drawer .drawer-item', { hasText: 'Settings' }).click();
      await reflow(page);
      await page.getByLabel('Layout', { exact: true }).selectOption('legacy');
      await page.waitForURL(url => url.searchParams.get('layout') === 'legacy');
      await page.waitForFunction(() => Boolean(window.lastMetrics));
      await reflow(page);
    } finally {
      await context?.close();
      await rm(scratch, { recursive: true, force: true });
    }
  });
}
