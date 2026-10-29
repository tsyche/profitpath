# UI/UX Phase 0 live evidence

**TL;DR:** The reproducible 2026-10-28 baseline below supersedes the earlier record for the product-flow redesign. It confirms long mobile task paths, repeating onboarding, and invalid-price coercion; sampled horizontal overflow and the historical 19-control count were not reproduced.

**Date:** 2026-10-27  
**Scope:** `localhost:3120`; isolated agent-Chrome; desktop 1440×900 and mobile 375×812; Fitness template; 12-offering sample; Beginner and Advanced levels.

## Result

Live interactions worked: template loading, notes entry, 12 offering rows, and experience-level changes. The browser reported no exceptions, failed requests, 5xx responses, or console warnings during the walkthrough.

## Ranked findings

1. **M1 — Mobile horizontal overflow**
   - **Surface:** 375px, Setup card.
   - **Observed:** The browser found `.card` at 394px and `.card-b` at 384px in a 375px viewport.
   - **Impact:** The first-screen layout exceeds the viewport before a user reaches the already-long inputs and outputs.
   - **Suspected location:** `assets/styles.css` mobile card sizing.
   - **Smallest possible patch:** Constrain mobile card width with `max-width: 100%` and remove horizontal padding from the width calculation.

2. **M2 — First-run modal can interrupt a completed action**
   - **Surface:** desktop and mobile after loading a template.
   - **Observed:** The welcome dialog appeared over the app after the “Fitness Services template loaded successfully” toast, blocking the newly loaded scenario.
   - **Impact:** A new user who chooses a template is interrupted before they can inspect its result.
   - **Suspected location:** `assets/components/Onboarding.ts`.
   - **Smallest possible patch:** Show the welcome dialog before template interaction, or defer it until a non-blocking entry point.

3. **M3 — Advanced mode exposes 19 gated elements in one scroll**
   - **Surface:** Advanced, 375px and desktop.
   - **Observed:** Switching to Advanced made 19 `.advanced-feature`/`.expert-feature` elements visible without an analysis-level navigation model.
   - **Impact:** The higher-value analysis tools remain buried in the single Outputs flow.
   - **Suspected location:** `assets/components/AnalysisPanels.ts`, `assets/components/SettingsPanel.ts`, `assets/styles.css`.
   - **Smallest possible patch:** Implement the approved Phase 1 analysis grouping map before exposing the panels as one continuous stack.

4. **M4 — Dense offering scenarios amplify the Setup search cost**
   - **Surface:** Fitness template expanded from 3 to 12 offerings.
   - **Observed:** The scenario rendered and recalculated, but the data-entry table consumed the Setup stream while expenses, resources, ranges, and market controls remain elsewhere in that same column.
   - **Impact:** A real multi-service business must scroll past a dense editable table to find adjacent configuration.
   - **Suspected location:** `assets/components/OfferingsTable.ts`, `assets/styles.css`.
   - **Smallest possible patch:** Phase 1 must assign the offerings table and supplemental Setup sections to persisted collapsible groups.

5. **L1 — Template feedback is clear**
   - **Surface:** Template selection.
   - **Observed:** The template modal names the consequence (“This replaces your current inputs”) and a success toast confirms the loaded industry.
   - **Evidence:** Live Fitness template load.
   - **Keep:** Preserve this feedback pattern when moving controls in later phases.

## Phase 1 implication

The IA map must solve M1 before visual polish: mobile width constraints, Setup group boundaries, and Advanced analysis destinations are the first decisions. Do not start code until that map is approved.

## Finding review

Fresh review: 5 drafted, 5 kept, 0 generic, 0 duplicate. M1 is measured mobile breakage; M2 is a concrete interruption; M3 and M4 are separate Outputs and Setup IA problems; L1 preserves a validated feedback pattern.

## Product-flow baseline — 2026-10-28

### Build, fixtures, and reproduction

- Application: `343b465`, `0.8.58-beta`. Production application code was unchanged during capture.
- Runner: disposable `mcr.microsoft.com/playwright:v1.59.1-noble`, Chromium and Firefox; light default theme; 1440×900 and 375×812. This is local browser automation, not a physical-device or participant study.
- Harness: [baseline.spec.ts](../../tests/design/baseline.spec.ts), isolated from release E2E by [its config](../../tests/design/playwright.config.ts). Reproduce from the repo root with `just test-e2e-container --config tests/design/playwright.config.ts baseline.spec.ts`. No real user storage or business data is used.
- Fixtures: [fixtures.ts](../../assets/prototypes/fixtures.ts). Beginner loads the actual Fitness template; Advanced loads a synthetic 12-offering hybrid studio. The latter includes all four offering types, group run costs, contractor labor, sales loss, confidence/bounds, staff-free and staffed resources, overhead/processing fees, a purchase, and an amortizing loan.
- [Manifest and SHA-256 hashes](product-flow-baseline/2026-10-28/manifest.json), JSON state/results, and screenshots are retained beside this ledger. Six [golden results](product-flow-baseline/2026-10-28/golden.json) cover both modes and all three cases. [Compatibility tests](../../src/test/product-flow-golden.test.ts) pin these numbers without regenerating them.

