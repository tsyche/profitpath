# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

**Five Major Features (Most Recent)**

1. **Sensitivity Analysis & What-If Scenarios** — Interactive sliders for pricing, costs, utilization, employees with tornado charts showing impact ranking
2. **Tax & Financial Calculations** — 2024 self-employment tax, federal income tax brackets, quarterly estimated payments, take-home after taxes
3. **CSV Import: Bootstrap from CSV** — Template download, drag-and-drop file upload, full business settings + offerings parsing
4. **Undo/Redo Workflow Support** — Full 50-entry history stack with Ctrl+Z/Ctrl+Shift+Z shortcuts
5. **Performance Monitoring Dashboard** — Real-time cache hit rate, calculation timing, entry count (Advanced feature)

**Supporting Improvements**
- Interactive Scenario Comparison (Side-by-Side Diff) with summary metrics and export/sharing
- Experience Level gating system with visual restriction badges and explanatory panels
- Bug fixes: Modal text contrast, tooltip positioning, mode switch UX, level change notifications

---

## Top 3 Recommended Next Tasks

1. **Accessibility & Mobile Experience** ⭐ START HERE
   - Full keyboard navigation and screen reader optimization
   - Mobile-responsive design improvements (touch targets, input handling)
   - Mobile-first layout polish
   - Highest impact-to-effort ratio; broadens addressable market
   - ~3-4 hours effort

2. **Advanced Formatting & Localization** (Quick Win)
   - Multi-currency support (EUR, GBP, CAD, AUD)
   - Localized number formatting
   - Configurable decimal precision per metric
   - Enables international expansion with minimal effort
   - ~2 hours effort

3. **Customer Acquisition & Growth Modeling** (Core Analytics)
   - Customer acquisition cost (CAC) tracking
   - Customer lifetime value (LTV) calculations
   - Churn rate modeling
   - Growth rate projections
   - Completes financial analysis suite
   - ~4-6 hours effort

---

## Fully Prioritized Backlog (high → low)

**Immediate Next (Foundation & Quick Wins)**

1. Accessibility & Mobile Experience
   - Full keyboard navigation and screen reader optimization
   - Mobile-responsive design improvements (touch targets, input handling)
   - Touch gesture support and mobile-first layout polish
   - Impact: Broadens addressable market, enables accessibility features
   - Effort: ~3-4 hours

2. Advanced Formatting & Localization (Quick Win)
    - Multi-currency support (EUR, GBP, CAD, AUD)
    - Localized number formatting (1,000 vs 1.000 vs 1000)
    - Configurable decimal precision per metric
    - Impact: Enables international expansion
    - Effort: ~2 hours

**Core Analytics Expansion**

3. Customer Acquisition & Growth Modeling
   - Customer acquisition cost (CAC) tracking
   - Customer lifetime value (LTV) calculations
   - Churn rate modeling
   - Growth rate projections
   - Impact: Completes financial analysis suite
   - Effort: ~4-6 hours

**New: Collaboration & Insights (High-Value Additions)**

4. Read-only Scenario Sharing & Collaborative Comments
   - Generate shareable read-only links for scenarios
   - Annotation/comment system on calculations and offerings
   - Client presentation mode without editing risk
   - Impact: Enables team workflows and client collaboration
   - Effort: ~2-3 hours

5. AI-Powered Profitability Insights Engine
   - Rules-based optimization suggestions ("increase price X by 10%")
   - Automated alerts for declining utilization
   - Competitive pricing recommendations
   - Auto-generated what-if scenarios
   - Impact: Transforms calculator into strategic advisor
   - Effort: ~3-4 hours

**Visual Design & Cutting-Edge Polish**

6. Micro-interactions & Animation Polish
   - Smooth number animations for KPI values (animated counters)
   - Enhanced button/input focus states with visual feedback
   - Hover effects revealing additional context
   - Subtle scale transforms and transitions
   - Smoother modal/toast entrance animations
   - Effort: ~3-4 hours

7. Modern Visual Effects & Color Enhancement
   - Glassmorphism effects on modals, cards, overlays (backdrop blur)
   - Subtle gradient layers on KPI boxes and section headers
   - Enhanced color contrast and accent color usage
   - Refined typography hierarchy and visual rhythm
   - Effort: ~2-3 hours

