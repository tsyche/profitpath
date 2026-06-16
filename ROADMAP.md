# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

**Five Most Recent Completions (June 2026)**

1. **Code Audit & Security Hardening** — Recovered 20 hidden tests (test:run scope fixed to cover src/); fixed deprecated `escape()`/`unescape()` in share-link encode/decode; escaped `e.message` before innerHTML injection; migrated unprefixed localStorage keys (`onboardingCompleted`, `selectedIndustry`) to `profitpath-` namespace with backward-compatible migration shim; applied npm security patches (babel, postcss); minor package updates (vitest, vite, playwright, eslint)
2. **UI Modernization — merged to main** — Full Material-influenced dark/light theming, no-flash toggle, emerald default + runtime accent palettes, self-hosted Inter font, elevation/motion system, `prefers-reduced-motion` guard; slim app-bar redesign with hamburger drawer, at-a-glance KPIs, mode-toggle badge; all modals themed via design tokens; analytics dashboard internals themed; dead mobile\* handler bindings removed; `escapeHtml` consolidated to single implementation (`9e668c9`, `a8c4621`, `fea798c`, `5fbe65d`)
3. **Share/Copy UX Polish** — Click-to-copy on all shareable URL and embed code fields; fixed copy-on-click toast (TypeError on undefined clipboard); compare/share white-screen bug, share link unicode encoding, embed modal blur, dark mode text legibility (`5f803ca`, `27d2a9e`, `17b9cdf`, `9db5571`)
4. **Help & Onboarding Enhancements** — Contextual '?' help on KPI cards, Quick Reference modal, guided tour selector fixes, welcome dialog theming (`0c7a945`)
5. **Data Visualization & Visual Indicators** — SVG utilization ring, KPI status border tints (good/warn/danger), break-even progress bar (`f112a7a`)

**Earlier (April–May 2026)**
- Customer Acquisition & Growth Modeling — CAC, LTV, churn rate, growth projections
- Localization & Formatting Infrastructure — multi-currency, localized number formatting
- Accessibility & Mobile Experience — keyboard navigation, screen-reader optimization, touch targets
- Code Audit & Repo Hardening — XSS + CSV injection fixes, localStorage key-drift, ~8.5k dead lines removed, PWA manifest repaired
- Workflow Automation & CI/CD — justfile migration, GitHub Actions, GitHub Pages, sync-docs recipe
- Mobile App Infrastructure (Capacitor v5) — ios/android project structures, MOBILE_APP_STRATEGY.md
- Settings & Experience Level polish — feature gating, toast queue, tab-style selector, 22-test suite
- Interactive Scenario Comparison — side-by-side diff with summary metrics and sharing

---

## Recommended Next 3

1. ✅ **Read-only Scenario Sharing & Collaborative Comments**
   - View-only share links (`?readonly=1`) — inputs locked, banner shown, "Start your own" CTA
   - Presentation Notes field embedded in shared URL for context
   - Two-option share modal: View Only vs Editable links
   - `overscroll-behavior: contain` + idempotent `closeDrawer` as part of this release

2. **Tax & Financial Report Generator** (~2-3 hrs)
   - Quarterly income projection summaries
   - Tax liability report with itemization
   - Business performance summary for loan applications
   - PDF export with professional formatting
   - Extends app value beyond simulation; natural premium-tier candidate

3. **Performance Optimization & Caching** (~3-4 hrs)
   - Profile calculation engine; identify bottlenecks in the debug panel
   - Optimize cache hit rates (visible in performance panel)
   - Improve rendering performance for large datasets
   - Strategic unblock for heavier features (multi-year projections, advanced analytics)

---

## Fully Prioritized Backlog (high → low)

**Code Quality**

0. Burn down 140 test-file lint warnings
   - Majority are `no-unused-vars` (83) and `no-console` (54) in test files
   - Zero errors; all warnings are pre-existing and low-risk
   - Effort: ~1 hour

