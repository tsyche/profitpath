import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('Regression: Presentation Notes restore', () => {
  const NOTES = 'Q3 pricing trial: instructors paid on list price';
  // Minimal payload: sanitizeScenarioState needs >=1 offering and defaults the rest.
  const payload = { notes: NOTES, offerings: [{ name: 'Lesson', priceMonthly: 100 }] };
  const shareParam = encodeURIComponent(
    Buffer.from(encodeURIComponent(JSON.stringify(payload))).toString('base64')
  );

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
    });
  });

  test('share link notes populate the editable textarea', async ({ page }) => {
    await page.goto(`/?scenario=${shareParam}`);
    await waitForPageReady(page);
    await expect(page.locator('#scenarioNotes')).toHaveValue(NOTES);
    await expect(page).not.toHaveURL(/scenario=/);
    await page.locator('#setupNotes > summary').click();
    await page.fill('#scenarioNotes', 'Edited after opening the shared snapshot');
    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#scenarioNotes')).toHaveValue('Edited after opening the shared snapshot');
  });

  test('typed notes survive a reload', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await page.locator('#setupNotes > summary').click();
    await page.fill('#scenarioNotes', NOTES);
    await page.reload();
    await waitForPageReady(page);
    await expect(page.locator('#scenarioNotes')).toHaveValue(NOTES);
  });

  test('read-only share link shows notes in the display block', async ({ page }) => {
    await page.goto(`/?scenario=${shareParam}&readonly=1`);
    await waitForPageReady(page);
    await expect(page.locator('#scenarioNotesDisplay')).toHaveText(NOTES);
    await expect(page).toHaveURL(/readonly=1/);
    await expect(page).not.toHaveURL(/scenario=/);
  });
});
