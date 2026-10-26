# ProfitPath Agent Development Guide

This document provides comprehensive information for AI agents and developers working on the ProfitPath project. It contains technical architecture details, business logic understanding, development workflows, and integration points.

## Project Overview

**ProfitPath** is a client-side profitability and capacity simulator for recurring service businesses. It provides real-time calculations, scenario management, and advanced export capabilities with a focus on progressive disclosure for different user experience levels.

### Core Value Proposition
- **Business Intelligence**: Break-even analysis, utilization tracking, profitability insights
- **Scenario Planning**: Save/load scenarios, side-by-side comparisons, what-if analysis
- **Progressive Disclosure**: Beginner-friendly interface with advanced features unlocked via experience levels
- **Industry Templates**: Pre-configured templates for consulting, cleaning, landscaping, fitness, photography, and handyman services

## Technical Architecture

### Frontend Architecture
- **Build System**: Vite v8.3.5 with JSX support
- **Testing**: Vitest v4.0.18 with jsdom environment
- **Code Quality**: ESLint with comprehensive rules
- **Language**: TypeScript (`strict: true`; see Build Process > TypeScript Support)
- **State Management**: Single global state object with localStorage persistence

### Key Files Structure

```
assets/
├── app.ts               # Entry point: boot order, window globals, URL/localStorage load, wire()
├── styles.css           # Styling and responsive design
├── accessibility.js     # Accessibility enhancements
├── components/          # UI panels, each with a bind/init entry called from app.ts (AppRender.ts = render()/updateOutputs, OfferingsTable, ExpensesPanel, ResourcesPanel, RangesMarketPanel, SettingsPanel, AppMenus, AnalysisPanels, ...)
├── state/              # appState.ts (state, persistState, undo/redo history) and hooks.ts (render/updateOutputs callbacks for handlers)
├── hooks/              # Custom hooks (useTableFocus.js)
├── services/           # Business logic modules
│   ├── businessLogic.js    # Core business rules and validation
│   ├── miscService.js      # Utility functions, exports, scenario URL sharing
│   ├── modalService.js     # Modal and toast handling
│   ├── industryTemplates.ts # INDUSTRY_TEMPLATES presets (Templates menu)
│   ├── scenarioService.js  # Scenario management
│   ├── stateManager.js     # State persistence helpers
│   ├── visualizationService.js # Chart and visualization logic (gauge, waterfall)
│   └── advancedChartsService.js # Heat map, radar scorecard, client funnel
└── utils/              # Helper utilities
    ├── chartUtils.js       # Chart configuration and rendering
    ├── helpers.js          # General utility functions
    ├── progressiveDisclosure.js # Feature gating logic
    └── tooltipManager.js   # Tooltip system

src/
├── analytics/          # Analytics, feedback, and dashboard modules
├── calculations/       # Modular calculation engine
│   ├── index.ts          # Core calculation engine with caching
│   ├── offeringRanking.ts # Profit-per-staff-hour ranking and discount-floor status
│   ├── offeringPrice.ts  # Per-session / one-time pricing lens: price per visit or per sale vs the canonical priceMonthly; display and entry only
│   ├── marketPosition.ts # Optional market low/avg/high per offering and the green/yellow/red price badge; display only
│   ├── currency.ts       # Scenario currency allowlist + shared fmtMoney0 (display only)
│   ├── offeringMeta.ts   # Per-offering confidence tag (verified/estimated/guess) and note sanitizers; display only
│   ├── rangeCase.ts      # Conservative / base / optimistic lens: calc() applies the active case's bounds itself (`ignoreCase` opts out), so every output, chart and export follows it; session-only, never persisted; panel in assets/components/RangeCasePanel.ts
│   ├── ranges.ts         # Optional low/high bounds (fill %, current clients, sessions per year; one `RANGE_BOUND_KEYS` list in rangeCase.ts): calcRange min/base/max band (always from the true base), bound sanitizers, suggestRanges (confidence-tag presets, user-set spreads), calcRangeDrivers (profit swing per offering)
│   ├── resources.ts      # Optional extra capacity pools (booth, room): sanitizer and annual hours; optional `staffFree` flag (tagged offerings draw no staff hours); calc() caps forecast clients per pool and reports poolUtilization + bottleneck
│   ├── groupRuns.ts      # Group offerings: costPerRun sanitizer and breakEvenSeats; calc() charges the run cost per cohort (Current) or per filled seat (Forecast); table in assets/components/GroupRunsPanel.ts
│   ├── membership.ts     # Membership / prepaid-credit what-if: one plan vs one member profile priced from the offerings; credits at list by default, stacking opt-in per plan; display only, never feeds calc() (persisted in scenarios, share URL and CSV as membershipPlans/memberProfiles; optional per-offering visitsLow/visitsHigh on a profile give calcMembershipRange's min/base/max band; panel in assets/components/MembershipPanel.ts, docs/plans/archive/membership-calculator.md)
│   └── expenses.ts       # Expense line items: categories, frequencies (weekly, monthly, annual, one-time amortized over lifeYears), sanitizer, annualization, cost-by-category breakdown
├── insights/           # Rules-based insights + what-ifs, reverse calculator (both built on calc()), mix optimizer
│   ├── insightsEngine.ts   # Rules-based insights; what-if impacts re-run calc()
│   ├── reverseCalculator.ts # "What would it take?": bisects each lever against takeHome (after est. tax)
│   ├── mixOptimizer.ts     # Suggests optimal offering mix for profit/utilization
│   └── whatIfWizard.ts     # Guided "What If?" wizard: 9 scenarios as state patches, previewed through calc()
├── settings/          # Experience levels and feature gating
│   └── index.js          # Settings management and feature gates
└── test/             # Vitest unit/integration tests (incl. fuzz tests)

index.html           # Main HTML structure
public/sw.js         # Service worker for PWA functionality
manifest.json        # PWA configuration
```

