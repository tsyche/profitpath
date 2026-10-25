# ProfitPath — Consolidated Roadmap (single source of truth)

**TL;DR:** This roadmap is the single source of truth for ProfitPath's ideas, priorities, and next actions.

See [README.md](README.md) for setup and development instructions. Shipped work lives in [docs/ledger/ROADMAP_SHIPPED.md](docs/ledger/ROADMAP_SHIPPED.md).

---

## Recommended Next 3

1. **Items 25 and 26, tabs and sticky mini-summary**: the Setup column keeps growing (expenses, resources, ranges, market) and the experience-level gating of those sections is still ad hoc. Ranges & confidence, Market position and Capacity resources are now gated to intermediate+; item 25 should cover the remaining Setup sections.
2. **12o remainder / 24c remainder**: small follow-ups on partly shipped items (see their entries).
3. **`labor-pct.spec.ts` flake** (12s): parked, not reproducible (see its entry).

Shipped 2026-10-24/25: multi-resource capacity pools (20), Duplicate offering button (12k), new rows take the unassigned mix (12l), one-time expenses amortized over useful life (30), processing fee % (29), Marketing expenses driving CAC (28), loans via Loan Payments (31), reverse calculator auto-refresh and price + volume lever (12r), wizard combined, part-time and market-average scenarios (12v), one-time rows in the optimizer and ranking (12w), share-link snapshot note (12u), US-tax label for non-USD scenarios (12t), one-time offering type (19), What-If wizard (12), e2e for Mix Optimizer and Advanced Charts (12c), in-app version (12f). Industry Benchmarks (item 10) dropped out of the top 3: it is blocked on sourcing trustworthy data, not on code.

---

## Fully Prioritized Backlog (high → low)

**Code Quality**

TypeScript migration: `checkJs` is on (Phase 0 done); remaining phases in [docs/plans/typescript-migration.md](docs/plans/typescript-migration.md).

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

