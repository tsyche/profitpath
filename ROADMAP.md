# ProfitPath — Consolidated Roadmap (single source of truth)

**TL;DR:** This roadmap is the single source of truth for ProfitPath's ideas, priorities, and next actions.

See [README.md](README.md) for setup and development instructions. Shipped work lives in [docs/ledger/ROADMAP_SHIPPED.md](docs/ledger/ROADMAP_SHIPPED.md).

---

## Recommended Next 3

1. **UI/UX pass Phase 0** ([plan](docs/plans/ui-ux-pass.md)): `/audit-ux-e2e` + `/audit-usability` evidence, absorbing items 25/26 and the light-theme contrast fix (24f). The Setup column keeps growing and gating is still ad hoc.
2. **12o remainder**: share-link staleness and a server-side short ID (needs a backend decision, so only the warning is cheap).
3. **12s flake watch**: `labor-pct.spec.ts` and `membership.spec.ts` flakes are parked, not reproducible; reopen only with failure output.

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

**Cleanup / Small Wins**

12s. **Fix: `labor-pct.spec.ts` flakes under full-suite load** *(new)*
   - Passes alone, fails intermittently in the full Playwright run; find the race or timeout instead of retrying it away
   - 2026-10-24: not reproducible. 160 runs (10-12 workers, 8 CPU burners) all passed, and the last 3 CI `Tests` runs were green. Parked; reopen with the failure output if it recurs, and don't add retries
   - 2026-10-25: `membership.spec.ts` 'caps at 3 plans, survives reload' failed once (chromium) in a full run, then passed 12/12 alone. Likely race: it `fill()`s the plan name and reloads at once, so the save may not have landed. Same rule: reopen with the failure output; fix by waiting on persisted state, not retries
   - Effort: ~1 hour

12d. **"Advisor" unified panel for scattered analytics features** *(new)*
   - Insights Engine, Reverse Calculator, Mix Optimizer, and Advanced Charts are four separate collapsed panels a user has to know to expand individually — low discoverability
   - Consider a single "Advisor" tab/section that surfaces the top insight/suggestion from each, with links to expand the full panel
   - Effort: ~3-4 hours

