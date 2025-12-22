# ProfitPath — Documentation Summary

```markdown
# ProfitPath — Quick README

This repository contains ProfitPath — a small client-side profitability and capacity simulator.

What this repo contains
- `index.html`, `assets/app.js`, `assets/styles.css` — main app code (vanilla JS, no build step required).
- `ROADMAP.md` — consolidated roadmap with completed features and planned improvements (single source of truth).

Quick status
- **Core Features**: Forecast/current mode simulation, revenue composition charts with interactive hover tooltips, scenario management with localStorage persistence.
- **Business Intelligence**: Break-even analysis with visual indicators, contribution margin calculations, profitability insights, rich dashboard visualizations.
- **Advanced Export**: Multi-format reporting (PDF with charts, Excel with formulas, HTML pages, automated scheduling), email sharing functionality.
- **Data Validation**: Comprehensive input validation with contextual error messages and business logic checks.
- **Collaboration**: Shareable URLs for sharing scenarios with stakeholders, automatic URL loading on page load.
- **UI/UX**: Responsive design, mobile-optimized layout, collapsible debug panel, utilization gauge, profit waterfall charts, polished visual design.

Run locally
1. Start a static server in the project root:

```bash
python3 -m http.server -b 0.0.0.0 8000
```

2. Open http://localhost:8000 in your browser.

Testing & development
- Load test scenarios: `?loadTestScenarios` - adds 9 test scenarios to localStorage
- Load specific scenario: `?testScenario=default` (or high-profit, loss-making, multi-service, etc.)

Building (optional)
```bash
# Install dependencies
npm install

# Development build with watch
npm run build:dev

# Production build
npm run build

# Run development server
npm run serve
```

Documentation & roadmap
- For the complete roadmap with completed features and future plans, see `ROADMAP.md`.
- For developer documentation, API reference, and contribution guidelines, see `DEVELOPER.md`.

Contributing
- Create a branch: `git checkout -b feature/my-feature`
- Make small, focused commits and open a PR when ready.

License
- (Add license details here if desired)

``` 
