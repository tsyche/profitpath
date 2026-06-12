# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

**Five Most Recent Completions (June 2026)**

1. **Customer Acquisition & Growth Modeling** — CAC tracking, customer lifetime value (LTV), churn rate modeling, and growth projections; completes the financial analysis suite (`src/analytics/customer-analytics.js`, `customer-ui.js`)
2. **Localization & Formatting Infrastructure** — Multi-currency support, localized number formatting, and configurable precision groundwork (`src/localization/index.js`)
3. **Accessibility & Mobile Experience** — Keyboard navigation, screen-reader optimization, larger touch targets, and mobile-responsive input handling (`assets/accessibility.js`)
4. **Code Audit & Repo Hardening** — Fixed export/print XSS and CSV formula-injection, corrected localStorage key drift (analytics scenario count, debug-panel toggle), removed ~8.5k lines of dead parallel implementation, fixed the broken PWA manifest icon, and brought the service worker + test suite under version control
5. **Workflow Automation & CI/CD** — Migrated task runner from Makefile to justfile, automated APK builds via GitHub Actions, GitHub Pages deployment for the web UI, sync-docs recipe to keep CLAUDE.md/AGENTS.md aligned

**Earlier (April–May 2026)**
- Mobile App Infrastructure (Capacitor v5) for iOS/Android distribution; MOBILE_APP_STRATEGY.md
- Settings & Experience Level polish (feature gating, toast queue, tab-style selector)
- Comprehensive settings test suite (22 tests: level switching, gates, persistence)
- Interactive Scenario Comparison (side-by-side diff) with summary metrics and sharing

---

## Top 5 Recommended Next Tasks

1. **Finish & merge UI Modernization** ⭐ IN PROGRESS (branch `modernize-ui`)
   - Done: Material-influenced dark refresh, light/dark mode with no-flash toggle, self-hosted Inter font, elevation/motion system, `prefers-reduced-motion` guard, runtime accent palettes (`?palette=teal|emerald|indigo|amber`)
   - Remaining: pick/promote a default palette, add theme toggle to the mobile menu, tokenize the leftover `#007bff` analytics buttons, optional tool-layout pass, then merge to main
   - High impact, mostly built; cross-platform-safe (verified web + Android WebView widths)
   - ~2-3 hours remaining

2. **Help & Onboarding Enhancements** (Quick Win)
   - Contextual help for advanced features and calculations
   - FAQ improvements and inline documentation
   - High impact: reduces support burden, improves feature discoverability
   - ~2-3 hours effort

3. **Read-only Scenario Sharing & Collaborative Comments**
   - Shareable read-only links (builds on the existing URL-encode share path in `miscService.js`)
   - Annotation/comment system on calculations and offerings; client presentation mode
   - Enables team workflows and client collaboration
   - ~2-3 hours effort

4. **Performance Optimization & Caching** (Strategic Foundation)
   - Profile calculation engine; identify bottlenecks
   - Optimize cache hit rates (currently visible in debug panel)
   - Improve rendering performance for large datasets
   - Enables heavier features (multi-year projections, advanced analytics) without degradation
   - ~3-4 hours effort

5. **Data Visualization & Visual Indicators** (Flashy Quick Win)
   - Replace text-only KPIs with progress rings / gauges for utilization and break-even
   - Animated KPI counters on recalculation; danger/warning/success states
   - Pairs naturally with the UI modernization already in flight
   - ~4-5 hours effort

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

1. UI Modernization — finish & merge (branch `modernize-ui`)
   - Material-influenced theme, light/dark mode, self-hosted font, motion system, accent palettes are built
   - Remaining: default palette decision, mobile theme toggle, tokenize stray `#007bff` buttons, optional tool-layout pass, merge
   - Effort: ~2-3 hours remaining

2. Help & Onboarding Enhancements (Quick Win)
   - Contextual help for advanced features and calculations
   - FAQ improvements and inline documentation
   - Impact: Reduces support burden, improves feature discoverability
   - Effort: ~2-3 hours

**Collaboration & Insights (High-Value Additions)**

3. Read-only Scenario Sharing & Collaborative Comments
   - Generate shareable read-only links for scenarios
   - Annotation/comment system on calculations and offerings
   - Client presentation mode without editing risk
   - Impact: Enables team workflows and client collaboration
   - Effort: ~2-3 hours

4. AI-Powered Profitability Insights Engine
   - Rules-based optimization suggestions ("increase price X by 10%")
   - Automated alerts for declining utilization
   - Competitive pricing recommendations
   - Auto-generated what-if scenarios
   - Impact: Transforms calculator into strategic advisor
   - Effort: ~3-4 hours

**Visual Design & Cutting-Edge Polish**

5. Micro-interactions & Animation Polish
   - ✅ Partially done in UI Modernization: spring button press, card/KPI hover lift, motion easing system, `prefers-reduced-motion` guard
   - Remaining: animated KPI counters (numbers rolling up on recalculation), CSS ripple on buttons, smoother modal/toast entrance
   - Effort: ~2 hours remaining

6. Modern Visual Effects & Color Enhancement
   - ✅ Done in UI Modernization: light/dark mode, runtime accent palettes, self-hosted Inter type, elevation scale
   - Note: glassmorphism intentionally dropped for Material-style tonal surfaces (cleaner, less iOS, better low-end Android perf)
   - Remaining: subtle gradient layers on KPI boxes/section headers, typography rhythm pass
   - Effort: ~1-2 hours

7. Data Visualization & Visual Indicators
    - Replace text-only KPI displays with visual indicators (progress rings, gauges)
    - Animated progress circles for utilization percentages
    - Visual break-even indicators (danger/warning/success states)
    - Smooth transitions on data updates
    - Effort: ~4-5 hours