**Collaboration & Insights (High-Value Additions)**

1. Read-only Scenario Sharing & Collaborative Comments ← *Recommended next*
   - Generate shareable read-only links for scenarios
   - Annotation/comment system on calculations and offerings
   - Client presentation mode without editing risk
   - Effort: ~2-3 hours

2. Tax & Financial Report Generator ← *Recommended next*
   - Quarterly income projection summaries, tax liability, PDF export
   - Effort: ~2-3 hours

3. Performance Optimization & Caching ← *Recommended next*
   - Profile calc engine, optimize cache hit rates, improve rendering for large datasets
   - Unblocks multi-year projections, advanced analytics
   - Effort: ~3-4 hours

4. AI-Powered Profitability Insights Engine
   - Rules-based optimization suggestions ("increase price X by 10%")
   - Automated alerts for declining utilization
   - Competitive pricing recommendations
   - Auto-generated what-if scenarios
   - Impact: Transforms calculator into strategic advisor
   - Effort: ~3-4 hours

**Visual Design & Polish**

5. Micro-interactions & Animation Polish
   - ✅ Partially done: spring button press, card/KPI hover lift, motion easing, `prefers-reduced-motion` guard
   - Remaining: animated KPI counters (numbers rolling up on recalculation), CSS ripple on buttons, smoother modal/toast entrance
   - Effort: ~2 hours remaining

6. Modern Visual Effects & Color Enhancement
   - ✅ Done: light/dark mode, runtime accent palettes, self-hosted Inter, elevation scale
   - Remaining: subtle gradient layers on KPI boxes/section headers, typography rhythm pass
   - Effort: ~1-2 hours

**Advanced Analytics (4-6 Hour Tasks)**

7. Advanced Chart Types
   - Heat maps for multi-variable sensitivity analysis
   - Radar charts for balanced scorecard views
   - Funnel charts for customer journey
   - Geographic pricing maps
   - Effort: ~4-6 hours

8. Industry Benchmarks & Competitive Pricing
   - ✅ Templates complete (consulting, cleaning, landscaping, fitness, photography, handyman)
   - Remaining: industry benchmark comparisons, regional pricing data, success metric standards
   - Effort: ~4-6 hours (templates done; focus on benchmarking data)

9. Seasonal & Market Adjustments
   - Seasonal demand modeling with monthly/quarterly variations
   - Geographic pricing variations by region
   - Economic indicator integration
   - Effort: ~4-5 hours

**Mobile & Platform Support (Deferred — blocked by macOS version)**

10. Native Android & iOS App via Capacitor ⭐ DETAILED STRATEGY AVAILABLE
    - **⚠️ Blocked**: Capacitor v6+ requires Xcode 15+, which requires macOS Ventura (13.x). Current machine is macOS Monterey (12.6) / Xcode 14.2. The Capacitor v5 infrastructure (ios/, android/, capacitor.config.ts) is already in place — this unblocks automatically once macOS is upgraded. The 5 high-severity `tar` vulnerabilities in `@capacitor/cli` also resolve with the Capacitor v8 upgrade.
    - **See [MOBILE_APP_STRATEGY.md](MOBILE_APP_STRATEGY.md) for complete implementation guide**
    - Effort: ~36-45 hours remaining (Phase 1 partially done; revalidate after macOS upgrade):
      - Phase 1 (Setup revalidation): 1-2 hours
      - Phase 2 (iOS): 8-10 hours
      - Phase 3 (Android): 6-8 hours
      - Phase 4 (Post-launch): Ongoing (~1.5 hrs per update release)

**Enterprise Features (Scale Layer — Deferred)**

11. Advanced Scenario Management
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

12. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours

13. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Effort: ~8-10 hours

14. Optimizer Mode & AI Insights
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours

---

## Monetization Strategy

Privacy-first freemium model planned post-launch. The app will remain fully free until market demand is validated; no ads, no tracking. Full strategy details (pricing tiers, access paths, revenue projections, licensing architecture) are kept in a local-only doc (`docs/MONETIZATION.md`, gitignored).

