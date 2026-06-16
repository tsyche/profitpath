# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

**Five Most Recent Completions (June 2026)**

1. **Lint Warning Cleanup** — Eliminated all lint warnings (0 errors, 0 warnings): added ESLint override for test files; removed/renamed unused imports, dead-code vars, bare catch params across 17 source files; replaced debug `console.log` with `console.warn` or removed in production code. Updated test to match no-op placeholder methods.
2. **Tax & Financial Report Generator** — Print-ready HTML financial report accessible from Export drawer: business performance summary (KPI grid + annual/monthly table), quarterly income projections (Q1–Q4), tax liability breakdown (SE tax, federal, quarterly payment due dates), and loan-application business summary. `window.lastMetrics` now populated on every render for zero-cost report generation.
3. **Performance Optimization & Caching** — Calc cache upgraded from FIFO to LRU (delete+re-insert on hit); max size bumped 50→100 to prevent thrashing during sensitivity analysis. Duplicate eviction logic consolidated into `cacheSet()`. New unit tests lock in LRU behavior and cap enforcement.
4. **Scroll Lock Bug Fix + Mobile Bottom-Nav Clearance** — Fixed scroll-lock leak in onboarding dialogs (welcome dialog raw `.remove()` bypassed `releaseScrollLock()`); fixed CSS `!important` specificity war hiding debug/perf panels behind fixed nav bar on mobile. Regression tests added for both.
5. **Read-only Scenario Sharing** — View-only share links (`?readonly=1`): inputs locked, banner shown, "Start your own" CTA; Presentation Notes embedded in URL; two-option share modal (View Only vs Editable).

**Earlier (April–May 2026)**
- UI Modernization — full Material dark/light theming, slim app-bar, hamburger drawer, all-modals theming
- Share/Copy UX Polish — click-to-copy on all shareable fields, compare/share/embed bug fixes
- Help & Onboarding Enhancements — contextual '?' KPI help, Quick Reference modal, guided tour fixes
- Data Visualization & Visual Indicators — SVG utilization ring, KPI status border tints, break-even progress bar
- Customer Acquisition & Growth Modeling — CAC, LTV, churn rate, growth projections
- Localization & Formatting Infrastructure — multi-currency, localized number formatting

---

## Recommended Next 3

1. **Animated KPI Counters & Remaining Micro-interactions** (~2 hrs)
   - Numbers roll up on recalculation (CSS counter animation or JS tween)
   - CSS ripple on primary buttons, smoother modal/toast entrance timing
   - Polishes the premium feel ahead of Play Store launch; low risk

2. **AI / Rules-Based Insights Engine** (~3-4 hrs)
   - Rules-based optimization suggestions ("your utilization is 62% — hiring would require X more clients to break even")
   - Automated alerts for declining margins or under-utilization
   - Auto-generated what-if scenarios from current inputs
   - Transforms the calculator into a strategic advisor; natural premium-tier differentiator

---

## Fully Prioritized Backlog (high → low)

**Code Quality**

0. ✅ ~~Lint Warning Cleanup~~ — Eliminated all 90 source-file warnings (no-unused-vars, no-console) plus 50 test-file warnings via ESLint override. Zero warnings, zero errors.

**Collaboration & Insights (High-Value Additions)**

1. ✅ **Read-only Scenario Sharing & Collaborative Comments**
2. ✅ **Tax & Financial Report Generator**
3. ✅ **Performance Optimization & Caching**

4. **AI-Powered Profitability Insights Engine** ← *Recommended next*
   - Rules-based optimization suggestions ("increase price X by 10%")
   - Automated alerts for declining utilization
   - Competitive pricing recommendations
   - Auto-generated what-if scenarios
   - Impact: Transforms calculator into strategic advisor
   - Effort: ~3-4 hours

5. **"What Would It Take?" Reverse Calculator** *(new)*
   - User enters desired annual take-home; app back-calculates required pricing, client count, or utilization
   - Inverse of the current forward-calculation model — highly intuitive for goal-setting
   - Effort: ~2-3 hours

6. **Client Mix Optimizer** *(new)*
   - Given current capacity, suggest the optimal offering mix (service type ratio) to maximize profit or utilization
   - Builds on existing sensitivity analysis infrastructure
   - Effort: ~2-3 hours

**Visual Design & Polish**

7. **Animated KPI Counters & Remaining Micro-interactions** ← *Recommended next*
   - Animated number roll-up on recalculation, CSS ripple on buttons, smoother entrance animations
   - `prefers-reduced-motion` guard already in place
   - Effort: ~2 hours

8. **Modern Visual Effects & Color Enhancement**
   - ✅ Done: light/dark mode, runtime accent palettes, self-hosted Inter, elevation scale
   - Remaining: subtle gradient layers on KPI boxes/section headers, typography rhythm pass
   - Effort: ~1-2 hours

**Advanced Analytics (4-6 Hour Tasks)**

9. **Advanced Chart Types**
   - Heat maps for multi-variable sensitivity analysis
   - Radar charts for balanced scorecard views
   - Funnel charts for customer journey
   - Effort: ~4-6 hours