### Core Modules

#### 1. Calculation Engine (`src/calculations/index.ts`)
- **Purpose**: Handles all business logic calculations with caching and debugging support
- **Key Features**:
  - Caching system with configurable cache size (default: 100 entries)
  - Debug mode with intermediate calculation results
  - Input sanitization and validation
  - Two calculation modes: Forecast and Current operations
- **Constants**: `HOURS_PER_YEAR = 2080` (standard paid hours per employee per year)
- **Cache Management**: LRU eviction (delete + re-insert on hit) when max size exceeded

#### 2. Business Logic (`assets/services/businessLogic.js`)
- **Purpose**: Core business rules, validation, and offering management
- **Key Functions**:
  - `validateBusinessLogic()` - Comprehensive input validation with suggestions
  - `rebalanceMix()` - Automatic mix percentage normalization
  - `defaultOfferings()` - Default service configurations
  - `updateValidationDisplay()` - Real-time validation feedback

#### 3. Settings & Feature Gating (`src/settings/index.js`)
- **Purpose**: Manages user preferences and progressive disclosure
- **Experience Levels**:
  - **Beginner**: Basic features only (core calculations, scenario management)
  - **Intermediate**: Advanced calculations, detailed breakdowns, scenario comparison, sensitivity analysis, client mix optimizer, insights and reverse calculator panels
  - **Advanced**: All features including debug panel, performance metrics, sensitivity analysis, client mix optimizer, advanced charts (heat map, radar scorecard, client funnel)
- **Feature Gates**: Automatic feature enablement based on experience level. Note: export formats are always available regardless of level (see `docs/experience-levels.md`).

#### 4. State Management
- **Global State**: Single `state` object containing all application data
- **Persistence**: localStorage for scenarios and user preferences
- **Auto-save**: Automatic persistence on input changes
- **URL Sharing**: Scenarios can be encoded in URLs for sharing

