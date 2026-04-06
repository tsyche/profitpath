# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

- Performance Monitoring Dashboard (Advanced feature) — real-time cache hit rate, calculation timing, entry count
- Undo/Redo Workflow Support — full history stack (50 entry max), Ctrl+Z/Ctrl+Shift+Z shortcuts, toast feedback
- CSV Import: Bootstrap from CSV — template download, drag-and-drop file upload, business settings + offerings import
- Interactive Scenario Comparison (Side-by-Side Diff) — full feature with summary metrics, per-offering breakdown, exports, sharing
- Bug fix: Comparison modal text visibility on white background (dark theme color override)
- Bug fix: Tour tooltip positioning (removed CSS animation override, fixed position jumping during onboarding)
- Bug fix: Mode switch now immediately updates mix lock checkbox visibility
- Feature Restriction Badges (visual indicators for locked features)
- Level Change Toast Notifications (brief feedback on level changes)
- Experience Level Explanation Panel (shows feature availability by level)

---

## Top 3 Recommended Next Tasks

1. **Sensitivity Analysis & What-If Scenarios**
   - Interactive sliders for pricing, costs, utilization, employee count
   - Tornado charts showing impact ranking of variable changes
   - Monte Carlo simulation for risk assessment
   - ~6-8 hours effort

2. **Tax & Financial Calculations**
   - Self-employment tax calculations
   - Quarterly tax estimates
   - Depreciation tracking
   - Profit sharing calculations
   - ~4-5 hours effort

3. **Customer Acquisition & Growth Modeling**
   - Customer acquisition cost (CAC) tracking
   - Customer lifetime value (LTV) calculations
   - Churn rate modeling
   - Growth rate projections
   - ~4-6 hours effort

---

## Fully Prioritized Backlog (high → low)

**Immediate Next (Core Analytics)**

1. Sensitivity Analysis & What-If Scenarios
   - Interactive sliders for pricing, costs, utilization, employee count
   - Tornado charts showing impact ranking of variable changes
   - Monte Carlo simulation for risk assessment
   - Effort: ~6-8 hours

2. Tax & Financial Calculations
   - Self-employment tax calculations
   - Quarterly tax estimates
   - Depreciation tracking
   - Profit sharing calculations
   - Effort: ~4-5 hours

3. Customer Acquisition & Growth Modeling
   - Customer acquisition cost (CAC) tracking
   - Customer lifetime value (LTV) calculations
   - Churn rate modeling
   - Growth rate projections
   - Effort: ~4-6 hours

**UX & Accessibility (3-4 Hour Tasks)**

4. Accessibility & Mobile Experience
   - Full keyboard navigation and screen reader optimization
   - Mobile-responsive design improvements
   - Touch gesture support
   - Effort: ~3-4 hours

**Visual Design & Cutting-Edge Polish (4-8 Hour Tasks)**

5. Micro-interactions & Animation Polish
   - Smooth number animations for KPI values changing (animated counters)
   - Enhanced button/input focus states with visual feedback
   - Hover effects on cards revealing additional context
   - Subtle scale transforms and transitions on interactive elements
   - Smoother modal/toast entrance animations
   - Effort: ~3-4 hours

6. Modern Visual Effects & Color Enhancement
   - Glassmorphism effects on modals, cards, or overlays (backdrop blur)
   - Subtle gradient layers on KPI boxes and section headers
   - Enhanced color contrast and accent color usage (subtle glows on focus)
   - Refined typography hierarchy and visual rhythm
   - Better distinction between different section types
   - Effort: ~2-3 hours

7. Data Visualization & Visual Indicators
    - Replace text-only KPI displays with visual indicators (progress rings, gauges)
    - Animated progress circles for utilization percentages
    - Visual break-even indicators (danger/warning/success states)
    - Smooth transitions when data updates
    - Visual feedback for scenario changes
    - Effort: ~4-5 hours

**Advanced Visualizations & Analytics (4-6 Hour Tasks)**

8. Advanced Chart Types
    - Heat maps for multi-variable sensitivity analysis
    - Radar charts for balanced scorecard views
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

**Technical Foundation & Internationalization (2 Hour Tasks)**

9. Advanced Formatting & Localization
    - Multi-currency support (EUR, GBP, CAD, AUD)
    - Localized number formatting (1,000 vs 1.000 vs 1000)
    - Configurable decimal precision per metric
    - Effort: ~2 hours

**Industry Intelligence & Competitive Positioning (6-8 Hour Tasks)**

10. Industry Presets & Benchmarks
    - Curated templates for common service businesses (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Industry benchmark comparisons and regional pricing data
    - Success metric tracking and performance standards
    - Effort: ~6-8 hours

11. Seasonal & Market Adjustments
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Market rate comparisons and competitive pricing
    - Economic indicator integration
    - Effort: ~4-5 hours

**Enterprise Features (Scale Layer — Deferred)**

12. Advanced Scenario Management
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

13. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing with external services
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours

14. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

15. Optimizer Mode & AI Insights
    - Automated optimization suggestions based on business data
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - Competitive analysis tools
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours

---

## Status & Notes

- **Current status**: Application is fully functional with all tests passing (202 tests), dev server stable, comprehensive test coverage preventing regressions. Three major features just shipped: CSV import, undo/redo, and performance monitoring.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard.
- **Latest milestones**: 
  - CSV Import: Template download, drag-and-drop file upload, full business settings + offerings parsing with validation
  - Undo/Redo: Full 50-entry history stack with Ctrl+Z/Ctrl+Shift+Z shortcuts and debounced table edits
  - Performance Dashboard: Real-time cache hit rate, calculation timing, entry count (Advanced feature gate)
- **Next priorities**: 
  1. Sensitivity analysis with interactive sliders and tornado charts — core analytical feature for what-if modeling
  2. Tax & financial calculations — expands business value proposition significantly
  3. Customer acquisition & growth modeling — rounds out financial analysis suite
- **Strategic positioning**: CSV import dramatically reduces setup friction (major competitive advantage). Performance dashboard enables power users to optimize. Next focus should be on analytical depth: sensitivity analysis and tax calculations strengthen core value proposition and differentiate from competitors.
- **Quick wins available**: 
  - Advanced Formatting & Localization (2 hrs) — multi-currency support
  - Micro-interactions & Animation Polish (3-4 hrs) — visual polish on KPI animations
  - Accessibility & Mobile Experience (3-4 hrs) — keyboard nav, screen reader support
- **Enterprise features (items 12-15) are deferred**: Represent significant scope expansion and require backend infrastructure. Validate market demand before investing.

### Test Coverage Status
- **202 tests passing** (comprehensive test suite)
- **Syntax validation**: Prevents parsing errors and lint issues
- **UI/UX tests**: All mobile UI, modal functionality, scenario comparison, help system, feedback system, undo/redo tests passing
- ✅ **Analytics tests**: All analytics and feedback system tests passing
- ✅ **Visualization tests**: Chart data structure validation, visual consistency, performance tests
- ✅ **Comparison tests**: Scenario comparison functionality and rendering tests
- ✅ **Import/Export tests**: CSV parsing, template generation, file upload handling
- ✅ **Undo/Redo tests**: History stack, keyboard shortcuts, button state management
- ✅ **Performance tests**: Cache statistics, timing instrumentation, feature gate tests
- ✅ **Comprehensive coverage**: Business logic, UI components, error handling, integration tests, animations, feature gating
