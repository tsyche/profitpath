# Current Features

**TL;DR:** ProfitPath models service pricing, costs, capacity, scenarios, and shareable decisions entirely in the browser.

ProfitPath is a comprehensive profitability and capacity simulator for recurring service businesses.

## Core Functionality

### Calculation Engine
- **Forecast & Current Modes**: Switch between planning future growth and analyzing current operations
- **Real-time Calculations**: Instant updates as you modify inputs
- **Comprehensive Metrics**: Revenue, costs, profit, utilization, capacity, break-even analysis
- **Modular Architecture**: Separated calculation logic for better maintainability and testing
- **Performance Caching**: Intelligent caching system for improved calculation performance
- **Debug Mode**: Intermediate calculation results for debugging and transparency

### Business Intelligence
- **Break-even Analysis**: Visual indicators showing contribution margins and break-even points
- **Utilization Tracking**: Monitor capacity usage with gauge and percentage indicators
- **Profit/Loss Waterfall**: Interactive chart showing revenue flow and cost breakdown
- **Client Mix Optimizer**: Suggests the offering mix that maximizes projected profit or utilization within current capacity (Intermediate+ experience levels)
- **Advanced Charts**: Price × utilization sensitivity heat map, balanced scorecard radar (profitability, utilization, growth headroom, cost efficiency, diversification), and client capacity funnel (Advanced experience level)
- **Advisor**: One entry point for insights, take-home goals, offering mix, and charts; opens each full tool (Intermediate+ experience levels)

### Data Management
- **Scenario Saving**: Save unlimited scenarios with descriptive names
- **Auto-save**: Automatic persistence of current work to localStorage
- **Shareable URLs**: Encode scenarios in URLs for easy sharing with stakeholders
- **Scenario Bundles**: Select up to four saved scenarios and share one snapshot link; recipients choose whether to import them, and duplicate names get a suffix
- **Import/Export**: Load scenarios from URLs or share via email
- **Embeddable Widgets**: Generate iframe codes with portable scenario snapshots, including both options for a comparison
- **Social Media Sharing**: Open Graph and Twitter Card support for rich previews
- **Industry Templates**: Pre-built configurations for consulting, cleaning, landscaping, fitness, photography, and handyman services
- **Scenario Comparison**: Side-by-side comparison of saved scenarios with key metrics and differences
- **Decision Workbench**: Compare two to four saved options from Scenarios, or Compare in Workspaces. Choose a baseline, assumption case, and optional annual net-income goal; review offering revenue/contribution deltas, guessed and untagged revenue, and a plain-language income verdict. Options must share a currency and calculation mode.
- **Decision Sharing**: CSV, print/PDF, and snapshot links retain the reviewed options, baseline, case, goal and notes. A decision link opens in memory without replacing the recipient's draft or saved library.
- **Analytics Tracking**: Background usage tracking for admin analysis (admin-only with user opt-out toggle) ✅
- **Site Traffic Counter**: Privacy-respecting GoatCounter visit counter (no cookies, honors Do Not Track), separate from the opt-in feature analytics above — see [docs/privacy-policy.md](docs/privacy-policy.md) ✅

## Advanced Features

### Export & Reporting
- **Multiple Formats**: CSV with detailed headers and units, Excel workbooks, printable PDF reports, and standalone HTML pages
- **Report Conclusions**: PDF, HTML, and email include the selected case, annual results, scenario context and notes. Readable reports use per-month, per-session, or per-sale prices; CSV/Excel keep canonical monthly prices for model compatibility.
- **Email Sharing**: Open a report draft in your mail application, including a case-preserving snapshot link
- **Scheduling Information**: Explains that automated delivery requires a server and is unavailable in this version

### Decision assumptions

The workbench's break-even sales-loss figure is the largest **total** loss on matched services whose prices increased that still matches baseline annual income. It replaces those services' loss assumption and holds other inputs at the selected case. Discrete client counts are recalculated through the normal engine. For stepwise Current-mode group costs, a labeled conservative bound keeps the original run costs; it also ignores any gain from losing negative-contribution sales. This avoids promising a safe interval from a non-monotone profit curve. Forecast remains a capacity-supported ceiling.

Membership What-If shows a per-service price-floor stress test from the entered plans. It assigns the entire fee to one service, fully redeems its included visits and eligible credits without breakage, and also tests the cash-discount limit at high usage. Credits redeem at list unless stacking is explicitly enabled. Other included services are not valued in that service's test. The deepest of this derived discount and the offering's manual discount drives the existing floor warning; modeled revenue stays unchanged.

