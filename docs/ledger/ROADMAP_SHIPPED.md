# Shipped Roadmap Items

**TL;DR:** Compact index of completed [ROADMAP.md](../../ROADMAP.md) work, followed by the original entries preserved verbatim. Partly shipped items (12o, 22, 24b) stay in the roadmap until finished.

## Shipped index

- [x] 2026-10-25 — TypeScript migration (strict, all source and tests `.ts`, lint `--max-warnings 0`)
- [x] 2026-10-26 — 24e. Membership What-If follow-ups (visit ranges, members per pool, fee optimizer)
- [x] 2026-10-25 — 24a. Membership and prepaid-credit pricing calculator
- [x] 2026-10-25 — 20. Multi-resource capacity pools
- [x] 2026-10-25 — 12j. Offerings table view (closed, already satisfied)
- [x] 2026-10-25 — 12k. Duplicate offering button
- [x] 2026-10-25 — 12l. New offerings take the unassigned Mix %
- [x] 2026-10-25 — 30. One-time / capital expenses, amortized over useful life
- [x] 2026-10-24 — 28. Marketing spend as a real P&L cost, not just a Customer Analytics input
- [x] 2026-10-24 — 29. Payment processing fees
- [x] 2026-10-24 — 31. Loan / debt payments
- [x] 2026-10-24 — 12r. Reverse calculator auto-refreshes and gains a combined price + volume lever
- [x] 2026-10-24 — 12v. Wizard: part-time hire, price + volume, price + hire, market-average scenarios
- [x] 2026-10-24 — 12w. One-time rows handled in the Mix Optimizer and offering ranking
- [x] 2026-10-24 — 12. Guided "What If?" wizard (also fixed the Insights "Add 1 employee" what-if showing +$0)
- [x] 2026-10-24 — 12c. E2E coverage for Mix Optimizer & Advanced Charts panels (found and fixed an XSS)
- [x] 2026-10-24 — 12u. Share dialog warns that links are point-in-time snapshots
- [x] 2026-10-24 — 12t. Tax section and report say US rules apply in non-USD scenarios
- [x] 2026-10-24 — 12f. App version shown in Settings
- [x] 2026-10-24 — 18. First-class per-session pricing type
- [x] 2026-10-24 — 19. One-time / bundled purchase line items
- [x] 2026-10-24 — 23. Inline per-session to monthly-equivalent conversion helper (superseded by 18)
- [x] 2026-10-24 — Animated KPI Counters, AI Insights Engine & Reverse Calculator
- [x] 2026-10-24 — 4-6. AI Insights Engine, Reverse Calculator, Client Mix Optimizer
- [x] 2026-10-24 — 4b. Wire Up Insights Engine & Reverse Calculator UI
- [x] 2026-10-24 — 12b. Remove the dead ?loadTestScenarios feature
- [x] 2026-10-24 — 12e. Export functions ignore the selected currency
- [x] 2026-10-24 — 12g. Removing the last offering reset the list to demo defaults
- [x] 2026-10-24 — 12h. Customer Analytics LTV showed $0
- [x] 2026-10-24 — 12i. Sticky header KPI totals lagged the Outputs panel
- [x] 2026-10-24 — 12m. Duplicate scenario
- [x] 2026-10-24 — 12n. Same-name save created a duplicate
- [x] 2026-10-24 — 12q. Dead #decimalPrecisionSelect control removed
- [x] 2026-10-24 — 24d. Per-offering margin per staff hour, discount floor check, market position
- [x] 2026-10-23 — 12p. Shared-link Presentation Notes never reached the textarea
- [x] 2026-10-23 — 21. Contractor / per-session labor costs (per-offering Labor % of price)
- [x] 2026-10-23 — 27. Structured Expense Line Items table
- [x] 2026-07 (month documented) — Analytics & APK Release Pipeline Hardening
- [x] 2026-07 (month documented) — Scroll Lock Reference-Counting Fix (3 leak sites)
- [x] 2026-07 (month documented) — Client Mix Optimizer, Advanced Chart Types & KPI Visual Polish
- [x] 2026-07 (month documented) — Lint Warning Cleanup (summary entry)
- [x] 2026-07 (month documented) — 0. Lint Warning Cleanup (backlog entry)
- [x] 2026-07 (month documented) — 7-8. Animated KPI Counters; Modern Visual Effects & Color Enhancement
- [x] 2026-07 (month documented) — 9. Advanced Chart Types
- [x] 2026-04 to 2026-06 (months documented) — Earlier completions: tax report, caching, sharing, UI modernization, onboarding, visual indicators, growth modeling, localization
- [x] 2026-04 to 2026-06 (months documented) — 1-3. Read-only Scenario Sharing, Tax & Financial Report Generator, Performance Optimization & Caching

## Archived entries

### 2026-10-25 — TypeScript migration

All source and tests are `.ts` with `strict: true`; the ratchet is retired (`tsc --noEmit` must be 0). `tests/e2e` is typechecked; unit `*.test.ts` files stay excluded (known gap, ~1,150 errors in the jsdom mock tests; tracked as ROADMAP 12x); `$`/`$$` are typed. Migration also surfaced and fixed real bugs, each with a test: insights under-utilization, dashboard export `getSummary`, customer analytics revenue, table focus restore (`tests/e2e/table-focus.spec.ts`). Plan: [typescript-migration](../plans/archive/typescript-migration.md).

