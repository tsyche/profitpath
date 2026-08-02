# ProfitPath

[![Tests](https://github.com/tsyche/profitpath/actions/workflows/test.yml/badge.svg)](https://github.com/tsyche/profitpath/actions/workflows/test.yml)
[![Build APK](https://github.com/tsyche/profitpath/actions/workflows/build-apk.yml/badge.svg)](https://github.com/tsyche/profitpath/actions/workflows/build-apk.yml)
[![Deploy](https://github.com/tsyche/profitpath/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/tsyche/profitpath/actions/workflows/deploy-pages.yml)
[![Version](https://img.shields.io/github/v/release/tsyche/profitpath?include_prereleases&label=version)](https://github.com/tsyche/profitpath/releases)
[![License](https://img.shields.io/github/license/tsyche/profitpath)](LICENSE)

Client-side profitability and capacity simulator for recurring service businesses. Provides real-time calculations, scenario management, and advanced export capabilities with progressive disclosure UI.

**Live**: [tsyche.github.io/profitpath](https://tsyche.github.io/profitpath/) (GitHub Pages) · [profitpath.tsyche.workers.dev](https://profitpath.tsyche.workers.dev) (Cloudflare Workers, deployed from the [GitLab mirror](https://gitlab.com/tsyche/profitpath))

## What's included

- `index.html`, `assets/app.jsx`, `assets/styles.css` — main app code (vanilla JS with Vite build system)
- `src/calculations/` — modular calculation engine with caching and debug capabilities
- `src/settings/` — experience level management and feature gating
- `ROADMAP.md` — consolidated roadmap with completed features and planned improvements (single source of truth)

## Key Features

- **Progressive Disclosure**: Beginner-friendly interface with optional advanced features unlocked via settings
- **Experience Levels**: Beginner, Intermediate, and Advanced modes with appropriate feature sets
- **Core Features**: Forecast/current mode simulation, revenue composition charts with interactive hover tooltips, scenario management with localStorage persistence
- **Business Intelligence**: Break-even analysis with visual indicators, contribution margin calculations, profitability insights, rich dashboard visualizations
- **Advanced Export**: Multi-format reporting (PDF with charts, Excel with formulas, HTML pages, automated scheduling), email sharing functionality
- **Data Validation**: Comprehensive input validation with contextual error messages and business logic checks
- **Collaboration**: Shareable URLs for sharing scenarios with stakeholders, automatic URL loading on page load
- **Templates**: Industry-specific templates for consulting, cleaning, landscaping, handyman, fitness, and photography services
- **UI/UX**: Responsive design, mobile-optimized layout, collapsible debug panel, utilization gauge, profit waterfall charts, polished visual design
- **Advanced Analytics**: Client mix optimizer (suggests optimal offering mix for profit/utilization), advanced charts (sensitivity heat map, balanced scorecard radar, client capacity funnel)
- **Privacy-Respecting Site Analytics**: Anonymous GoatCounter visit counting (web + APK) — no cookies, no business data ever leaves the device; see [docs/privacy-policy.md](docs/privacy-policy.md)
- **Test Coverage**: 427 unit tests (including fuzz tests, 40 files) and 264 Playwright e2e tests across chromium and firefox (14 files) — both run in CI on every push

## Quick Start

1. Install dependencies and start development server:

```bash
just setup
just dev
```

2. Open http://localhost:3000 in your browser.

## Development

### Common commands

```bash
just setup           # Install dependencies
just dev             # Start dev server with hot reload (localhost:3000)
just test            # Run all tests (unit + e2e)
just lint            # Check code quality
just build           # Production build
just preview         # Preview production build
just fresh           # Complete reset: clean dependencies, install, test, lint, dev
```

For full list of available commands, run `just --list`.

### Testing scenarios

Use the Templates menu to load real, working `INDUSTRY_TEMPLATES` configs
(consulting, cleaning, landscaping, fitness, photography, handyman). A
`TEST_SCENARIOS` object with 2 entries (`basic`, `freelancer`) also exists in
`assets/app.jsx` for URL-based loading, but the `?loadTestScenarios` /
`?testScenario=name` loader functions are currently unimplemented stubs — see
`CLAUDE.md`'s Testing Scenarios section for details.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Comprehensive developer guide with architecture, core modules, and contributing guidelines
- **[ROADMAP.md](ROADMAP.md)** — Completed features and prioritized roadmap for future improvements
- **[FEATURES.md](FEATURES.md)** — Detailed feature descriptions and capabilities
- **[docs/experience-levels.md](docs/experience-levels.md)** — Feature gates by user experience level
- **[docs/privacy-policy.md](docs/privacy-policy.md)** — Data handling and privacy commitments
- **[tests/e2e/README.md](tests/e2e/README.md)** — Playwright E2E test suite structure and commands
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — How to contribute: setup, testing, branch/PR conventions
- **[CHANGELOG.md](CHANGELOG.md)** — Notable changes by version

## Guided Tour

ProfitPath includes a 9-step interactive tour helping new users explore all features. Access it via **Help & tour** in the menu drawer (the ☰ button in the app bar). The tour covers:

1. Welcome & dashboard overview
2. Forecast vs. Current mode selection
3. Team configuration (employees, pay, costs)
4. Service offering setup
5. Profitability metrics
6. Capacity utilization tracking
7. Break-even analysis
8. Interactive charts and visualizations
9. Save, export, and sharing options

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing, and branch/PR conventions.

## License

See LICENSE file for details
