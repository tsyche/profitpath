import { test, expect } from '@playwright/test';

// Regression tests for a batch of UI fixes:
//  - app-bar hamburger toggles the drawer (second tap closes it)
//  - Help menu tooltip option reflects state (Disable when already enabled)
//  - Customer Analytics twisty (advanced) actually expands and renders
test.describe('UI fixes', () => {
  test('hamburger toggles the drawer open and closed', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* */ } });
    await page.goto('/');
    await page.waitForSelector('#appMenuBtn');

    await page.evaluate(() => document.getElementById('appMenuBtn').click());
    await expect(page.locator('#appDrawer')).toHaveClass(/open/);

    await page.evaluate(() => document.getElementById('appMenuBtn').click());
    await expect(page.locator('#appDrawer')).not.toHaveClass(/open/);
  });

  test('Help menu offers to disable tooltips when they are enabled', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ showTooltips: true }));
      } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('helpBtn').click());
    await page.waitForSelector('.help-menu-btn[data-action="tooltips"]');
    await expect(page.locator('.help-menu-btn[data-action="tooltips"] strong')).toHaveText('Disable Tooltips');
  });

  test('Customer Analytics twisty expands and renders content in advanced mode', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: 'advanced' }));
      } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForSelector('#customerAnalyticsToggle');

    await expect(page.locator('#customerAnalyticsBody')).toHaveClass(/collapsed/);
    await page.evaluate(() => document.getElementById('customerAnalyticsToggle').click());
    await expect(page.locator('#customerAnalyticsBody')).not.toHaveClass(/collapsed/);
    // The panel should now contain the rendered dashboard, not be empty.
    const len = await page.evaluate(() => document.getElementById('customerAnalyticsPanel').innerHTML.length);
    expect(len).toBeGreaterThan(100);
  });

  test('Scenarios modal stays open after saving a scenario', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Open scenarios modal
    await page.evaluate(() => {
      if (typeof window.openScenarioModal === 'function') window.openScenarioModal();
      else document.getElementById('desktopScenariosBtn')?.click();
    });
    await page.waitForSelector('#scenarioNameInput', { timeout: 5000 });

    // Type a name and click Save
    await page.fill('#scenarioNameInput', 'Regression Test Scenario');
    await page.evaluate(() => document.getElementById('saveScenarioBtn').click());

    // A confirm-save dialog should appear
    await page.waitForSelector('.modal-overlay .modal-btn', { timeout: 3000 });
    // Click the '💾 Save' confirm button
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.modal-btn')];
      const saveBtn = btns.find(b => b.textContent.includes('Save'));
      if (saveBtn) saveBtn.click();
    });

    // After confirming, the scenarios modal input should still be visible
    await page.waitForTimeout(300);
    await expect(page.locator('#scenarioNameInput')).toBeVisible();
    // And the new scenario should appear in the list
    await expect(page.locator('.scenario-item-name')).toContainText('Regression Test Scenario');
  });

  test('Scenarios modal stays open after deleting a scenario', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        // Pre-seed a scenario so there's something to delete
        const s = [{ id: 'e2e-del-1', name: 'Delete Me', timestamp: new Date().toISOString(), state: {} }];
        localStorage.setItem('profitpath-scenarios', JSON.stringify(s));
      } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      if (typeof window.openScenarioModal === 'function') window.openScenarioModal();
      else document.getElementById('desktopScenariosBtn')?.click();
    });
    await page.waitForSelector('.delete-btn', { timeout: 5000 });

    // Click delete on the seeded scenario
    await page.evaluate(() => document.querySelector('.delete-btn').click());

    // Confirm delete dialog should appear
    await page.waitForSelector('.modal-btn', { timeout: 3000 });
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.modal-btn')];
      const delBtn = btns.find(b => b.textContent.includes('Delete'));
      if (delBtn) delBtn.click();
    });

    // Scenarios modal should still be open
    await page.waitForTimeout(300);
    await expect(page.locator('#scenarioNameInput')).toBeVisible();
  });

  test('Scenario comparison text is legible in dark mode', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        const s = [
          { id: 'dm-1', name: 'Dark A', timestamp: new Date().toISOString(), state: { employees: 1 } },
          { id: 'dm-2', name: 'Dark B', timestamp: new Date().toISOString(), state: { employees: 3 } }
        ];
        localStorage.setItem('profitpath-scenarios', JSON.stringify(s));
      } catch { /* */ }
    });
    await page.goto('/');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      window.showScenarioComparisonDiff('dm-1', 'dm-2');
    });
    await page.waitForSelector('.scenario-diff-wrap', { timeout: 5000 });

    const info = await page.evaluate(() => {
      const lum = (s) => { const m = s.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
      const label = document.querySelector('.diff-col-label');
      const modal = document.querySelector('.modal-content');
      return {
        textLum: lum(getComputedStyle(label).color),
        bgLum: lum(getComputedStyle(modal).backgroundColor),
      };
    });
    // Text should be light, background should be dark
    expect(info.textLum).toBeGreaterThan(0.4);
    expect(info.bgLum).toBeLessThan(0.3);
  });

  test('Embed comparison modal closes cleanly without leaving stray backdrop', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        const s = [
          { id: 'emb-1', name: 'Embed A', timestamp: new Date().toISOString(), state: {} },
          { id: 'emb-2', name: 'Embed B', timestamp: new Date().toISOString(), state: {} }
        ];
        localStorage.setItem('profitpath-scenarios', JSON.stringify(s));
      } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(300);

    // Open the comparison modal then trigger the embed modal
    await page.evaluate(() => window.showScenarioComparisonDiff('emb-1', 'emb-2'));
    await page.waitForSelector('.scenario-diff-wrap', { timeout: 5000 });
    await page.evaluate(() => window.getComparisonEmbedCode('emb-1', 'emb-2'));
    // Wait for a second modal overlay to appear (the embed modal stacks on top)
    await page.waitForFunction(() => document.querySelectorAll('.modal-overlay').length >= 2, { timeout: 3000 });

    // Close embed modal by pressing Escape (most reliable cross-browser close)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Only the comparison modal overlay should remain
    const remaining = await page.locator('.modal-overlay').count();
    expect(remaining).toBe(1);
    // The comparison modal diff content should still be visible
    await expect(page.locator('.scenario-diff-wrap')).toBeVisible();
  });

  test('Scenario compare does not remove document.body (white screen bug)', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        const s = [
          { id: 'cmp-1', name: 'Alpha', timestamp: new Date().toISOString(), state: { employees: 2 } },
          { id: 'cmp-2', name: 'Beta',  timestamp: new Date().toISOString(), state: { employees: 4 } }
        ];
        localStorage.setItem('profitpath-scenarios', JSON.stringify(s));
      } catch { /* */ }
    });
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      if (typeof window.openScenarioModal === 'function') window.openScenarioModal();
      else document.getElementById('desktopScenariosBtn')?.click();
    });
    await page.waitForSelector('#compareScenario1', { timeout: 5000 });

    // Select both scenarios
    await page.evaluate(() => {
      document.getElementById('compareScenario1').value = 'cmp-1';
      document.getElementById('compareScenario2').value = 'cmp-2';
    });
    await page.evaluate(() => document.getElementById('compareBtn').click());

    // document.body must still exist and comparison modal must appear
    const bodyExists = await page.evaluate(() => !!document.body);
    expect(bodyExists).toBe(true);
    await page.waitForSelector('.scenario-diff-wrap', { timeout: 5000 });
    // Scenarios modal overlay should be gone (replaced by comparison modal)
    const scenariosInputVisible = await page.evaluate(() => !!document.getElementById('scenarioNameInput'));
    expect(scenariosInputVisible).toBe(false);
  });
});