### 2026-10-26 — 24e. Membership What-If follow-ups

Three display-only slices on the membership panel, nothing feeds `calc()`:

- **Visit ranges** (982693c): optional low/high visits per offering on a profile; `calcMembershipRange` takes min/max across the all-low / base / all-high runs. CSV profile cols 3-4.
- **Members per pool** (1f80464): `maxMembers` is the minimum over staff and tagged pools of floor(pool hours / member hours per year), staff-free pools put no hours on staff, and the binding pool is named. Staff hours come from the last `calc()`; headroom is standalone at target utilization.
- **Fee optimizer**: `recommendFee` solves fee = cost / (1 - margin) - cash, floored at 0, rounded up to the cent. It returns an explicit infeasible result when the member would stop saving. It solves the fee only, with credits and discount held fixed. The target is session-only.

Deferred lines are in ROADMAP 24e.

### 2026-10-25 — 24c. Ranged inputs: frequency bounds

Optional low/high on `sessionsPerYear` for every offering type except one-time (Forecast and Current; staff hours and variable cost both move). The Conservative case takes the high bound because more sessions cost more for the same monthly price. Every bound key now comes from one list (`RANGE_BOUND_KEYS`), with a parametrized test that each key survives `hasRanges`, the sanitizer, share URL, CSV and `withBounds`. CSV gains cols 25-26 (older files still import); the drivers line shows each offering's min/max profit. Chart ranges deferred into the UI/UX pass.

### 2026-10-25 — 24a. Membership and prepaid-credit pricing calculator

Shipped as phases 1-3 (f11fd67 math, 8391cee persistence, 7ae525c panel). Plan: [membership-calculator](../plans/archive/membership-calculator.md). Follow-ups: ROADMAP 24e, 32.

24a. **Membership and prepaid-credit pricing calculator**
    - Let a business vary plan fees, included and purchased credits, credit value and expiry, service prices, member discounts, eligibility, and a customer's monthly purchase mix. Show regular spend, member spend including the plan fee, credits used or left over, effective savings percentage, and business revenue or margin side by side.
    - Make it a general what-if tool rather than a Sound Stage-specific template. The first example should expose when a headline plan saving (value of included benefits versus fee) differs from what a customer actually saves on their chosen services. Avoid counting prepaid credits as both new revenue and a discount at redemption.
    - Acceptance: a user can change the purchase mix and compare two plans with the same services; unused or expired credits and ineligible services affect the result; every displayed percentage identifies its denominator.
    - 2026-10-23 trial: modeling membership tiers vs a punch card needed exactly this; also model breakage (expired credits = revenue with no delivery cost) and credit redemptions consuming the redeemed service's capacity and labor cost.

### 2026-10-25 — 12j. Offerings table view (closed, already satisfied)

12j. **No table/spreadsheet view for Service Offerings** *(CLOSED 2026-10-25, already satisfied: Service Offerings has been a table since the first asset-file refactor (f1d487e), rows = offerings; the entry described a layout that no longer exists. Responsive card stacking on narrow screens is intended.)*
   - Past ~5 offerings (very normal for a real multi-service business — hit 12 building a real scenario), the vertical card-per-offering layout means a lot of scrolling to review or compare anything at a glance
   - A compact table view (rows = offerings, columns = name/price/sessions/hours/var-cost/mix) as an alternate/toggleable layout would make both bulk entry and review much faster once past a handful of offerings
   - Effort: ~3-4 hours

### 2026-10-25 — 12k. Duplicate offering button

12k. **No "Duplicate offering" button** *(SHIPPED 2026-10-25: Duplicate button per offering row; the copy is inserted below the source, named '(copy)', with 0 current clients and only the unassigned mix.)*
   - A real business's price list often has near-identical tiered variants (e.g. a rental service with 4hr/8hr × hands-on/hands-off combinations) — recreating each from scratch felt tedious enough that it directly led to collapsing 4 real pricing tiers into 1 blended estimate rather than modeling them accurately
   - A duplicate button (copy an existing offering as a starting point, then tweak) would remove the friction that currently nudges users toward under-modeling
   - Effort: ~1 hour

### 2026-10-25 — 12l. New offerings take the unassigned Mix %

12l. **New offerings start Mix % at 0%, making the running total read "wrong" through most of a multi-offering build** *(SHIPPED 2026-10-25: a new row takes the unassigned mix (100 minus current total, min 0), so mid-build totals stay at 100 instead of warning.)*
   - Building a scenario with several offerings means seeing "Mix percentages sum to 37% (should be 100%)"-style warnings through most of the process, since each newly-added row starts at 0 until manually set — expected given auto-normalize, but reads as alarming/broken mid-build rather than just incomplete
   - Distributing remaining % evenly across newly-added rows (or softening/suppressing the warning until offerings stop being actively added) would read calmer during normal use
   - Effort: ~1-2 hours

### 2026-10-25 — 30. One-time / capital expenses, amortized over useful life

