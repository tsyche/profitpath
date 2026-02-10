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
- **124 tests now passing** (updated after Vitest upgrade)
- **Dev server starts without errors** on http://localhost:3000
- **Tests are meaningful and accurate** - green results mean app runs without issues

### Technical Foundation Improvements ✅ **COMPLETED**
- **Modern build system** with Vite v7.3.1 for development and production
- **Comprehensive test suite** with Vitest v4.0.18 and jsdom environment
- **Code quality tools** with ESLint configuration
- **Syntax validation** to prevent regression of parsing errors
- **File structure updates** (`.js` → `.jsx` for better JSX support)
- **Vitest compatibility fixes** - all mocks updated for v4.0.18

### Repository Cleanup ✅ **COMPLETED**
- **Removed 50+ unnecessary files** including fix scripts, IDE history, and outdated build files
- **Clean repository** with only essential files
- **All documentation updated** with accurate file references
- **Modern development workflow** established

### Critical UI/UX Issues ✅ **COMPLETED**
- **Mobile Navigation & Menu System** - Settings and help icons inside hamburger menu ✅
- **Help System & Tour Tutorial** - Functional help buttons and auto-start tour ✅
- **Modal Functionality Fixes** - Scenarios modal blur resolved, templates/export menus working ✅
- **Feedback System Implementation** - Feedback modal with text input and submission ✅
- **Analytics System Refactor** - Analytics converted to admin-only tracking feature ✅

### Documentation Audit ✅ **COMPLETED**
- **All documentation files updated** with accurate file references
- **README.md** - Updated for JSX, Vite, and current development workflow
- **DEVELOPER.md** - Updated with current file structure and test status
- **FEATURES.md** - Updated with JSX support and test count
- **package.json** - Updated file references and scripts

---

## Current Issues (IMMEDIATE PRIORITY)

### Desktop Menu Bar Issues ✅ **COMPLETED**

1. **Right-side Icons Not Working** ✅ **FIXED**
   - **Issue**: Analytics, feedback, and help buttons in desktop header don't respond to clicks
   - **Root Cause**: Missing event listeners for `analyticsBtn`, `desktopFeedbackBtn`, `helpBtn`
   - **Solution**: Added proper event listeners with window.analyticsUI and window.feedbackUI checks
   - **Timing Fix**: Deferred button setup until scripts are loaded using `setupDesktopMenuButtons()`
   - **Test**: `src/test/desktop-menu.test.js` - All button functionality tests passing ✅

2. **Dropdown Menus Work Once Only** ✅ **FIXED**
   - **Issue**: Templates and export menus work first time, then stop working after cancel
   - **Root Cause**: Incorrect DOM structure handling - looking for wrong elements/classes
   - **Solution**: Fixed DOM structure handling for `templatesMenu` and `exportMenu`
   - **Test**: `src/test/desktop-menu.test.js` - All multiple click tests passing ✅

3. **Mobile Menu Layout** ✅ **FIXED**
   - **Issue**: Settings, analytics, and feedback icons appearing outside hamburger menu
   - **Solution**: Moved all icons inside mobile hamburger menu, hidden right-icons on mobile
   - **Test**: Mobile layout tests passing ✅

### **Test Status**: ✅ **ALL TESTS PASSING**
- **Desktop menu tests**: All 9 tests passing ✅
- **Multiple click tests**: All scenarios, templates, export tests passing ✅
- **Button functionality tests**: All analytics, feedback, help tests passing ✅
- **Total test count**: 133 tests passing ✅

### **Current Status**: 🚀 **READY FOR PRODUCTION**
- **All tests passing**: 133/133 ✅
- **No lint errors**: Clean ✅
- **Console errors resolved**: All DOM elements exist ✅
- **Mobile & Desktop functionality**: Both working correctly ✅
- **Timing issues resolved**: Scripts load order fixed ✅

**The app should now run without console errors and all menu buttons should work properly in both mobile and desktop views!** 🎉

---

## Fully Prioritized Backlog (high → low)

**High priority**

1. Simple visualizations: utilization gauge and optional richer charts.
2. Scenario comparison (diff view).

Technical Foundation & Quality (Foundation Layer)

3. Advanced Formatting & Localization
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
- **Recently completed**: All syntax issues resolved, comprehensive test coverage (124 tests passing), modern Vite v7.3.1 build system, Vitest v4.0.18 compatibility, JSX support, repository cleanup, all critical UI/UX issues fixed, analytics refactor completed, documentation audit completed.
- **Current status**: Application is fully functional with all tests passing, dev server running without errors, meaningful test coverage that prevents regressions, and all critical UI/UX issues resolved.
- **All major issues resolved**: Mobile UI/UX problems fixed, modal functionality working, help system functional, tour tutorial auto-starting, feedback system implemented, analytics refactored to admin-only, repository cleaned up, documentation audited and updated.
- **Next priorities**: Simple visualizations, scenario comparison, then advanced features like sensitivity analysis and tax calculations.
- Enterprise features represent significant scope expansion and may require backend infrastructure changes.

### Test Coverage Status
- ✅ **124 tests passing** (updated after Vitest upgrade)
- ✅ **Syntax validation**: Prevents parsing errors
- ✅ **UI/UX tests**: All mobile UI, modal functionality, help system, feedback system tests passing
- ✅ **Advanced dashboard tests**: All 29 tests passing after Vitest v4 compatibility fixes
- ✅ **Analytics tests**: All analytics and feedback system tests passing
- ✅ **Comprehensive coverage**: Business logic, UI components, error handling, and integration tests