12o. **Share URLs are absurdly long** *(PARTLY SHIPPED 2026-10-24: v2 links are deflated + base64url via `fflate`, about 4-5x shorter, legacy links still decode; staleness of old links and a server-side short ID remain open)* *(new — found trialing a real business; Tim's reaction on seeing one: "lol")*
   - The Share feature encodes the entire scenario JSON (every offering's full field set, plus the full Presentation Notes text) as a base64 blob in a `?scenario=` query param — a 12-offering scenario with a few paragraphs of notes produced a URL several thousand characters long, unusable in most contexts (chat apps, SMS, some URL-length-limited systems) and unpleasant to paste anywhere
   - Also has a real staleness trap: a previously-copied share URL is a frozen snapshot — editing and re-saving the scenario does *not* update URLs already shared, so an old link can silently show stale data (including stale Presentation Notes) with no indication it's out of date
   - Fix options, roughly in order of effort: (a) compress the JSON before base64 (e.g. gzip) — quick win, doesn't fix staleness; (b) server-side scenario storage with a short opaque ID in the URL (like a pastebin) — fixes both length and staleness, but needs backend infra this project has avoided so far; (c) at minimum, surface a warning in the UI that share links are point-in-time snapshots, not live views
   - Effort: ~1 hour for (a), ~4-6 hours for (b) if backend storage is acceptable
   - 2026-10-23 trial: a 14-offering scenario produced a ~5.3 KB URL
   - 2026-10-26: a 14.4 KB legacy-encoded link was refused outright by Claude-in-Chrome's URL safety check; the same scenario as a v2 link is 2.9 KB and loads fine. Length is a hard limit for some tools, not just cosmetic

**Layout & Information Architecture** *(new category — Tim independently flagged this as "getting very busy on a single scrollable page view," agreed with while building the Sound Stage scenario)*

25. **Restructure past-the-fold sections into tabs**
    - Today, Inputs + Offerings + Outputs + Simple Visualizations + Sensitivity Analysis + Client Mix Optimizer + Advanced Charts + Customer Analytics + Performance/Debug all stack vertically on one page. Building a 12-offering scenario meant constant scrolling to get from editing an offering back to checking its effect on Outputs, or to reach any of the analysis accordions below
    - Recommended shape: keep **Inputs + Offerings + core Outputs (KPI cards, break-even, tax estimate)** as the persistent default view — that's the tight edit-and-see-the-effect loop that needs to stay adjacent — and move the deeper analysis accordions (Sensitivity Analysis, Client Mix Optimizer, Advanced Charts, Customer Analytics) into an actual tab bar rather than independently-collapsible sections stacked below each other. A rough split:
      - **Setup** tab (or default view): Mode, staffing/overhead/utilization inputs, Service Offerings table, Presentation Notes
      - **Dashboard** tab: KPI summary, Simple Visualizations, Break-Even Analysis, Tax Estimates
      - **Analyze** tab: Sensitivity Analysis, Client Mix Optimizer, Advanced Charts
      - **Customers** tab: Customer Analytics (CAC/LTV/churn/growth)
    - This also aligns with the existing mobile bottom-nav pattern (per the test suite's "Bottom-nav clearance" coverage) — tabs work naturally on both desktop and the APK build, so this isn't a desktop-only change
    - The Performance/cache-stats panel is a dev diagnostic, not a business feature — could stay a small fixed-position debug toggle rather than earning its own tab
    - Effort: ~6-8 hours (real IA/layout rework, not just visual polish — worth a design pass on exactly where each accordion lands before implementation)

26. **Sticky mini-summary while scrolling/editing**
    - Smaller companion to item 25: even with tabs, the Setup tab alone (staffing inputs + a 12-row offerings table) is long. A small sticky strip showing live Revenue/Net Income/Utilization while scrolling through offerings (the existing top-bar KPIs, just persistently visible rather than scrolling out of view) would keep the edit-and-see-the-effect loop tight without needing to scroll back up after every change
    - Effort: ~2 hours

**Business Model Fidelity** *(new category — found trialing a real hybrid subscription+hourly business, The Sound Stage, a voice/acting/recording studio)*

24f. **Deferred follow-ups from shipped 24c / 24e / 32** *(new, 2026-10-26)*
    - Chart ranges (24c): folded into [docs/plans/ui-ux-pass.md](docs/plans/ui-ux-pass.md).
    - Membership (24e): subtract current client load from members-per-pool headroom (needs a stable meaning of "current" in Forecast mode; group offerings use per-visit hours, not per-seat); solve credits or discount for a target margin (non-linear); feed members into `calc()` only if the panel proves useful. Excel parity is item 33.
    - Effort: ~1-2 hours each, none urgent

33. **Excel export parity** *(new, 2026-10-26)*
    - The Excel export carries only offerings and outputs; membership plans and profiles, expenses, capacity resources, ranges, confidence tags and group run costs are missing, so a TSS-style scenario loses most of its model on export. CSV and the share URL already carry them.
    - Add a sheet per missing block (or fold into existing sheets), reuse the CSV serializers so the two can't drift, and add a round-trip e2e/unit test that fails when a persisted field is absent from the workbook (a parity check against the same field list the share URL uses).
    - Effort: ~3-4 hours

34. **Light theme meets WCAG AA contrast** *(new, 2026-10-26; found by the axe scan in `tests/e2e/a11y.spec.ts`)*
    - The light palette fails `color-contrast`, so the scan skips that rule in light theme only. This is a palette change, not a one-line fix: pick AA-safe text/accent/muted tokens, then re-check charts, badges and KPI gradients.
    - Done when the skip is deleted from `a11y.spec.ts` and light theme passes at all three experience levels. Phase 0 of [docs/plans/ui-ux-pass.md](docs/plans/ui-ux-pass.md) feeds the palette decision; do it before or with that pass, not after.
    - Effort: ~3-5 hours

35. **Fixes from the 2026-10-26 TSS trial** *(new, 2026-10-26; a 13-offering Current-mode scenario with expenses, pools, group rows and two membership plans, on v0.8.57-beta)*
    - Totals matched a hand calculation at both $1,500 and $3,300 rent (net $4,296 / -$17,304 a year). These are the gaps around them, worst first:
    - **Membership What-If ignores `processingFeePct`.** `src/calculations/membership.ts` never applies the fee, so "You keep" is overstated by the fee share of fee + cash revenue (a $181 member month shows $119 kept instead of about $113).
    - **Header Net income chip stays green when negative.** `updateKeyMetrics()` in `AppRender.ts` only sets text on `#abkIncome`/`#glIncome`, and `.ab-kpi.k-net b` is always `--accent-ink`. The Outputs pill (`#kpiIncome`) already maps good/warn/danger, so reuse that.
    - **Reloading a `?scenario=` page silently discards edits.** The param stays in the address bar, so a refresh re-applies the link over the persisted state. Clear it with `history.replaceState` after a successful load (keeping `readonly=1`).
    - **Share sanitizer clamps `hoursPerSession` to at least 0.1** (`miscService.ts` `sanitizeScenarioState`). A zero-hour subscription row gets phantom staff time and then tops "profit per staff hour" ($1,593/hr for a membership with 0 clients). `sessionsPerYear` is also floored to an integer of at least 1, so fractional cadences can't round-trip.
    - **Profit per staff hour ranks `staffFree` rows by their session hours** (a no-staff rehearsal room shows $39/hr). Show "no staff" or rank them per pool hour instead.
    - **Current mode ignores `fillPct` for group runs.** Runs are `ceil(clients / seats)` (`index.ts` ~L162/L230), so 77 seat-sales at 8 seats and 80% fill count as 10 runs, not 12, and staff hours drop to 20 a month instead of 24. Forecast already divides by fill.
    - **Expenses table renders 1-up cards at half width.** `#offeringsBody` gets the auto-fit grid but the expenses `tbody` doesn't, so 11 expenses make a long single column with the right half empty.
    - Gap, not bug: a membership plan has one credit pool, so a per-service entitlement (one class a month on top of credits) can't be modeled. Pair it with the 24f membership follow-ups.
    - Each fix gets the smallest test that fails first: unit tests for the membership fee, sanitizer and fill math, and e2e tests for the chip colour, reload and expenses grid.
    - Effort: ~3-4 hours total

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

---

## Monetization Strategy

Privacy-first freemium model planned post-launch. The app will remain fully free until market demand is validated; no ads, no tracking.

---

## Status & Notes

- **Current status**: Application is fully functional with comprehensive test coverage (744 unit tests across 65 files, 1 skipped, plus 474 Playwright e2e tests across 40 files on chromium + firefox; axe a11y scan included), dev server stable. July 2026: client mix optimizer, advanced chart types (heat map/radar/funnel), KPI visual polish, animated counters, GoatCounter analytics + APK release pipeline hardened, scroll-lock reference-counting leaks fixed. October 2026: bug sweep, per-scenario currency, expenses, ranges, offering types, and the Insights and Reverse Calculator panels (see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md)).
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ advanced visualizations (heat map, radar, funnel), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming), ✅ financial report export, ✅ LRU calc cache, ✅ client mix optimizer.
- **Latest milestones** (July 2026):
  - Client Mix Optimizer: grid-search + hill-climbing mix suggestions, fully wired panel
  - Advanced Charts: price × utilization sensitivity heat map, balanced scorecard radar, client capacity funnel
  - KPI Visual Polish: accent-gradient wash on KPI boxes/section headers, tightened line-height rhythm
  - Animated KPI Counters shipped; AI Insights Engine & Reverse Calculator rebuilt on `calc()` and wired into two panels (October 2026)
  - GoatCounter analytics + APK release pipeline hardened: build-time platform stamping (web vs APK), real `versionCode`/`versionName` on every build, auto-generated release notes
  - Scroll lock reference-counting leaks fixed across 3 sites (modal double-open, analytics↔advanced dashboard transition); dead logo link fixed
- **Next priorities**: see Recommended Next 3 above.
- **Strategic positioning**: Core financial-modeling + export + performance + advanced-analytics + accessibility-scan foundation is complete, and the release/distribution pipeline (web + APK) is now solid after this round of hardening. Insights and Reverse Calculator are now reachable; the data-model gaps from the 2026-08 trial (per-session, one-time, group, expenses, pools, ranges, membership) are shipped, so focus moves to the UI/UX pass. Mobile app launch is waiting on a full Xcode install. Enterprise features deferred until market demand validates investment.
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
- **744 unit tests** across 65 files (743 passing, 1 skipped), plus **474 Playwright e2e tests** across 40 files on chromium + firefox; 0 lint warnings, typecheck 0 errors
- Key areas: calculation engine and fuzz tests, scenarios, feature gating, export/import, scroll lock, mobile layout, tooltips, security (XSS, CSV injection), performance, optimizer and advanced charts, axe a11y at every experience level (light-theme contrast skipped, see 24f)
- Detail lives in [CLAUDE.md](CLAUDE.md#testing-strategy)