**Advanced Analytics (4-6 Hour Tasks)**

8. Advanced Chart Types
    - Heat maps for multi-variable sensitivity analysis
    - Radar charts for balanced scorecard views
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

9. Tax & Financial Report Generator
    - Quarterly income projection summaries
    - Tax liability report with itemization
    - Business performance summary for loan applications
    - PDF export with professional formatting
    - Impact: Extends app value beyond simulation
    - Effort: ~2-3 hours

**Industry Intelligence & Competitive Positioning**

10. Industry Benchmarks & Competitive Pricing
    - ✅ Templates complete (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Industry benchmark comparisons and regional pricing data
    - Success metric tracking and performance standards
    - Regional pricing variations by market
    - Effort: ~4-6 hours (templates done; focus on benchmarking)

11. Seasonal & Market Adjustments
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Market rate comparisons and competitive pricing
    - Economic indicator integration
    - Effort: ~4-5 hours

**Mobile & Platform Support (Scale Layer)**

12. Native Android & iOS Support via Capacitor ⭐ DETAILED STRATEGY AVAILABLE
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

13. Advanced Scenario Management
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

14. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing with external services
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours

15. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

16. Optimizer Mode & AI Insights
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

- **Current status**: Application is fully functional with comprehensive test coverage (278 unit tests across 26 files, 1 skipped, plus Playwright e2e across chromium + firefox), dev server stable. Recent work (June 2026) focused on the customer-acquisition/growth analytics, localization & accessibility shipments, a full code audit (security + dead-code + PWA fixes), and an in-progress UI modernization (light/dark + Material refresh on branch `modernize-ui`). Settings system has 22 dedicated tests ensuring feature gates, toast queueing, and UI sync work correctly.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard.
- **Latest milestones**: 
  - Sensitivity Analysis: Interactive sliders for pricing, overhead, utilization, and employees with tornado impact charts
  - Tax Calculations: 2024 US self-employment tax, federal income tax brackets, quarterly estimates, and take-home calculations
  - CSV Import: Template download, drag-and-drop file upload, full business settings + offerings parsing with validation
  - Undo/Redo: Full 50-entry history stack with Ctrl+Z/Ctrl+Shift+Z shortcuts and debounced table edits
  - Performance Dashboard: Real-time cache hit rate, calculation timing, entry count (Advanced feature gate)
- **Next priorities** (Reordered by impact/effort):
  1. **Finish & merge UI Modernization** ⭐ — light/dark + Material refresh + palettes already built on `modernize-ui`; finish and ship
  2. **Help & Onboarding Enhancements** — quick win; contextual help + FAQ reduces support burden, improves discoverability
  3. **Read-only Scenario Sharing & Comments** — high-value feature enabling team workflows without backend complexity
  4. **Performance Optimization & Caching** — unblocks heavier features (multi-year projections); cache hit rates already visible in debug panel
  5. **Data Visualization & Visual Indicators** — progress rings/gauges + animated counters; pairs with the UI work in flight
- **Strategic positioning**: Accessibility, localization, and customer-acquisition analytics shipped in June, completing the core financial-modeling + reach foundation. Focus now shifts to polish (UI modernization), discoverability (help/onboarding), and collaboration (read-only sharing) to drive retention. Enterprise features (backend integrations, full native app build-out) deferred until market demand validates investment.
- **Quick wins available** (High-Value, Low Effort):
  - Help & Onboarding Enhancements (2-3 hrs) — contextual help, FAQ, discoverability
  - Read-only Scenario Sharing & Comments (2-3 hrs) — collaboration without backend
  - Tax & Financial Report Generator (2-3 hrs) — extends value beyond simulation
  - Consolidate `escapeHtml` + clear lint warnings (1.5 hrs) — code-quality debt from the June audit
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
  - **Recent focus**: Shipped customer-acquisition/growth analytics, localization, and accessibility; ran a full code audit; began UI modernization (light/dark + Material) on `modernize-ui`
  - **Code audit outcomes**: Fixed export/print XSS + CSV formula-injection, two localStorage key-drift bugs, removed ~8.5k lines of dead parallel implementation, repaired the PWA manifest icon, and brought the service worker + 24 test files under version control. Unit suite at 278 tests / 26 files (1 skipped), 0 lint errors.
  - **Known debt**: Capacitor is on v5.7.8, three majors behind latest (v8) — a deliberate upgrade decision pending a native-build test plan. Three `escapeHtml` copies and 137 test-file lint warnings remain (tracked in Code Quality backlog).
  - **Mobile app readiness**: Capacitor (v5) infrastructure complete, iOS/Android project structures created, MOBILE_APP_STRATEGY.md provides a detailed 40-50 hour implementation plan across 4 phases
  - **CI/CD foundation**: GitHub Actions configured for APK builds, GitHub Pages deployment, automated testing pipeline in place
  - **Next focus areas**: 
    1. **Immediate**: Mobile app Phase 1-2 (Capacitor setup validation, iOS TestFlight, ~12-15 hours)
    2. **Quick wins available**: Accessibility & mobile UX (3-4 hrs), Advanced formatting/localization (2 hrs), Read-only sharing (2-3 hrs)
    3. **Strategic**: Evaluate CAC/LTV analytics after mobile launch gets user feedback
  - **Note for Phase 4**: Remember to keep web and mobile versions in sync (same version numbers, synchronized releases)

### Test Coverage Status (June 2026 Audit)
- **278 unit tests** across 26 files (1 skipped), plus Playwright e2e across chromium + firefox
- **Pass rate**: 100% of unit tests passing (1 intentional skip); 0 lint errors
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
