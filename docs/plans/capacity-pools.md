# Multi-resource capacity pools (ROADMAP item 20)

**TL;DR:** Let a scenario define optional named resources (booth, room, bay) with annual hours, and tag offerings to one. Each pool gets its own utilization; the busiest pool is the bottleneck and drives `capacityPct`, so untagged scenarios and every existing consumer behave exactly as today.

**Status:** Draft
**Fold into:** [AGENTS.md](../../AGENTS.md) "Core Modules" (calculation engine) and `docs/experience-levels.md`.

## Problem

- Capacity is one pool: staff paid hours × productive % × target %.
- A studio or gym has parallel constraints (booth, room, staff). Today everything funnels into one number, so the app can flag "over capacity" while the real bottleneck has headroom, or miss a room that is full while staff is idle.

## Design

- **Resources:** optional global `resources[]`, each `{ name, hoursPerWeek, weeksPerYear }` (annual hours = product). Fixed-length-capped array with a sanitizer, like `expenses`.
- **Tag:** optional `resource` (resource name or id) per offering. A tagged offering consumes pool hours equal to its group-adjusted `sessions × hoursPerSession`, in addition to staff hours. Staff stays the implicit default pool.
- **Pool target:** resource capacity is multiplied by `targetUtilizationPct`, same as staff.
- **Forecast:** `clients = floor(min over pools of poolTargetHours / mix-weighted pool hours per client)`. Pools with no tagged hours are skipped.
- **Current:** per-pool utilization = tagged hours / pool annual hours.
- **Outputs:** `capacityPct` = max across pools (all existing readers keep working). Add `poolUtilization[{name, pct}]` and `bottleneck{name, pct}`.
- **Gating:** the resource table appears at intermediate level and up. Beginners never see it.
- **Backward compat:** no `resources` means one staff pool and results identical to today.

## Out of scope (log as follow-ups)

- Ranking by margin per resource hour.
- Resource-aware Mix Optimizer.
- Wizard scenario "add a second room".
- Per-resource cost (rent already lives in Fixed Expenses).

## Touch list

- `src/calculations/resources.ts` (new): type, sanitizer, pool math.
- `src/calculations/index.ts`: forecast and current modes, output fields, cache key.
- `src/types.ts`: `Resource`, `AppOffering.resource`, output fields.
- Per-offering field checklist: `sanitizeScenarioState` allowlist, both CSV export paths and headers, CSV import, `AppOffering` types (Omit list and optional block), both output paths in `app.jsx`.
- Global field checklist: `types.ts`, calc cache key, `sanitizeScenarioState`, CSV settings export and `SETTINGS_KEYS` import, `app.jsx` (default, read, write, reset, CSV apply, template load), `index.html`, fuzz allowed-key set.
- UI: resource table in Setup, resource dropdown per offering row, bottleneck line beside utilization.

## Phases

1. **Calc layer:** `resources.ts`, `calc()` integration, unit tests, fuzz. Gate: untagged output identical to today on all six templates.
2. **Persistence:** share URL, localStorage, CSV, sanitizers.
3. **UI:** table, dropdown, bottleneck line, e2e. Gate: lint, typecheck at baseline, full unit and Playwright.
4. **Docs:** AGENTS.md/CLAUDE.md counts and module list, ROADMAP shipped entry, archive this plan.

## Tests

- Two-pool case where the booth caps forecast clients below the staff cap.
- Untagged regression across the six templates.
- Group offering consumes pool hours by cohort, not enrollment.
- Zero, negative and missing resource hours; unknown resource tag on an offering (falls back to untagged).
- Fuzz: resources array with junk entries.
- E2E: add a resource, tag an offering, bottleneck line shows and names the pool.

## Decisions

- A tagged offering also consumes staff hours (an engineer runs the booth). A per-offering "staff-free" toggle can come later if self-serve rooms matter.
- The tag is a stable resource id, so a rename cannot orphan it. CSV shows the resource name and resolves it back to the id on import.

## Rollback

All additive and optional. Remove the `resources` field and tag; no migration of stored scenarios is needed.
