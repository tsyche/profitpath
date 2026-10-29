# Playwright E2E Testing for ProfitPath

**TL;DR:** Run `just test-e2e-container` for the complete Chromium/Firefox suite in a disposable container. Native browser runs use `just test-e2e`; both start a dedicated Vite server on port 3121.

## Running tests

Install dependencies with `just setup`. Container runs require Docker and use the Playwright image matching the lockfile, including uncommitted source without changing host dependencies.

```bash
just test-e2e-container
just test-e2e-container workspace-shell.spec.ts workspace-model.spec.ts workspace-results.spec.ts workspace-accessibility.spec.ts
just test-e2e-container --project=chromium
just test-e2e
just test-e2e-headed
```

The container runner forwards Playwright arguments. Avoid shell metacharacters in recipe arguments; use a simple regular expression such as `--grep shared.comparison` for a focused test.

## Coverage and layout selection

The default layout remains covered by the existing calculation, scenario, export, mobile, accessibility, security, offline, and tool journeys. Tests use `.spec.ts` files and shared TypeScript helpers.

The opt-in `?layout=workspaces` preview has four suites:

- `workspace-shell.spec.ts`: navigation, URL/history/reload, keyboard focus, undo separation, and saved-scenario entry.
- `workspace-model.spec.ts`: optional entry, last-valid numeric input, save/undo, and 12-offering Forecast/Current editing on desktop and mobile.
- `workspace-results.spec.ts`: tool destinations, first-screen mobile figures, case-preserving CSV/share, read-only copying, quota recovery, and portable comparison embeds/recipient exports.
- `workspace-accessibility.spec.ts`: keyboard workspace focus and axe scans across all experience levels, light/dark themes, desktop/mobile, and the expanded offering editor.

The separate development prototype and baseline captures use port 3122:

```bash
just test-e2e-container --config tests/design/playwright.config.ts
```

These design tests do not replace real-application regression tests or the required human device/screen-reader walkthrough before cutover.

## Results and debugging

- Container logs, exit status, screenshots, and retained failure videos are under `e2e-results/container/`.
- Native runs write artifacts under `test-results/`.
- The list reporter runs locally; CI also writes `e2e-results/report.json`.
- Container runs use four workers and zero retries. Native CI allows one retry and reports a retried pass as flaky.
- Use `npm run test:e2e:ui` for interactive native debugging when browser startup is permitted.

## Adding coverage

Add `.spec.ts` tests that exercise real user behavior with the existing helpers. Cover confirmed bugs with a failing regression test before changing the implementation, then verify it passes. Mock external system boundaries only. Keep navigation preferences separate from financial state in fixtures and assertions.
