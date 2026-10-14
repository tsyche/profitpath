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
    // server that happens to be running on the default port 3000
    baseURL: 'http://localhost:3173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
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
    command: 'npm run dev -- --port 3173 --strictPort',
    url: 'http://localhost:3173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