## Business Logic Understanding

### Core Business Rules

#### 1. Employee Capacity Calculation
```javascript
const HOURS_PER_YEAR = 2080; // Standard paid hours per employee per year
const annualPaidHours = employees * HOURS_PER_YEAR;
const annualServiceHours = annualPaidHours * (productiveUtilizationPct / 100);
```

#### 2. Two Calculation Modes

**Forecast Mode**:
- Plans capacity for target client count
- Uses mix percentages to distribute clients across offerings
- Calculates required capacity based on target utilization

**Current Mode**:
- Analyzes existing client base
- Uses actual client counts per offering
- Calculates current utilization and profitability

#### 3. Mix Percentage Normalization
- Mix percentages must sum to 100% for accurate calculations
- Auto-normalization available when "lock mix" is enabled
- Proportional distribution when one offering's mix is changed

#### 4. Break-even Analysis
- Calculates contribution margin per client
- Determines break-even point in clients and revenue
- Provides profitability thresholds and warnings

### Industry Templates

The application includes pre-configured templates for:
- **Consulting**: High-value, low-volume services
- **Cleaning**: High-frequency, standardized services
- **Landscaping**: Seasonal, outdoor services
- **Fitness**: Personal training and group classes
- **Photography**: Event-based and portrait services
- **Handyman**: Home repair and maintenance

Each template includes appropriate pricing, frequency, and cost structures.

## Development Workflow

### Prerequisites
- Node.js (v24, pinned in `.tool-versions`) — the root `.tool-versions` pins only Node; Java (`android/.tool-versions`) and Ruby (`ios/.tool-versions`) are split into their respective platform directories so Cloudflare's build (which reads the root file) doesn't try to install mobile-only tooling
- Modern browser with ES6+ support
- Git for version control

### Git Workflow

`origin` pushes to both GitHub and GitLab (`git remote get-url --all --push origin`) — one `git push` updates both.

CI is designed to auto-bump the patch version on every push to `main` (commits back with `[skip ci]`), which normally means the remote is 1 commit ahead by the time you're ready to push. Actions stopped triggering on push from 2026-07-23 (flagged GitHub account) and was working again by 2026-09-12, so the bump commits land again. Always rebase before committing or pushing:

```bash
git pull --rebase
git commit -am "your message"
git push
```

Or if you've already committed locally:

```bash
git pull --rebase && git push
```

### Setup Commands

Use `just` as the primary workflow (run `just --list` to see all recipes):

```bash
just fresh           # Complete reset: clean, install, test, lint, start
just setup           # Install dependencies (npm ci)
just dev             # Start dev server (localhost:3120)
just test            # Run all tests (unit + e2e)
just lint            # Check code quality
just build           # Production build
```

Underlying npm commands (for reference):
```bash
npm ci               # Install dependencies
npm run dev          # Start development server (http://localhost:3120)
npm run build        # Production build
npm run test:run     # Run unit tests (headless)
npm run lint         # Check code quality
```

### Testing Scenarios

To exercise different business situations, use the Templates menu, which loads real `INDUSTRY_TEMPLATES` configs for consulting, cleaning, landscaping, fitness, photography, and handyman.

### Testing Strategy

#### Test Coverage (731 unit tests across 65 files — 730 passing, 1 skipped — plus 438 Playwright e2e tests across 38 files, chromium + firefox)
- **Unit Tests**: Business logic, calculation engine, utility functions
- **Integration Tests**: UI components and user workflows
- **Fuzz Tests**: Seeded property tests for the calculation engine and input sanitizers (`src/test/fuzz.test.ts`)
- **Business Logic Tests**: Comprehensive calculation validation
- **E2E Tests**: Playwright suites in `tests/e2e/` (chromium + firefox, dedicated port 3121)

#### Test Files
- `src/calculations/calculations.test.ts` - Core calculation tests
- `src/test/fuzz.test.ts` - Fuzz/property tests for calc engine and sanitizers
- Additional tests in `src/test/` directory