30. **One-time / capital expenses, separate from recurring monthly costs** *(SHIPPED 2026-10-25: new 'one-time' expense frequency; amount is the purchase price, spread evenly over a per-row Life (yrs) input, default 3, range 1-30. CSV gains a Life (yrs) column. Year-1 cash outlay is not modeled.)*
    - Equipment purchases, buildout costs, and other one-time capital outlays are a different shape than recurring monthly overhead — today there's nowhere to put a "bought a new recording rig for $3,000 this year" line without distorting the monthly Overhead number
    - Covered by item 27's frequency field (one-time vs. monthly vs. annual) rather than needing its own separate feature — listed here mainly to make sure item 27's design explicitly accounts for this case rather than assuming everything recurs monthly
    - Effort: included in item 27's scope

### 2026-10-24 — 28. Marketing spend as a real P&L cost, not just a Customer Analytics input

28. **Marketing spend as a real P&L cost, not just a Customer Analytics input** *(SHIPPED 2026-10-24: the Customer Analytics panel now derives its marketing budget from Marketing expense rows, so one number drives CAC and the P&L; with no Marketing rows it keeps its default. It was previously a hardcoded 1000 with no input.)*
    - Monthly Marketing Budget already exists today, but only inside the Customer Analytics panel (used solely for the CAC calculation) — it's real cash a business spends, yet it doesn't reduce Net Income anywhere in the core calc
    - Once item 27 exists, "Marketing" becomes a natural expense category — the same number should drive both CAC *and* the core P&L, rather than living in an isolated analytics silo disconnected from the actual profitability number the rest of the app centers on
    - Effort: ~2 hours once item 27 exists (mostly wiring, not new UI)

### 2026-10-24 — 29. Payment processing fees

29. **Payment processing fees** *(SHIPPED 2026-10-24: global "Processing fee (% of revenue)" input, 0-20%, counted as a variable cost on every offering via `feePct` in the calc engine; persisted in share links, localStorage and CSV. A flat per-transaction amount was not built.)*
    - A near-universal real cost for any business taking card payments (Stripe/Square-style ~2.9% + $0.30 per transaction) that isn't modeled anywhere today
    - As a category on item 27's expense table (percentage-of-revenue type rather than flat amount), or as a simple global "processing fee %" input applied to revenue — either would capture a cost every single template business (consulting, fitness, photography, etc.) actually pays
    - Effort: ~2-3 hours

### 2026-10-24 — 31. Loan / debt payments

31. **Loan / debt payments** *(SHIPPED 2026-10-24: covered by item 27. Enter a `Loan Payments` expense with a flat payment; no principal/interest tracking.)*
    - Principal + interest payments on business loans or equipment financing — common for businesses financing a buildout or gear, not represented today
    - Simplest version: a "Debt Service" expense category (item 27) with a flat monthly payment amount; a more complete version would track principal/interest split and remaining term for payoff projections, but that's a bigger feature than this app's current scope suggests is warranted yet
    - Effort: ~1-2 hours for the simple flat-payment version once item 27 exists

### 2026-10-24 — 12r, 12v, 12w. Insights follow-ups

- 12r: results re-run (debounced 300 ms) when inputs change after a first Calculate; new 'combined' lever applies one multiple to prices and volume (client counts in Current, target utilization in Forecast), ranked after cost reduction.
- 12v: four new wizard scenarios (part-time hire, price + volume, price + hire, move prices toward market average). Market scenario converts the display price (per month, visit or sale) back to priceMonthly; rows without a market average are left alone. Still open: a "what's new" tie-in.
- 12w: Mix Optimizer fixes one-time rows' mix share (they have no hours or demand cap, so it piled 99% into them); ranking table shows 'n/a' per hour for hour-free rows (`hourFree` on `OfferingMetric`) and sorts them last.
- Also added: an e2e guard for swallowed `updateOutputs` render errors (a top-level `let` read before initialization only surfaced as a console warning).

Dates are the documented ship date; where the roadmap gave only a month, that month is shown.

### 2026-10-24 — 12u. Share dialog warns that links are point-in-time snapshots

12u. **Warn that share links are point-in-time snapshots** *(new, 12o option c)*
   - One-line note in the Share dialog; old links stay frozen after edits
   - Effort: ~30 minutes

**Shipped 2026-10-24:** a note under the two links in the Share dialog (`shareScenario` in `miscService.ts`). Test `tests/e2e/share-dialog.spec.ts`.

### 2026-10-24 — 12t. Tax section and report say US rules apply in non-USD scenarios

12t. **Tax report shows US-tax figures in non-USD scenarios** *(new, left over from 12e)*
   - Label the report as US-tax-based or hide the tax section when the scenario currency is not USD
   - Effort: ~1 hour

**Shipped 2026-10-24 as a label, not a hide:** `taxBasisNote()` in `src/calculations/currency.ts` adds 'US tax rules applied to EUR amounts' to the on-screen Tax Estimates disclaimer and the financial report's tax section. Numbers are unchanged (take-home feeds the reverse calculator). Tests `currency.test.ts`, `tests/e2e/currency.spec.ts`.

### 2026-10-24 — 18. First-class per-session pricing type

