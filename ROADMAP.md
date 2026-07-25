# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

**Five Most Recent Completions (July 2026)**

1. **Analytics & APK Release Pipeline Hardening** — GoatCounter privacy-respecting visit counter shipped for web + APK (no cookies, honors Do Not Track, local dev auto-skipped), but the initial runtime-only detection (`window.Capacitor.isNativePlatform()`) turned out unreliable — the APK reported zero traffic for a full day. Root-caused and fixed with a **build-time platform stamp** (`window.__PP_PLATFORM__`, rewritten `'web'`→`'apk'` by `build-apk.yml` after `cap sync`, with runtime Capacitor detection kept only as a fallback); confirmed working via GoatCounter's own device fingerprinting (System: Android, Sizes: Phones) after the fix. Same investigation surfaced and fixed two more release-pipeline bugs: `android/app/build.gradle`'s `versionCode`/`versionName` were hardcoded at `1`/`"1.0"` forever (silently blocking every Android update, and confusing Obtainium's update detection along with stale pre-beta-scheme release tags), and GitHub release notes were a static "Beta release" string instead of the actual commits shipped — both now automated in CI. `docs/privacy-policy.md` rewritten to disclose GoatCounter accurately (previously falsely claimed zero third-party integrations).
2. **Scroll Lock Reference-Counting Fix (3 leak sites)** — A reference-counted scroll lock (used by every modal/drawer) could get permanently stranded by rapid double-triggered opens — unrecoverable on Android without a force-close, since the touchmove blocker never released. Found and fixed in three places: `ppOpenModal`/`ppCloseModal` (no idempotency guard), and independently in `showAnalyticsDashboard`/`openFeedbackModal` (both had a "remove existing modal" cleanup path that dropped the lock it held). Also deleted a dead, overridden duplicate `showAdvancedDashboard` method that was making the analytics code hard to reason about. Bundled with a dead logo-link fix (`href="/"` resolved to the wrong GitHub Pages root; now `href="."`). 5 new regression tests; each confirmed to fail without its corresponding fix before being merged.
3. **Client Mix Optimizer, Advanced Chart Types & KPI Visual Polish** — Grid-search + hill-climbing optimizer suggests the offering mix that maximizes profit or utilization, fully wired into a collapsible panel; new Advanced Charts panel (price × utilization sensitivity heat map, 5-axis balanced scorecard radar, client capacity funnel); subtle accent-gradient wash on KPI boxes/section headers with tightened line-height. 26 new tests (unit + e2e), all manually verified rendering in a headless browser.
4. **Animated KPI Counters, AI Insights Engine & Reverse Calculator (calc logic)** — KPI counter roll-up animation shipped and visible in the UI. **Caveat**: the Insights Engine (`src/insights/insightsEngine.js`) and Reverse Calculator (`src/insights/reverseCalculator.js`) modules are fully built and unit-tested but have **zero UI wiring** — no panel, no import in `assets/app.jsx` or `index.html`. Users cannot access either feature today; see "Recommended Next 3" below.
5. **Lint Warning Cleanup** — Eliminated all lint warnings (0 errors, 0 warnings): added ESLint override for test files; removed/renamed unused imports, dead-code vars, bare catch params across 17 source files; replaced debug `console.log` with `console.warn` or removed in production code.

**Earlier (April–June 2026)**
- Tax & Financial Report Generator — Print-ready HTML financial report accessible from Export drawer: business performance summary (KPI grid + annual/monthly table), quarterly income projections (Q1–Q4), tax liability breakdown (SE tax, federal, quarterly payment due dates), and loan-application business summary
- Performance Optimization & Caching — FIFO → LRU calc cache, max size 50→100
- Read-only Scenario Sharing — View-only share links, Presentation Notes embedded in URL
- UI Modernization — full Material dark/light theming, slim app-bar, hamburger drawer, all-modals theming
- Share/Copy UX Polish — click-to-copy on all shareable fields, compare/share/embed bug fixes
- Help & Onboarding Enhancements — contextual '?' KPI help, Quick Reference modal, guided tour fixes
- Data Visualization & Visual Indicators — SVG utilization ring, KPI status border tints, break-even progress bar
- Customer Acquisition & Growth Modeling — CAC, LTV, churn rate, growth projections
- Localization & Formatting Infrastructure — multi-currency, localized number formatting

---

## Recommended Next 3

1. **Wire Up AI Insights Engine & Reverse Calculator UI** (~2-3 hrs)
   - The calculation logic for both already exists and is unit-tested (`src/insights/`) — this is purely UI wiring, following the exact pattern just established for the Mix Optimizer panel (collapsible section, feature-gate entry, init function)
   - Highest impact-to-effort ratio on the board right now: two "done" features are currently invisible to every user
   - Acceptance criteria: collapsible panel(s) in `index.html`, `showInsightsEngine`/`showReverseCalculator` (or similar) feature gates in `src/settings/index.js`, init/render functions in `assets/app.jsx`, at least one e2e smoke test per panel

2. **Guided "What If?" Wizard** (~2-3 hrs)
   - Step-by-step flow walking users through common scenarios ("what if I hired one more person?", "what if I raised prices 15%?") without requiring them to know which inputs to change
   - Natural delivery mechanism for the Reverse Calculator once wired up (item 1) — pairs well if done back-to-back
   - Lower friction than manual sensitivity analysis; strong onboarding hook

3. **Industry Benchmarks & Competitive Pricing** (~4-6 hrs)
   - Templates are done (consulting, cleaning, landscaping, fitness, photography, handyman) — remaining work is benchmark comparisons, regional pricing data, success metric standards
   - Natural differentiator once the templates already carry realistic default pricing

---

## Fully Prioritized Backlog (high → low)

**Code Quality**

0. ✅ ~~Lint Warning Cleanup~~ — Eliminated all 90 source-file warnings (no-unused-vars, no-console) plus 50 test-file warnings via ESLint override. Zero warnings, zero errors.

**Collaboration & Insights (High-Value Additions)**

1. ✅ **Read-only Scenario Sharing & Collaborative Comments**
2. ✅ **Tax & Financial Report Generator**
3. ✅ **Performance Optimization & Caching**
4. ✅ **AI-Powered Profitability Insights Engine** — calc logic done (`src/insights/insightsEngine.js`); **UI wiring still pending**, see item 4b below
5. ✅ **"What Would It Take?" Reverse Calculator** — calc logic done (`src/insights/reverseCalculator.js`); **UI wiring still pending**, see item 4b below
6. ✅ **Client Mix Optimizer** — fully wired, panel live in the UI

4b. **Wire Up Insights Engine & Reverse Calculator UI** ← *Recommended next*
   - Both modules are unit-tested and calc-complete; this is purely UI wiring following the Mix Optimizer panel pattern
   - Effort: ~2-3 hours

**Visual Design & Polish**

7. ✅ **Animated KPI Counters & Remaining Micro-interactions**
8. ✅ **Modern Visual Effects & Color Enhancement** — gradient layers on KPI boxes/section headers, typography rhythm pass, all shipped

**Advanced Analytics (4-6 Hour Tasks)**

9. ✅ **Advanced Chart Types** — price × utilization heat map, balanced scorecard radar, client capacity funnel, fully wired

10. **Industry Benchmarks & Competitive Pricing** ← *Recommended next*
    - ✅ Templates complete (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Remaining: industry benchmark comparisons, regional pricing data, success metric standards
    - Effort: ~4-6 hours (templates done; focus on benchmarking data)

11. **Seasonal & Market Adjustments**
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Effort: ~4-5 hours

12. **Guided "What If?" Wizard** ← *Recommended next*
    - Step-by-step flow walking users through 3-5 common scenarios ("what if I hired one more person?", "what if I raised prices 15%?") without requiring them to know which inputs to change
    - Natural delivery mechanism for the Reverse Calculator once item 4b ships
    - Effort: ~2-3 hours

**Cleanup / Small Wins**

12b. **Fix or remove the dead `?loadTestScenarios` / `?testScenario=name` feature** *(new — found during doc audit)*
   - `loadTestScenarios()` and `loadSpecificTestScenario()` in `assets/services/miscService.js` are empty no-op stubs; `TEST_SCENARIOS` in `assets/app.jsx` only has 2 entries (`basic`, `freelancer`), not the 9 previously documented
   - Either implement real named scenarios or delete the dead code path (it's called unconditionally on load per `assets/app.jsx`)
   - Effort: ~1-2 hours

12c. **E2E coverage for Mix Optimizer & Advanced Charts panels** *(new)*
   - Current coverage for both is unit-tests-only (compute logic) plus a handful of visual-polish assertions; no e2e test drives the actual panel toggle → run → results flow the way `mobile_layout.spec.js`/`ui-fixes.spec.js` do for other panels
   - Effort: ~1-2 hours

12d. **"Advisor" unified panel for scattered analytics features** *(new)*
   - Insights Engine (once wired), Reverse Calculator (once wired), Mix Optimizer, and Advanced Charts are four separate collapsed panels a user has to know to expand individually — low discoverability
   - Consider a single "Advisor" tab/section that surfaces the top insight/suggestion from each, with links to expand the full panel
   - Effort: ~3-4 hours

12e. **Fix: export functions ignore the user's selected currency** *(new — found during roadmap audit, real correctness bug)*
   - Currency is genuinely user-selectable (USD/EUR/GBP/CAD/AUD via `#currencySelect` in Settings, backed by `formatCurrency()` in `src/localization/index.js`), but `exportAsExcel`, `exportAsPDF`, `exportAsHTML`, and `shareViaEmail` in `assets/services/miscService.js` each declare their own local `fmtMoney0` that hardcodes a `'$'` prefix instead of reusing the locale-aware formatter — a user on EUR/GBP/CAD/AUD sees the correct symbol in the app but a hardcoded `$` in every exported report
   - Fix: replace the 5 duplicated local `fmtMoney0` definitions with the shared `formatCurrency()` (or the existing `Intl.NumberFormat`-based one at line 51 of the same file)
   - Small fix, but real user-facing incorrectness for anyone not on USD — worth doing sooner than its size suggests
   - Effort: ~1 hour

12f. **Surface the app's own version in the UI** *(new — motivated by this session's Obtainium/versionCode debugging)*
   - Nothing in the UI currently shows what version is running — not in Settings, not in the debug panel, nowhere (`grep` for version display in `assets/app.jsx`/`index.html` returns nothing)
   - Now that CI reliably stamps a real `versionCode`/`versionName` and generates real release notes from commits (see item 1 in Recently Completed), showing "vX.Y.Z" somewhere small (Settings footer or debug panel) would let users self-report their version when reporting bugs, and is a natural stepping stone toward an in-app "what's new" surface if release notes are ever curated for end users rather than just commit logs
   - Effort: ~30-60 minutes

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

- **Current status**: Application is fully functional with comprehensive test coverage (427 unit tests across 40 files, 1 skipped, plus 264 Playwright e2e tests across 14 files on chromium + firefox), dev server stable. July 2026: client mix optimizer, advanced chart types (heat map/radar/funnel), KPI visual polish, animated counters, AI insights engine + reverse calculator (calc logic only — UI wiring pending), GoatCounter analytics + APK release pipeline hardened, scroll-lock reference-counting leaks fixed.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ advanced visualizations (heat map, radar, funnel), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming), ✅ financial report export, ✅ LRU calc cache, ✅ client mix optimizer.
- **Latest milestones** (July 2026):
  - Client Mix Optimizer: grid-search + hill-climbing mix suggestions, fully wired panel
  - Advanced Charts: price × utilization sensitivity heat map, balanced scorecard radar, client capacity funnel
  - KPI Visual Polish: accent-gradient wash on KPI boxes/section headers, tightened line-height rhythm
  - Animated KPI Counters shipped; AI Insights Engine & Reverse Calculator calc logic shipped but **not yet wired to any UI** — see item 4b in the backlog
  - GoatCounter analytics + APK release pipeline hardened: build-time platform stamping (web vs APK), real `versionCode`/`versionName` on every build, auto-generated release notes
  - Scroll lock reference-counting leaks fixed across 3 sites (modal double-open, analytics↔advanced dashboard transition); dead logo link fixed
- **Next priorities**: Wire up Insights Engine & Reverse Calculator UI → Guided "What If?" Wizard → Industry Benchmarks (see Recommended Next 3 above). Also worth a quick pass soon despite being small: the export-currency bug (item 12e) is a real correctness issue for any non-USD user.
- **Strategic positioning**: Core financial-modeling + export + performance + advanced-analytics foundation is complete, and the release/distribution pipeline (web + APK) is now solid after this round of hardening. Focus shifts back to closing the gap between built-but-unwired features and actual UI access, then onboarding polish (wizard) and differentiation (benchmarks). Mobile app launch remains blocked on macOS. Enterprise features deferred until market demand validates investment.
- **Known debt**: Capacitor stuck at v5.7.8 due to Xcode 14.2 / macOS Monterey — 5 high-severity tar vulnerabilities in @capacitor/cli will resolve when Capacitor v8 upgrade is unblocked by macOS upgrade.

### User Feedback & Research Loop

This section tracks common feature requests, friction points, and competitive gaps reported by users:

- **Collaboration**: Teams requesting read-only sharing and comment features for client presentations (✅ shipped)
- **Financial Reporting**: Users wanting tax liability estimates and quarterly summaries (✅ shipped)
- **Performance**: Large scenario reports occasionally show slowdowns with multi-service businesses (✅ shipped)
- **Reverse calculation**: "Tell me what I need to hit X take-home" — calc logic shipped (`src/insights/reverseCalculator.js`), UI wiring pending (see backlog item 4b)
- **Goal-setting wizard**: Users unsure which inputs to adjust for desired outcomes — tracked as Guided "What If?" Wizard
- **Accessibility**: Keyboard navigation and screen reader support (shipped)
- **Localization**: Multi-currency support and localized formatting (shipped)

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

### Test Coverage Status (July 2026)
- **427 unit tests** across 40 files (426 passing, 1 skipped), plus **264 Playwright e2e tests** across 14 files on chromium + firefox
- **Pass rate**: 100% unit tests passing (1 intentional skip); 100% e2e passing; 0 lint errors, 0 lint warnings
- **Health score**: 9/10 — production-ready with excellent feature gating, UI regression, security, and financial report coverage
- **Key test areas**:
  - ✅ **Calculation Engine** (40+ tests): Mode switching, mix normalization, LRU caching, edge cases
  - ✅ **Scenarios** (35+ tests): Creation, loading, comparison, workflow validation
  - ✅ **Feature Gating** (45+ tests): All experience levels, visibility transitions, debug panel behavior
  - ✅ **Export/Import** (25+ E2E tests): CSV, Excel, PDF, HTML, financial report, email, clipboard export
  - ✅ **Scroll Lock** (26 tests): Fresh-user welcome dialog, all modals, touch-scroll prevention, rapid double-open reference-counting regressions
  - ✅ **Mobile Layout** (10+ tests): Bottom-nav clearance, debug panel visibility, dark mode contrast
  - ✅ **Tooltips** (50+ tests): All three tooltip systems, XSS prevention, state tracking
  - ✅ **Security** (E2E): XSS and CSV injection regression suite
  - ✅ **Performance** (cache stats, LRU behavior, timing thresholds, max-size cap)
  - ✅ **Client Mix Optimizer** (9 tests): Profit/utilization objectives, edge cases, public API
  - ✅ **Advanced Charts** (12 tests): Heat map grid, scorecard normalization, funnel stages
  - ⚠️ **Gap**: Mix Optimizer & Advanced Charts have no e2e panel-interaction coverage yet (see backlog item 12c)
