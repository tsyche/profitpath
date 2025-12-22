# ProfitPath Developer Documentation

## Overview

ProfitPath is a client-side profitability and capacity simulator for recurring service businesses. It provides real-time calculations, scenario management, and advanced export capabilities.

## Architecture

### Core Components

- **State Management**: Single global `state` object containing all application data
- **Calculation Engine**: `calc()` function performs all business logic computations
- **UI Rendering**: Declarative rendering with DOM manipulation
- **Persistence**: localStorage for scenario management and user preferences
- **Export System**: Multiple format support (CSV, Excel, PDF, HTML, Email)

### Key Files

- `index.html` - Main HTML structure and external dependencies
- `assets/app.js` - Core application logic (~3200 lines)
- `assets/styles.css` - Styling and responsive design
- `sw.js` - Service worker for offline functionality
- `manifest.json` - PWA configuration

## API Reference

### Core Functions

#### `calc(stateInput?)`
Main calculation engine that computes profitability metrics.

**Parameters:**
- `stateInput` (optional): State object to calculate with (defaults to global state)

**Returns:** Object with calculation results:
```javascript
{
  mode: 'forecast' | 'current',
  offerings: [...],
  annualFixedCosts: number,
  annualPayroll: number,
  clients: number,
  totalSessions: number,
  serviceHours: number,
  capacityPct: number,
  revenue: number,
  variableCosts: number,
  income: number,
  // ... more fields
}
```

#### `render()`
Updates the entire UI to reflect current state and calculations.

#### `setStateFromInputs()`
Reads form inputs and updates the global state object.

### State Management

#### Global State Structure
```javascript
const state = {
  mode: 'forecast' | 'current',
  employees: number,
  employeePay: number,
  monthlyCosts: number,
  productiveUtilizationPct: number,
  targetUtilizationPct: number,
  lockMix: boolean,
  offerings: [{
    id: string,
    name: string,
    priceMonthly: number,
    sessionsPerYear: number,
    hoursPerSession: number,
    variableCostPerSession: number,
    mixPct: number,
    currentClients: number
  }]
}
```

### Scenario Management

#### `saveScenario(name)`
Saves current state as a named scenario in localStorage.

#### `loadScenario(scenarioId)`
Loads a scenario by ID and updates the application state.

#### `deleteScenario(scenarioId)`
Removes a scenario from localStorage.

#### `getAllScenarios()`
Returns array of all saved scenarios.

### Export Functions

#### `exportAsCSV()`
Exports current data as CSV spreadsheet.

#### `exportAsExcel()`
Exports current data as Excel workbook with formulas.

#### `exportAsPDF()`
Generates PDF report with charts and data.

#### `exportAsHTML()`
Creates standalone HTML page with report.

#### `shareViaEmail()`
Opens email client with report data.

### Utility Functions

#### `$ = (sel, root = document) => root.querySelector(sel)`
DOM query selector utility.

#### `$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel))`
DOM query selector all utility.

#### `clamp(n, min, max)`
Constrains a number between min and max values.

#### `fmtMoney0(n)`, `fmtMoney2(n)`
Format numbers as currency.

#### `fmtPct1(n)`
Format numbers as percentages.

## Development Workflow

### Local Development
See README.md for setup instructions.

### Building
The application works without any build step, but esbuild configuration is available for development ergonomics:

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run build:dev

# Production build with minification
npm run build
```

The build creates bundled JavaScript in the `dist/` directory.

### TypeScript Support
TypeScript configuration is set up for gradual migration:

```bash
# Type check TypeScript files
npx tsc --noEmit

# Build with TypeScript support
npm run build  # Handles both .js and .ts files
```

Example: `assets/constants.ts` demonstrates TypeScript usage.

### Testing Scenarios
```javascript
// Load test scenarios via URL
http://localhost:8000/?loadTestScenarios

// Load specific test scenario
http://localhost:8000/?testScenario=default
```

Available test scenarios:
- `default` - Basic consulting setup
- `high-profit` - High-margin scenario
- `loss-making` - Operating at a loss
- `multi-service` - Multiple service offerings
- `over-capacity` - Above target utilization
- `under-capacity` - Below target utilization
- `current-mode` - Existing clients scenario
- `zero-values` - Edge case testing
- `break-even-test` - Break-even analysis

### Code Style

- Use modern JavaScript (ES6+)
- Prefer functional programming patterns
- Keep functions under 50 lines when possible
- Use meaningful variable names
- Add comments for complex business logic
- Follow consistent indentation and formatting

### Performance Considerations

- Calculations are run on every input change (debounced)
- Charts use lazy loading with Intersection Observer
- Export libraries loaded on-demand
- DOM operations minimized with efficient rendering

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features used throughout
- Graceful degradation for older browsers

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes with proper testing
4. Update documentation as needed
5. Submit a pull request

### Code Review Checklist

- [ ] Functions are well-documented
- [ ] No console.log statements in production
- [ ] Error handling is appropriate
- [ ] Performance impact considered
- [ ] Mobile responsiveness tested
- [ ] Accessibility considerations included

## Deployment

The application is static and can be deployed to any web server:

```bash
# Build for production (no build step required)
# Just copy files to web server
cp -r . /path/to/web/server/
```

### PWA Features

- Service worker provides offline functionality
- Web app manifest enables "Add to Home Screen"
- Automatic update notifications

## Troubleshooting

### Common Issues

**Calculations not updating:**
- Check browser console for errors
- Verify state object is properly structured
- Try resetting defaults

**Export not working:**
- Check browser console for library loading errors
- Ensure stable internet connection for CDN libraries
- Try refreshing the page

**Scenarios not saving:**
- Check localStorage availability
- Verify scenario name is provided
- Check browser storage quota

### Debug Tools

- Press `F12` to open developer tools
- Check Console tab for errors
- Check Network tab for failed requests
- Use browser's Application tab to inspect localStorage

## Future Enhancements

See ROADMAP.md and TECHDEBT.md for planned improvements and known issues.