18. **First-class per-session/one-off pricing type**
    - Every offering today is modeled as `Price/mo × 12 × clients` — a genuine fit for subscriptions, but every hourly/one-off service (recording session, studio rental, podcast time) had to be hand-converted into a fake "monthly-equivalent" price by guessing a visit frequency, mixing one real number (list price) and one guessed number (frequency) into a single field with no way to tell them apart later
    - A distinct "per-session" offering type — real per-session price + a separately-labeled visits/year assumption, shown as two clearly different kinds of input — would be both more accurate and more honest about which part of the model is fact vs. assumption
    - Status 2026-10-24: the per-offering `type` field shipped with `group` (see 24b); `per-session` is the missing value
    - Likely the single highest-value item on this list: it's the root cause behind items 12k and part of 12j (tedious workarounds exist *because* the data model doesn't fit this extremely common business shape)
    - Effort: ~4-6 hours (touches the core calc model, not just UI)

**Shipped 2026-10-24 as an entry lens:** a `per-session` offering type whose Price cell is per visit (`/session`), with Sessions / yr as the separate visits assumption. `priceMonthly` stays the one canonical price, so calc, what-ifs, exports and CSV are unchanged; changing visits keeps the per-visit price fixed. Helpers in `src/calculations/offeringPrice.ts`; tests `offeringPrice.test.ts`, `tests/e2e/per-session.spec.ts`. Reports and CSV show the monthly equivalent.

### 2026-10-24 — 19. One-time / bundled purchase line items

19. **One-time / bundled purchase line items**
    - Common small-business pattern with nowhere to go today: a one-time bundle/package purchase (e.g. a punch card, gift card, or registration fee) that's neither a monthly subscription nor a recurring per-session booking
    - A simple "one-time revenue" line-item type (name, price, estimated annual quantity sold, no session/capacity implications) would capture this without forcing it into the recurring-offering shape
    - Effort: ~2-3 hours

**Shipped 2026-10-24 as another type value:** `one-time` rows price per sale (`/sale`); the sanitizer pins Sessions / yr to 1 and Hours / session to 0, so a sale adds revenue and unit cost (Var $ / session) but no staff hours or capacity. Units sold per year is Clients (Current) or the Mix % share (Forecast). `priceMonthly` stays canonical (sale price / 12). Tests `oneTime.test.ts`, `tests/e2e/one-time.spec.ts`. Not done: a separate "one-time revenue" output line (units count as clients, so they dilute per-client metrics).

### 2026-10-24 — 23. Inline per-session to monthly-equivalent conversion helper (superseded by 18)

23. **Inline per-session → monthly-equivalent conversion helper**
    - Until item 18 (first-class per-session pricing) ships, users modeling hourly/one-off services have to do the `hourly rate × assumed hours × assumed frequency = Price/mo` math by hand outside the tool — did this manually ~9 times in one session (e.g. Podcast Studio $80/hr × 2hr × 1 visit/mo = $160/mo)
    - Even a small inline toggle next to Price/mo ("Enter as: monthly total | per-session × frequency", auto-computing one from the other) would remove that friction as a lightweight stopgap even before the full data-model change
    - Effort: ~2 hours

Superseded by item 18: the per-session type does this conversion in the Price cell.

### 2026-10-24 — Animated KPI Counters, AI Insights Engine & Reverse Calculator

4. **Animated KPI Counters, AI Insights Engine & Reverse Calculator (calc logic)** — KPI counter roll-up animation shipped and visible in the UI. The Insights Engine and Reverse Calculator are now wired into two Intermediate+ panels (2026-10-24). Both modules were stale against the real model (profitable offerings flagged loss-making, `~Infinity%` price rises, NaN what-ifs), so they were rebuilt on `calc()` first; see item 4b.

### 2026-10-24 — 4-6. AI Insights Engine, Reverse Calculator, Client Mix Optimizer

4. ✅ **AI-Powered Profitability Insights Engine** — rebuilt on `calc()` and wired into the "Insights & What-Ifs" panel (`src/insights/insightsEngine.ts`), see item 4b
5. ✅ **"What Would It Take?" Reverse Calculator** — solves each lever by re-running `calc()` and is wired into the "What Would It Take?" panel (`src/insights/reverseCalculator.ts`), see item 4b
6. ✅ **Client Mix Optimizer** — fully wired, panel live in the UI

### 2026-10-24 — 4b. Wire Up Insights Engine & Reverse Calculator UI

4b. ✅ **Wire Up Insights Engine & Reverse Calculator UI** *(SHIPPED 2026-10-24: two collapsible Intermediate+ panels behind `showInsights` / `showReverseCalculator`; tests `src/insights/*.test.ts`, `tests/e2e/insights-reverse.spec.ts`)*
   - The ROADMAP called this "purely UI wiring"; it was not. Both modules read fields that do not exist on the real state (`marginPct`, `fullTimeEmployees`), so every offering looked loss-making, add-employee showed NaN and the pricing lever returned `~Infinity%`. Rebuilt on the calc engine: insights use per-offering unit margin, what-if impacts re-run `calc()`, and the reverse calculator bisects each lever against `takeHome` (after estimated tax). Money uses the scenario currency
   - Not done: the reverse calculator does not auto-refresh when inputs change (press Calculate again); no lever combines pricing with volume

### 2026-10-24 — 12b. Remove the dead ?loadTestScenarios feature

