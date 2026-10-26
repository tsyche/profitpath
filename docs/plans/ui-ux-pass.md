# UI/UX pass (ROADMAP items 25 and 26)

**TL;DR:** Audit first, then fix layout and mobile in small gated phases. Ship the sticky mini-summary (26) early, narrow the tabs item (25) to the analysis half of Outputs, and shorten the Setup column with collapsible groups. Onboarding is out of scope.

**Status:** Draft
**Fold into:** [experience-levels.md](../experience-levels.md) (gating and section locations) and the "Key Files Structure" / UI notes in [AGENTS.md](../../AGENTS.md) and [CLAUDE.md](../../CLAUDE.md).

## Problem

- Setup grew past the original design: Fixed Expenses, Capacity resources, Ranges, Market and the What-If wizard all landed after items 25/26 were written.
- Gating (`advanced-feature` / `expert-feature`) was added section by section, never reviewed as a whole.
- Outputs stacks core KPIs plus six advanced-gated analysis panels and two expert-gated panels in one long column.
- Item 25 assumed a single vertical stack. On wide screens Setup (`#controls`) and Outputs already sit side by side, so the edit-and-see loop is adjacent there. The real pain is the long right column, the long left column, and mobile.

## Scope

- **In:** Setup and Outputs layout, level gating review, mobile (≤768px, bottom-nav fit), analysis panels.
- **Out:** onboarding / first-run flow (separate plan), new features, visual rebrand, `app.jsx` split (done; see [typescript-migration.md](archive/typescript-migration.md)).

## Phases

### Phase 0: Evidence (no code changes)

- `/audit-ux-e2e` against the dev server (port 3120): default template, a 12-offering scenario, 375px mobile, beginner and advanced levels.
- `/audit-usability`: Nielsen heuristics sweep plus a cognitive walkthrough of "first scenario from a template".
- Skip `/audit-tests`; unrelated to UI/UX, run separately.
- **Gate:** ranked findings list (severity, affects beginner path y/n, suspected code location) saved under `docs/ledger/`.

### Phase 1: IA decision

- Map every Setup and Outputs section to a final location, default open/closed state, and gating level.
- Working proposal: keep Setup + core KPIs (cards, break-even, tax) always visible; tabs only for **Analyze** (sensitivity, mix optimizer, insights, reverse calculator, advanced charts) and **Customers**; perf/debug stay a small expert toggle.
- **Gate:** one-page map approved by Tim. No code before this.

### Phase 2: Sticky mini-summary (item 26)

- Revenue, Net Income, Utilization strip, persistently visible while scrolling Setup, desktop and mobile.
- Independent of the Phase 1 outcome, so it can ship first.
- Must not collide with the mobile bottom-nav or the top bar.
- **Gate:** unit + lint + typecheck ≤ baseline + e2e (strip values match Outputs after an edit, hand-computed).

### Phase 3: Analysis tabs (item 25, narrowed)

- Implement the Phase 1 map for the Outputs analysis half.
- Keep `advanced-feature` / `expert-feature` gating: hidden tabs for lower levels, no empty tab bar.
- Keyboard and screen-reader behavior: proper `tablist` roles, arrow-key navigation, focus management (extends `accessibility.js`).
- Persist the selected tab in `localStorage`, with a safe fallback.
- **Gate:** existing e2e updated, new e2e per tab and per level, axe clean.

### Phase 4: Setup length and mobile

- Collapsible Setup groups with persisted open/closed state; sensible defaults per level.
- Fix Phase 0 findings (mobile layout, touch targets, bottom-nav clearance).
- **Gate:** e2e at 375px and desktop, chromium + firefox.

### Phase 5: Finalize

- `/consolidate-docs finalize`: fold into official docs, move items 25/26 to `docs/ledger/ROADMAP_SHIPPED.md`, archive this plan.

## Every-phase gate

- `npm run test:run`, `npm run lint`, `npm run typecheck` (0 errors), Playwright on chromium + firefox.
- New code is `.ts`; top-level `let` read by `render()` is declared before `render()`.
- Update ROADMAP right after each phase ships.

## Risks

- **e2e churn:** tabs move elements; many specs assume everything is on one page. Mitigate by keeping element IDs stable and moving, not renaming.
- **Hidden-by-default content:** collapsing sections can hide validation errors. Auto-expand a group when it contains an error.
- **Mobile sticky overlap:** verify against the bottom-nav at 375px before merging.

## Decisions log

| Date | Decision |
|---|---|
| 2026-10-25 | Scope = layout + mobile only; onboarding excluded |
| 2026-10-25 | Run both `/audit-ux-e2e` and `/audit-usability` in Phase 0 |
| 2026-10-25 | Item 25 narrowed to analysis tabs; Setup/KPIs stay always visible |
