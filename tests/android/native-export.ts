/**
 * Opt-in acceptance against the disposable .acceptance APK, never a physical device.
 * Run with Node 24: node tests/android/native-export.ts emulator-5554
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { unzipSync } from 'fflate';

const serial = process.argv[2] || 'emulator-5554';
if (!/^emulator-\d+$/.test(serial)) throw new Error('This check only accepts an emulator serial');
const appId = 'io.profitpath.app.acceptance';
const output = resolve('e2e-results/android');
mkdirSync(output, { recursive: true });
const adb = (...args: string[]) => execFileSync('adb', ['-s', serial, ...args], { encoding: 'utf8', timeout: 20000 });
const activity = () => adb('shell', 'dumpsys', 'activity', 'activities').split('\n').find(line => line.includes('topResumedActivity')) || '';
const files = () => {
  try { return adb('shell', 'run-as', appId, 'ls', 'cache/profitpath-exports').trim().split('\n').filter(Boolean); }
  catch { return []; }
};

adb('shell', 'am', 'start', '-n', `${appId}/io.profitpath.app.MainActivity`);
const pid = adb('shell', 'pidof', appId).trim();
if (!/^\d+$/.test(pid)) throw new Error('Install and launch the dedicated acceptance APK first');
const port = adb('forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`).trim();
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true });
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(15000);
const result: Record<string, unknown> = {};

try {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('profitpath-onboarding-completed', 'true');
    localStorage.setItem('profitpath-state', JSON.stringify({
      mode: 'current', fullTimeEmployees: 1, partTimeEmployees: 0,
      fullTimeEmployeePay: 10000, partTimeEmployeePay: 0, monthlyCosts: 0,
      productiveUtilizationPct: 80, targetUtilizationPct: 75,
      notes: 'Synthetic emulator acceptance only.',
      offerings: [{ id: 'android-check', name: 'Emulator test', priceMonthly: 100, sessionsPerYear: 12,
        hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 20 }]
    }));
  });
  await page.goto('http://localhost/?layout=workspaces&view=results', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#workspaceResults')).toBeVisible();
  const snapshot = await page.evaluate(() => {
    const url = new URL(window.encodeScenarioToURL(window.state, { readonly: true })!);
    return 'http://localhost/' + url.search;
  });
  const income = await page.evaluate(() => window.calc(window.state).income);
  await page.evaluate(() => localStorage.removeItem('profitpath-state'));
  await page.goto(snapshot, { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Model', exact: true }).dispatchEvent('click');
  await expect(page.locator('#modeSelect')).toBeDisabled();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#modeSelect')).toBeDisabled();
  expect(await page.evaluate(() => window.calc(window.state).income)).toBe(income);
  await page.locator('#workspaceTryChange').dispatchEvent('click');
  // Skip Playwright's stability wait: the WebView's dialog animation never reads as stable over CDP.
  await page.getByLabel('Alternative name', { exact: true }).fill('Emulator editable copy', { force: true });
  await page.getByRole('button', { name: 'Create alternative', exact: true }).dispatchEvent('click');
  await expect(page.locator('#modeSelect')).toBeEnabled();
  result.readonlyReloadAndEditableCopy = true;
  console.log('Read-only reload and editable copy passed');

  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Results', exact: true }).dispatchEvent('click');
  const openReview = async () => {
    await page.locator('.workspace-context').getByRole('button', { name: 'Share / export', exact: true }).dispatchEvent('click');
    await expect(page.locator('[data-snapshot-format="csv"]')).toBeVisible();
  };
  const invalidFilename = await page.evaluate(async () => {
    const bridge = (window as unknown as { Capacitor: { Plugins: { NativeExport: {
      shareFile(options: { filename: string; mimeType: string; data: string }): Promise<unknown>;
    } } } }).Capacitor.Plugins.NativeExport;
    try {
      await bridge.shareFile({ filename: '../outside.csv', mimeType: 'text/csv', data: btoa('invalid path test') });
      return '';
    } catch (error) { return error instanceof Error ? error.message : String(error); }
  });
  expect(invalidFilename).toContain('Unsupported export filename');
  result.pathTraversalRejected = true;
  for (const format of ['csv', 'excel', 'html']) {
    const before = new Set(files());
    await openReview();
    await page.locator(`[data-snapshot-format="${format}"]`).dispatchEvent('click');
    await expect.poll(activity, { timeout: 15000 }).toContain('ChooserActivity');
    const created = files().filter(file => !before.has(file));
    expect(created).toHaveLength(1);
    const bytes = execFileSync('adb', ['-s', serial, 'exec-out', 'run-as', appId, 'cat', `cache/profitpath-exports/${created[0]}`], { timeout: 15000 });
    if (format === 'excel') expect(unzipSync(bytes)['xl/workbook.xml']).toBeDefined();
    else {
      expect(bytes.toString('utf8')).toContain('Emulator test');
      expect(bytes.toString('utf8')).toContain(format === 'csv' ? 'BUSINESS PARAMETERS' : 'Annual');
    }
    writeFileSync(resolve(output, created[0]), bytes);
    result[format] = { file: created[0], bytes: bytes.length, chooserOpened: true };
    adb('shell', 'input', 'keyevent', '4');
    await expect.poll(activity).toContain(appId);
    console.log(`${format}: real file bytes and native chooser passed`);
  }
  await openReview();
  await page.locator('[data-snapshot-format="pdf"]').dispatchEvent('click');
  await expect.poll(activity, { timeout: 20000 }).toContain('com.android.printspooler');
  adb('shell', 'uiautomator', 'dump', '/data/local/tmp/profitpath-print.xml');
  const printUI = adb('shell', 'cat', '/data/local/tmp/profitpath-print.xml');
  // The print dialog's destination varies by device; a rendered page proves the report reached PrintManager.
  expect(printUI).toContain('Page 1 of 1');
  writeFileSync(resolve(output, 'print-preview.xml'), printUI);
  writeFileSync(resolve(output, 'print-preview.png'), execFileSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], { timeout: 15000 }));
  result.printPreview = true;
  adb('shell', 'input', 'keyevent', '4');
  await expect.poll(activity).toContain(appId);
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('Native print preview passed; no report was sent to another app');
} finally {
  // close() can stall on a backgrounded WebView after a failure and would hide the real error.
  await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  adb('forward', '--remove', `tcp:${port}`);
}
