# ProfitPath — Consolidated Roadmap (single source of truth)

**TL;DR:** Active work and blockers only; last audited 2026-11-10 against v0.8.73-beta. The requested bundle feature is external generation of one decision link for two to four scenarios; its shared encoder and Node usage are documented in the shipped ledger.

See [README.md](README.md) for setup and development instructions. Shipped work lives in [docs/ledger/ROADMAP_SHIPPED.md](docs/ledger/ROADMAP_SHIPPED.md).

---

## Recommended Next 3

1. **Workspace tour repair** (item 42): address the known misplaced guidance before adding more onboarding.
2. **Finish device/human acceptance** (item 40): native share/print/mail and participant comprehension remain open. Workspaces is already the new-device default.
3. **CI worker benchmark** (item 43): measure whether two browser workers reliably reduce runner time.

### Bundle status

- **Scenario sharing (item 36): shipped.** [Scenarios UI](assets/components/UIHelpers.ts) exposes Share selected for up to four saves; the [bundle service](assets/services/scenarioBundle.ts) validates compressed snapshots, confirms import, preserves existing work, skips identical saved copies, and suffixes conflicting names.
- **Verification:** all five [bundle tests](src/test/scenario-bundle.test.ts) passed on 2026-11-10. The existing [browser journey](tests/e2e/scenario-bundle.spec.ts) covers share/import; browsers were not rerun during this documentation audit.
- **Service purchases:** [item 19](docs/ledger/ROADMAP_SHIPPED.md#2026-10-24--19-one-time--bundled-purchase-line-items) provides per-sale revenue with no capacity use. [Membership entitlements](docs/ledger/ROADMAP_SHIPPED.md#2026-10-27--24g-membership-per-service-entitlements) provide included visits in a display-only what-if.
- **External generation:** Tim clarified the request on 2026-11-10: one decision link for multiple named calculation states. See [Node encoder usage](README.md#generate-a-decision-link-from-node). This request does not add service-package modeling.

Industry Benchmarks (item 10) stays out of the top 3: it is blocked on sourcing trustworthy data, not on code. Shipped work is indexed in the [ledger](docs/ledger/ROADMAP_SHIPPED.md).

---

## Fully Prioritized Backlog (high → low)

41. **Retire the temporary minimatch override** *(conditional follow-up, 2026-11-10)*
    - The 11 moderate development dependency findings are resolved: full `npm audit` reports zero after rimraf 6.1.4/glob 14.0.4 and the minimatch 11.0.6 override. See the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md).
    - Wait for ESLint/config-array and typescript-eslint to request patched minimatch themselves. Retain the override while their declared ranges still select vulnerable 10.x.
    - Acceptance: remove the override only when a fresh lockfile install, full audit, lint, typecheck and unit tests pass without it.
    - Effort: ~30 minutes once upstream ranges support the patched dependency.

42. **Workspace tour repair**
    - Stop the Classic guided tour from targeting hidden controls in Workspaces, then define guidance for Model / Results / Compare.
    - Acceptance: Classic guidance remains usable; Workspaces cannot launch the misplaced Classic cards; new guidance targets visible controls and supports keyboard dismissal without leaving scrolling locked.
    - Effort: ~2-4 hours.

43. **CI worker benchmark**
    - Compare the full release browser suite with one and two workers to reduce CI duration and runner minutes.
    - Acceptance: record duration, failures and retries under comparable conditions; retain two workers only if reliability is preserved and runtime materially improves.
    - Effort: ~1-2 hours, including runner time.

**Advanced Analytics (4-6 Hour Tasks)**

10. **Industry Benchmarks & Competitive Pricing**
    - 🧑 needs-human: benchmark and regional pricing data must be sourced and trusted by Tim; code is the easy part
    - Remaining: industry benchmark comparisons, regional pricing data, success metric standards
    - Effort: ~4-6 hours (templates done; focus on benchmarking data)

11. **Seasonal & Market Adjustments**
    - Design drafted: [seasonal-adjustments plan](docs/plans/seasonal-adjustments.md). Display-only monthly lens (peak capacity, cash trough) over `calc()`; annual figures never change.
    - Geographic pricing variations by region: recommended move into item 10 (needs sourced regional data); awaiting Tim's call.
    - Acceptance: monthly results reconcile to the annual base and expose peak capacity/cash trough; regional pricing scope needs Tim's decision.
    - Effort: ~4-5 hours

**Layout & Information Architecture** *(new category — Tim independently flagged this as "getting very busy on a single scrollable page view," agreed with while building the Sound Stage scenario)*

40. **Post-redesign device/human acceptance**
    - Effort: ~2-4 hours of coordinated acceptance; fixes estimated after findings.
    - Implementation items 25 and 38–39 are closed at Tim's direction on 2026-10-29; this item owns every remaining acceptance task. See the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md).
    - Release CI [Tests 40982288978](https://github.com/tsyche/profitpath/actions/runs/40982288978), APK, Pages and mirror passed; all five checks have zero annotations. Local validation passes 832 unit tests (one existing skip), 606/610 browser cases (four existing Firefox skips), four production zoom/PDF cases and four offline cases, with no retries.
    - Android emulator checks passed on 2026-10-29: release APK 0.8.63-beta, Pixel 8 / Android 35, install/launch, remembered Workspaces choice, rename with the native keyboard visible, save/alternative, mode switching, Results, decision workbench, reload persistence and portrait/landscape. Offline reload/edit/save/reload passed with Wi-Fi and cellular data disabled; an external connectivity probe succeeded before disconnection and failed during it. WebView `navigator.onLine` remained true, so it is not the offline oracle.
    - Android emulator (Pixel 8 / Android 35) read-only reload, editable copy, path-traversal rejection, CSV/Excel/HTML share chooser with real file bytes, and native print preview passed on 2026-10-30 via `tests/android/native-export.ts` (disposable `.acceptance` APK; see the script header). Repeat affected journeys if findings require code changes.
    - Physical-device checks (real touch and software keyboard, core flow, Results, alternative/Compare, reload/Back, orientation, invalid input) passed on build 0.8.64-beta, reported by Tim on 2026-10-30; no findings.
    - Open finding (2026-10-30): on 0.8.64-beta, Share/export options did nothing on the device. Build 0.8.64 predates the native Android export (`ExportPlugin`, pushed afterward), so the blob download has no handler in the WebView. Reinstall the build after 0.8.64 and re-test share/print/mail; close this once confirmed. A nested body scroller (`html, body { overflow-x: hidden }`) was fixed with a regression test.
    - TalkBack/VoiceOver pass reported by Tim on 2026-10-30 with no findings. 🧑 needs-human: native print/mail-app handoff, and participant task times/comprehension with a re-score against the recorded baseline. Emulator checks supplement physical-device and human observations; they do not establish them.
    - Record findings and fix any blocked journey. Repeat affected release gates if code changes. Tim set Workspaces as the new-device default on 2026-10-30 (before the remaining human checks); Classic stays available via the Settings toggle and `?layout=legacy`. Retirement of Classic remains a later decision.

**Business Model Fidelity** *(new category — found trialing a real hybrid subscription+hourly business, The Sound Stage, a voice/acting/recording studio)*

24f. **Conditional membership integration** *(remaining follow-up from shipped 24e)*
    - Membership headroom now subtracts modeled scenario load, and the target-margin optimizer suggests fee, credits or discount separately. The remaining conditional follow-up is to feed members into `calc()` only if real use shows the display-only panel is insufficient.
    - Chart ranges, Excel parity, and per-service entitlements are recorded in the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md).
    - No integration work until real usage establishes the need.
    - 🧑 needs-human: real usage must demonstrate the gap and establish integration semantics.
    - Effort: scope after evidence; acceptance must prevent double-counting plan revenue, redemptions, labor and capacity.

45. **Live driver slider in the decision workbench** *(idea, 2026-11-10; from the Sound Stage price decision)*
    - Problem: an owner's real question is "what if I run 4 classes a month instead of 8?" Today that means editing a group row's Clients (seat-sales, not runs) one scenario at a time. The tornado chart, the price × utilization heat map and the reverse calculator answer neighbouring questions, but none move one driver live across every option at once.
    - Shape: in the decision workbench, pick one driver (group runs per month, a row's clients, price, fill % or sales-loss %) and drag a slider. Every option's net income and the "highest income" verdict recompute through `calc()` as it moves, and the slider marks the crossover point where the leading option changes, if any.
    - Display-only lens: the slider never writes to saved scenarios or the bundle; reset returns to the loaded values. Group drivers are in runs, converted with seats × fill (the same rule as `runs = ceil(clients / (seats × fill))`).
    - Acceptance: values at the slider's base position equal the workbench table exactly; a unit test pins one known crossover; keyboard and screen-reader operable (native `input type="range"` plus a number field); results update without visible lag on a four-option bundle.
    - Out of scope: multi-driver sliders (the heat map covers two drivers) and saving slider positions to links until someone asks.
    - Effort: ~3-5 hours.

**Mobile & Platform Support (Deferred — needs full Xcode)**

13. **Native Android & iOS App via Capacitor**
    - 🧑 needs-human: macOS is now current (26.6.2) but only Command Line Tools are installed; install full Xcode, then revalidate the Capacitor upgrade
    - Last recorded machine check (2026-10-24): current macOS, Command Line Tools only. Recheck Xcode before iOS work. [Package versions](package.json) already use CLI 8.6 with core/platform 5.7; align the supported toolchain and revalidate native exports. The old claim that CLI v8 is still pending was stale.
    - Strategy doc available locally (gitignored)
    - Effort: ~36-45 hours remaining (Phase 1 partially done; revalidate once Xcode is installed)

**Enterprise Features (Scale Layer — Deferred)**

13a. **Open share links in the installed app (Android App Links / iOS Universal Links)** *(optional; no demand yet)*
    - Today a tapped share link opens the web app in the browser and loads the data from the URL; the APK registers no deep links (only the launcher intent filter).
    - Android: `https` `intent-filter` with `autoVerify` for `profitpath.tsyche.workers.dev`, a `/.well-known/assetlinks.json` carrying the APK signing-cert SHA-256 (use the release key, not debug), and a Capacitor `appUrlOpen` listener that passes the URL to the existing scenario/bundle/decision loaders.
    - iOS: Associated Domains entitlement plus `apple-app-site-association`; blocked on item 13 (full Xcode).
    - Keep the browser fallback for recipients without the app. Needs a device test that a tapped link lands in the app with the data loaded.
    - Effort: ~3-5 hours Android, iOS estimated after item 13.
    - 🧑 needs-human: release-signing certificate access and physical-device link verification; iOS also needs Xcode.

14. **Advanced Scenario Management**
    - 🧑 needs-human: team sharing needs backend infrastructure and a hosting/account decision
    - Scenario versioning and history tracking
    - Bulk snapshot-link import/export is shipped (item 36); remaining work is file-based bulk operations and version history.
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours
    - Acceptance: define retained versions and restore behavior; team permissions require a separate backend design.

15. **Integration & Automation**
    - 🧑 needs-human: backend infrastructure plus third-party accounts/credentials
    - API for third-party integrations
    - Webhook notifications for key metrics
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours
    - Acceptance: scope one integration with authenticated delivery, retry behavior and no accidental business-data transmission.

16. **Multi-Year Strategic Planning**
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Effort: ~8-10 hours
    - Acceptance: explicit annual assumptions, hiring costs and payback reconcile across the selected years.

17. **Optimizer Mode & AI Insights** *(rules-based Insights Engine and Mix Optimizer shipped; only the ML parts remain)*
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours
    - 🧑 needs-human: approved training/data source, provider/cost decision and measurable benefit over existing rules.
    - Acceptance: evaluate against the existing rules before exposing predictions to users.

12o. **Server-hosted short share links** *(deferred; backend-dependent)*
    - Store shared scenarios behind short opaque IDs to reduce link length and let recipients see updated scenarios.
    - Requires backend infrastructure, hosting, and an account / retention decision. No backend work is planned until the roadmap reaches that phase.
    - Current compressed links remain point-in-time snapshots; the Share flow warns users to resend after edits.
    - Effort: ~6-10 hours after infrastructure decisions.
    - 🧑 needs-human: hosting, retention and account decisions.
    - Acceptance: opaque IDs, explicit snapshot/update semantics, expiry and abuse limits.

---

## Monetization Strategy

Privacy-first freemium model planned post-launch. The app remains free until demand is validated. No ads; anonymous page-load counting is disclosed in the [privacy policy](docs/privacy-policy.md).

---

## Status & Notes

- **Current status**: 854 unit tests across 79 files (853 passing, one existing skip), 630 release Playwright cases across 51 files on Chromium + Firefox, plus four production zoom/PDF cases, four production offline cases, and 30 separate design-review cases; axe a11y scans included. Classic and Workspaces remain available during item 25 acceptance. July 2026: client mix optimizer, advanced chart types (heat map/radar/funnel), KPI visual polish, animated counters, GoatCounter analytics + APK release pipeline hardened, scroll-lock reference-counting leaks fixed. October 2026: bug sweep, per-scenario currency, expenses, ranges, offering types, and the Insights and Reverse Calculator panels (see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md)).
- **Foundation history**: see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md); completed work is indexed there.
- **Latest milestones** (July 2026):
  - Client Mix Optimizer: grid-search + hill-climbing mix suggestions, fully wired panel
  - Advanced Charts: price × utilization sensitivity heat map, balanced scorecard radar, client capacity funnel
  - KPI Visual Polish: accent-gradient wash on KPI boxes/section headers, tightened line-height rhythm
  - Animated KPI Counters shipped; AI Insights Engine & Reverse Calculator rebuilt on `calc()` and wired into two panels (October 2026)
  - GoatCounter analytics + APK release pipeline hardened: build-time platform stamping (web vs APK), real `versionCode`/`versionName` on every build, auto-generated release notes
  - Scroll lock reference-counting leaks fixed across 3 sites (modal double-open, analytics↔advanced dashboard transition); dead logo link fixed
