# ProfitPath

Client-side profitability and capacity simulator for recurring service businesses. Provides real-time calculations, scenario management, and advanced export capabilities with progressive disclosure UI.

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
- **Test Coverage**: 278 unit tests (including fuzz tests) and 114 e2e tests across chromium and firefox

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

Load test data via URL parameters:
- `?loadTestScenarios` — add 9 pre-built test scenarios to localStorage
- `?testScenario=default` — load a specific scenario (also: high-profit, loss-making, multi-service, etc.)

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Comprehensive developer guide with architecture, core modules, and contributing guidelines
- **[ROADMAP.md](ROADMAP.md)** — Completed features and prioritized roadmap for future improvements
- **[FEATURES.md](FEATURES.md)** — Detailed feature descriptions and capabilities
- **[docs/experience-levels.md](docs/experience-levels.md)** — Feature gates by user experience level

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

- Create a feature branch: `git checkout -b feature/my-feature`
- Make focused commits with clear messages
- Open a pull request when ready

## License

See LICENSE file for details
