# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

**Five Most Recent Completions (June 2026)**

1. **Workflow Automation & CI/CD** — Migrated task runner from Makefile to justfile (modern task orchestration), automated APK builds via GitHub Actions, GitHub Pages deployment for web UI, sync-docs recipe to keep CLAUDE.md/AGENTS.md in sync
2. **Mobile App Infrastructure (Capacitor)** — Bootstrapped Capacitor v8 for iOS and Android app store distribution, configured native platform layers, setup cross-platform build pipeline, documented complete MOBILE_APP_STRATEGY.md with 40-50 hour timeline
3. **Documentation Consolidation & Audit** — Consolidated CLAUDE.md/AGENTS.md alignment, created comprehensive FEATURES.md, audited and updated test counts (493 tests across 34 files), fixed stale documentation references
4. **Settings & Experience Level Polish** (April 2026) — Fixed feature gating for tooltips by level, implemented toast queuing system, tab-style UI for experience selector, prevented duplicate event listeners and toasts
5. **Comprehensive Settings Test Suite** (April 2026) — Added 22 new tests covering experience level switching, feature gates, tooltip state changes, checkbox updates, persistence, and toast behavior

**Supporting Improvements**
- Interactive Scenario Comparison (Side-by-Side Diff) with summary metrics and export/sharing
- Experience Level gating system with visual restriction badges and explanatory panels
- Toast queue system that displays notifications sequentially instead of all at once
- Bug fixes: Modal text contrast, tooltip positioning, mode switch UX, redundant toasts, checkbox syncing

---

## Top 5 Recommended Next Tasks

1. **Accessibility & Mobile Experience** ⭐ START HERE
   - Full keyboard navigation and screen reader optimization
   - Mobile-responsive design improvements (touch targets, input handling)
   - Mobile-first layout polish
   - Highest impact-to-effort ratio; broadens addressable market to accessibility-conscious users
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

4. **Help & Onboarding Enhancements** (Quick Win)
   - Contextual help for advanced features and calculations
   - Video tutorials for key workflows
   - FAQ improvements and inline documentation
   - High impact: reduces support burden, improves feature discoverability
   - ~2-3 hours effort

5. **Performance Optimization & Caching** (Strategic Foundation)
   - Profile calculation engine; identify bottlenecks
   - Optimize cache hit rates (currently visible in debug panel)
   - Improve rendering performance for large datasets
   - Enables heavier features (multi-year projections, advanced analytics) without degradation
   - ~3-4 hours effort

---

## Fully Prioritized Backlog (high → low)

**Code Quality (Deferred from June 2026 Audit)**

0. Consolidate duplicate `escapeHtml` implementations
   - Three copies exist: `miscService.js`, `visualizationService.js`, and a fallback delegate in `app.jsx`
   - Extract to a single shared utility module; update all callers
   - Risk: divergent implementations are a future XSS waiting to happen (one copy could get a bug fix the others miss)
   - Effort: ~30 min

0. Burn down 137 test-file lint warnings
   - Majority are `no-unused-vars` (83) and `no-console` (54) in test files
   - Zero errors; all warnings are pre-existing and low-risk
   - Effort: ~1 hour

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

13. Native Android & iOS Support via Capacitor ⭐ DETAILED STRATEGY AVAILABLE
    - Build and distribute iOS and Android apps via Capacitor wrapper
    - Zero code changes to core app (uses existing web codebase)
    - Native app shell with service worker for offline capability
    - App Store and Google Play Store submission and distribution
    - Privacy policy, app icons, screenshots, and store metadata
    - Full testing strategy for cross-platform compatibility
    - **See [MOBILE_APP_STRATEGY.md](MOBILE_APP_STRATEGY.md) for complete implementation guide**
    - Effort: ~40-50 hours total (solo hobby pace, 8-10 weeks):
      - Phase 1 (Setup): 4-5 hours
      - Phase 2 (iOS): 8-10 hours
      - Phase 3 (Android): 6-8 hours
      - Phase 4 (Post-launch): Ongoing (~1.5 hrs per update release)

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

## Monetization Strategy

### Current: Free Tier Only
ProfitPath is 100% free with all calculator features available. No monetization until the app is live and user feedback validates market demand.

### Future Freemium Model (Post-Launch, 3-6 Months)

**Tier 1: Free (Current App)**
- All calculator features (forecast, current mode, scenario management)
- Basic exports (CSV)
- Experience levels 1-2 (Beginner/Intermediate)
- localStorage persistence

**Tier 2: Premium ($4.99/month or $39/year)**
- Full Advanced experience level (all features unlocked)
- Multi-format exports (PDF with charts, Excel with formulas, HTML)
- Scenario comparison (side-by-side diff)
- Sensitivity analysis
- Tax calculations & quarterly estimates
- Performance dashboard
- Estimated 5-15% conversion rate

**Tier 3: Pro ($9.99/month or $79/year) — Optional, if demand exists**
- Team sharing (read-only scenario links with comments)
- Automated email reporting
- White-label PDF export
- Priority support
- Estimated 1-5% conversion rate

### Why Not Ads?
Ads destroy trust in financial planning tools. Business owners need to feel confident, not distracted. Freemium subscription is the proven model for business SaaS (Notion, Monday.com, Stripe, etc.).