#### Test Commands
```bash
npm run test:run     # Run all tests (headless)
npm run test:ui      # Run tests with UI interface
```

### Code Quality

#### ESLint Configuration
- Modern JavaScript standards
- Consistent formatting and style
- Error prevention rules
- Custom rules for project-specific patterns

#### Code Style Guidelines
- Use modern JavaScript (ES6+)
- Prefer functional programming patterns
- Keep functions under 50 lines when possible
- Use meaningful variable names
- Add comments for complex business logic
- Follow consistent indentation and formatting

### Build Process

#### Vite Configuration
- JSX support for modern component development
- Hot module replacement for development
- Optimized production builds
- Service worker integration for PWA features

#### TypeScript Support
- The codebase is TypeScript with `strict: true`; `tsconfig.json` is `noEmit` (Vite builds, `tsc` only checks). Run `just typecheck`: it must report 0 errors (no ratchet or baseline file). Browser globals are declared in `src/globals.d.ts`. `tests/e2e` is typechecked (included in `tsconfig.json`); unit `**/*.test.ts` files are still excluded (known gap: ~1,150 implicit-any/null errors in the jsdom mock tests).
- Only `eslint.config.js`, `vite.config.js` and `public/sw.js` stay `.js`.
- New code is written in `.ts`; do not add `.js` files.
- Import `.ts` modules without an extension (`../calculations/index`); `index.html` script tags need the real `.ts` path.
- ESLint has a `**/*.ts` block (typescript-eslint recommended, `no-explicit-any` as warning), and `npm run lint` runs with `--max-warnings 0`, so avoid `any` (use `unknown`, `$opt<T>`/`$req<T>` from `assets/utils/dom.ts`). `$`/`$$` are typed (`<T extends HTMLElement = HTMLInputElement>`, return `T | null`), so no `any` exceptions remain.
- Migration history: `docs/plans/archive/typescript-migration.md`.

## Integration Points

### Export System
The application supports multiple export formats:
- **CSV**: Detailed spreadsheet with headers and units
- **Excel**: Workbook with formulas and formatting
- **PDF**: Professional reports with charts
- **HTML**: Standalone web pages
- **Email**: Direct sharing via email client
- **Embed**: iframe codes for website integration
- **Schedule**: Set up recurring report generation

### Analytics System
Two separate, unrelated systems — don't conflate them:
- **In-app feature analytics** (`src/analytics/`): admin-only, opt-in via the settings panel toggle, stored in `localStorage` only. Never transmitted anywhere — see `sanitizeData()` in `src/analytics/analytics.js`, which also strips any accidental PII-shaped fields before storing an event.
- **Site traffic counter** (GoatCounter, `index.html`): a third-party script that logs anonymous page-load counts (path, referrer, browser/OS, screen size) to `tsyche.goatcounter.com`. No cookies, no fingerprinting, honors the browser's Do Not Track header automatically, and never sees anything entered into the app — scenarios, prices, and calculations still never leave the device. Fires from both the web deploy and the Capacitor-wrapped APK, tagged `/web` vs `/apk` respectively so usage can be told apart; skipped automatically on `localhost`/`127.0.0.1` dev servers. See `docs/privacy-policy.md`.

### Scenario Management
- **LocalStorage persistence** for unlimited scenarios
- **URL encoding** for easy sharing
- **Import/Export** functionality
- **Version control** ready for future enhancements

### Chart and Visualization System
- **Lazy loading** for performance optimization
- **Interactive charts** with hover tooltips
- **Mobile-responsive** design
- **Extensible architecture** for additional chart types

## Performance Considerations

### Optimization Strategies
- **Calculation caching** to avoid redundant computations
- **Lazy loading** of export libraries and charts
- **Efficient DOM operations** with minimal re-renders
- **Service worker** for offline functionality and caching

