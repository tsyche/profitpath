# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

- Interactive Scenario Comparison (Side-by-Side Diff) — full feature with summary metrics, per-offering breakdown, exports, sharing
- Bug fix: Comparison modal text visibility on white background (dark theme color override)
- Bug fix: Tour tooltip positioning (removed CSS animation override, fixed position jumping during onboarding)
- Bug fix: Mode switch now immediately updates mix lock checkbox visibility
- Feature Restriction Badges (visual indicators for locked features)
- Level Change Toast Notifications (brief feedback on level changes)
- Experience Level Explanation Panel (shows feature availability by level)

---

## Top 3 Recommended Next Tasks

1. **Data Import: Bootstrap from CSV/Excel**
   - Allow users to import client lists, pricing, cost structures from spreadsheets
   - Dramatically reduces setup friction and improves competitive positioning
   - ~3-4 hours effort

2. **Undo/Redo Workflow Support**
   - Stack-based undo for input changes and scenario edits
   - Increases experimentation confidence
   - ~2-3 hours effort

3. **Performance Monitoring & Optimization Dashboard**
   - Real-time metrics: cache hit rate, computation time, memory usage
   - Helps identify bottlenecks proactively
   - ~3-4 hours effort

---

## Fully Prioritized Backlog (high → low)

**Immediate Next (Quick Wins + Foundation)**

1. Data Import: CSV/Excel Bootstrap
   - Import client lists, pricing, and cost structures from spreadsheets
   - Reduces setup friction and onboarding time
   - Effort: ~3-4 hours

**Quick Wins (2-4 Hour Tasks)**

2. Undo/Redo Workflow Support
   - Stack-based undo for input changes and scenario edits
   - Increases experimentation confidence
   - Effort: ~2-3 hours

3. Performance Monitoring & Optimization Dashboard
   - Real-time metrics: cache hit rate, computation time, memory usage
   - Helps identify bottlenecks proactively
   - Effort: ~3-4 hours

**Core Analytics & Business Intelligence (4-8 Hour Tasks)**

4. Sensitivity Analysis & What-If Scenarios
   - Interactive sliders for pricing, costs, utilization, employee count
   - Tornado charts showing impact ranking of variable changes
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

**UX & Accessibility (3-4 Hour Tasks)**

7. Accessibility & Mobile Experience
   - Full keyboard navigation and screen reader optimization
   - Mobile-responsive design improvements
   - Touch gesture support
   - Effort: ~3-4 hours

**Visual Design & Cutting-Edge Polish (4-8 Hour Tasks)**

8. Micro-interactions & Animation Polish
   - Smooth number animations for KPI values changing (animated counters)
   - Enhanced button/input focus states with visual feedback
   - Hover effects on cards revealing additional context
   - Subtle scale transforms and transitions on interactive elements
   - Smoother modal/toast entrance animations
   - Effort: ~3-4 hours

9. Modern Visual Effects & Color Enhancement
   - Glassmorphism effects on modals, cards, or overlays (backdrop blur)
   - Subtle gradient layers on KPI boxes and section headers
   - Enhanced color contrast and accent color usage (subtle glows on focus)
   - Refined typography hierarchy and visual rhythm
   - Better distinction between different section types
   - Effort: ~2-3 hours

10. Data Visualization & Visual Indicators
    - Replace text-only KPI displays with visual indicators (progress rings, gauges)
    - Animated progress circles for utilization percentages
    - Visual break-even indicators (danger/warning/success states)
    - Smooth transitions when data updates
    - Visual feedback for scenario changes
    - Effort: ~4-5 hours

**Advanced Visualizations & Analytics (4-6 Hour Tasks)**

11. Advanced Chart Types
    - Heat maps for multi-variable sensitivity analysis
    - Radar charts for balanced scorecard views
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

**Technical Foundation & Internationalization (2 Hour Tasks)**

12. Advanced Formatting & Localization
    - Multi-currency support (EUR, GBP, CAD, AUD)
    - Localized number formatting (1,000 vs 1.000 vs 1000)
    - Configurable decimal precision per metric
    - Effort: ~2 hours

**Industry Intelligence & Competitive Positioning (6-8 Hour Tasks)**

13. Industry Presets & Benchmarks
    - Curated templates for common service businesses (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Industry benchmark comparisons and regional pricing data
    - Success metric tracking and performance standards
    - Effort: ~6-8 hours

14. Seasonal & Market Adjustments
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Market rate comparisons and competitive pricing
    - Economic indicator integration
    - Effort: ~4-5 hours

**Enterprise Features (Scale Layer — Deferred)**

15. Advanced Scenario Management
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

16. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing with external services
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours

17. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

18. Optimizer Mode & AI Insights
    - Automated optimization suggestions based on business data
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - Competitive analysis tools
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours

---

## Status & Notes

- **Current status**: Application is fully functional with all tests passing (202 tests), dev server stable, comprehensive test coverage preventing regressions, and all critical UI/UX issues resolved.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ scenario comparison (side-by-side diff with exports and sharing).
- **Latest milestone**: Interactive scenario comparison (side-by-side diff view with summary metrics, per-offering breakdown, CSV/PDF exports, shareable links). Fixed comparison modal visibility (dark text colors on white background). Dropdown selections now persist across modal reopens.
- **Next priorities**: 
  1. Data import feature (CSV/Excel bootstrap) — strong competitive advantage, reduces onboarding friction
  2. Undo/redo workflow support — increases experimentation confidence
  3. Performance dashboard — real-time cache/computation metrics
- **Strategic positioning**: Data import and industry benchmarks are notable gaps vs. competitors and should be prioritized for market differentiation. Scenario comparison (completed) enables what-if analysis; next focus should be reducing setup friction (CSV import) and workflow improvements (undo/redo).
- **Quick wins available**: 
  - Undo/redo (2-3 hrs) and performance dashboard (3-4 hrs) have outsized UX impact
  - Sensitivity analysis with sliders and tornado charts (6-8 hrs) would strengthen analysis capabilities
- **Enterprise features (items 15-18) are deferred**: Represent significant scope expansion and require backend infrastructure. Validate market demand before investing.

### Test Coverage Status
- **202 tests passing** (comprehensive test suite)
- **Syntax validation**: Prevents parsing errors and lint issues
- **UI/UX tests**: All mobile UI, modal functionality, scenario comparison, help system, feedback system tests passing
- ✅ **Analytics tests**: All analytics and feedback system tests passing
- ✅ **Visualization tests**: Chart data structure validation, visual consistency, performance tests
- ✅ **Comparison tests**: Scenario comparison functionality and rendering tests
- ✅ **Comprehensive coverage**: Business logic, UI components, error handling, integration tests, animations, feature gating
