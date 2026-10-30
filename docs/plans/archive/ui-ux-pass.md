# UI/UX pass (ROADMAP items 25 and 26)

**TL;DR:** Phase 0 evidence is complete. This proposed IA map keeps the edit-and-see loop visible, groups Setup by decision, and moves advanced Outputs into Analyze and Customers tabs. Tim must approve the map before implementation.

**Status:** Shipped
**Fold into:** [experience-levels.md](../../experience-levels.md) (gating and section locations) and the "Key Files Structure" / UI notes in [AGENTS.md](../../../AGENTS.md) and [CLAUDE.md](../../../CLAUDE.md).

**Archived:** 2026-10-27, folded into `docs/experience-levels.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/ledger/ROADMAP_SHIPPED.md`.

## Problem

- Setup grew past the original design: Fixed Expenses, Capacity resources, Ranges, Market and the What-If wizard all landed after items 25/26 were written.
- Gating (`advanced-feature` / `expert-feature`) was added section by section, never reviewed as a whole.
- Outputs stacks core KPIs plus six advanced-gated analysis panels and two expert-gated panels in one long column.
- Item 25 assumed a single vertical stack. On wide screens Setup (`#controls`) and Outputs already sit side by side, so the edit-and-see loop is adjacent there. The real pain is the long right column, the long left column, and mobile.

## Scope

- **In:** Setup and Outputs layout, level gating review, mobile (≤768px, bottom-nav fit), analysis panels.
- **Out:** onboarding / first-run flow (separate plan), new features, visual rebrand, `app.jsx` split (done; see [typescript-migration.md](typescript-migration.md)).

## Phases

### Phase 0: Evidence (no code changes)

- ✅ [Live audit evidence](../../ledger/UI_UX_PHASE0_LIVE_EVIDENCE.md): dev server, template loading, 12-offering scenario, 375px mobile, Beginner and Advanced levels.
- ✅ [Heuristic audit](../../usability-audit-heuristics-profitpath.md): Nielsen sweep plus a cognitive walkthrough of "first scenario from a template".
- 2026-10-26: light-theme `color-contrast` is skipped in `tests/e2e/a11y.spec.ts` (palette misses AA); tracked as ROADMAP 34; drop the skip when it lands.
- Skip `/audit-tests`; unrelated to UI/UX, run separately.
- **Gate:** ranked findings list (severity, affects beginner path y/n, suspected code location) saved under `docs/ledger/`.

### Phase 1: IA decision

- Proposed map follows. Existing `advanced-feature` / `expert-feature` gates remain the source of truth; this changes location and disclosure, not entitlement.
- ✅ **Gate:** one-page map approved by Tim on 2026-10-27.

#### Proposed IA map

| Area | Contents | Default | Level |
|---|---|---|---|
| Setup: Business basics | Mode, mix lock, staffing, pay, productive/target utilization | Open | All |
| Setup: Offerings | Service Offerings table and add/duplicate actions | Open | All |
| Setup: Costs | Other overhead, payment processing, Fixed Expenses | Open | All |
| Setup: Scenario notes | Presentation Notes | Closed | All |
| Setup: Capacity & assumptions | Resources, Ranges & confidence, Group runs, Market position | Closed; auto-open on validation error | Existing advanced gates |
| Outputs: Overview | Capacity, KPI cards, cost/range/ranking breakdowns, break-even, tax, simple visualizations | Always visible | All |
| Outputs: Analyze tab | Advisor, Sensitivity, Mix Optimizer, Insights & What-Ifs, What Would It Take?, Advanced Charts | Hidden unless at least one child is allowed; selected tab persists | Existing advanced/expert gates |
| Outputs: Customers tab | Membership What-If and Customer Analytics | Hidden unless at least one child is allowed; selected tab persists | Existing advanced gates |
| Outputs: Diagnostics disclosure | Performance and Debug | Closed; outside tab bar | Existing expert gates |

**Interaction rules**

- No tab bar for Beginner when both tabs are unavailable.
- `Overview` is the safe fallback whenever a saved tab is unavailable at the current level.
- Tabs use one `tablist`, arrow-key navigation, and focus the active panel; panel headings remain in the document outline.
- Setup uses one shared collapsible primitive. Groups with an invalid field auto-open; persisted state is per group, not per scenario.
- The Phase 2 mini-summary shows Revenue, Net Income, and Utilization while Setup scrolls; it links focus to Overview rather than duplicating calculations.

### Phase 2: Sticky mini-summary (item 26)

- ✅ Revenue, Net Income, Utilization strip remains visible while scrolling Setup on desktop and mobile.
- ✅ It stays below the fixed top bar; `#controls` permits its sticky child to escape the inherited card clipping.
- ✅ Gate: lint, typecheck, build, and targeted Chromium + Firefox E2E passed on 2026-10-27.

### Phase 3: Analysis tabs (item 25, narrowed)

- ✅ Implemented the Phase 1 Outputs map: Analyze and Customers hold the existing advanced panels; Overview remains the default.
- ✅ Existing gates remain authoritative: Beginner sees no tab bar, and unavailable saved tabs fall back to Overview.
- ✅ Tabs use `tablist` / `tab` / `tabpanel`, arrow-key focus movement, and panel focus on activation.
- ✅ The selected tab persists in `localStorage`.
- ✅ Gate: focused Chromium + Firefox E2E, complete axe suite, lint, typecheck, and build passed on 2026-10-27.

### Phase 4: Setup length and mobile

- ✅ Native Setup groups persist their open/closed state: Business basics, Offerings, and Costs start open; Notes and assumptions start closed.
- ✅ An invalid field automatically opens its owning group.
- ✅ Mobile group summaries meet the 44px touch target; existing bottom-nav clearance remains covered.
- ✅ Gate: focused 375px and desktop Chromium + Firefox E2E passed on 2026-10-27.

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
| 2026-10-27 | Phase 0 complete; IA map approved: Setup groups plus Overview / Analyze / Customers / Diagnostics |
| 2026-10-27 | Phase 2 complete: sticky Setup mini-summary with cross-browser E2E coverage |
| 2026-10-27 | Phase 3 complete: gated Analyze / Customers tabs with keyboard and persistence coverage |
| 2026-10-27 | Phase 4 complete: persisted Setup groups, invalid-field expansion, and mobile touch/clearance coverage |
