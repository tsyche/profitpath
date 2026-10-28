# Decision workbench (ROADMAP items 36-39)

**TL;DR:** Turn scenario planning into a decision tool: build options as saved scenarios, compare them in one plain-language view under conservative assumptions, and share the whole set with one link. Most building blocks already exist; this plan connects them.

**Status:** Building
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