22. **Per-offering confidence tagging (Verified / Estimated / Guess) + per-offering notes** *(PARTIAL, 2026-10-24: optional tag + 200-char note per offering, edited in the "Ranges & confidence" table; persisted via share URL, localStorage and CSV cols 17-18. SHIPPED link to outputs 2026-10-24: a "Fill ranges from confidence" button writes editable bounds (Estimated ±15%, Guess ±30%, Verified/untagged none; typed bounds kept) and the Outputs band lists the top 3 profit-swing drivers with their tags. The tag never silently weights a number. Remaining: user-configurable spread percentages if wanted, and a badge outside the Ranges table)*
    - Building a scenario before real data exists means mixing genuinely-known numbers (real list prices, verified from the business's own site) with invented ones (visit frequency, client counts) — today the *only* place to flag that distinction is one free-text Presentation Notes box for the entire scenario, which doesn't scale past a few offerings and ends up as one long disclaimer paragraph nobody reads closely enough to know which of 12 rows a given caveat applies to
    - A small per-offering confidence badge (e.g. a 3-state toggle: Verified/Estimated/Guess) plus an optional short per-offering note field would let a scenario visibly show its own reliability row-by-row, and could feed a future "confidence-weighted" output (see item 24)
    - Directly motivated by this session: wrote one large disclaimer to cover 12 offerings of mixed real/guessed data because there was nowhere more granular to put it
    - Effort: ~3-4 hours

24. **Confidence-band / range output for assumption-heavy scenarios** *(largely covered by the 24c min / base / max band; remaining: a one-click optimistic / base / conservative toggle, if still wanted)*
    - Distinct from the existing Sensitivity Analysis (which varies one lever at a time against a single baseline): when most of a scenario's inputs are guesses rather than known values (9 of 12 offerings in this session's trial), a single point-estimate output number (e.g. "$42,798 revenue") implies false precision
    - A simple optimistic/base/conservative 3-scenario toggle — applying a confidence band to guessed inputs (informed by item 22's confidence tags, if built) and showing a resulting range rather than one number — would better communicate uncertainty for exactly this "sketching before real data exists" use case
    - Effort: ~4-5 hours

24e. **Membership What-If follow-ups** *(new, from 24a)*
    - Credits-vs-visits ranges: low / base / high on a profile's monthly visits, so breakage and savings show a band (pairs with 24c).
    - Members supportable per capacity pool: how many members of a profile fit before staff or a pool (item 20) saturates.
    - Recommended-plan optimizer: suggest fee / credits / discount that hit a target margin while keeping actual member savings positive.
    - Feed members into `calc()`: only if the panel proves useful; today it is display only so credits can't double count as revenue.
    - Excel export carries no plans or profiles (nor expenses or resources); add with the others if that path is revisited.

32. **Repo-wide accessibility e2e (axe-core)** *(new, from 24a; the plan's "axe clean" gate was not run because the repo has no axe tooling)*
    - Add `@axe-core/playwright` and a spec that scans each main panel and the modals at each experience level; fail on Critical/Serious.
    - Feeds Phase 0 of [docs/plans/ui-ux-pass.md](docs/plans/ui-ux-pass.md) (items 25/26).

24b. **Group / cohort offerings (seats, sessions run, fill rate)** *(SHIPPED 2026-10-25; first slice 2026-10-23: `type` field (`subscription | group`) with Seats and Fill % columns shipped; SHIPPED 2026-10-25: `costPerRun` (per cohort in Current, per filled seat in Forecast) and per-offering break-even fill in the "Group runs" table; fitness template's class is now a group row, and the unread per-client waterfall hours attribute was removed. Photography template retuned: it ran at 254% utilization)*
    - Today staff hours scale with clients (`hoursPerSession` per client), so a group class must be faked as a fractional hour per student (2 hr ÷ 8 seats = 0.25). An under-filled class then looks cheaper to deliver than it is: the instructor still works the full 2 hours.
    - Add an offering type with seats per session, sessions run per year, and expected fill % (Forecast) or average enrolled (Current). Staff hours and fixed per-run costs count per run; revenue and per-seat costs count per filled seat. Output break-even fill (seats needed to cover the run's cost).
    - Motivated by the 2026-10-23 trial: seats are known capacity, fill is only known after booking — it felt like needing Current and Forecast mode at once. This item plus 24c removes that tension without a hybrid mode.
    - Design: implement as one value of a per-offering **type** field shared with items 18 and 19 (`subscription | per-session | group | one-time`), not as a new app mode or a business-type toggle. Each row picks its shape, so mixed businesses (memberships + hourly + classes) work in one scenario; the table shows only the columns a row's type uses; industry templates just preset default types. Keeps the calc one path per type rather than forked per mode.
    - Effort: ~4-6 hours

24c. **Ranged inputs for assumptions (low / base / high)** *(PARTIAL, 2026-10-24: optional low/high on group fill % (Forecast) and current clients (Current); collapsed "Ranges" table under Fixed Expenses; Outputs band shows min / base / max for revenue, profit, clients, utilization and break-even clients; persisted via share URL, CSV (cols 12-15) and sanitizers. Remaining: visit frequency range, per-offering and chart ranges, the item 22 link shipped as the "top drivers" line under the band)*
    - Let any guessed input (fill %, visit frequency, client count) carry a low/base/high value and show results as a range. Pairs with item 22 (confidence tags) as the input side of item 24's range output.
    - Covers "known capacity, unknown demand" in Current mode: real counts stay point values, guesses become ranges.
    - Design note: the band is a scenario envelope (all lows together, all highs together via `calcRange` in `src/calculations/ranges.ts`), not a statistical interval; min/max are taken across the runs, so it stays honest when more clients means more loss.
    - Effort: ~3-4 hours on top of item 24

**Cost Modeling Rework** *(new category — Tim's read after this session: "the entire pp could use a rework around costs and money out... seems like it's mostly recurring fees and employee stuff right now")*

The revenue side of the app is rich: an unlimited, per-offering table with its own price/frequency/mix fields. The cost side, by contrast, is three flat numbers: Overhead (monthly), Full-time payroll, Part-time payroll, plus a per-offering Var $/Session field almost nobody in this session's trial ended up using (all 12 offerings landed on $0). Real small businesses have much richer cost structures than that — rent, insurance, software, equipment, loan payments, contractor pay, marketing spend, payment processing fees, one-time capital purchases. Right now none of those have a home.

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

- **Current status**: Application is fully functional with comprehensive test coverage (560 unit tests across 55 files, 1 skipped, plus 342 Playwright e2e tests across 25 files on chromium + firefox), dev server stable. July 2026: client mix optimizer, advanced chart types (heat map/radar/funnel), KPI visual polish, animated counters, GoatCounter analytics + APK release pipeline hardened, scroll-lock reference-counting leaks fixed. October 2026: bug sweep, per-scenario currency, expenses, ranges, offering types, and the Insights and Reverse Calculator panels (see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md)).
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ advanced visualizations (heat map, radar, funnel), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming), ✅ financial report export, ✅ LRU calc cache, ✅ client mix optimizer.
- **Latest milestones** (July 2026):
  - Client Mix Optimizer: grid-search + hill-climbing mix suggestions, fully wired panel
  - Advanced Charts: price × utilization sensitivity heat map, balanced scorecard radar, client capacity funnel
  - KPI Visual Polish: accent-gradient wash on KPI boxes/section headers, tightened line-height rhythm
  - Animated KPI Counters shipped; AI Insights Engine & Reverse Calculator rebuilt on `calc()` and wired into two panels (October 2026)
  - GoatCounter analytics + APK release pipeline hardened: build-time platform stamping (web vs APK), real `versionCode`/`versionName` on every build, auto-generated release notes
  - Scroll lock reference-counting leaks fixed across 3 sites (modal double-open, analytics↔advanced dashboard transition); dead logo link fixed
- **Next priorities**: see Recommended Next 3 above.
- **Strategic positioning**: Core financial-modeling + export + performance + advanced-analytics foundation is complete, and the release/distribution pipeline (web + APK) is now solid after this round of hardening. Insights and Reverse Calculator are now reachable; focus moves to onboarding polish (wizard) and data-model fidelity (per-session pricing). Mobile app launch is waiting on a full Xcode install. Enterprise features deferred until market demand validates investment.
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
- **Real-business trial run (2026-08-02)**: Used the app hands-on to build a Forecast-mode scenario for a real hybrid subscription+hourly business (The Sound Stage, a voice/acting/recording studio — 12 real offerings spanning 2 memberships, weekly group workouts, 1:1 coaching, and various hourly studio/recording services). Tim independently hit the same roadblocks trying to enter this data himself, confirming these aren't automation-specific artifacts. Surfaced the biggest data-model gap yet found: no first-class per-session pricing type, forcing every hourly service into a fake monthly-equivalent price (shipped as item 18, see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md); see also 19-21 for related gaps: one-time purchases, multi-resource capacity, contractor labor; 22-24 for confidence-tagging, an inline conversion helper (folded into 18), and range-based output — all motivated by the same trial). Also surfaced 6 real bugs (12g-12o: silent full-reset data loss on removing all offerings, Customer Analytics LTV showing $0 despite a populated revenue model, header KPI staleness after bulk edits, same-name save creates a silent duplicate instead of overwriting, absurdly long/staleness-prone share URLs) and 4 UX friction points (12j-12m: no table view past ~5 offerings, no duplicate-offering button, Mix% defaulting to 0% on new rows, no duplicate-scenario option). Same session, Tim separately flagged two bigger structural gaps after reviewing the findings: (1) the single-scrollable-page layout is "getting very busy" — see the new Layout & Information Architecture category (25-26, tabs restructure); (2) cost/expense modeling is thin ("mostly recurring fees and employee stuff") next to the rich revenue-offerings model — see the new Cost Modeling Rework category (27-31, headlined by a structured Expense Line Items table mirroring Service Offerings). Full context/writeup in the `soundstage-web` project if needed later.

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

### Test Coverage Status (October 2026)
- **567 unit tests** across 56 files (566 passing, 1 skipped), plus **346 Playwright e2e tests** across 26 files on chromium + firefox
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
  - ✅ **E2E**: Mix Optimizer & Advanced Charts panel flows covered in `tests/e2e/advisor-panels.spec.ts` (12c)
