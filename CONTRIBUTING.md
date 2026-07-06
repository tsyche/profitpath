# Contributing to ProfitPath

## Setup

```bash
just setup   # npm ci + install Playwright browsers
just dev     # start dev server at http://localhost:3000
```

## Before submitting changes

```bash
just test    # unit (Vitest) + e2e (Playwright, chromium + firefox)
just lint    # ESLint
```

Or individually: `just test-unit`, `just test-e2e`, `just lintfix` (auto-fix).

See [CLAUDE.md](CLAUDE.md) for architecture, module layout, and business logic
details.

## Git workflow

CI auto-bumps the patch version on every push to `main` (commits back with
`[skip ci]`), so the remote is often 1 commit ahead. Always rebase before
pushing:

```bash
git pull --rebase && git push
```

## Branch & PR conventions

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make focused commits with clear messages (no `feat:`/`fix:` type prefixes —
   see recent `git log` for the house style)
3. Ensure `just test` and `just lint` pass
4. Update relevant docs (`README.md`, `CLAUDE.md`/`AGENTS.md` stay in sync via
   `just sync-docs`, `FEATURES.md`, `docs/experience-levels.md` if you touch
   feature gating)
5. Open a pull request with a clear description

## Code style

- Modern JavaScript (ES6+), functional patterns preferred
- Keep functions under ~50 lines where practical
- No new features without accompanying tests (unit for logic, e2e for UI/layout)
- Follow ESLint rules — `just lintfix` handles most formatting automatically

## Adding a new feature gate

If you add a setting that should be gated by experience level:
1. Add the key to `DEFAULT_SETTINGS` and all three `FEATURE_GATES` tiers in
   `src/settings/index.js`
2. Add the DOM selector to `elementsToToggle` in `assets/app.jsx`'s
   `updateUIForSettings()`
3. Update `docs/experience-levels.md`
