# ProfitPath — Consolidated Roadmap (single source of truth)

**TL;DR:** This roadmap is the single source of truth for ProfitPath's ideas, priorities, and next actions.

See [README.md](README.md) for setup and development instructions. Shipped work lives in [docs/ledger/ROADMAP_SHIPPED.md](docs/ledger/ROADMAP_SHIPPED.md).

---

## Recommended Next 3

1. **Device/human acceptance and layout default** (item 40): test the shipped redesign and workbench on Android, finish human/native handoffs, and decide the new-device default while retaining both layouts.
2. **Seasonal & Market Adjustments** (item 11): monthly/quarterly demand and geographic pricing variations.

Industry Benchmarks (item 10) stays out of the top 3: it is blocked on sourcing trustworthy data, not on code. Shipped work is indexed in the [ledger](docs/ledger/ROADMAP_SHIPPED.md).

---

## Fully Prioritized Backlog (high → low)

**Advanced Analytics (4-6 Hour Tasks)**

10. **Industry Benchmarks & Competitive Pricing**
    - 🧑 needs-human: benchmark and regional pricing data must be sourced and trusted by Tim; code is the easy part
    - ✅ Templates complete (consulting, cleaning, landscaping, fitness, photography, handyman)
    - Remaining: industry benchmark comparisons, regional pricing data, success metric standards
    - Effort: ~4-6 hours (templates done; focus on benchmarking data)

11. **Seasonal & Market Adjustments**
    - Seasonal demand modeling with monthly/quarterly variations
    - Geographic pricing variations by region
    - Effort: ~4-5 hours

**Layout & Information Architecture** *(new category — Tim independently flagged this as "getting very busy on a single scrollable page view," agreed with while building the Sound Stage scenario)*

40. **Post-redesign device/human acceptance and default-layout decision**
    - Implementation items 25 and 38–39 are closed at Tim's direction on 2026-10-29; this item owns every remaining acceptance task. See the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md).
    - Release CI [Tests 40982288978](https://github.com/tsyche/profitpath/actions/runs/40982288978), APK, Pages and mirror passed; all five checks have zero annotations. Local validation passes 832 unit tests (one existing skip), 606/610 browser cases (four existing Firefox skips), four production zoom/PDF cases and four offline cases, with no retries.
    - Android emulator checks passed on 2026-10-29: release APK 0.8.63-beta, Pixel 8 / Android 35, install/launch, remembered Workspaces choice, rename with the native keyboard visible, save/alternative, mode switching, Results, decision workbench, reload persistence and portrait/landscape. Offline reload/edit/save/reload passed with Wi-Fi and cellular data disabled; an external connectivity probe succeeded before disconnection and failed during it. WebView `navigator.onLine` remained true, so it is not the offline oracle.
    - Android emulator (Pixel 8 / Android 35) read-only reload, editable copy, path-traversal rejection, CSV/Excel/HTML share chooser with real file bytes, and native print preview passed on 2026-10-30 via `tests/android/native-export.ts` (disposable `.acceptance` APK; see the script header). Remaining: physical phone/tablet coverage. Repeat affected journeys if findings require code changes.
    - 🧑 needs-human: real touch/keyboard behavior, TalkBack or VoiceOver announcements/navigation, native print/mail-app handoff, and participant task times/comprehension with a re-score against the recorded baseline. Emulator checks supplement physical-device and human observations; they do not establish them.
    - Record findings and fix any blocked journey. Repeat affected release gates if code changes. After acceptance, decide the new-device default explicitly; keep Classic as the current default and retain both layouts and their remembered Settings toggle. Retirement of Classic remains a later decision.

**Business Model Fidelity** *(new category — found trialing a real hybrid subscription+hourly business, The Sound Stage, a voice/acting/recording studio)*

24f. **Conditional membership integration** *(remaining follow-up from shipped 24e)*
    - Membership headroom now subtracts modeled scenario load, and the target-margin optimizer suggests fee, credits or discount separately. The remaining conditional follow-up is to feed members into `calc()` only if real use shows the display-only panel is insufficient.
    - Chart ranges, Excel parity, and per-service entitlements are recorded in the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md).
    - No integration work until real usage establishes the need.

