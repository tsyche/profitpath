import { test, expect } from '@playwright/test';

// A crafted `compareStates` share link must not be able to inject script via a
// scenario name. The name is attacker-controlled and was previously interpolated
// into innerHTML unescaped (DOM XSS). It must now render as inert text.
test.describe('Security — share-link XSS', () => {
  const offering = {
    id: 'o1', name: 'Svc', priceMonthly: 100, sessionsPerYear: 12,
    hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 5,
  };
  const state = {
    mode: 'forecast', offerings: [offering],
    fullTimeEmployees: 1, partTimeEmployees: 0, fullTimeEmployeePay: 60000,
    partTimeEmployeePay: 0, monthlyCosts: 1000, productiveUtilizationPct: 80,
    targetUtilizationPct: 80, lockMix: false,
  };
  const XSS = '<img src=x onerror="window.__xssFired=true">';

  test('malicious scenario name in a compareStates link does not execute', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('onboardingCompleted', 'true'); } catch { /* ignore */ }
      window.__xssFired = false;
    });

    const payload = { s1: { name: XSS, state }, s2: { name: 'Safe', state } };
    const param = encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64'));

    // NB: don't use waitForPageReady here — its onboarding-overlay cleanup also
    // strips the comparison .modal-overlay, hiding the very thing we're testing.
    await page.goto('/?compareStates=' + param, { waitUntil: 'networkidle' });

    // The comparison modal must actually have opened and rendered the name
    // (otherwise this test would pass vacuously).
    await expect(page.locator('.scenario-diff-wrap')).toBeVisible({ timeout: 5000 });
    // The name renders as inert, escaped text — not as an <img> element.
    await expect(page.locator('.scenario-diff-header .diff-col-s1')).toContainText('onerror');
    expect(await page.locator('.scenario-diff-wrap img[src="x"]').count()).toBe(0);
    // The injected onerror must never have fired.
    expect(await page.evaluate(() => window.__xssFired)).toBe(false);
  });
});
