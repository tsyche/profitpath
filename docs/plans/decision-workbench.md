# Decision workbench (ROADMAP items 36-39)

**TL;DR:** Turn scenario planning into a decision tool: build options as saved scenarios, compare them in one plain-language view under conservative assumptions, and share the whole set with one link. Most building blocks already exist; this plan connects them.

**Status:** Building — Phases 1–2 shipped; Phases 3–4 implemented and locally validated. Plan closeout approval and commit/push review are pending.
**Fold into:** [FEATURES.md](../../FEATURES.md) (scenario and comparison features) and the "Key Files Structure" notes in [AGENTS.md](../../AGENTS.md) and [CLAUDE.md](../../CLAUDE.md).

## Problem

Found in the 2026-10-26 TSS pricing trial: deciding between "today's prices", a moderate raise and a worst-case raise took a private worksheet, hand math and chat turns. ProfitPath held the inputs but couldn't carry the decision:

- Options can't travel. A share link carries only the on-screen state, unnamed (item 36).
- A price raise doesn't lose any sales unless the user cuts client counts by hand (item 37).
- Compare is two scenarios, totals only. It has no per-offering view, goal line, verdict, or "how much rests on guesses" (item 38).
- The discount floor uses a hand-typed `discountPct`. The worst case actually follows from the membership plans, and nothing checks that plans stay in their intended value order (item 39).

## What already exists (reuse, don't rebuild)

- Saved scenarios with Save/Load/Duplicate/Delete and two-way Compare (`scenarioService.ts`, `ScenarioComparison.ts`).
- v2 compressed share links (`encodeScenarioToURL`, `sanitizeScenarioState`).
- Conservative / base / optimistic lens (`rangeCase.ts`): every output already follows the active case.
- Confidence tags per offering: verified / estimated / guess (`offeringMeta.ts`).
- Margin per staff hour, floor check and market badge (`offeringRanking.ts`, `marketPosition.ts`).
- Reverse calculator, what-if wizard (incl. price + volume), membership what-if.

## Phases

| Phase | Item | Gives the user | Gate |
|---|---|---|---|
| 1 | 36 Share saved scenarios / bundle link | Send "Today, Option A, Option B" as one link; recipient imports all three | Round-trip unit test + e2e import |
| 2 | 37 Sales lost after a price change | A raise loses an assumed share of sales; the conservative case uses the larger loss | Unit tests on the volume math in both modes |
| 3 | 38 Decision view | 2-4 scenarios side by side, per offering, with deltas, goal line, a break-even sales loss and a one-line verdict, under the active case | e2e on a 3-scenario bundle |
| 4 | 39 Membership-derived floor + value ladder | Worst-case member price per offering computed from the plans; a warning when a cheaper product beats a pricier one | Unit tests against the TSS numbers |

Each phase ships on its own. Phase 1 unblocks the TSS owner review today; 3 depends on 2 for the break-even sales-loss column.

## Progress

- **Phase 1 / item 36:** shipped 2026-10-27. Selected saved scenarios can be sent and imported as a client-side compressed bundle.
- **Phase 2 / item 37:** shipped 2026-10-27. Each offering has low, base, and high sales-loss assumptions after a price change. The calculator applies loss to demand, revenue, costs, and utilization in Forecast and Current modes; the existing Conservative and Optimistic cases select the higher and lower assumptions.
- **Phase 3 / item 38:** implemented 2026-10-29. Scenarios in both layouts and the workspace Compare view open one shared two-to-four-option workbench. Baseline/case/annual-income goal stay outside financial state. Offering rows match stable IDs or unique names/types, with missing and ambiguous services kept explicit. CSV, print/PDF and decision bundle links retain the reviewed conclusion; shared decisions remain in memory without changing the recipient's draft/library. Mixed currency/mode options are rejected.
- **Phase 4 / item 39:** implemented 2026-10-29. Single-service full-redemption and cash-limit stress prices derive from membership plans, feed the existing floor flag alongside the manual discount, and leave modeled revenue unchanged. Profile-specific value-order checks flag lower-fee plans that cost no more than higher-fee ones. Tests use the existing hand-computed synthetic studio fixture; private TSS figures are not committed.

## Implementation acceptance — 2026-10-29

- Pure calculations cover selected-case totals, goals, confidence exposure, reordered/new/ambiguous offerings, sales-loss thresholds in both modes, and conservative bounds for cohort costs/negative-contribution services. Thresholds replace total loss only on raised services; other services retain their assumptions. Keeping original Current-mode group run costs and ignoring gains from losing negative-contribution sales provides a safe interval even when actual profit has cohort steps.
- Membership tests cover credits at list versus opt-in stacking, included visits, eligibility, cash discounts, free benefits, one-time pricing, and same-profile plan comparisons.
- Focused Chromium/Firefox journeys pass in both layouts at desktop and 375px, including three-scenario bundle import, two/four options, CSV/print content, recipient reloads, hostile names and live membership floor updates. Visual review exposed the global offering-card styles hiding scenario headers; the new visible/aligned-header regression failed before reusing the existing flat-table styles.
- The shared bundle decoder now supplies a bounded output buffer before decompression. The allocation regression failed before the fix and passes after it.
- Final local verification: **832 unit tests pass** with one existing skip across 75 files. The **610-case release suite passes 606**, with four existing Firefox skips; all 82 workspace cases and 14 decision cases pass. **Four production zoom/PDF cases and four offline cases pass**, including the decision view. No retries were used. Lint, strict typecheck and production build pass. The decision report renders as a readable six-page landscape PDF with the selected case, goal, options and notes.
- Durable behavior is folded into FEATURES and the architecture notes. Finalization/archival approval is pending, followed by commit/push review. The product-flow redesign's human/device gates remain separately owned by [ROADMAP item 25](../../ROADMAP.md); both layouts and the existing default remain available.

## Design notes

- **Client-side only.** Bundles are point-in-time snapshots, the same as share links (12o). Live team sharing stays in item 14.
- **No backend dependency.** Phase 1 shares the selected scenarios inside one compressed link. Server-hosted short links remain deferred in [ROADMAP.md item 12o](../../ROADMAP.md).
- **Untrusted input.** Every imported state runs through `sanitizeScenarioState`, names are escaped and deduped, and payload size stays capped.
- **Plain language first.** The verdict leads ("B earns $X more a month and still beats today if raised services lose 15% of sales"); tables back it up.
- **Assumptions stay visible.** The decision view shows the share of revenue that rests on `guess`-tagged rows, so a confident-looking total built on guesses is obvious.

## Rollback

Each phase is additive UI and pure calculation. Revert the commit, and old scenarios and links keep working, because the bundle is a new payload shape beside the existing one.

## Alternatives considered

- **Server-side scenario storage:** could shorten links and make them live, but needs backend infrastructure and hosting decisions (ROADMAP item 12o). Outside this plan.
- **Rework Forecast mode into the workbench:** both modes answer different questions (capacity ceiling vs current customers). The workbench sits on top of both instead.
