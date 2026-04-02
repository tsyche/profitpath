# Playwright E2E Testing for ProfitPath

This directory contains end-to-end tests for the ProfitPath application using Playwright.

## Setup

Tests are already configured with:
- Playwright with Chromium and Firefox browsers
- Automatic dev server startup
- HTML reporting with screenshots/videos on failure
- Mobile viewport testing

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (show browser window)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/basic.spec.js

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
```

## Test Structure

- `basic.spec.js` - Core application functionality
- `scenarios.spec.js` - Scenario management features
- `export.spec.js` - Export and sharing features

## Adding New Tests

1. Create a new `.spec.js` file in `tests/e2e/`
2. Use the test structure from existing files
3. Run tests to verify they work

## Debugging

- Use `npm run test:e2e:ui` for interactive debugging
- Use `npm run test:e2e:headed` to watch tests run in browser
- Check `test-results` directory for HTML reports after runs

## CI/CD

The configuration is ready for CI with:
- Parallel test execution
- Retry on failure
- Screenshot/video capture on failure
- HTML reporting