8. Data Visualization & Visual Indicators
    - Replace text-only KPI displays with visual indicators (progress rings, gauges)
    - Animated progress circles for utilization percentages
    - Visual break-even indicators (danger/warning/success states)
    - Smooth transitions on data updates
    - Effort: ~4-5 hours

**Advanced Analytics (4-6 Hour Tasks)**

9. Advanced Chart Types
    - Heat maps for multi-variable sensitivity analysis
    - Radar charts for balanced scorecard views
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

10. Tax & Financial Report Generator
    - Quarterly income projection summaries
    - Tax liability report with itemization
    - Business performance summary for loan applications
    - PDF export with professional formatting
    - Impact: Extends app value beyond simulation
    - Effort: ~2-3 hours

**Industry Intelligence & Competitive Positioning**

11. Industry Benchmarks & Competitive Pricing
    - ✅ Templates complete (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Industry benchmark comparisons and regional pricing data
    - Success metric tracking and performance standards
    - Regional pricing variations by market
    - Effort: ~4-6 hours (templates done; focus on benchmarking)

12. Seasonal & Market Adjustments
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Market rate comparisons and competitive pricing
    - Economic indicator integration
    - Effort: ~4-5 hours

**Mobile & Platform Support (Scale Layer)**

13. Native Android & iOS Support via Capacitor
    - Build and distribute iOS and Android APKs
    - Native app wrapper around web build (Capacitor)
    - Native notifications and local storage integration
    - Offline capability and app persistence
    - App store / Google Play Store distribution readiness
    - Effort: ~8-10 hours (initial setup + testing)

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

- **Current status**: Application is fully functional with all tests passing (202 tests), dev server stable, comprehensive test coverage preventing regressions. Five major features just shipped: CSV import, undo/redo, performance monitoring, sensitivity analysis, and tax calculations.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard.
- **Latest milestones**: 
  - Sensitivity Analysis: Interactive sliders for pricing, overhead, utilization, and employees with tornado impact charts
  - Tax Calculations: 2024 US self-employment tax, federal income tax brackets, quarterly estimates, and take-home calculations
  - CSV Import: Template download, drag-and-drop file upload, full business settings + offerings parsing with validation
  - Undo/Redo: Full 50-entry history stack with Ctrl+Z/Ctrl+Shift+Z shortcuts and debounced table edits
  - Performance Dashboard: Real-time cache hit rate, calculation timing, entry count (Advanced feature gate)
- **Next priorities** (Reordered by impact/effort):
  1. **Accessibility & Mobile Experience** ⭐ — Highest impact-to-effort ratio; broadens addressable market to accessibility-conscious users and mobile-first business owners
  2. **Advanced Formatting & Localization** — Quick 2-hour win; enables international expansion (EUR, GBP, CAD, AUD support)
  3. **Customer Acquisition & Growth Modeling** — Completes financial analysis suite with CAC, LTV, and churn tracking
  4. **Read-only Scenario Sharing & Comments** — New high-value feature enabling team workflows without backend complexity
  5. **AI-Powered Profitability Insights** — Transforms calculator into strategic advisor with rules-based optimization suggestions
- **Strategic positioning**: Sensitivity analysis, tax calculations, and CSV import create a powerful financial modeling foundation. Reordering priorities to accessibility-first because: (1) expands market to accessibility-conscious segments, (2) enables screen reader users, (3) improves mobile experience for on-the-go usage, (4) higher impact than micro-interactions. Quick wins (localization, insights) keep momentum. Enterprise features (mobile app, backend integrations) deferred until market demand validates investment.
- **Quick wins available** (High-Value, Low Effort):
  - Advanced Formatting & Localization (2 hrs) — multi-currency support, international expansion
  - Read-only Scenario Sharing & Comments (2-3 hrs) — collaboration without backend
  - Tax & Financial Report Generator (2-3 hrs) — extends value beyond simulation
  - Mobile-First Responsive Refinements (2-3 hrs) — touch targets, input handling
- **Enterprise features (items 14-17) are deferred**: Represent significant scope expansion and require backend infrastructure (or ML infrastructure). Validate strong market demand before investing 8-15 hours per feature.
- **Audit notes**: 
  - Reordered priorities based on impact-to-effort analysis
  - Added 5 new high-value features identified through gap analysis (sharing, insights, reports, templates, mobile refinements)
  - Industry templates verified complete and profitable (6 templates: consulting, cleaning, landscaping, fitness, photography, handyman)
  - Consider collaborative workflows (sharing, comments) as higher priority than micro-interactions for team expansion

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