Plan value-order warnings compare the same entered member profile under every plan. They identify a lower-fee plan whose total monthly payment matches or beats a higher-fee plan; they do not assume every member should upgrade.

### Testing Infrastructure
- **Industry Templates**: 6 working templates (consulting, cleaning, landscaping, fitness, photography, handyman) loadable from the Templates menu

### Performance & Reliability
- **Lazy Loading**: Export libraries and charts load on-demand
- **Offline Support**: Service worker caches assets for offline use
- **Error Handling**: Comprehensive validation and user-friendly error messages
- **PWA Ready**: Installable web app with native app-like experience

### User Experience

Choose **Settings → Layout** to switch between Classic and the approved [workspace preview](docs/experience-levels.md#workspace-preview). The choice is remembered on this device; both layouts use the same model. Model groups business setup and focused offering editing; Results leads with annual figures and question-led tools; Compare uses saved baseline/alternative scenarios. Classic remains the default for new devices pending the human walkthrough and release gates in [ROADMAP item 40](ROADMAP.md).

Click the model title or pencil to rename it; an unnamed draft prompts **Name your model**. Enter finishes a rename and Escape cancels it. **Save scenario** stores a named snapshot for comparison. **Create alternative** keeps the saved baseline unchanged and starts a separately named draft to edit and save. It also creates an editable copy of a read-only snapshot.

**Forecast** plans customers supported by capacity; **Current** analyzes entered existing customers. A mode badge and short business-setup explanation identify the active calculation. Model/Results/Compare remain equal-sized navigation controls. Mobile context actions use one icon-and-label row; the overflow closes on an action, outside click or Escape.

In the preview, experience levels control initial detail while all modeling inputs, specialist tools, Compare, and exports remain reachable. Incomplete numeric edits keep last-valid results and block saving/sharing. Shared snapshot reloads retain the selected case.

- **Progressive Disclosure**: Beginner-friendly interface with optional advanced features
- **Experience Levels**: Beginner, Intermediate, and Advanced user modes with appropriate feature sets
	- See `docs/experience-levels.md` for a full mapping of which features are visible at each level and guidance for maintainers.
- **Feature Gating**: Advanced features unlocked via settings panel for power users
- **Guided Onboarding**: Interactive step-by-step tour helping new users explore all features, accessible via **Help & tour** in the menu drawer (☰)
- **Industry Setup Wizards**: Tailored configuration wizards for different business types (consulting, cleaning, landscaping, fitness, photography)
- **Contextual Help Tooltips**: Smart tooltips that appear on hover to explain features and provide inline guidance
- **Help Center**: Comprehensive help system with guided tour and support documentation
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Interactive Charts**: Hover tooltips, pinnable legends, detailed breakdowns with visual feedback
- **Mobile Navigation**: App bar with a slide-in menu drawer (☰) plus a thumb-reachable bottom bar (Scenarios, Templates, Settings, More) for full feature access on phones
- **Accessibility**: Keyboard navigation, screen reader support, high contrast options
- **Feedback System**: User feedback collection via modal dialog with submission support

### Developer Features
- **Modern Development Stack**: Vite for fast development and optimized builds with JSX support, justfile for simplified commands
- **Comprehensive Testing**: Vitest unit tests with jsdom environment, plus Playwright E2E tests
- **Syntax Validation**: Dedicated syntax test to prevent parsing errors and regressions
- **Code Quality**: ESLint configuration with automated linting and CI integration
- **Debug Panel**: Built-in developer tools for testing and debugging
- **CI/CD Pipeline**: Automated testing, linting, and quality checks
- **Comprehensive Documentation**: API reference, architecture guide, contribution guidelines, AGENTS.md for development context
- **Error-Free Development**: All template literals and syntax issues resolved
- **Modular Architecture**: Clean separation of concerns with calculation engine, business logic, and UI layers
- **Progressive Disclosure**: Sophisticated feature gating system for different user experience levels

## How to Use

1. **Set Business Parameters**: Configure employees, pay rates, overhead costs, and utilization targets
2. **Define Services**: Add service offerings with pricing, frequency, variable costs, and optional contractor pay as a % of list price
3. **Analyze Results**: Review KPIs, charts, and break-even analysis
4. **Save Scenarios**: Save different business configurations for comparison
5. **Export Reports**: Generate professional reports in multiple formats

## Browser Support

- Modern browsers: Chrome, Firefox, Safari, Edge
- Mobile browsers: iOS Safari, Chrome Mobile
- Progressive Web App: Installable on supporting devices