10. **Industry Benchmarks & Competitive Pricing**
    - ✅ Templates complete (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Remaining: industry benchmark comparisons, regional pricing data, success metric standards
    - Effort: ~4-6 hours (templates done; focus on benchmarking data)

11. **Seasonal & Market Adjustments**
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Effort: ~4-5 hours

12. **Guided "What If?" Wizard** *(new)*
    - Step-by-step flow walking users through 3-5 common scenarios ("what if I hired one more person?", "what if I raised prices 15%?") without requiring them to know which inputs to change
    - Lower friction than manual sensitivity analysis; great onboarding hook
    - Effort: ~2-3 hours

**Mobile & Platform Support (Deferred — blocked by macOS version)**

13. **Native Android & iOS App via Capacitor**
    - **⚠️ Blocked**: Capacitor v6+ requires Xcode 15+, which requires macOS Ventura (13.x). Current machine is macOS Monterey (12.6) / Xcode 14.2. Capacitor v5 infrastructure (ios/, android/, capacitor.config.ts) already in place — unblocks automatically on macOS upgrade. The 5 high-severity `tar` vulnerabilities in `@capacitor/cli` also resolve with the Capacitor v8 upgrade.
    - Strategy doc available locally (gitignored)
    - Effort: ~36-45 hours remaining (Phase 1 partially done; revalidate after macOS upgrade)

**Enterprise Features (Scale Layer — Deferred)**

14. **Advanced Scenario Management**
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

15. **Integration & Automation**
    - API for third-party integrations
    - Webhook notifications for key metrics
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours

16. **Multi-Year Strategic Planning**
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Effort: ~8-10 hours

17. **Optimizer Mode & AI Insights**
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours

---

## Monetization Strategy

Privacy-first freemium model planned post-launch. The app will remain fully free until market demand is validated; no ads, no tracking.

---

## Status & Notes

- **Current status**: Application is fully functional with comprehensive test coverage (340 unit tests across 35 files, 1 skipped, plus 123 Playwright e2e on Chromium), dev server stable. June 2026: financial report export, LRU cache upgrade, scroll lock and mobile nav fixes, monetization strategy documented privately.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming), ✅ financial report export, ✅ LRU calc cache.
- **Latest milestones** (June 2026):
  - Lint cleanup: 0 errors, 0 warnings across all 17 affected source files; dead imports/vars/debug logs removed
  - Financial Report Export: Print-ready HTML report (performance summary, quarterly projections, tax breakdown, loan summary)
  - Cache LRU + size bump: FIFO → LRU, 50→100 entries; `cacheSet()` consolidation
  - Mobile fix: scroll-lock leak on fresh-user welcome dialog; CSS `!important` nav-bar clearance
  - Monetization strategy: documented in gitignored local doc; public stub only
- **Next priorities**: Animated KPI counters → AI Insights Engine (see Recommended Next 3 above)
- **Strategic positioning**: Core financial-modeling + export + performance foundation is complete. Focus now shifts to polish (animations), intelligence (rules-based insights), and mobile app launch (blocked on macOS). Enterprise features deferred until market demand validates investment.
- **Known debt**: Capacitor stuck at v5.7.8 due to Xcode 14.2 / macOS Monterey — 5 high-severity tar vulnerabilities in @capacitor/cli will resolve when Capacitor v8 upgrade is unblocked by macOS upgrade.

### User Feedback & Research Loop

This section tracks common feature requests, friction points, and competitive gaps reported by users:

- **Collaboration**: Teams requesting read-only sharing and comment features for client presentations (✅ shipped)
- **Financial Reporting**: Users wanting tax liability estimates and quarterly summaries (✅ shipped)
- **Performance**: Large scenario reports occasionally show slowdowns with multi-service businesses (✅ shipped)
- **Reverse calculation**: "Tell me what I need to hit X take-home" — no input yet, inferred from usage patterns
- **Goal-setting wizard**: Users unsure which inputs to adjust for desired outcomes
- **Accessibility**: Keyboard navigation and screen reader support (shipped)
- **Localization**: Multi-currency support and localized formatting (shipped)

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

### Test Coverage Status (June 2026)
- **340 unit tests** across 35 files (1 skipped), plus **123 Playwright e2e** on Chromium
- **Pass rate**: 100% unit tests passing (1 intentional skip); 100% e2e passing; 0 lint errors, 0 lint warnings
- **Health score**: 9/10 — production-ready with excellent feature gating, UI regression, security, and financial report coverage
- **Key test areas**:
  - ✅ **Calculation Engine** (40+ tests): Mode switching, mix normalization, LRU caching, edge cases
  - ✅ **Scenarios** (35+ tests): Creation, loading, comparison, workflow validation
  - ✅ **Feature Gating** (45+ tests): All experience levels, visibility transitions, debug panel behavior
  - ✅ **Export/Import** (25+ E2E tests): CSV, Excel, PDF, HTML, financial report, email, clipboard export
  - ✅ **Scroll Lock** (15+ tests): Fresh-user welcome dialog, all modals, touch-scroll prevention
  - ✅ **Mobile Layout** (10+ tests): Bottom-nav clearance, debug panel visibility, dark mode contrast
  - ✅ **Tooltips** (50+ tests): All three tooltip systems, XSS prevention, state tracking
  - ✅ **Security** (E2E): XSS and CSV injection regression suite
  - ✅ **Performance** (cache stats, LRU behavior, timing thresholds, max-size cap)