### Why Not One-Time Purchase?
- Doesn't scale with growing feature set
- Users expect ongoing feature improvements in SaaS era
- Subscription enables sustainable development (especially hobby-scale)
- Easier to test pricing (can adjust tier costs)

### Implementation Timeline
1. **Phase 1** (Now → App Store Launch): Free tier only. Focus on quality and user acquisition.
2. **Phase 2** (3-6 months post-launch): Add Premium tier via RevenueCat (2-3 hour integration). Monitor conversion rates, gather user feedback.
3. **Phase 3** (6-12 months): Evaluate Pro tier based on demand. Consider team collaboration features if requested frequently.

### Revenue Projections (Conservative Estimate)
- **Year 1**: Free tier only (~1,000-5,000 downloads, $0 revenue)
- **Year 2**: Premium tier + 5% conversion @ $39/yr = ~$1,950-9,750 annual recurring
- **Year 3**: Improve conversion to 8% + Pro tier at 1% = ~$7,500-35,000 annual recurring

*Note: These are rough estimates. Actual revenue depends entirely on marketing effort (organic growth from App Store visibility). As a hobby project, expect conservative adoption unless you actively market.*

### Technical Notes
- **RevenueCat** (recommended): Unified dashboard for iOS/Android in-app purchases + subscriptions. ~20% fee after platform cuts. 2-3 hour integration.
- **Stripe**: More complex, requires backend or serverless functions. Better long-term control, higher overhead.
- **Apple/Google In-App Billing**: Native but requires separate implementation per platform; not recommended for single developer.

---

## Status & Notes

- **Current status**: Application is fully functional with comprehensive test coverage (493 tests across 34 files), dev server stable. Recent work (June 2026) focused on workflow automation (justfile migration, GitHub Actions CI/CD, documentation audits) and mobile app infrastructure (Capacitor setup for iOS/Android). Settings system has 22 dedicated tests ensuring feature gates, toast queueing, and UI sync work correctly.
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

### User Feedback & Research Loop

This section tracks common feature requests, friction points, and competitive gaps reported by users:

- **Accessibility**: Users requesting keyboard navigation and screen reader support (prioritized in top 5)
- **Localization**: International users requesting multi-currency support and localized formatting
- **Collaboration**: Teams requesting read-only sharing and comment features for client presentations
- **Analytics**: Power users requesting CAC/LTV tracking and growth modeling
- **Performance**: Large scenario reports occasionally show slowdowns with multi-service businesses
- **Help/Onboarding**: New users asking for better contextual help and video tutorials

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

- **Audit notes (June 2026)**: 
  - **Recent focus**: Workflow automation (Makefile → justfile migration, GitHub Actions setup), mobile app infrastructure (Capacitor v8 iOS/Android), documentation consolidation and test count audit
  - **Significant growth**: Test suite grew from 224 tests (April) to 493 tests (June) — 120% increase in coverage
  - **Mobile app readiness**: Capacitor infrastructure complete, iOS/Android project structures created, MOBILE_APP_STRATEGY.md provides detailed 40-50 hour implementation plan across 4 phases
  - **Documentation maturity**: CLAUDE.md/AGENTS.md aligned, FEATURES.md comprehensive, MOBILE_APP_STRATEGY.md detailed with testing checklists and implementation guides
  - **CI/CD foundation**: GitHub Actions configured for APK builds, GitHub Pages deployment, automated testing pipeline in place
  - **Next focus areas**: 
    1. **Immediate**: Mobile app Phase 1-2 (Capacitor setup validation, iOS TestFlight, ~12-15 hours)
    2. **Quick wins available**: Accessibility & mobile UX (3-4 hrs), Advanced formatting/localization (2 hrs), Read-only sharing (2-3 hrs)
    3. **Strategic**: Evaluate CAC/LTV analytics after mobile launch gets user feedback
  - **Note for Phase 4**: Remember to keep web and mobile versions in sync (same version numbers, synchronized releases)

### Test Coverage Status (June 2026 Audit)
- **493 tests** across 34 test files (comprehensive suite: unit, integration, and e2e)
- **Pass rate**: ~99.6% (491+ passing, minimal skips)
- **Health score**: 8.8+/10 — production-ready with excellent feature gating and settings system validation
- **Recent expansions**: Added tooltip system tests (50+), feature gating tests (45+), E2E scenario workflows (15+), E2E export tests (25+)
- **Settings & Experience Levels** (22 tests): Feature gate verification, experience level switching, tooltip state changes, checkbox state syncing, toast queue behavior, settings persistence, full integration workflows
- **Key test areas**:
  - ✅ **Calculation Engine** (40+ tests): Mode switching, mix normalization, caching, edge cases
  - ✅ **Scenarios** (35+ tests): Creation, loading, comparison, workflow validation
  - ✅ **Feature Gating** (45+ tests): All experience levels, visibility transitions, debug panel behavior
  - ✅ **Export/Import** (25+ E2E tests): CSV, Excel, PDF, email, clipboard export
  - ✅ **Tooltips** (50+ tests): All three tooltip systems, XSS prevention, state tracking
  - ✅ **UI/UX**: Mobile UI, modal functionality, scenario comparison, help system, feedback system
  - ✅ **Analytics**: Analytics and feedback system tests
  - ✅ **Visualizations**: Chart data validation, visual consistency
  - ✅ **Performance**: Cache statistics, calculation timing, feature gate tests
  - ✅ **Comprehensive coverage**: Business logic, UI components, error handling, integration tests, animations
