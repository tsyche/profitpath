# UI/UX Phase 0 live evidence

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
