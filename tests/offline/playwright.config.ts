import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// A loopback address outside the development-host allowlist exercises production
// service-worker registration without changing the application's offline policy.
export default defineConfig({
  testDir: '.',
  outputDir: '../../test-results/offline',
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.2:3123',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 3123 --strictPort --host 0.0.0.0',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    url: 'http://127.0.0.2:3123',
    reuseExistingServer: false
  }
});
