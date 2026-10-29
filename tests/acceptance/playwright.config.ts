import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Production acceptance proofs kept separate from the regular release suite.
export default defineConfig({
  testDir: '.',
  outputDir: '../../test-results/acceptance',
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.2:3124',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 3124 --strictPort --host 0.0.0.0',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    url: 'http://127.0.0.2:3124',
    reuseExistingServer: false
  }
});
