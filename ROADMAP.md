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

12g. **Fix: removing the last offering silently resets the whole list to generic demo defaults** *(new — found trialing a real business, see item 18 below; real data-loss risk)*
   - Removing every offering (down to zero) doesn't leave an empty state — it silently repopulates the 3 generic template offerings ("Weekly"/"Biweekly"/"Monthly", $200/$140/$100 etc.), with no confirmation and no way to tell it happened except noticing the numbers changed
   - Directly hit this while rebuilding an offerings list from scratch — spent a round-trip confused about why "Remove" appeared to not be working, before realizing it *had* worked and something else had repopulated defaults on top
   - A user who removes everything intending to start clean, gets interrupted, and comes back later could easily not notice their real data was replaced with demo placeholders
   - Fix: either leave a genuine empty state (with an "Add your first offering" prompt) or show a confirmation before the reset-to-demo-data path fires
   - Effort: ~1 hour

12h. **Bug: Customer Analytics LTV shows $0 even with a fully populated revenue model** *(new — found trialing a real business)*
   - With Avg Customer Lifespan set to 24 months and a 12-offering scenario computing a real $1,026/client contribution margin, the Customer Analytics panel still showed `LTV: $0` (and consequently `LTV:CAC: 0.00:1`, flagged "Critical: business model is unsustainable")
   - CAC computed correctly from Marketing Budget ÷ New Customers ($1000/5 = $200), so the assumption inputs *are* wired up — LTV specifically looks disconnected from the actual per-client revenue/contribution-margin numbers the rest of the app already computes
   - Worth checking whether LTV is reading from real offering revenue at all, or stuck on a stale/zero source value
   - Effort: unknown until root-caused; likely small once found (~1-2 hours)

12i. **Sticky header KPI totals lagged the Outputs panel after a batch of edits** *(new — found trialing a real business; may be automation-specific, flag with lower confidence)*
   - After programmatically filling ~12 offerings' worth of fields in quick succession, the top sticky bar (Revenue/Net Income/Utilization) kept showing stale pre-edit numbers while the Outputs panel below had already recomputed correctly — required an unrelated UI interaction (closing an unrelated modal) before the header repainted
   - This was hit via browser automation (`form_input`-style programmatic value-setting) rather than a human clicking through the UI one field at a time, so it's possible this doesn't reproduce with normal typing — but worth a quick check on whether the header subscribes to the same state/store as Outputs, since a real desync there would also affect fast manual edits (e.g. CSV import, paste)
   - Effort: ~30-60 minutes to check, more if it's a real state-subscription bug

12j. **No table/spreadsheet view for Service Offerings** *(new — found trialing a real business)*
   - Past ~5 offerings (very normal for a real multi-service business — hit 12 building a real scenario), the vertical card-per-offering layout means a lot of scrolling to review or compare anything at a glance
   - A compact table view (rows = offerings, columns = name/price/sessions/hours/var-cost/mix) as an alternate/toggleable layout would make both bulk entry and review much faster once past a handful of offerings
   - Effort: ~3-4 hours

12k. **No "Duplicate offering" button** *(new — found trialing a real business)*
   - A real business's price list often has near-identical tiered variants (e.g. a rental service with 4hr/8hr × hands-on/hands-off combinations) — recreating each from scratch felt tedious enough that it directly led to collapsing 4 real pricing tiers into 1 blended estimate rather than modeling them accurately
   - A duplicate button (copy an existing offering as a starting point, then tweak) would remove the friction that currently nudges users toward under-modeling
   - Effort: ~1 hour

12l. **New offerings start Mix % at 0%, making the running total read "wrong" through most of a multi-offering build** *(new — found trialing a real business)*
   - Building a scenario with several offerings means seeing "Mix percentages sum to 37% (should be 100%)"-style warnings through most of the process, since each newly-added row starts at 0 until manually set — expected given auto-normalize, but reads as alarming/broken mid-build rather than just incomplete
   - Distributing remaining % evenly across newly-added rows (or softening/suppressing the warning until offerings stop being actively added) would read calmer during normal use
   - Effort: ~1-2 hours

