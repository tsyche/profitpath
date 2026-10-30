import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // CI also writes a JSON report; Playwright marks a retried pass as "flaky".
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: 'e2e-results/report.json' }]]
    : [['list']],
  use: {
    // Dedicated e2e port (strict) so tests never attach to an unrelated dev
    // server that happens to be running on the dev port 3120
    baseURL: 'http://127.0.0.1:3121',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    // Workspaces is the product default; plain '/' specs exercise Classic, so pin it.
    // Workspace specs pass ?layout=workspaces, which overrides this preference.
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://127.0.0.1:3121', localStorage: [{ name: 'profitpath-layout', value: 'legacy' }] }],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3121 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:3121',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