- **Next priorities**: see Recommended Next 3 above.
- **Strategic positioning**: prioritize concrete modeling gaps over backend expansion. Workspaces is the default; item 40 owns remaining acceptance. Android ships today; iOS/toolchain alignment remains in item 13.
- **Known debt**: CLI 8.6 and core/platform 5.7 remain mismatched; item 13 owns alignment. `npm audit --omit=dev` reported zero vulnerabilities on 2026-11-10; that check does not establish the security status of development dependencies.
- **Blocked major bumps** (ignored in `.github/dependabot.yml`; 2026-09-25): vitest/@vitest/ui 5 fails 11 unit tests; jsdom 30 and jest-dom 7 untried; typescript 7 is blocked because typescript-eslint peers `typescript <6.1.0` (project is on 6.0.3; recheck when typescript-eslint supports 7). Also note `@capacitor/cli` is ^8 while `@capacitor/core` and the platform packages are ^5 — a pre-existing mismatch to resolve with the Capacitor upgrade. Remove each ignore once fixed.

### User Feedback & Research Loop

This section tracks common feature requests, friction points, and competitive gaps reported by users:

- **Historical feedback**: read-only sharing, reporting and performance work are recorded in the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md). The old combined claim that sharing and comments were shipped did not establish a comments feature.
- **Reverse calculation**: "Tell me what I need to hit X take-home" — shipped as the "What Would It Take?" panel (`src/insights/reverseCalculator.ts`); follow-ups in item 12r
- **Goal-setting wizard**: Users unsure which inputs to adjust for desired outcomes — tracked as Guided "What If?" Wizard
- **Accessibility**: Keyboard navigation and screen reader support (shipped)
- **Localization**: Multi-currency support and localized formatting (shipped)
- **Real-business trial run (2026-08-02)**: Used the app hands-on to build a Forecast-mode scenario for a real hybrid subscription+hourly business (The Sound Stage, a voice/acting/recording studio — 12 real offerings spanning 2 memberships, weekly group workouts, 1:1 coaching, and various hourly studio/recording services). Tim independently hit the same roadblocks trying to enter this data himself, confirming these aren't automation-specific artifacts. Surfaced the biggest data-model gap yet found: no first-class per-session pricing type, forcing every hourly service into a fake monthly-equivalent price (shipped as item 18, see the [shipped ledger](docs/ledger/ROADMAP_SHIPPED.md); see also 19-21 for related gaps: one-time purchases, multi-resource capacity, contractor labor; 22-24 for confidence-tagging, an inline conversion helper (folded into 18), and range-based output — all motivated by the same trial). Also surfaced 6 real bugs (12g-12o: silent full-reset data loss on removing all offerings, Customer Analytics LTV showing $0 despite a populated revenue model, header KPI staleness after bulk edits, same-name save creates a silent duplicate instead of overwriting, absurdly long/staleness-prone share URLs) and 4 UX friction points (12j-12m: no table view past ~5 offerings, no duplicate-offering button, Mix% defaulting to 0% on new rows, no duplicate-scenario option). Same session, Tim separately flagged two bigger structural gaps after reviewing the findings: (1) the single-scrollable-page layout is "getting very busy" — see the Layout & Information Architecture category (25-26, tabs restructure; now the UI/UX pass); (2) cost/expense modeling is thin ("mostly recurring fees and employee stuff") next to the rich revenue-offerings model — shipped as items 27-31 (structured Expense Line Items table, marketing, processing fees, one-time costs, loans). Full context/writeup in the `soundstage-web` project if needed later.

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

### Test Coverage Status (October 2026)
- **854 unit tests** across 79 files (853 passing, one existing skip), plus **630 release Playwright cases** across 51 files on Chromium + Firefox; four production zoom/PDF cases, four production offline cases, and 30 separate design-review cases. Lint, strict typecheck, and production build pass. The 2026-10-29 full release run used no retries; the design-review suite remains separate historical evidence.
- Key areas: calculation engine and fuzz tests, scenarios, feature gating, export/import, scroll lock, mobile layout, tooltips, security (XSS, CSV injection), performance, optimizer and advanced charts, axe a11y at every experience level in both themes
- Detail lives in [CLAUDE.md](CLAUDE.md#testing-strategy)
