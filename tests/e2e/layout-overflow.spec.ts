import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

// Regression: the Actions row (Duplicate / Remove) spilled out of its offering card, and the read-only
// output tables inherited the offering-card layout (no header, blank labels) instead of a real table.
async function open(page: Page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
  });
  await page.goto('/');
  await waitForPageReady(page);
}

for (const width of [1728, 1280, 375]) {
  test(`offering Actions buttons stay inside their card at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const spill = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('#offeringsBody tr').forEach((tr, i) => {
        const card = tr.getBoundingClientRect();
        const tops = new Set([...tr.querySelectorAll('td.group-actions button')].map((b) => Math.round(b.getBoundingClientRect().top)));
        if (tops.size > 1) out.push(`row ${i} buttons not on one line`);
        tr.querySelectorAll('button').forEach((b) => {
          const r = b.getBoundingClientRect();
          if (r.right > card.right + 0.5 || r.left < card.left - 0.5) out.push(`row ${i} ${b.textContent}`);
        });
      });
      return out;
    });
    expect(spill).toEqual([]);
  });
}

test('profit-per-staff-hour output renders as a table with its header row', async ({ page }) => {
  await open(page);
  const wrap = page.locator('#offeringRanking');
  await expect(wrap).toBeVisible();
  await expect(wrap.locator('thead')).toBeVisible();
  await expect(wrap.locator('thead th').first()).toHaveText('Offering');
  const display = await wrap.locator('tbody tr').first().evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe('table-row');
});