12b. ✅ **Remove the dead `?loadTestScenarios` / `?testScenario=name` feature** *(SHIPPED 2026-10-24: deleted the stubs, `TEST_SCENARIOS` and the call sites; docs updated)* *(new — found during doc audit)*
   - `loadTestScenarios()` and `loadSpecificTestScenario()` in `assets/services/miscService.js` are empty no-op stubs; `TEST_SCENARIOS` in `assets/app.jsx` only has 2 entries (`basic`, `freelancer`), not the 9 previously documented
   - Either implement real named scenarios or delete the dead code path (it's called unconditionally on load per `assets/app.jsx`)
   - Effort: ~1-2 hours

### 2026-10-24 — 12e. Export functions ignore the selected currency

12e. ✅ **Fix: export functions ignore the user's selected currency** *(SHIPPED 2026-10-24; tests in `src/calculations/currency.test.ts` and `tests/e2e/currency.spec.ts`)*
   - The original diagnosis was wrong: `#currencySelect` was a dead control (no JS read it) and the app UI hardcoded USD too, so exports were not the only offender
   - Now `state.currency` (USD/EUR/GBP/CAD/AUD, per scenario, allowlisted in `sanitizeScenarioState`, persisted via localStorage and share URLs) drives one shared `fmtMoney0` in `src/calculations/currency.ts`; the 9 duplicate formatters (app, services, 4 exports) and the unused `src/localization/` were removed
   - Left out: tax report amounts are still US-tax figures shown in the scenario currency; `#decimalPrecisionSelect` is also dead (see 12q)

### 2026-10-24 — 12g. Removing the last offering reset the list to demo defaults

12g. **Fix: removing the last offering silently resets the whole list to generic demo defaults** *(SHIPPED 2026-10-24: Remove on the last offering now shows a toast and keeps it (calc and every persistence path need one offering, so a true empty state was out of scope); removals are undoable via pushHistory. Originally: found trialing a real business, see item 18 below; real data-loss risk)*
   - Removing every offering (down to zero) doesn't leave an empty state — it silently repopulates the 3 generic template offerings ("Weekly"/"Biweekly"/"Monthly", $200/$140/$100 etc.), with no confirmation and no way to tell it happened except noticing the numbers changed
   - Directly hit this while rebuilding an offerings list from scratch — spent a round-trip confused about why "Remove" appeared to not be working, before realizing it *had* worked and something else had repopulated defaults on top
   - A user who removes everything intending to start clean, gets interrupted, and comes back later could easily not notice their real data was replaced with demo placeholders
   - Fix: either leave a genuine empty state (with an "Add your first offering" prompt) or show a confirmation before the reset-to-demo-data path fires
   - Effort: ~1 hour

### 2026-10-24 — 12h. Customer Analytics LTV showed $0

12h. ✅ **Bug: Customer Analytics LTV shows $0 even with a fully populated revenue model** *(SHIPPED 2026-10-24: `calculateLTV` read `priceMonthly` from per-offering metrics that never carried it; offering metrics now expose `contributionPerClientMonthly` and LTV uses it; tests in `src/analytics/customer-analytics.test.ts`)* *(new — found trialing a real business)*
   - With Avg Customer Lifespan set to 24 months and a 12-offering scenario computing a real $1,026/client contribution margin, the Customer Analytics panel still showed `LTV: $0` (and consequently `LTV:CAC: 0.00:1`, flagged "Critical: business model is unsustainable")
   - CAC computed correctly from Marketing Budget ÷ New Customers ($1000/5 = $200), so the assumption inputs *are* wired up — LTV specifically looks disconnected from the actual per-client revenue/contribution-margin numbers the rest of the app already computes
   - Worth checking whether LTV is reading from real offering revenue at all, or stuck on a stale/zero source value
   - Effort: unknown until root-caused; likely small once found (~1-2 hours)

### 2026-10-24 — 12i. Sticky header KPI totals lagged the Outputs panel

12i. ✅ **Sticky header KPI totals lagged the Outputs panel after a batch of edits** *(SHIPPED 2026-10-24: real bug, not automation-only. `onTableInput` refreshed Outputs but not the header chips, so any typed edit left them stale until the next full render; `updateOutputs` now refreshes them; test `tests/e2e/header-sync.spec.ts`)* *(new — found trialing a real business; may be automation-specific, flag with lower confidence)*
   - After programmatically filling ~12 offerings' worth of fields in quick succession, the top sticky bar (Revenue/Net Income/Utilization) kept showing stale pre-edit numbers while the Outputs panel below had already recomputed correctly — required an unrelated UI interaction (closing an unrelated modal) before the header repainted
   - This was hit via browser automation (`form_input`-style programmatic value-setting) rather than a human clicking through the UI one field at a time, so it's possible this doesn't reproduce with normal typing — but worth a quick check on whether the header subscribes to the same state/store as Outputs, since a real desync there would also affect fast manual edits (e.g. CSV import, paste)
   - Effort: ~30-60 minutes to check, more if it's a real state-subscription bug

### 2026-10-24 — 12m. Duplicate scenario

12m. ✅ **No "Duplicate scenario" option** *(SHIPPED 2026-10-24: 📑 Duplicate button in the Scenarios list clones a scenario as "X copy" / "X copy 2"; tests `src/test/scenario-duplicate.test.ts`, `tests/e2e/scenario-save.spec.ts`)* *(new — found trialing a real business)*
   - The Scenarios modal has Save/Load/Delete/Compare but no clone — wanted this to keep one scenario as a "fill in as real data arrives" baseline and branch an illustrative/aspirational variant without re-entering all 12 offerings by hand
   - Effort: ~1 hour

### 2026-10-24 — 12n. Same-name save created a duplicate

12n. ✅ **Saving a scenario under an existing name silently creates a duplicate instead of overwriting** *(SHIPPED 2026-10-24: same name, ignoring case, now updates in place keeping id and createdAt; test `tests/e2e/scenario-save.spec.ts`)* *(new — found trialing a real business, hit immediately after 12m)*
   - Edited Presentation Notes on an already-saved scenario, then saved again under the exact same name expecting an update-in-place — instead got two entries with identical names in "Load Saved Scenarios" (only distinguishable by timestamp), and had to manually identify and delete the stale one
   - The "Confirm Save" dialog text ("Save current configuration as 'X'? This will save your current calculations and settings.") reads like it's describing an update, not a duplicate-creation — the actual behavior doesn't match that framing
   - Fix: detect an existing scenario with the same name and either overwrite it or explicitly ask "a scenario with this name already exists — overwrite or save as a new copy?"
   - Effort: ~1 hour

### 2026-10-24 — 12q. Dead #decimalPrecisionSelect control removed

12q. ✅ **`#decimalPrecisionSelect` in Settings does nothing** *(SHIPPED 2026-10-24: removed the dead control; money is shown in whole units)* *(new — found while fixing 12e; same dead-control pattern)*
   - No JS reads the select (`index.html` only), and every money value is formatted at 0 decimals regardless of the choice. Either wire it into `formatMoney0` (scenario-level or global setting) or remove the control
   - Effort: ~1 hour

### 2026-10-24 — 24d. Per-offering margin per staff hour, discount floor check, market position

24d. **Per-offering margin per staff hour + discount floor check** *(SHIPPED 2026-10-24. 2026-10-23: Outputs table ranks offerings by profit per staff hour with max-discount headroom and an OK / Thin (<15%) / Below cost flag; 2026-10-24: one per-offering "Best discount %" (deepest of member / prepaid) now feeds the floor flag and an "At best discount" per-hour column; revenue stays at list price. Also 2026-10-24: collapsed "Market position" table with optional market low / avg / high and a source note per offering, plus a green / yellow / red badge with a ▼ underpriced / ▲ overcharging arrow (red outside the range or below cost, yellow within 10% of an edge or thin floor); compares list price; persisted via share URL, localStorage and CSV cols 19-22)*
    - Rank offerings by contribution per delivered staff hour (price − variable cost, ÷ hours), and flag any offering whose best-case discounted price (member discount, prepaid-credit rate) falls below its per-hour delivery cost.
    - The 2026-10-23 pricing exercise did this by hand to test whether membership/punch-card discounts still clear coach and reader payouts.
    - Market position: optional per-offering market low / high / average (plus source and date). Show a green / yellow / red badge: green inside the range and clears the floor, yellow within ~10% of either edge or a thin floor margin, red outside the range or failing the floor. Pair the badge with a direction (▼ below market = underpriced, ▲ above = overcharging) since the fixes differ. The trial kept this table by hand and found services both at the low edge and well below market.
    - Effort: ~2-3 hours (+~1-2 hours for market position)

### 2026-10-23 — 12p. Shared-link Presentation Notes never reached the textarea

12p. ✅ **Fix: shared-link Presentation Notes never reach the notes textarea** *(found and fixed 2026-10-23; regression tests in `tests/e2e/notes.spec.ts`)*
   - `assets/app.jsx` populated `#scenarioNotes` from `state.notes` at module load, before the URL scenario (`loadScenarioFromURL()`) or the localStorage restore ran. So the textarea rendered empty for share links *and* after any page reload, and the next keystroke saved over the stored notes. Read-only display path verified working.
   - Fix: populate the textarea after URL/localStorage state is applied (e.g. inside `wire()`); add an e2e test that loads a `?scenario=` link with notes and asserts the textarea value
   - Effort: ~30 min

### 2026-10-23 — 21. Contractor / per-session labor costs (per-offering Labor % of price)

21. ✅ **Contractor / per-session labor costs** *(shipped 2026-10-23: per-offering "Labor % of price" column, added to Var $/session; no global default yet)*
    - Staffing today is Full-time/Part-time salaried only, but studios/gyms/coaching businesses commonly pay some instructors per-session or as contractors rather than salary — the real business used to validate this session doesn't even specify on its own public site which staff are salaried vs. contracted, suggesting this is a genuinely common ambiguity, not an edge case
    - A "cost per session" or "% of session revenue" labor field (global default, optionally overridable per offering) would let the model represent gig/contractor pay, which isn't representable at all today
    - 2026-10-23 trial confirmed the need: instructors are paid a % of the *advertised* price (business absorbs member discounts), so the % must apply to list price, not realized revenue. Workaround today is `price × %` typed into Var $/Session. Raise priority.
    - Effort: ~3-4 hours

### 2026-10-23 — 27. Structured Expense Line Items table

27. **Structured Expense Line Items table (the headline idea)** *(SHIPPED 2026-10-23: calc engine + Fixed Expenses table (weekly/monthly/annual, 12 categories), what-if scaling, CSV export/import round trip, report totals, cost-by-category breakdown in Outputs; free-form `monthlyCosts` kept as 'Other overhead'. One-time frequency stays with item 30)*
    - Mirror the Service Offerings pattern on the cost side: instead of one flat "Overhead (monthly)" field, a real table of expense line items — name, category, amount, frequency (monthly/annual/one-time) — the same way offerings already have a name, price, and frequency
    - Category tags (Rent/Lease, Utilities, Insurance, Software/Subscriptions, Marketing, Equipment, Loan Payments, Professional Services, Supplies/COGS, Payment Processing, Contractor/1099, Other) would let the Outputs panel break down costs the way it already breaks down revenue by offering
    - This single change would naturally subsume several smaller ideas below (28, 29, 30) rather than needing bespoke fields bolted on one at a time — a "Contractor/1099" category line covers fixed contractor pay (item 21's per-session % of list price is a per-offering variable cost and stays its own field), a "Marketing" category line covers item 28 below, "Payment Processing" covers item 29, and one-time-frequency line items cover item 30 — all as category tags on one unified list rather than several separate features
    - Frequency must include **weekly**: the 2026-10-23 trial business pays some contractors a set weekly amount, which today has to be forced into annual FT/PT pay (which also adds capacity hours) or monthly Overhead
    - Effort: ~6-8 hours (this is the core architectural change the other cost items below build on — worth sequencing first)

### 2026-07 (month documented) — Analytics & APK Release Pipeline Hardening

1. **Analytics & APK Release Pipeline Hardening** — GoatCounter privacy-respecting visit counter shipped for web + APK (no cookies, honors Do Not Track, local dev auto-skipped), but the initial runtime-only detection (`window.Capacitor.isNativePlatform()`) turned out unreliable — the APK reported zero traffic for a full day. Root-caused and fixed with a **build-time platform stamp** (`window.__PP_PLATFORM__`, rewritten `'web'`→`'apk'` by `build-apk.yml` after `cap sync`, with runtime Capacitor detection kept only as a fallback); confirmed working via GoatCounter's own device fingerprinting (System: Android, Sizes: Phones) after the fix. Same investigation surfaced and fixed two more release-pipeline bugs: `android/app/build.gradle`'s `versionCode`/`versionName` were hardcoded at `1`/`"1.0"` forever (silently blocking every Android update, and confusing Obtainium's update detection along with stale pre-beta-scheme release tags), and GitHub release notes were a static "Beta release" string instead of the actual commits shipped — both now automated in CI. `docs/privacy-policy.md` rewritten to disclose GoatCounter accurately (previously falsely claimed zero third-party integrations).

### 2026-07 (month documented) — Scroll Lock Reference-Counting Fix (3 leak sites)

2. **Scroll Lock Reference-Counting Fix (3 leak sites)** — A reference-counted scroll lock (used by every modal/drawer) could get permanently stranded by rapid double-triggered opens — unrecoverable on Android without a force-close, since the touchmove blocker never released. Found and fixed in three places: `ppOpenModal`/`ppCloseModal` (no idempotency guard), and independently in `showAnalyticsDashboard`/`openFeedbackModal` (both had a "remove existing modal" cleanup path that dropped the lock it held). Also deleted a dead, overridden duplicate `showAdvancedDashboard` method that was making the analytics code hard to reason about. Bundled with a dead logo-link fix (`href="/"` resolved to the wrong GitHub Pages root; now `href="."`). 5 new regression tests; each confirmed to fail without its corresponding fix before being merged.

### 2026-07 (month documented) — Client Mix Optimizer, Advanced Chart Types & KPI Visual Polish

3. **Client Mix Optimizer, Advanced Chart Types & KPI Visual Polish** — Grid-search + hill-climbing optimizer suggests the offering mix that maximizes profit or utilization, fully wired into a collapsible panel; new Advanced Charts panel (price × utilization sensitivity heat map, 5-axis balanced scorecard radar, client capacity funnel); subtle accent-gradient wash on KPI boxes/section headers with tightened line-height. 26 new tests (unit + e2e), all manually verified rendering in a headless browser.

### 2026-07 (month documented) — Lint Warning Cleanup (summary entry)

5. **Lint Warning Cleanup** — Eliminated all lint warnings (0 errors, 0 warnings): added ESLint override for test files; removed/renamed unused imports, dead-code vars, bare catch params across 17 source files; replaced debug `console.log` with `console.warn` or removed in production code.

### 2026-07 (month documented) — 0. Lint Warning Cleanup (backlog entry)

0. ✅ ~~Lint Warning Cleanup~~ — Eliminated all 90 source-file warnings (no-unused-vars, no-console) plus 50 test-file warnings via ESLint override. Zero warnings, zero errors.

### 2026-07 (month documented) — 7-8. Animated KPI Counters; Modern Visual Effects & Color Enhancement

7. ✅ **Animated KPI Counters & Remaining Micro-interactions**
8. ✅ **Modern Visual Effects & Color Enhancement** — gradient layers on KPI boxes/section headers, typography rhythm pass, all shipped

### 2026-07 (month documented) — 9. Advanced Chart Types

9. ✅ **Advanced Chart Types** — price × utilization heat map, balanced scorecard radar, client capacity funnel, fully wired

### 2026-04 to 2026-06 (months documented) — Earlier completions: tax report, caching, sharing, UI modernization, onboarding, visual indicators, growth modeling, localization

- Tax & Financial Report Generator — Print-ready HTML financial report accessible from Export drawer: business performance summary (KPI grid + annual/monthly table), quarterly income projections (Q1–Q4), tax liability breakdown (SE tax, federal, quarterly payment due dates), and loan-application business summary
- Performance Optimization & Caching — FIFO → LRU calc cache, max size 50→100
- Read-only Scenario Sharing — View-only share links, Presentation Notes embedded in URL
- UI Modernization — full Material dark/light theming, slim app-bar, hamburger drawer, all-modals theming
- Share/Copy UX Polish — click-to-copy on all shareable fields, compare/share/embed bug fixes
- Help & Onboarding Enhancements — contextual '?' KPI help, Quick Reference modal, guided tour fixes
- Data Visualization & Visual Indicators — SVG utilization ring, KPI status border tints, break-even progress bar
- Customer Acquisition & Growth Modeling — CAC, LTV, churn rate, growth projections
- Localization & Formatting Infrastructure — multi-currency, localized number formatting

### 2026-04 to 2026-06 (months documented) — 1-3. Read-only Scenario Sharing, Tax & Financial Report Generator, Performance Optimization & Caching

1. ✅ **Read-only Scenario Sharing & Collaborative Comments**
2. ✅ **Tax & Financial Report Generator**
3. ✅ **Performance Optimization & Caching**

### 2026-10-24 — 12c. E2E coverage for Mix Optimizer & Advanced Charts

12c. ✅ **E2E coverage for Mix Optimizer & Advanced Charts panels** *(SHIPPED 2026-10-24: `tests/e2e/advisor-panels.spec.ts`; also fixed an XSS, the Mix Optimizer results table put offering names into innerHTML unescaped, now escaped and covered by a hostile-name test)* *(new)*
   - Current coverage for both is unit-tests-only (compute logic) plus a handful of visual-polish assertions; no e2e test drives the actual panel toggle → run → results flow the way `mobile_layout.spec.js`/`ui-fixes.spec.js` do for other panels
   - Effort: ~1-2 hours

### 2026-10-24 — 12f. App version shown in Settings

12f. ✅ **Surface the app's own version in the UI** *(SHIPPED 2026-10-24: Settings footer shows "ProfitPath vX.Y.Z", injected from package.json via Vite `define` as `__APP_VERSION__`; test in `advisor-panels.spec.ts`)* *(new — motivated by this session's Obtainium/versionCode debugging)*
   - Nothing in the UI currently shows what version is running — not in Settings, not in the debug panel, nowhere (`grep` for version display in `assets/app.jsx`/`index.html` returns nothing)
   - Now that CI reliably stamps a real `versionCode`/`versionName` and generates real release notes from commits (see the Analytics & APK pipeline entry in [the shipped ledger](docs/ledger/ROADMAP_SHIPPED.md)), showing "vX.Y.Z" somewhere small (Settings footer or debug panel) would let users self-report their version when reporting bugs, and is a natural stepping stone toward an in-app "what's new" surface if release notes are ever curated for end users rather than just commit logs
   - Effort: ~30-60 minutes

### 2026-10-24 — 12. Guided "What If?" wizard

12. ✅ **Guided "What If?" Wizard** *(SHIPPED 2026-10-24: header and drawer "What if?" opens a modal with 5 scenarios (hire, price, clients, costs, take-home goal); each previews calc() before/after and Apply is undoable; `src/insights/whatIfWizard.ts`, tests `src/insights/whatIfWizard.test.ts`, `tests/e2e/whatif-wizard.spec.ts`. Also fixed the Insights "Add 1 employee" what-if, which patched legacy `employees` that calc() ignores when `fullTimeEmployees` is set, so it always showed +$0)*
    - Step-by-step flow walking users through 3-5 common scenarios ("what if I hired one more person?", "what if I raised prices 15%?") without requiring them to know which inputs to change
    - Natural delivery mechanism for the Reverse Calculator (live since 2026-10-24)
    - Effort: ~2-3 hours

### 2026-10-25 — 20. Multi-resource capacity pools

20. ✅ **Multi-resource capacity pools** *(SHIPPED 2026-10-25; staff-free toggle added later the same day: a resource flagged `staffFree` makes its tagged offerings draw no staff hours, persisted in state, share URL and CSV col 4 of RESOURCES; optional named resources (booth, room, bay) with hours/week and weeks/year; offerings tag one resource and use it on top of staff time; `calc()` caps forecast clients per pool and reports `poolUtilization` and `bottleneck`, and `capacityPct` is the busiest pool. Untagged scenarios are unchanged. Setup "Capacity resources" section is intermediate+; Outputs shows a bottleneck line. Persisted via share URL, localStorage and CSV (RESOURCES section, offering Resource column by name). `src/calculations/resources.ts`, tests `resources.test.ts`, `resources-persistence.test.ts`, `tests/e2e/resources.spec.ts`)*
    - The single "Service Hours" capacity pool assumes every offering competes for the same bottleneck resource — true for a solo consultant, false for any facility-based business with genuinely separate constraints (e.g. a recording booth, a rehearsal room, and staff time, which can all run in parallel)
    - Today the app could flag "over capacity" even when the actual constraining resource still has headroom, because everything funnels into one utilization number
    - A multi-pool model (or at minimum optional resource tagging per offering, with capacity computed per resource) would meaningfully improve accuracy for any facility/studio/gym-style business, not just this one
    - Effort: ~6-8 hours (meaningful capacity-model rework)
