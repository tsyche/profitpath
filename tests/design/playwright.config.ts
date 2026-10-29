import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Separate from release E2E: baseline capture must remain reproducible against the old shell.
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  outputDir: '../../test-results/design',
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3122', screenshot: 'only-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ],
  webServer: {
    command: 'npm run dev -- --port 3122 --strictPort --host 127.0.0.1',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    url: 'http://127.0.0.1:3122',
    reuseExistingServer: false
  }
});
