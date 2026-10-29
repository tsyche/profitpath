import { test, expect } from '@playwright/test';
import { hybridFixture } from '../../assets/prototypes/fixtures';

test('the reviewed conclusion renders to a real PDF with its case, notes and offering price units', async ({ page, context }, info) => {
  await context.addInitScript(model => {
    localStorage.setItem('profitpath-state', JSON.stringify(model));
    localStorage.setItem('profitpath-onboarding-completed', 'true');
    window.print = () => {};
  }, hybridFixture());
  await page.goto('/?layout=workspaces&view=results&case=conservative');
  await expect(page.locator('#workspaceResults')).toBeVisible();
  const income = await page.locator('#kpiIncome').innerText();
  await page.locator('.workspace-context').getByRole('button', { name: 'Share / export', exact: true }).click();
  const [report] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'PDF report', exact: true }).click()
  ]);
  await expect(report.locator('body')).toContainText('Conservative case');
  await expect(report.locator('body')).toContainText(income);
  await expect(report.locator('body')).toContainText('Synthetic hybrid studio.');
  await expect(report.locator('body')).toContainText('$60/session');
  await expect(report.locator('body')).toContainText('$120/sale');
  await report.emulateMedia({ media: 'print' });
  const path = info.outputPath('profitpath-conservative-report.pdf');
  const pdf = await report.pdf({ path, format: 'A4', printBackground: true });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  await info.attach('printed-conclusion', { path, contentType: 'application/pdf' });
  await report.close();
});
