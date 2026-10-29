# ProfitPath — Consolidated Roadmap (single source of truth)

**TL;DR:** This roadmap is the single source of truth for ProfitPath's ideas, priorities, and next actions.

See [README.md](README.md) for setup and development instructions. Shipped work lives in [docs/ledger/ROADMAP_SHIPPED.md](docs/ledger/ROADMAP_SHIPPED.md).

---

## Recommended Next 3

1. **Product-flow redesign** (item 25): [active plan and implementation checkpoint](docs/plans/product-flow-redesign.md#implementation-checkpoint--2026-10-28). Baseline/prototype complete; real workspace preview implemented behind `?layout=workspaces`. Finish release validation and the human/device walkthrough before cutover; mobile Results, portable sharing, and workspace accessibility fixes are implemented behind the opt-in switch.
2. **Decision workbench Phase 3** (item 38): compare 2-4 scenarios with offering deltas, a goal line, break-even sales loss, and a plain-language verdict.
3. **Typecheck unit tests** (item 12x): include `**/*.test.ts` in `tsconfig.json` and retire accepted casts. Low priority; do opportunistically.

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

25. **Product-flow redesign** *(building; prototype approved)*
    - [Redesign plan](docs/plans/product-flow-redesign.md): Tim accepted Model / Results / Compare with optional first-time guidance and requested phased work on 2026-10-28. Item 38 retains ownership of richer decision comparison.
    - **Phase 0 complete:** [reproducible baseline](docs/ledger/UI_UX_PHASE0_LIVE_EVIDENCE.md#product-flow-baseline--2026-10-28), synthetic Beginner/Fitness and Advanced/12-offering fixtures, Chromium/Firefox desktop/mobile screenshots, feature destinations, task paths, and six golden calculation checks.
    - **Phase 1 approved:** Tim reviewed the [clickable prototype](docs/plans/prototypes/product-flow.html), discussed feature parity and provisional styling, and approved continuation on 2026-10-28. The [detail matrix](docs/plans/product-flow-redesign.md#feature-destinations-and-approved-detail-matrix) guides implementation; full capability access remains a release requirement.
    - **Phases 2–4 implementation present:** real preview through Settings → Layout or `?layout=workspaces`; separate workspace/scenario navigation, focused offering editing with existing handlers and table alternative, consolidated cost/capacity editors, inline entry, contextual Results/tools, Compare, and share/export review. Classic remains the default for new devices until cutover acceptance.
    - **Transition choice requested 2026-10-29:** retain both Classic and Workspaces through a remembered Settings layout choice. Explicit layout links override the device preference without changing it. Switching reloads the view and starts fresh undo history; preserve the model, selected case, read-only locks, and named saves. Block switching for incomplete edits or failed draft persistence. Keep the original layout through the transition; its retirement is a separate decision.
    - **Verified improvements:** navigation/focus/undo; last-valid inputs; optional template entry; specialist tool discovery at Beginner; case-preserving links and CSV reimport; shared read-only reload/editable copies; quota-failure recovery; explicit comparison labels; portable comparison embeds and recipient exports; first-screen mobile primary figures; all 12 workspace axe cases. Chromium dense-table overflow is fixed and passes regression checks.
    - **Local automation verified 2026-10-29:** the complete release suite passes **576 browser cases** with four existing Firefox skips and no retries, including all **66 workspace cases**. Lint, strict typecheck, build, and **818 unit tests** pass with one existing skip. The original CI font environment also passes the mobile regression after failing before the fix. Official architecture, experience-level, feature, and testing docs describe both layouts; the plan checkpoint records exact run results.
    - **CI Firefox mobile Results fixed locally:** [Tests run 40823830884](https://github.com/tsyche/profitpath/actions/runs/40823830884) exposed **765.1167px** against the unchanged **754px** limit. DejaVu Sans makes Firefox's system-font action buttons wrap, adding 50px. Workspace actions now use the bundled font; the exact environment fails the new row assertion before the fix and passes afterward at **715.1167px**. CI uploaded only JSON because `playwright-report/` did not exist; the failure upload now targets `test-results/`. Remote confirmation awaits the next approved push. APK build, GitLab mirror, and Pages deployment for the previous commit succeeded.
    - **Comparison export parity verified:** CSV/PDF label Base/Conservative/Optimistic and the annual period; PDF includes all eight financial summary rows. A shared comparison retains its own case even when the recipient draft has no ranges; displayed values, exports, and re-shared embeds agree across all three cases in both browsers.
    - **Remaining Phase 5:** human walkthrough, final styling refinement from that review, and cutover/finalization. Do not claim full feature parity or archive the plan yet.
    - **Unmeasured release gates:** participant task times/comprehension; human screen-reader announcements/navigation; physical-device software-keyboard behavior; actual 200% zoom/reflow; real print/mail-app handoff. Before changing the new-device default, verify service-worker/offline behavior for both layouts. Retain the layout choice and original layout during the transition. Automated viewport/axe checks do not close these gates. No further design approval is required.
    - The 2026-10-27 UI containment pass shipped persisted Setup groups, a sticky summary, and Analyze/Customers tabs. It did not materially change the app's single-page workflow or reduce its conceptual load.
    - Starting evidence: the heuristic audit scored usability **7/10** (4 major, 6 minor, 3 cosmetic findings). Its central diagnosis was long single-column Setup and Outputs flows, ad-hoc progressive disclosure, and advanced tools with no visible value until expanded. Live evidence separately recorded mobile overflow, a template-blocking welcome modal, 19 advanced/expert controls exposed in one scroll, and high search cost in dense offering scenarios.
    - Audit caveat reconciled for implementation: historical accounts still contradict each other; the dated Phase 0 capture supersedes them. Sampled horizontal page overflow and the historical 19-control count were not reproduced. Dense mobile editing was confirmed.
    - Goal: a coherent flow from business setup → offerings → assumptions → decision, with users able to build the model separately from reading and acting on its results.
    - Accepted approach: scenario context with Model / Results / Compare, a focused offering editor with a table alternative, optional template guidance, and specialist tools grouped by question. Preserve the edit-and-see loop; styling remains refinable.
    - Plan against concrete journeys: first model from a template, a 12-offering hybrid business, changing one price with a sales-loss assumption, comparing options, and exporting/sharing the conclusion. Include beginner, advanced, 375px mobile, keyboard-only, and screen-reader use.
    - Keep the existing data model and calculations stable unless the approved plan demonstrates a required change. Preserve accessibility, keyboard navigation, mobile use, and deep-link/share behavior.
    - Done when a user can understand where to start, what to enter next, and where to find the answer without scanning the entire application; prove this with journey-based Playwright coverage, accessibility checks, and a human walkthrough. Re-score the experience after implementation.

**Business Model Fidelity** *(new category — found trialing a real hybrid subscription+hourly business, The Sound Stage, a voice/acting/recording studio)*

24f. **Deferred follow-ups from shipped 24c / 24e / 32** *(new, 2026-10-26)*
    - Chart ranges (24c): remains open; related layout work shipped in [the 25–26 ledger entry](docs/ledger/ROADMAP_SHIPPED.md#2026-10-27--2526-uiux-pass).
    - Membership headroom now subtracts modeled scenario load, and the target-margin optimizer suggests fee, credits or discount separately. The remaining conditional follow-up is to feed members into `calc()` only if real use shows the display-only panel is insufficient.
    - Excel parity shipped as item 33. Per-service entitlements shipped as item 24g.
    - Effort: ~1-2 hours for chart ranges; membership integration stays conditional.

37. **Sales loss after a price change** ✅ shipped 2026-10-27
    - Per-offering low, base and high loss assumptions reduce modeled demand, revenue, costs, and utilization in both modes.
    - Conservative uses the higher loss and Optimistic the lower loss through the existing range-case lens.

38-39. **Decision workbench later phases** *([plan](docs/plans/decision-workbench.md))*
    - 38: 2-4 scenario decision view with offering deltas, goal line, and break-even sales loss.
    - 39: derive membership discount floor and value ladder warnings from plans.
    - These remain separate after the client-side bundle ships.

12x. **Typecheck unit tests (`**/*.test.ts`) and retire the accepted casts** *(new, TS-migration leftover)*
    - `**/*.test.ts` is excluded from `tsconfig.json`; including it gives ~1,158 errors (380 TS7005 implicit `any[]`, 204 TS18047, 186 TS2339) in the `src/test/*` jsdom mock tests. Fix per file (type the mocks), then drop the exclude; do it opportunistically when touching a test file.
    - Accepted casts to revisit only if they cause trouble: `as unknown as CalcResult` (AppRender calc-failure fallback) and the `Bag` (`Record<string, unknown>`) casts in RangesMarketPanel, ResourcesPanel, ExpensesPanel and OfferingsTable.
    - Low priority; the migration itself is done (see [ledger](docs/ledger/ROADMAP_SHIPPED.md)).

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

- **Current status**: 819 unit tests across 72 files (818 passing, one existing skip), 580 release Playwright cases across 47 files on Chromium + Firefox (576 passing, four existing skips), plus four production offline cases and 30 separate design-review cases; axe a11y scans included. Classic and Workspaces remain available during item 25 acceptance. July 2026: client mix optimizer, advanced chart types (heat map/radar/funnel), KPI visual polish, animated counters, GoatCounter analytics + APK release pipeline hardened, scroll-lock reference-counting leaks fixed. October 2026: bug sweep, per-scenario currency, expenses, ranges, offering types, and the Insights and Reverse Calculator panels (see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md)).
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ advanced visualizations (heat map, radar, funnel), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming), ✅ financial report export, ✅ LRU calc cache, ✅ client mix optimizer.
- **Latest milestones** (July 2026):
  - Client Mix Optimizer: grid-search + hill-climbing mix suggestions, fully wired panel
  - Advanced Charts: price × utilization sensitivity heat map, balanced scorecard radar, client capacity funnel
  - KPI Visual Polish: accent-gradient wash on KPI boxes/section headers, tightened line-height rhythm
  - Animated KPI Counters shipped; AI Insights Engine & Reverse Calculator rebuilt on `calc()` and wired into two panels (October 2026)
  - GoatCounter analytics + APK release pipeline hardened: build-time platform stamping (web vs APK), real `versionCode`/`versionName` on every build, auto-generated release notes
  - Scroll lock reference-counting leaks fixed across 3 sites (modal double-open, analytics↔advanced dashboard transition); dead logo link fixed
- **Next priorities**: see Recommended Next 3 above.
- **Strategic positioning**: Core financial-modeling + export + performance + advanced-analytics + accessibility-scan foundation is complete, and the release/distribution pipeline (web + APK) is now solid after this round of hardening. Insights and Reverse Calculator are now reachable; the data-model gaps from the 2026-08 trial (per-session, one-time, group, expenses, pools, ranges, membership) are shipped. Next, redesign the product flow rather than adding more containment to the single-page interface. Mobile app launch is waiting on a full Xcode install. Enterprise features deferred until market demand validates investment.
- **Known debt**: Capacitor stuck at v5.7.8 until Xcode 15+ is installed (macOS is no longer the blocker) — 5 high-severity tar vulnerabilities in @capacitor/cli will resolve with the Capacitor v8 upgrade.
- **Blocked major bumps** (ignored in `.github/dependabot.yml`; 2026-09-25): vitest/@vitest/ui 5 fails 11 unit tests; jsdom 30, jest-dom 7 and typescript 7 untried. Also note `@capacitor/cli` is ^8 while `@capacitor/core` and the platform packages are ^5 — a pre-existing mismatch to resolve with the Capacitor upgrade. Remove each ignore once fixed.

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
- **819 unit tests** across 72 files (818 passing, one existing skip), plus **580 release Playwright cases** across 47 files on Chromium + Firefox (576 passing, four existing skips); four production offline cases and 30 separate design-review cases. Lint, strict typecheck, and production build pass. The 2026-10-29 full release run used no retries; the design-review suite remains separate historical evidence.
- Key areas: calculation engine and fuzz tests, scenarios, feature gating, export/import, scroll lock, mobile layout, tooltips, security (XSS, CSV injection), performance, optimizer and advanced charts, axe a11y at every experience level in both themes
- Detail lives in [CLAUDE.md](CLAUDE.md#testing-strategy)