**Mobile & Platform Support (Deferred — needs full Xcode)**

13. **Native Android & iOS App via Capacitor**
    - 🧑 needs-human: macOS is now current (26.6.2) but only Command Line Tools are installed; install full Xcode, then revalidate the Capacitor upgrade
    - **Partly unblocked (2026-10-24)**: the dev machine now runs a current macOS, but full Xcode is not installed (Command Line Tools only). Capacitor v6+ needs Xcode 15+. Capacitor v5 infrastructure (ios/, android/, capacitor.config.ts) is already in place. The 5 high-severity `tar` vulnerabilities in `@capacitor/cli` also resolve with the Capacitor v8 upgrade.
    - Strategy doc available locally (gitignored)
    - Effort: ~36-45 hours remaining (Phase 1 partially done; revalidate once Xcode is installed)

**Enterprise Features (Scale Layer — Deferred)**

14. **Advanced Scenario Management**
    - 🧑 needs-human: team sharing needs backend infrastructure and a hosting/account decision
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

15. **Integration & Automation**
    - 🧑 needs-human: backend infrastructure plus third-party accounts/credentials
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

17. **Optimizer Mode & AI Insights** *(rules-based Insights Engine and Mix Optimizer shipped; only the ML parts remain)*
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours

12o. **Server-hosted short share links** *(deferred; backend-dependent)*
    - Store shared scenarios behind short opaque IDs to reduce link length and let recipients see updated scenarios.
    - Requires backend infrastructure, hosting, and an account / retention decision. No backend work is planned until the roadmap reaches that phase.
    - Current compressed links remain point-in-time snapshots; the Share flow warns users to resend after edits.

---

## Monetization Strategy

Privacy-first freemium model planned post-launch. The app will remain fully free until market demand is validated; no ads, no tracking.

---

## Status & Notes

- **Current status**: 833 unit tests across 75 files (832 passing, one existing skip), 610 release Playwright cases across 50 files on Chromium + Firefox (606 passing, four existing skips), plus four production zoom/PDF cases, four production offline cases, and 30 separate design-review cases; axe a11y scans included. Classic and Workspaces remain available during item 25 acceptance. July 2026: client mix optimizer, advanced chart types (heat map/radar/funnel), KPI visual polish, animated counters, GoatCounter analytics + APK release pipeline hardened, scroll-lock reference-counting leaks fixed. October 2026: bug sweep, per-scenario currency, expenses, ranges, offering types, and the Insights and Reverse Calculator panels (see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md)).
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ advanced visualizations (heat map, radar, funnel), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming), ✅ financial report export, ✅ LRU calc cache, ✅ client mix optimizer.
- **Latest milestones** (July 2026):
  - Client Mix Optimizer: grid-search + hill-climbing mix suggestions, fully wired panel
  - Advanced Charts: price × utilization sensitivity heat map, balanced scorecard radar, client capacity funnel
  - KPI Visual Polish: accent-gradient wash on KPI boxes/section headers, tightened line-height rhythm
  - Animated KPI Counters shipped; AI Insights Engine & Reverse Calculator rebuilt on `calc()` and wired into two panels (October 2026)
  - GoatCounter analytics + APK release pipeline hardened: build-time platform stamping (web vs APK), real `versionCode`/`versionName` on every build, auto-generated release notes
  - Scroll lock reference-counting leaks fixed across 3 sites (modal double-open, analytics↔advanced dashboard transition); dead logo link fixed
