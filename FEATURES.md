# Current Features

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

### Data Management
- **Scenario Saving**: Save unlimited scenarios with descriptive names
- **Auto-save**: Automatic persistence of current work to localStorage
- **Shareable URLs**: Encode scenarios in URLs for easy sharing with stakeholders
- **Import/Export**: Load scenarios from URLs or share via email
- **Embeddable Widgets**: Generate iframe embed codes for website integration
- **Social Media Sharing**: Open Graph and Twitter Card support for rich previews
- **Industry Templates**: Pre-built configurations for consulting, cleaning, landscaping, fitness, photography, and handyman services
- **Scenario Comparison**: Side-by-side comparison of saved scenarios with key metrics and differences
- **Analytics Tracking**: Background usage tracking for admin analysis (admin-only with user opt-out toggle) ✅

## Advanced Features

### Export & Reporting
- **Multiple Formats**: Professional CSV with detailed headers and units, Excel (with formulas), PDF (with charts), HTML pages
- **Email Sharing**: Send reports directly from the application
- **Automated Scheduling**: Set up recurring report generation

### Testing Infrastructure
- **Test Scenarios**: 9 pre-built scenarios covering various business situations
- **URL Parameters**: Load test scenarios via `?loadTestScenarios` or `?testScenario=name`
- **Edge Case Coverage**: Scenarios for profit/loss, capacity limits, multi-service businesses

### Performance & Reliability
- **Lazy Loading**: Export libraries and charts load on-demand
- **Offline Support**: Service worker caches assets for offline use
- **Error Handling**: Comprehensive validation and user-friendly error messages
- **PWA Ready**: Installable web app with native app-like experience

### User Experience
- **Progressive Disclosure**: Beginner-friendly interface with optional advanced features
- **Experience Levels**: Beginner, Intermediate, and Advanced user modes with appropriate feature sets
	- See `docs/experience-levels.md` for a full mapping of which features are visible at each level and guidance for maintainers.
- **Feature Gating**: Advanced features unlocked via settings panel for power users
- **Guided Onboarding**: Interactive step-by-step tour helping new users explore all features, accessible via ❓ button or "🎯 Take Tour" in mobile menu
- **Industry Setup Wizards**: Tailored configuration wizards for different business types (consulting, cleaning, landscaping, fitness, photography)
- **Contextual Help Tooltips**: Smart tooltips that appear on hover to explain features and provide inline guidance
- **Help Center**: Comprehensive help system with guided tour and support documentation
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Interactive Charts**: Hover tooltips, pinnable legends, detailed breakdowns with visual feedback
- **Mobile Hamburger Menu**: Full feature access on mobile devices with collapsible menu navigation
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
2. **Define Services**: Add service offerings with pricing, frequency, and variable costs
3. **Analyze Results**: Review KPIs, charts, and break-even analysis
4. **Save Scenarios**: Save different business configurations for comparison
5. **Export Reports**: Generate professional reports in multiple formats

## Browser Support

- Modern browsers: Chrome, Firefox, Safari, Edge
- Mobile browsers: iOS Safari, Chrome Mobile
- Progressive Web App: Installable on supporting devices
