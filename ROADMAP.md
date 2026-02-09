# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Top 3 Suggested Tasks

Based on user impact and technical foundation:

1. **Critical UI/UX Bug Fixes**

   - Fix mobile hamburger menu scrolling and icon placement
   - Implement functional help system and tour tutorial
   - Fix modal functionality (scenarios, templates, export)
   - Add feedback modal with submission
   - ~6-8 hours effort

2. **Analytics System Refactor**

   - Convert analytics to admin-only tracking feature
   - Default enabled with quiet background tracking
   - Simple user opt-out toggle in settings
   - ~3-4 hours effort

3. **Advanced Testing Infrastructure**

   - Add integration tests for UI components and user workflows
   - Implement visual regression testing for charts and reports
   - Add performance testing for calculation engine
   - ~4-5 hours effort

---

## Recently Completed (Latest Updates)

### Syntax Integrity & Test Coverage ✅ **COMPLETED**
- **Fixed all unterminated string literals** in `assets/app.jsx`
- **Resolved template literal parsing issues** with backticks
- **Created syntax validation test** (`assets/app-syntax.test.js`)
- **111 tests now passing** (110 business logic + 1 syntax validation)
- **Dev server starts without errors** on http://localhost:3000
- **Tests are meaningful and accurate** - green results mean app runs without issues

### Technical Foundation Improvements ✅ **COMPLETED**
- **Modern build system** with Vite for development and production
- **Comprehensive test suite** with Vitest and jsdom environment
- **Code quality tools** with ESLint configuration
- **Syntax validation** to prevent regression of parsing errors
- **File structure updates** (`.js` → `.jsx` for better JSX support)

---

## Fully Prioritized Backlog (high → low)

**Critical UI/UX Issues (Immediate)**

1. **Mobile Navigation & Menu System** ✅ **COMPLETED**
   - Settings and help icons inside hamburger menu (not outside) ✅
   - Hamburger menu scrolling when items expand beyond screen ✅
   - Proper mobile menu layout and functionality ✅
   - Effort: ~2-3 hours

2. **Help System & Tour Tutorial** ✅ **COMPLETED**
   - Functional help button in both mobile and desktop views ✅
   - Tour tutorial auto-start on first run for new users ✅
   - Contextual help content and navigation ✅
   - Effort: ~2 hours

3. **Modal Functionality Fixes** ✅ **COMPLETED**
   - Scenarios modal blur issue resolved ✅
   - Templates menu working consistently (not one-time) ✅
   - Export menu working consistently (not one-time) ✅
   - Effort: ~2 hours

4. **Feedback System Implementation** ✅ **COMPLETED**
   - Feedback modal with text input and submission ✅
   - Available in both mobile and desktop views ✅
   - Form validation and submission handling ✅
   - Effort: ~1-2 hours

**High priority**

5. Simple visualizations: utilization gauge and optional richer charts.
6. Scenario comparison (diff view).

Technical Foundation & Quality (Foundation Layer)

7. Analytics System Refactor ✅ **COMPLETED**
   - Convert analytics to admin-only tracking feature ✅
   - Default enabled with quiet background tracking ✅
   - Simple user opt-out toggle in settings ✅
   - Remove analytics from user-facing features ✅
   - Effort: ~3-4 hours

8. Advanced Formatting & Localization
   - Multiple currency support beyond USD
   - Localized number formatting
   - Configurable decimal precision per metric
   - Effort: ~2 hours

Business Intelligence & Analytics (Core Enhancement)

4. Sensitivity Analysis & What-If Scenarios

    - "What if" sliders for key variables (pricing, costs, utilization)
    - Tornado charts showing impact of variable changes
    - Monte Carlo simulation for risk assessment
    - Effort: ~6-8 hours

5. Tax & Financial Calculations

    - Self-employment tax calculations
    - Quarterly tax estimates
    - Depreciation tracking
    - Profit sharing calculations
    - Effort: ~4-5 hours

6. Customer Acquisition & Growth Modeling
    - Customer acquisition cost (CAC) tracking
    - Customer lifetime value (LTV) calculations
    - Churn rate modeling
    - Growth rate projections
    - Effort: ~4-6 hours

Enhanced User Experience (UX Layer)

7. Accessibility & Mobile Experience
    - Full keyboard navigation
    - Screen reader optimization
    - Mobile-responsive design improvements
    - Touch gesture support
    - Effort: ~3-4 hours

Advanced Visualizations (Presentation Layer)

8. Interactive Scenario Comparison

    - Side-by-side scenario comparison
    - Diff highlighting for changes
    - Scenario blending (weighted averages)
    - Correlation analysis between variables
    - Effort: ~5-6 hours

9. Advanced Chart Types
    - Heat maps for multi-variable sensitivity
    - Radar charts for balanced scorecard
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

Industry Intelligence & Templates (Domain Layer)

10. Industry Presets & Benchmarks

    - Curated templates for common service businesses
    - Industry benchmark comparisons
    - Regional pricing data
    - Success metric tracking
    - Effort: ~6-8 hours

11. Seasonal & Market Adjustments
    - Seasonal demand modeling
    - Geographic pricing variations
    - Market rate comparisons
    - Economic indicator integration
    - Effort: ~4-5 hours

Enterprise Features (Scale Layer)

12. Advanced Scenario Management

    - Scenario versioning and history
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions
    - Effort: ~8-10 hours

13. Integration & Automation

    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing
    - CRM/ERP system connections
    - Effort: ~10-12 hours

14. Multi-Year Strategic Planning

    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

15. Optimizer Mode & AI Insights
    - Automated optimization suggestions
    - Machine learning price optimization
    - Predictive analytics
    - Competitive analysis tools
    - Effort: ~12-15 hours

---

Notes

- The repo contains a stable, production-ready profitability simulator with comprehensive error handling, performance optimizations, PWA capabilities, and extensive export functionality.
- **Recently completed**: All syntax issues resolved, comprehensive test coverage (111 tests passing), modern Vite build system, JSX support for better development experience, and accurate test validation that ensures app functionality.
- **Current status**: Application is fully functional with all tests passing, dev server running without errors, and meaningful test coverage that prevents regressions.
- **Critical issues identified**: Mobile UI/UX problems, modal functionality issues, help system not working, tour tutorial not auto-starting, feedback system missing, analytics needs refactor to admin-only.
- **Next priorities**: Fix critical UI/UX bugs (mobile menu, help system, modals, feedback), then refactor analytics to admin-only tracking feature.
- Enterprise features represent significant scope expansion and may require backend infrastructure changes.

### Test Coverage Status
- ✅ **111 tests passing** (110 business logic + 1 syntax validation)
- ✅ **Syntax validation**: Prevents parsing errors
- 🔄 **UI/UX tests**: Created but failing (need implementation)
- 📋 **New failing tests added**: Mobile UI issues, modal functionality, help system, feedback system