- **Next priorities**: see Recommended Next 3 above.
- **Strategic positioning**: Core financial-modeling + export + performance + advanced-analytics + accessibility-scan foundation is complete, and the release/distribution pipeline (web + APK) is now solid after this round of hardening. Insights and Reverse Calculator are now reachable; the data-model gaps from the 2026-08 trial (per-session, one-time, group, expenses, pools, ranges, membership) are shipped. The product-flow redesign and decision workbench are shipped; device/human acceptance and the layout-default decision remain in item 40. Mobile app launch is waiting on a full Xcode install. Enterprise features deferred until market demand validates investment.
- **Known debt**: Capacitor stuck at v5.7.8 until Xcode 15+ is installed (macOS is no longer the blocker) — 5 high-severity tar vulnerabilities in @capacitor/cli will resolve with the Capacitor v8 upgrade.
- **Blocked major bumps** (ignored in `.github/dependabot.yml`; 2026-09-25): vitest/@vitest/ui 5 fails 11 unit tests; jsdom 30 and jest-dom 7 untried; typescript 7 is blocked because typescript-eslint peers `typescript <6.1.0` (project is on 6.0.3; recheck when typescript-eslint supports 7). Also note `@capacitor/cli` is ^8 while `@capacitor/core` and the platform packages are ^5 — a pre-existing mismatch to resolve with the Capacitor upgrade. Remove each ignore once fixed.

### User Feedback & Research Loop

This section tracks common feature requests, friction points, and competitive gaps reported by users:

- **Collaboration**: Teams requesting read-only sharing and comment features for client presentations (✅ shipped)
- **Financial Reporting**: Users wanting tax liability estimates and quarterly summaries (✅ shipped)
- **Performance**: Large scenario reports occasionally show slowdowns with multi-service businesses (✅ shipped)
- **Reverse calculation**: "Tell me what I need to hit X take-home" — shipped as the "What Would It Take?" panel (`src/insights/reverseCalculator.ts`); follow-ups in item 12r
- **Goal-setting wizard**: Users unsure which inputs to adjust for desired outcomes — tracked as Guided "What If?" Wizard
- **Accessibility**: Keyboard navigation and screen reader support (shipped)
- **Localization**: Multi-currency support and localized formatting (shipped)
- **Real-business trial run (2026-08-02)**: Used the app hands-on to build a Forecast-mode scenario for a real hybrid subscription+hourly business (The Sound Stage, a voice/acting/recording studio — 12 real offerings spanning 2 memberships, weekly group workouts, 1:1 coaching, and various hourly studio/recording services). Tim independently hit the same roadblocks trying to enter this data himself, confirming these aren't automation-specific artifacts. Surfaced the biggest data-model gap yet found: no first-class per-session pricing type, forcing every hourly service into a fake monthly-equivalent price (shipped as item 18, see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md); see also 19-21 for related gaps: one-time purchases, multi-resource capacity, contractor labor; 22-24 for confidence-tagging, an inline conversion helper (folded into 18), and range-based output — all motivated by the same trial). Also surfaced 6 real bugs (12g-12o: silent full-reset data loss on removing all offerings, Customer Analytics LTV showing $0 despite a populated revenue model, header KPI staleness after bulk edits, same-name save creates a silent duplicate instead of overwriting, absurdly long/staleness-prone share URLs) and 4 UX friction points (12j-12m: no table view past ~5 offerings, no duplicate-offering button, Mix% defaulting to 0% on new rows, no duplicate-scenario option). Same session, Tim separately flagged two bigger structural gaps after reviewing the findings: (1) the single-scrollable-page layout is "getting very busy" — see the Layout & Information Architecture category (25-26, tabs restructure; now the UI/UX pass); (2) cost/expense modeling is thin ("mostly recurring fees and employee stuff") next to the rich revenue-offerings model — shipped as items 27-31 (structured Expense Line Items table, marketing, processing fees, one-time costs, loans). Full context/writeup in the `soundstage-web` project if needed later.

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

### Test Coverage Status (October 2026)
- **833 unit tests** across 75 files (832 passing, one existing skip), plus **610 release Playwright cases** across 50 files on Chromium + Firefox (606 passing, four existing skips); four production zoom/PDF cases, four production offline cases, and 30 separate design-review cases. Lint, strict typecheck, and production build pass. The 2026-10-29 full release run used no retries; the design-review suite remains separate historical evidence.
- Key areas: calculation engine and fuzz tests, scenarios, feature gating, export/import, scroll lock, mobile layout, tooltips, security (XSS, CSV injection), performance, optimizer and advanced charts, axe a11y at every experience level in both themes
- Detail lives in [CLAUDE.md](CLAUDE.md#testing-strategy)
