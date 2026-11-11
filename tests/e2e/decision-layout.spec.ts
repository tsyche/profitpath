import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['dark', 'light']) {
  for (const width of [1440, 375, 320]) {
    test(`${theme} ${width}px: decision values stay labeled and readable`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`/?layout=workspaces&theme=${theme}`);
      await page.waitForFunction(() => Boolean(window.lastMetrics));
      await page.evaluate(() => {
        const names = ['Current baseline', 'Option A: ' + 'Long service name '.repeat(5), 'Option B', 'Option C'];
        const state = structuredClone(window.state);
        localStorage.setItem('profitpath-scenarios', JSON.stringify(names.map((name, i) => ({
          id: `layout-${i}`, name, timestamp: 'now', createdAt: new Date().toISOString(),
          state: { ...state, monthlyCosts: 100 + i * 50 }
        }))));
        window.openScenarioModal();
      });
      await page.locator('#decisionWorkbenchBtn').click();
      const picker = page.getByRole('dialog', { name: 'Choose decision options' });
      for (const checkbox of await picker.getByRole('checkbox').all()) await checkbox.check();
      await picker.getByRole('button', { name: 'Open workbench' }).click();
      const dialog = page.getByRole('dialog', { name: 'Decision workbench', exact: true });
      await expect(page.locator('#decisionDriverPanel')).toBeHidden();
      const summary = dialog.getByRole('region', { name: 'Decision summary', exact: true });
      const values = await summary.locator('td .decision-value').allTextContents();
      expect(values.length).toBeGreaterThan(0);
      await page.setViewportSize({ width, height: 1000 });
      await expect(summary.locator('td .decision-value')).toHaveText(values);
      expect(await summary.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      const firstRow = summary.locator('tbody tr').first();
      if (width > 640) {
        const widths = await summary.locator('thead th').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2);
        expect(await firstRow.locator('th').evaluate(el => getComputedStyle(el).textAlign)).toBe('left');
        expect(await firstRow.locator('td').first().evaluate(el => getComputedStyle(el).textAlign)).toBe('center');
      } else {
        const labels = firstRow.locator('.decision-option-label');
        await expect(labels).toHaveCount(4);
        await expect(labels.first()).toHaveText('Current baseline (baseline)');
        for (const label of await labels.all()) await expect(label).toBeVisible();
        for (const value of await firstRow.locator('td').all()) {
          const box = await value.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        }
      }
      const offering = dialog.locator('.decision-offering').first();
      await expect(offering).not.toHaveAttribute('open');
      await offering.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(offering).toHaveAttribute('open', '');
      expect(await offering.locator('.decision-table').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.locator('#decisionCase').selectOption('optimistic');
      await expect(offering).toHaveAttribute('open', '');
      const accessibility = await new AxeBuilder({ page }).include('#decisionResults').analyze();
      expect(accessibility.violations).toEqual([]);
      await dialog.evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: testInfo.outputPath('decision-layout.png'), animations: 'disabled' });
    });
  }
}
