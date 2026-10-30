# Seasonal & Market Adjustments (ROADMAP item 11)

**TL;DR:** Build seasonality as a display-only monthly lens over `calc()`, like the membership panel, not as a change to `calc()`. A 12-month demand profile that averages 100% leaves annual figures untouched but shows peak-month capacity, monthly cash flow and the low-cash month. Geographic pricing is split out into item 10, because it is a data-sourcing problem.

**Status:** Draft
**Fold into:** [FEATURES.md](../../FEATURES.md)

## Contents

- [Problem](#problem)
- [Decision](#decision)
- [Model](#model)
- [Interactions](#interactions)
- [Persistence and compatibility](#persistence-and-compatibility)
- [Geographic pricing](#geographic-pricing)
- [Tests](#tests)
- [Slices](#slices)
- [Open questions](#open-questions)

## Problem

`calc()` is an annual steady-state model: revenue is `clients × priceMonthly × 12`, fixed costs are `monthlyCosts × 12 + expenses`, and capacity is `employees × 2080 × utilization`. A seasonal business (landscaping, photography, cleaning around holidays) makes the same annual money but not the same monthly money.

What a flat annual model hides:

- **Peak-month overload:** annual utilization can look fine at 70% while June runs at 115%.
- **Cash trough:** fixed costs and payroll are flat while revenue is not, so a profitable year can still go negative in January.
- **Resource pinch:** a booth, room or truck pool can be the monthly bottleneck even when annual use is low.

An annual total does not change when demand moves between months, so this is not an input to profit. It is a timing view.

## Decision

- **Display-only lens.** It reads the finished `calc()` result and a profile. It never feeds `calc()`, so no golden calculation changes and no cache-key change (see the cache key gotcha in the capacity-pools notes).
- **Profile is a scenario input, not a case.** It is saved and shared with the scenario. It is independent of the Conservative/Base/Optimistic lens, which keeps working unchanged.
- **Profile must average 100%.** Normalize on entry so the monthly sum equals the annual figure exactly. This is the invariant the tests pin.
- **Not built:** a seasonal revenue multiplier inside `calc()`. It would silently change annual profit, break shared links, and double count with Ranges.

## Model

New module `src/calculations/seasonality.ts`:

- `sanitizeSeasonality(raw)` returns 12 finite weights clamped to 0–300, or `undefined` when absent. Untrusted input, same posture as `sanitizeRangeBound`.
- `normalizeSeasonality(weights)` scales to a mean of 100.
- `monthlyView(state, metrics, profile)` returns, per month:
  - revenue (annual revenue × weight / 1200) and variable cost (scales with delivery, so it follows the same weight)
  - fixed cost share (flat, annual / 12)
  - net and running cash balance
  - staff utilization, and per-pool utilization from `poolUtilization`
- Summary: peak utilization month, lowest running balance, months over 100% capacity, and the opening cash needed to never go negative.
- Presets: Flat, Summer peak, Winter peak, Holiday, Weekdays-only school year. Presets are editable starting points, never claimed as industry data.

Current vs Forecast mode both work, because the lens scales whatever annual clients and revenue `calc()` returned.

## Interactions

- **Range case:** the lens consumes `calc()` output, which already applies the active case, so it follows the case with no wiring.
- **One-time and group offerings:** revenue and run cost scale with the same weights. Group `costPerRun` follows cohorts, so it scales with demand rather than staying flat.
- **Loans and one-time expenses:** loan payments and amortized expenses stay flat across months.
- **Membership panel:** unaffected. Memberships are recurring and the lens treats them as a separate, flat line until a real need appears.
- **Workspaces layout:** a Results tool under the existing question-led tools, gated like Ranges (specialist tool, reachable at every level). Classic gets the same panel via `AnalysisPanels`.

## Persistence and compatibility

- Optional `seasonality?: number[]` on `CalcState`, marked app-only (ignored by `calc()`), like `membershipPlans`.
- Share URL: carried in the scenario payload. Old links have no field and open flat. New links opened by an old build ignore the unknown field, so there is no break in either direction.
- CSV/Excel: one appended row of 12 values with a header, round trip sanitized. Existing columns are not reordered.
- PDF/HTML/email: add the monthly table and the summary when a non-flat profile is set. Flat profiles add nothing.

## Geographic pricing

Recommend dropping this from item 11:

- It needs trusted regional data, and that is exactly what item 10 is blocked on.
- The user-controllable part already exists: the optional per-offering market low/avg/high and its price badge.
- A user who sells in two regions can model them as two scenarios and compare them.

Action: move "geographic pricing variations by region" into item 10 and rename item 11 to Seasonality.

## Tests

Following the trophy: unit for pure logic, integration with real `calc()`, one E2E journey.

- **Unit (`seasonality.test.ts`):** sanitizer rejects NaN, negatives, wrong length and huge values; normalization yields a mean of exactly 100; flat profile gives identical months; monthly sums equal annual revenue, variable cost and net within rounding.
- **Property/fuzz:** extend `fuzz.test.ts` so random profiles always keep the sum invariant and never produce NaN.
- **Integration:** run the real `calc()` on the Fitness and hybrid fixtures plus a group, a one-time and a resource-pool case; assert peak month, trough month and that `calc()` output is byte-identical with and without a profile (the no-change guarantee).
- **Persistence:** scenario save/load, share URL round trip, old link without the field, CSV round trip.
- **E2E (Chromium + Firefox):** pick a preset, see the peak and trough, save, reload, share, and open the link as a recipient; axe scan on the panel; 375px width.

## Slices

1. Module, sanitizer, normalization, monthly view and unit/fuzz tests. No UI. Gate: golden calculations unchanged.
2. Panel in both layouts with presets and a chart (extend `visualizationService`), plus persistence and share URL.
3. CSV/Excel/PDF/HTML export rows.
4. Optional later: per-pool monthly bottleneck chart, only if real use asks for it.

## Open questions

- **Cash start:** is a user-entered opening balance needed, or is "opening cash needed" as an output enough? Leaning output-only.
- **Granularity:** monthly only, or quarterly as a simpler input that expands to months? Leaning monthly entry with a quarterly preset.
- **Variable cost scaling:** the lens scales all variable costs with demand. Some, such as fixed per-run costs on a booked schedule, may not. Check against the group-run formulas before slice 1.