### Memory Management
- **Cache size limits** (default: 100 calculation results, LRU eviction)
- **Automatic cleanup** of unused resources
- **Efficient state updates** to prevent memory leaks

### Browser Support
- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Mobile browsers**: iOS Safari, Chrome Mobile
- **Progressive Web App**: Installable on supporting devices
- **Graceful degradation** for older browsers

## Debugging and Development Tools

### Debug Panel
- **Real-time calculation output** with intermediate results
- **State inspection** for troubleshooting
- **Error reporting** with stack traces
- **Performance metrics** for optimization

### Development Features
- **Hot reload** for instant feedback during development
- **Syntax validation** to catch errors early
- **Comprehensive logging** for debugging
- **Error boundaries** for graceful error handling

### Testing Utilities
- **Mock functions** for external dependencies
- **Test scenarios** for various business situations
- **Edge case coverage** for robust error handling
- **Performance testing** for calculation engine

## Security Considerations

### Client-Side Security
- **No app-logic server dependencies** - fully client-side application; see Data Privacy below for the one anonymous network call the app makes
- **LocalStorage security** - user data stays local
- **Input validation** - comprehensive sanitization
- **XSS prevention** - proper HTML escaping

### Data Privacy
- **No business-data transmission** - all calculations, scenarios, and inputs stay on-device; only an anonymous page-load count leaves the app (see Analytics System above)
- **User control** - complete control over your data
- **Export security** - secure export methods
- **Privacy-first design** - minimal data collection

## Future Enhancement Opportunities

### High-Impact Features
1. **Enhanced Visualizations**: Utilization gauges, profit waterfall charts
2. **Advanced Analytics**: Sensitivity analysis, Monte Carlo simulation
3. **Industry Benchmarking**: Performance comparisons and best practices
4. **Collaboration Tools**: Team sharing and scenario collaboration

### Technical Improvements
1. **Performance Optimization**: Further caching and lazy loading
2. **Accessibility**: Enhanced keyboard navigation and screen reader support
3. **Mobile Experience**: Touch-friendly interactions and responsive design
4. **Integration APIs**: Third-party service connections

### Architecture Evolution
1. **Component Architecture**: Modular component system
2. **State Management**: Advanced state management patterns
3. **Testing Infrastructure**: Visual regression testing
4. **Documentation**: Enhanced developer documentation

## Troubleshooting Guide

### Common Issues

#### Calculation Errors
- **Check input validation** - ensure all required fields are filled
- **Verify mix percentages** - ensure they sum to 100% or enable auto-normalization
- **Review business logic** - check for unrealistic pricing or cost structures

#### UI Issues
- **Clear cache** - remove browser cache and localStorage
- **Check console** - look for JavaScript errors
- **Verify dependencies** - ensure all packages are installed correctly

#### Performance Issues
- **Check calculation cache** - may need cache clearing
- **Monitor memory usage** - large scenarios may impact performance
- **Review chart loading** - may need to optimize chart rendering

### Debug Commands
```javascript
// Clear calculation cache
clearCalculationCache();

// Get cache statistics
getCacheStats();

// Validate business logic
validateBusinessLogic();

// Update settings
updateSetting('key', 'value');
```

## Contributing Guidelines

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch/PR conventions, and testing requirements.

### Code Review Checklist
- [ ] Functions are well-documented
- [ ] No console.log statements in production
- [ ] Error handling is appropriate
- [ ] Performance impact considered
- [ ] Mobile responsiveness tested
- [ ] Accessibility considerations included

## Contact and Support

### Development Team
- **Issue tracking**: GitHub Issues
- **Documentation**: README.md and AGENTS.md

### Getting Help
- **Documentation**: Start with README.md and AGENTS.md
- **Issues**: Search existing issues before creating new ones
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

This document serves as a comprehensive guide for AI agents and developers working on ProfitPath. It provides the technical depth needed for effective development while maintaining focus on the business value and user experience goals of the application.
