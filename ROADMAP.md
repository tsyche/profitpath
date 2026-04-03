# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

- Experience Level Explanation Panel (shows feature availability by level)
- Level Change Toast Notifications (brief feedback on level changes)
- Feature Restriction Badges (visual indicators for locked features)
- Documentation consolidation and CLAUDE.md integration

---

## Top 3 Recommended Next Tasks

1. **Simple Visualizations: Utilization Gauge & Profit Waterfall**
   - Add visual indicators to dashboard showing utilization % and profit breakdown
   - Quick visual impact with strong user value
   - Foundation for advanced analytics features
   - ~4-6 hours effort

2. **Interactive Scenario Comparison (Side-by-Side Diff)**
   - Highlight changes between scenarios with key metric comparison
   - Scenario blending and correlation analysis
   - Major UX improvement for what-if workflows
   - ~5-6 hours effort

3. **Data Import: Bootstrap from CSV/Excel**
   - Allow users to import client lists, pricing, cost structures from spreadsheets
   - Dramatically reduces setup friction and improves competitive positioning
   - ~3-4 hours effort

---

## Fully Prioritized Backlog (high → low)

**Immediate Next (Quick Wins + Foundation)**

1. Simple visualizations: utilization gauge and profit waterfall charts in main interface.
2. Scenario comparison system with side-by-side diff view and key metrics comparison.

**Quick Wins (2-4 Hour Tasks)**

3. Undo/Redo Workflow Support
   - Stack-based undo for input changes and scenario edits
   - Increases experimentation confidence
   - Effort: ~2-3 hours

4. Performance Monitoring & Optimization Dashboard
   - Real-time metrics: cache hit rate, computation time, memory usage
   - Helps identify bottlenecks proactively
   - Effort: ~3-4 hours

**Core Analytics & Business Intelligence (4-8 Hour Tasks)**

5. Data Import: CSV/Excel Bootstrap
   - Import client lists, pricing, and cost structures from spreadsheets
   - Reduces setup friction and onboarding time
   - Effort: ~3-4 hours

6. Sensitivity Analysis & What-If Scenarios
   - Interactive sliders for pricing, costs, utilization, employee count
   - Tornado charts showing impact ranking of variable changes
   - Monte Carlo simulation for risk assessment
   - Effort: ~6-8 hours

7. Tax & Financial Calculations
   - Self-employment tax calculations
   - Quarterly tax estimates
   - Depreciation tracking
   - Profit sharing calculations
   - Effort: ~4-5 hours

8. Customer Acquisition & Growth Modeling
   - Customer acquisition cost (CAC) tracking
   - Customer lifetime value (LTV) calculations
   - Churn rate modeling
   - Growth rate projections
   - Effort: ~4-6 hours

**UX & Accessibility (3-4 Hour Tasks)**

9. Accessibility & Mobile Experience
   - Full keyboard navigation and screen reader optimization
   - Mobile-responsive design improvements
   - Touch gesture support
   - Effort: ~3-4 hours

**Advanced Visualizations & Analytics (4-6 Hour Tasks)**

10. Advanced Chart Types
    - Heat maps for multi-variable sensitivity analysis
    - Radar charts for balanced scorecard views
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

**Technical Foundation & Internationalization (2 Hour Tasks)**

11. Advanced Formatting & Localization
    - Multi-currency support (EUR, GBP, CAD, AUD)
    - Localized number formatting (1,000 vs 1.000 vs 1000)
    - Configurable decimal precision per metric
    - Effort: ~2 hours

**Industry Intelligence & Competitive Positioning (6-8 Hour Tasks)**

12. Industry Presets & Benchmarks
    - Curated templates for common service businesses (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Industry benchmark comparisons and regional pricing data
    - Success metric tracking and performance standards
    - Effort: ~6-8 hours

13. Seasonal & Market Adjustments
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Market rate comparisons and competitive pricing
    - Economic indicator integration
    - Effort: ~4-5 hours

**Enterprise Features (Scale Layer — Deferred)**

14. Advanced Scenario Management
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

15. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing with external services
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours

16. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

17. Optimizer Mode & AI Insights
    - Automated optimization suggestions based on business data
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - Competitive analysis tools
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours

---

## Status & Notes

- **Current status**: Application is fully functional with all tests passing (159 tests), dev server stable, comprehensive test coverage preventing regressions, and all critical UI/UX issues resolved.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating.
- **Latest milestone**: Experience level UX improvements completed (explanation panel, toast notifications, feature badges).
- **Next priorities**: 
  1. Simple visualizations (utilization gauge & profit waterfall) — high impact, enables advanced analytics
  2. Interactive scenario comparison (side-by-side diff view)
  3. Data import feature (CSV/Excel bootstrap) — strong competitive advantage
- **Strategic positioning**: Data import and industry benchmarks are notable gaps vs. competitors and should be prioritized for market differentiation.
- **Quick wins available**: Undo/redo (2-3 hrs) and performance dashboard (3-4 hrs) have outsized UX impact.
- **Enterprise features (items 14-17) are deferred**: Represent significant scope expansion and require backend infrastructure. Validate market demand before investing.

### Test Coverage Status
- **159 tests passing** (comprehensive test suite)
- **Syntax validation**: Prevents parsing errors and lint issues
- **UI/UX tests**: All mobile UI, modal functionality, help system, feedback system tests passing
- ✅ **Analytics tests**: All analytics and feedback system tests passing
- ✅ **Comprehensive coverage**: Business logic, UI components, error handling, and integration tests
