import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { hybridFixture } from '../../assets/prototypes/fixtures';

async function scan(page: Page) {
  // Settle finite decorative effects; Firefox can keep hidden reduced-motion animations running.
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming().endTime !== Infinity) animation.finish();
    }
  });
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
    .map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  for (const level of ['beginner', 'intermediate', 'advanced']) {
    test(`${theme} ${level} workspaces and focused editor pass axe on desktop and mobile`, async ({ page }, info) => {
      test.setTimeout(90000);
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      await page.addInitScript(({ model, theme, level }) => {
        localStorage.setItem('profitpath-state', JSON.stringify(model));
        localStorage.setItem('profitpath-settings', JSON.stringify({ experienceLevel: level }));
        localStorage.setItem('profitpath-onboarding-completed', 'true');
        localStorage.setItem('theme', theme);
      }, { model: hybridFixture(), theme, level });
      await page.goto('/?layout=workspaces');
      const nav = page.getByRole('navigation', { name: 'Workspaces' });
      await expect(nav).toBeVisible();
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
        for (const workspace of ['Model', 'Results', 'Compare']) {
          const link = nav.getByRole('link', { name: workspace, exact: true });
          await link.focus(); await page.keyboard.press('Enter');
          await expect(page.locator(`#workspace${workspace}`)).toBeFocused();
          await scan(page);
        }
        await nav.getByRole('link', { name: 'Model', exact: true }).click();
        if (width === 375) await page.getByLabel('Model section', { exact: true }).selectOption('offerings');
        else await page.getByRole('navigation', { name: 'Model sections' }).getByRole('link', { name: 'Offerings', exact: true }).click();
        await page.locator('[data-offering-id="hybrid-2"]').click();
        await page.locator('#workspaceOfferingEditor details').evaluateAll(details => details.forEach(detail => { (detail as HTMLDetailsElement).open = true; }));
        await scan(page);
        await page.screenshot({ path: info.outputPath(`editor-${width}.png`) });
        expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(width);
      }
    });
  }
}