---

## Status & Notes

- **Current status**: Application is fully functional with comprehensive test coverage (315 unit tests across 33 files, 1 skipped, plus 170 Playwright e2e across chromium + firefox), dev server stable. June 2026: completed UI modernization (merged to main), data visualization KPI indicators, help & onboarding enhancements, compare/share bug fixes, click-to-copy UX, and a full code audit with security hardening.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming).
- **Latest milestones** (June 2026):
  - Code Audit: Recovered 20 hidden tests; fixed deprecated escape()/unescape() in share links; localStorage key namespace migration; npm security patches
  - UI Modernization (merged): Dark/light themes, Material refresh, app-bar redesign, all-modals theming, runtime accent palettes, analytics dashboard fully themed, dead mobile code removed, escapeHtml consolidated
  - Data Visualization: SVG utilization ring, KPI status border tints (good/warn/danger), break-even progress bar
  - Help & Onboarding: Contextual '?' help on complex KPIs, Quick Reference modal, fixed guided tour selectors
  - Share/Copy UX: Click-to-copy on all shareable URL and embed code fields; compare/share/embed bug fixes
- **Next priorities**: Read-only Scenario Sharing → Tax & Financial Report Generator → Performance Optimization (see Recommended Next 3 above)
- **Strategic positioning**: Core financial-modeling + reach + polish foundation is complete. Focus now shifts to collaboration (read-only sharing), extending app value (financial reporting), and performance headroom. Mobile app deferred until macOS upgrade enables Xcode 15+. Enterprise features deferred until market demand validates investment.
- **Known debt**: 140 test-file lint warnings (no errors; pre-existing, low risk). Capacitor stuck at v5.7.8 due to Xcode 14.2 / macOS Monterey — 5 high-severity tar vulnerabilities in @capacitor/cli will resolve when Capacitor v8 upgrade is unblocked by macOS upgrade.

### User Feedback & Research Loop

This section tracks common feature requests, friction points, and competitive gaps reported by users:

- **Collaboration**: Teams requesting read-only sharing and comment features for client presentations
- **Financial Reporting**: Users wanting tax liability estimates and quarterly summaries
- **Performance**: Large scenario reports occasionally show slowdowns with multi-service businesses
- **Accessibility**: Keyboard navigation and screen reader support (shipped)
- **Localization**: Multi-currency support and localized formatting (shipped)
- **Analytics**: CAC/LTV tracking and growth modeling (shipped)
- **Help/Onboarding**: Better contextual help and guided tour (shipped)

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

### Test Coverage Status (June 2026)
- **315 unit tests** across 33 files (1 skipped), plus **170 Playwright e2e** across chromium + firefox
- **Pass rate**: 100% of unit tests passing (1 intentional skip); 100% e2e passing; 0 lint errors
- **Health score**: 9/10 — production-ready with excellent feature gating, UI regression, security, and help/onboarding coverage
- **Key test areas**:
  - ✅ **Calculation Engine** (40+ tests): Mode switching, mix normalization, caching, edge cases
  - ✅ **Scenarios** (35+ tests): Creation, loading, comparison, workflow validation
  - ✅ **Feature Gating** (45+ tests): All experience levels, visibility transitions, debug panel behavior
  - ✅ **Export/Import** (25+ E2E tests): CSV, Excel, PDF, email, clipboard export
  - ✅ **Tooltips** (50+ tests): All three tooltip systems, XSS prevention, state tracking
  - ✅ **Security** (E2E): XSS and CSV injection regression suite
  - ✅ **UI/UX**: Mobile UI, modal functionality, scenario comparison, help system, feedback system
  - ✅ **Analytics**: Analytics and feedback system tests
  - ✅ **Visualizations**: Chart data validation, visual consistency
  - ✅ **Performance**: Cache statistics, calculation timing, feature gate tests