Each baseline starts a fresh browser context, seeds only the synthetic fixture, sets the **actual** `profitpath-onboarding-completed` key, loads `/`, waits for the offering count and calculated summary, and records layout/state/results. It captures the first screen, offering editor, and Results before clearing a price. A separate fresh-context journey uses the real welcome/industry/explore controls and reloads.

### Measured layout

Coordinates below are rounded initial-layout CSS Y positions, not measured walking or scrolling times. The body is the scrolling container; its height is recorded separately from the viewport-sized document element. Firefox measurements and screenshots are retained in the artifacts; this table reports Chromium.

| Fixture / viewport | Offerings | Costs | Net-income result | Body height | Body/document width |
|---|---:|---:|---:|---:|---:|
| Fitness / Beginner / 1440×900 | 1,362 | 4,828 | 192 | 5,028 | 1,440 |
| Fitness / Beginner / 375×812 | 1,822 | 5,475 | 5,762 | 8,999 | 375 |
| Hybrid / Advanced / 1440×900 | 1,413 | 14,499 | 243 | 16,575 | 1,440 |
| Hybrid / Advanced / 375×812 | 1,845 | 15,604 | 17,827 | 22,501 | 375 |

Representative screenshots: [desktop Fitness](product-flow-baseline/2026-10-28/beginner-1440-first-screen.png), [mobile Fitness offerings](product-flow-baseline/2026-10-28/beginner-375-offerings.png), [desktop hybrid](product-flow-baseline/2026-10-28/advanced-1440-first-screen.png), [mobile hybrid offerings](product-flow-baseline/2026-10-28/advanced-375-offerings.png), and [mobile hybrid Results](product-flow-baseline/2026-10-28/advanced-375-results.png).

### Current behavior and historical reconciliation

| Finding | Observed now | Consequence / owner |
|---|---|---|
| Historical mobile overflow | Body and document widths match 375px for both fixtures in both engines. This does not prove every child, dialog, or keyboard state fits. | Do not carry historical M1 forward as a reproduced page-width defect. Keep reflow coverage in item 25. |
| Welcome interruption | Industry selection opens a second tour invitation. Choosing Explore does not complete onboarding; welcome returns after reload. [Screenshot](product-flow-baseline/2026-10-28/welcome-after-reload.png). | Phase 3 replaces automatic overlays with optional inline guidance. |
| Immediately clickable onboarding controls | Source attaches handlers 100ms after inserting the controls. An immediate automated industry click did nothing; capture allows 150ms for each handler attachment. | Phase 3 binds entry controls before exposing them. Do not copy this timer pattern. |
| Historical 19 advanced controls | The present default Advanced layout exposes 6 `.advanced-feature`/`.expert-feature` elements; Beginner exposes 0. Tabs already contain other specialist panels. | M3's exact count is stale. Specialist discovery and modeled-value access still need the new destinations. |
| Dense editing | Twelve offerings push mobile business expenses to about 15,600px and net income to about 17,800px. Desktop Results remain in the adjacent column. | Preserve desktop edit-and-see feedback; replace mobile traversal with direct destinations and list/detail editing. |
| Partial price entry | Clearing the first monthly price leaves an empty field but changes both canonical and persisted `priceMonthly` to `0`. | Phase 3 must retain transient invalid text and last valid state; saving/sharing must expose or block unresolved invalid input. |
| Active-case sharing | A Conservative scenario link contains inputs only and opens on Base. Existing behavior is documented in `rangeCase.ts`, but fails the redesign's no-silent-reset requirement. | Phase 4 needs an explicit case snapshot or accurate case warning/selection. Test each format before promising parity. |
| Settings capabilities | `SettingsPanel.ts` still lists full exports as locked below Advanced, while exports are universally available. This is source-verified, not a fresh settings screenshot. | Phase 4 updates copy alongside the approved detail matrix. |

No page exceptions occurred in the fixture captures. This is not a network/security audit or proof that every error path works. The old heuristic report's claim that browser work was deferred and this ledger's earlier claim that it occurred remain contradictory historical statements; neither is used as the current baseline.

### Task inventory for the redesign

| Task | Current reproducible path | Target path |
|---|---|---|
| First model | Welcome → Choose Industry → Fitness → Explore → scroll to offering → edit price → find annual income | Inline example preview → Model / Offerings → edit → Results |
| Find one of twelve offerings | Scroll/search the editable card/table stream; related resources/run costs are separate Setup groups | Search/filter list → focused editor → relevant delivery fields |
| Price with sales loss | Save baseline through Scenarios; edit price in offerings and loss in Ranges; inspect outputs; undo/save | Try a change → focused price + pricing assumptions → live result → save alternative |
| Business expense | Scroll past offerings to Costs; overhead/processing fees remain back in Business basics | Model / Costs, with payroll linking to People & capacity |
| Compare | Scenarios → comparison selectors → two-scenario diff modal | Compare destination → baseline + alternative → edit option → return |
| Share/export | Drawer → Share or Export → chosen format; case behavior varies by surface | Results/Compare → review included options, case, units, notes, and snapshot behavior |
| Returning use | Auto-saved state restores, but Explore-only onboarding reappears | Resume draft and destination; optional guidance stays out of the way |

The complete feature-to-destination and proposed level matrix is in the [redesign plan](../plans/product-flow-redesign.md#feature-destinations-and-proposed-detail-matrix). Participant task times, screen-reader behavior, physical keyboards/devices, and a full export-format round trip remain unmeasured; item 25 retains those gates.
