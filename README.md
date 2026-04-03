# ProfitPath — Documentation Summary

```markdown
# ProfitPath — Quick README

This repository contains ProfitPath — a small client-side profitability and capacity simulator.

What this repo contains
- `index.html`, `assets/app.jsx`, `assets/styles.css` — main app code (vanilla JS with Vite build system).
- `src/calculations/` — modular calculation engine with caching and debug capabilities.
- `src/settings/` — experience level management and feature gating.
- `ROADMAP.md` — consolidated roadmap with completed features and planned improvements (single source of truth).

Quick status
- **Progressive Disclosure**: Beginner-friendly interface with optional advanced features unlocked via settings
- **Experience Levels**: Beginner, Intermediate, and Advanced modes with appropriate feature sets
- **Core Features**: Forecast/current mode simulation, revenue composition charts with interactive hover tooltips, scenario management with localStorage persistence.
- **Business Intelligence**: Break-even analysis with visual indicators, contribution margin calculations, profitability insights, rich dashboard visualizations.
- **Advanced Export**: Multi-format reporting (PDF with charts, Excel with formulas, HTML pages, automated scheduling), email sharing functionality.
- **Data Validation**: Comprehensive input validation with contextual error messages and business logic checks.
- **Collaboration**: Shareable URLs for sharing scenarios with stakeholders, automatic URL loading on page load.
- **Templates**: Industry-specific templates for consulting, cleaning, landscaping, handyman, fitness, and photography services.
- **UI/UX**: Responsive design, mobile-optimized layout, collapsible debug panel, utilization gauge, profit waterfall charts, polished visual design.
- **Syntax Integrity**: All template literals and backticks resolved, comprehensive test coverage (181+ tests passing).

Run locally
1. Install dependencies and start development server:

```bash
npm install
npm run dev
```

2. Open http://localhost:3000 in your browser.

Testing & development
- Load test scenarios: `?loadTestScenarios` - adds 9 test scenarios to localStorage
- Load specific scenario: `?testScenario=default` (or high-profit, loss-making, multi-service, etc.)

Building & development
```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Run tests (181+ tests passing)
npm run test:run

# Run linting
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

Documentation & roadmap
- For the complete roadmap with completed features and future plans, see `ROADMAP.md`.
- For developer documentation, architecture details, and contribution guidelines, see `CLAUDE.md`.
- For an explanation of Experience Levels and which features are gated per level, see `docs/experience-levels.md`.

## Guided Tour

ProfitPath includes a comprehensive 9-step guided tour to help new users understand all features:

1. **Welcome to ProfitPath** - Introduction to the dashboard
2. **Choose Your Mode** - Select Forecast or Current analysis mode
3. **Team Configuration** - Set employee count and compensation details
4. **Define Your Services** - Add service offerings with pricing and costs
5. **Key Profitability Metric** - Net income indicator (green = profitable)
6. **Capacity Utilization** - Monitor team utilization (aim for 80-90%)
7. **Break-even Analysis** - Required clients and contribution margins
8. **Charts & Visualizations** - Interactive charts and business analytics
9. **Save, Export & Share** - Complete toolkit for managing and sharing scenarios

The tour includes progress indicators, navigation arrows, and can be exited anytime with the ✕ button or Escape key. Access it anytime via the ❓ help button in the top-right corner or "🎯 Take Tour" in the mobile menu.

Contributing
- Create a branch: `git checkout -b feature/my-feature`
- Make small, focused commits and open a PR when ready.

License
- (Add license details here if desired)

``` 
