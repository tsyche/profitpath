# ProfitPath

**TL;DR:** Model service-business profitability and capacity in your browser. Business inputs stay on your device; save scenarios, compare alternatives, and export results.

[![Tests](https://github.com/tsyche/profitpath/actions/workflows/test.yml/badge.svg)](https://github.com/tsyche/profitpath/actions/workflows/test.yml)
[![Build APK](https://github.com/tsyche/profitpath/actions/workflows/build-apk.yml/badge.svg)](https://github.com/tsyche/profitpath/actions/workflows/build-apk.yml)
[![Deploy](https://github.com/tsyche/profitpath/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/tsyche/profitpath/actions/workflows/deploy-pages.yml)
[![Version](https://img.shields.io/github/v/release/tsyche/profitpath?include_prereleases&label=version)](https://github.com/tsyche/profitpath/releases)
[![License](https://img.shields.io/github/license/tsyche/profitpath)](LICENSE)

Client-side profitability and capacity simulator for recurring service businesses. Provides real-time calculations, scenario management, and advanced export capabilities with progressive disclosure UI.

**Live**: [profitpath.tsyche.workers.dev](https://profitpath.tsyche.workers.dev) (Cloudflare Workers, deployed from the [GitLab mirror](https://gitlab.com/tsyche/profitpath)) · [tsyche.github.io/profitpath](https://tsyche.github.io/profitpath/) (GitHub Pages)

## Contents

- [What's included](#whats-included)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Documentation](#documentation)
- [Guided Tour](#guided-tour)
- [Contributing](#contributing)
- [License](#license)

## What's included

- `index.html`, `assets/app.ts`, `assets/styles.css` — main app code (TypeScript with Vite)
- `src/calculations/` — modular calculation engine with caching and debug capabilities
- `src/settings/` — experience level management and feature gating
- `ROADMAP.md` — consolidated roadmap with completed features and planned improvements (single source of truth)

## Key Features

- **Progressive Disclosure**: Beginner-friendly interface with optional advanced features unlocked via settings
- **Experience Levels**: Beginner, Intermediate, and Advanced modes with appropriate feature sets
- **Core Features**: Forecast/current mode simulation, revenue composition charts with interactive hover tooltips, scenario management with localStorage persistence
- **Business Intelligence**: Break-even analysis with visual indicators, contribution margin calculations, profitability insights, rich dashboard visualizations
- **Advanced Export**: Multi-format reporting (printable PDF, Excel with formulas, HTML pages), email sharing, and portable scenario/comparison links. Scheduled delivery requires a server and is unavailable.
- **Data Validation**: Comprehensive input validation with contextual error messages and business logic checks
- **Collaboration**: Shareable URLs for sharing scenarios with stakeholders, automatic URL loading on page load
- **Templates**: Industry-specific templates for consulting, cleaning, landscaping, handyman, fitness, and photography services
- **UI/UX**: Responsive design, mobile-optimized layout, collapsible debug panel, utilization gauge, profit waterfall charts, polished visual design
- **Guided "What if?" wizard** (all experience levels): preview hiring, pricing, client, cost and take-home-goal scenarios against your numbers, then apply one with undo
- **Advanced Analytics**: Client mix optimizer (suggests optimal offering mix for profit/utilization), rules-based insights with what-if estimates, a "What would it take?" reverse calculator for a target take-home, advanced charts (sensitivity heat map, balanced scorecard radar, client capacity funnel)
- **Privacy-Respecting Site Analytics**: Anonymous GoatCounter visit counting (web + APK) — no cookies, no business data ever leaves the device; see [docs/privacy-policy.md](docs/privacy-policy.md)
- **Testing**: Unit, integration, seeded fuzz, and Playwright journey/accessibility tests across Chromium and Firefox. See [the testing guide](tests/e2e/README.md).

## Quick Start

1. Install dependencies and start development server:

```bash
just setup
just dev
```

2. Open http://localhost:3120 in your browser.

Choose **Settings → Layout** to switch between Classic (the original single page) and Workspaces (Model, Results, Compare). Both use the same model; the choice is remembered on this device. Workspaces is the default for new devices; Classic stays available in Settings. The [workspace preview](http://localhost:3120/?layout=workspaces) also opens directly. See [experience levels](docs/experience-levels.md#workspace-preview) for navigation and detail behavior.

## Development

### Generate a decision link from Node

Build the DOM-free encoder with the installed Vite toolchain:

```bash
npm exec vite build -- --ssr src/sharing/decisionLink.ts --outDir dist/node
```

Import the generated module from your Node script (Node 24+), supplying two to four
`{ name, state }` options. Each state is a normal calculation input; the first
option is the baseline. Keep the built file inside this checkout so Node can
resolve `fflate` from its installed dependencies.

```ts
import { encodeDecisionLink } from './dist/node/decisionLink.js';

const link = encodeDecisionLink(options, {
  baseUrl: 'https://profitpath.tsyche.workers.dev/',
  selectedCase: 'base',
  annualGoal: 100000 // Optional annual net income before tax; omit for no goal.
});
if (!link) throw new Error('Invalid options or bundle exceeds the share limits');
console.log(link);
```

The URL is `?bundle=v1.<payload>&decision=1&case=base[&goal=100000]`.
`payload` is unpadded base64url of raw DEFLATE-compressed UTF-8 JSON:
`{"version":1,"scenarios":[{"name":"Option 0","state":{...}},...]}`.
Names are trimmed and limited to 120 characters; states use the same allowlist,
defaults and clamps as browser imports. Supply stable IDs for offerings,
expenses, resources and membership references; missing IDs are generated.

The unchanged bundle limits are four scenarios, 500,000 uncompressed JSON bytes
and 20,000 characters for the `v1.` payload (excluding the URL and decision
parameters). Invalid or oversized states return `null`; invalid base URLs throw.
Cases are `base`, `conservative`, or `optimistic`; the optional goal is a whole
number from 0 through 1,000,000,000,000. Options must share currency and calculation
mode for the workbench to calculate. Links open the decision in memory without
importing saved scenarios. Rebuild the encoder after source changes; a normal
web build replaces `dist/`.

### Common commands

```bash
just setup           # Install dependencies
just dev             # Start dev server with hot reload (localhost:3120)
just test            # Run all tests (unit + e2e)
just test-e2e-container # Run Chromium + Firefox in a disposable Docker container
just lint            # Check code quality
just build           # Production build
just preview         # Preview production build
just fresh           # Complete reset: clean dependencies, install, test, lint, dev
```

For full list of available commands, run `just --list`.

Run `just setup` after cloning or changing dependencies. Other checks use the
installed dependencies without reinstalling them. If the host sandbox blocks
browser startup, `just test-e2e-container` uses a source snapshot and the
Playwright image matching the lockfile; it requires a running Docker engine and
writes logs and failure artifacts to `e2e-results/container/`.

### Testing scenarios

Use the Templates menu to load real, working `INDUSTRY_TEMPLATES` configs
(consulting, cleaning, landscaping, fitness, photography, handyman).

## Documentation

- **[AGENTS.md](AGENTS.md)** — Comprehensive developer guide with architecture, core modules, and contributing guidelines
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