12m. **No "Duplicate scenario" option** *(new — found trialing a real business)*
   - The Scenarios modal has Save/Load/Delete/Compare but no clone — wanted this to keep one scenario as a "fill in as real data arrives" baseline and branch an illustrative/aspirational variant without re-entering all 12 offerings by hand
   - Effort: ~1 hour

12n. **Saving a scenario under an existing name silently creates a duplicate instead of overwriting** *(new — found trialing a real business, hit immediately after 12m)*
   - Edited Presentation Notes on an already-saved scenario, then saved again under the exact same name expecting an update-in-place — instead got two entries with identical names in "Load Saved Scenarios" (only distinguishable by timestamp), and had to manually identify and delete the stale one
   - The "Confirm Save" dialog text ("Save current configuration as 'X'? This will save your current calculations and settings.") reads like it's describing an update, not a duplicate-creation — the actual behavior doesn't match that framing
   - Fix: detect an existing scenario with the same name and either overwrite it or explicitly ask "a scenario with this name already exists — overwrite or save as a new copy?"
   - Effort: ~1 hour

12o. **Share URLs are absurdly long** *(new — found trialing a real business; Tim's reaction on seeing one: "lol")*
   - The Share feature encodes the entire scenario JSON (every offering's full field set, plus the full Presentation Notes text) as a base64 blob in a `?scenario=` query param — a 12-offering scenario with a few paragraphs of notes produced a URL several thousand characters long, unusable in most contexts (chat apps, SMS, some URL-length-limited systems) and unpleasant to paste anywhere
   - Also has a real staleness trap: a previously-copied share URL is a frozen snapshot — editing and re-saving the scenario does *not* update URLs already shared, so an old link can silently show stale data (including stale Presentation Notes) with no indication it's out of date
   - Fix options, roughly in order of effort: (a) compress the JSON before base64 (e.g. gzip) — quick win, doesn't fix staleness; (b) server-side scenario storage with a short opaque ID in the URL (like a pastebin) — fixes both length and staleness, but needs backend infra this project has avoided so far; (c) at minimum, surface a warning in the UI that share links are point-in-time snapshots, not live views
   - Effort: ~1 hour for (a), ~4-6 hours for (b) if backend storage is acceptable

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

18. **First-class per-session/one-off pricing type**
    - Every offering today is modeled as `Price/mo × 12 × clients` — a genuine fit for subscriptions, but every hourly/one-off service (recording session, studio rental, podcast time) had to be hand-converted into a fake "monthly-equivalent" price by guessing a visit frequency, mixing one real number (list price) and one guessed number (frequency) into a single field with no way to tell them apart later
    - A distinct "per-session" offering type — real per-session price + a separately-labeled visits/year assumption, shown as two clearly different kinds of input — would be both more accurate and more honest about which part of the model is fact vs. assumption
    - Likely the single highest-value item on this list: it's the root cause behind items 12k and part of 12j (tedious workarounds exist *because* the data model doesn't fit this extremely common business shape)
    - Effort: ~4-6 hours (touches the core calc model, not just UI)

19. **One-time / bundled purchase line items**
    - Common small-business pattern with nowhere to go today: a one-time bundle/package purchase (e.g. a punch card, gift card, or registration fee) that's neither a monthly subscription nor a recurring per-session booking
    - A simple "one-time revenue" line-item type (name, price, estimated annual quantity sold, no session/capacity implications) would capture this without forcing it into the recurring-offering shape
    - Effort: ~2-3 hours

20. **Multi-resource capacity pools**
    - The single "Service Hours" capacity pool assumes every offering competes for the same bottleneck resource — true for a solo consultant, false for any facility-based business with genuinely separate constraints (e.g. a recording booth, a rehearsal room, and staff time, which can all run in parallel)
    - Today the app could flag "over capacity" even when the actual constraining resource still has headroom, because everything funnels into one utilization number
    - A multi-pool model (or at minimum optional resource tagging per offering, with capacity computed per resource) would meaningfully improve accuracy for any facility/studio/gym-style business, not just this one
    - Effort: ~6-8 hours (meaningful capacity-model rework)

21. **Contractor / per-session labor costs**
    - Staffing today is Full-time/Part-time salaried only, but studios/gyms/coaching businesses commonly pay some instructors per-session or as contractors rather than salary — the real business used to validate this session doesn't even specify on its own public site which staff are salaried vs. contracted, suggesting this is a genuinely common ambiguity, not an edge case
    - A "cost per session" or "% of session revenue" labor field (global default, optionally overridable per offering) would let the model represent gig/contractor pay, which isn't representable at all today
    - Effort: ~3-4 hours

22. **Per-offering confidence tagging (Verified / Estimated / Guess) + per-offering notes**
    - Building a scenario before real data exists means mixing genuinely-known numbers (real list prices, verified from the business's own site) with invented ones (visit frequency, client counts) — today the *only* place to flag that distinction is one free-text Presentation Notes box for the entire scenario, which doesn't scale past a few offerings and ends up as one long disclaimer paragraph nobody reads closely enough to know which of 12 rows a given caveat applies to
    - A small per-offering confidence badge (e.g. a 3-state toggle: Verified/Estimated/Guess) plus an optional short per-offering note field would let a scenario visibly show its own reliability row-by-row, and could feed a future "confidence-weighted" output (see item 24)
    - Directly motivated by this session: wrote one large disclaimer to cover 12 offerings of mixed real/guessed data because there was nowhere more granular to put it
    - Effort: ~3-4 hours

23. **Inline per-session → monthly-equivalent conversion helper**
    - Until item 18 (first-class per-session pricing) ships, users modeling hourly/one-off services have to do the `hourly rate × assumed hours × assumed frequency = Price/mo` math by hand outside the tool — did this manually ~9 times in one session (e.g. Podcast Studio $80/hr × 2hr × 1 visit/mo = $160/mo)
    - Even a small inline toggle next to Price/mo ("Enter as: monthly total | per-session × frequency", auto-computing one from the other) would remove that friction as a lightweight stopgap even before the full data-model change
    - Effort: ~2 hours

24. **Confidence-band / range output for assumption-heavy scenarios**
    - Distinct from the existing Sensitivity Analysis (which varies one lever at a time against a single baseline): when most of a scenario's inputs are guesses rather than known values (9 of 12 offerings in this session's trial), a single point-estimate output number (e.g. "$42,798 revenue") implies false precision
    - A simple optimistic/base/conservative 3-scenario toggle — applying a confidence band to guessed inputs (informed by item 22's confidence tags, if built) and showing a resulting range rather than one number — would better communicate uncertainty for exactly this "sketching before real data exists" use case
    - Effort: ~4-5 hours

**Cost Modeling Rework** *(new category — Tim's read after this session: "the entire pp could use a rework around costs and money out... seems like it's mostly recurring fees and employee stuff right now")*

The revenue side of the app is rich: an unlimited, per-offering table with its own price/frequency/mix fields. The cost side, by contrast, is three flat numbers: Overhead (monthly), Full-time payroll, Part-time payroll, plus a per-offering Var $/Session field almost nobody in this session's trial ended up using (all 12 offerings landed on $0). Real small businesses have much richer cost structures than that — rent, insurance, software, equipment, loan payments, contractor pay, marketing spend, payment processing fees, one-time capital purchases. Right now none of those have a home.

27. **Structured Expense Line Items table (the headline idea)**
    - Mirror the Service Offerings pattern on the cost side: instead of one flat "Overhead (monthly)" field, a real table of expense line items — name, category, amount, frequency (monthly/annual/one-time) — the same way offerings already have a name, price, and frequency
    - Category tags (Rent/Lease, Utilities, Insurance, Software/Subscriptions, Marketing, Equipment, Loan Payments, Professional Services, Supplies/COGS, Payment Processing, Contractor/1099, Other) would let the Outputs panel break down costs the way it already breaks down revenue by offering
    - This single change would naturally subsume several smaller ideas below (28, 29, 30) rather than needing bespoke fields bolted on one at a time — a "Contractor/1099" category line covers item 21's per-session labor cost use case, a "Marketing" category line covers item 28 below, "Payment Processing" covers item 29, and one-time-frequency line items cover item 30 — all as category tags on one unified list rather than several separate features
    - Effort: ~6-8 hours (this is the core architectural change the other cost items below build on — worth sequencing first)

28. **Marketing spend as a real P&L cost, not just a Customer Analytics input**
    - Monthly Marketing Budget already exists today, but only inside the Customer Analytics panel (used solely for the CAC calculation) — it's real cash a business spends, yet it doesn't reduce Net Income anywhere in the core calc
    - Once item 27 exists, "Marketing" becomes a natural expense category — the same number should drive both CAC *and* the core P&L, rather than living in an isolated analytics silo disconnected from the actual profitability number the rest of the app centers on
    - Effort: ~2 hours once item 27 exists (mostly wiring, not new UI)

29. **Payment processing fees**
    - A near-universal real cost for any business taking card payments (Stripe/Square-style ~2.9% + $0.30 per transaction) that isn't modeled anywhere today
    - As a category on item 27's expense table (percentage-of-revenue type rather than flat amount), or as a simple global "processing fee %" input applied to revenue — either would capture a cost every single template business (consulting, fitness, photography, etc.) actually pays
    - Effort: ~2-3 hours

30. **One-time / capital expenses, separate from recurring monthly costs**
    - Equipment purchases, buildout costs, and other one-time capital outlays are a different shape than recurring monthly overhead — today there's nowhere to put a "bought a new recording rig for $3,000 this year" line without distorting the monthly Overhead number
    - Covered by item 27's frequency field (one-time vs. monthly vs. annual) rather than needing its own separate feature — listed here mainly to make sure item 27's design explicitly accounts for this case rather than assuming everything recurs monthly
    - Effort: included in item 27's scope

31. **Loan / debt payments**
    - Principal + interest payments on business loans or equipment financing — common for businesses financing a buildout or gear, not represented today
    - Simplest version: a "Debt Service" expense category (item 27) with a flat monthly payment amount; a more complete version would track principal/interest split and remaining term for payoff projections, but that's a bigger feature than this app's current scope suggests is warranted yet
    - Effort: ~1-2 hours for the simple flat-payment version once item 27 exists

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
- **Real-business trial run (2026-08-02)**: Used the app hands-on to build a Forecast-mode scenario for a real hybrid subscription+hourly business (The Sound Stage, a voice/acting/recording studio — 12 real offerings spanning 2 memberships, weekly group workouts, 1:1 coaching, and various hourly studio/recording services). Tim independently hit the same roadblocks trying to enter this data himself, confirming these aren't automation-specific artifacts. Surfaced the biggest data-model gap yet found: no first-class per-session pricing type, forcing every hourly service into a fake monthly-equivalent price (see backlog item 18, plus 19-21 for related gaps: one-time purchases, multi-resource capacity, contractor labor; 22-24 for confidence-tagging, an inline conversion helper, and range-based output — all motivated by the same trial). Also surfaced 6 real bugs (12g-12o: silent full-reset data loss on removing all offerings, Customer Analytics LTV showing $0 despite a populated revenue model, header KPI staleness after bulk edits, same-name save creates a silent duplicate instead of overwriting, absurdly long/staleness-prone share URLs) and 4 UX friction points (12j-12m: no table view past ~5 offerings, no duplicate-offering button, Mix% defaulting to 0% on new rows, no duplicate-scenario option). Same session, Tim separately flagged two bigger structural gaps after reviewing the findings: (1) the single-scrollable-page layout is "getting very busy" — see the new Layout & Information Architecture category (25-26, tabs restructure); (2) cost/expense modeling is thin ("mostly recurring fees and employee stuff") next to the rich revenue-offerings model — see the new Cost Modeling Rework category (27-31, headlined by a structured Expense Line Items table mirroring Service Offerings). Full context/writeup in the `soundstage-web` project if needed later.

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
