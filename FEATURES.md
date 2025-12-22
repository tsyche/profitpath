# Current Features

ProfitPath is a comprehensive profitability and capacity simulator for recurring service businesses.

## Core Functionality

### Calculation Engine
- **Forecast & Current Modes**: Switch between planning future growth and analyzing current operations
- **Real-time Calculations**: Instant updates as you modify inputs
- **Comprehensive Metrics**: Revenue, costs, profit, utilization, capacity, break-even analysis

### Business Intelligence
- **Break-even Analysis**: Visual indicators showing contribution margins and break-even points
- **Utilization Tracking**: Monitor capacity usage with gauge and percentage indicators
- **Profit/Loss Waterfall**: Interactive chart showing revenue flow and cost breakdown

### Data Management
- **Scenario Saving**: Save unlimited scenarios with descriptive names
- **Auto-save**: Automatic persistence of current work to localStorage
- **Shareable URLs**: Encode scenarios in URLs for easy sharing with stakeholders
- **Import/Export**: Load scenarios from URLs or share via email

## Advanced Features

### Export & Reporting
- **Multiple Formats**: CSV, Excel (with formulas), PDF (with charts), HTML pages
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
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Interactive Charts**: Hover tooltips, pinnable legends, detailed breakdowns
- **Mobile Hamburger Menu**: Full feature access on mobile devices
- **Accessibility**: Keyboard navigation, screen reader support, high contrast options

### Developer Features
- **Debug Panel**: Built-in developer tools for testing and debugging
- **CI/CD Pipeline**: Automated testing and quality checks
- **Comprehensive Documentation**: API reference, architecture guide, contribution guidelines

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
