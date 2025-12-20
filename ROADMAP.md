# ProfitPath — Consolidated Roadmap (single source of truth)

This file now contains every idea, improvement, and feature-request previously scattered across the repo. Items are ordered by priority (High → Medium → Low). Completed items are shown first so you can focus on what remains.

If you prefer a shorter view, scan the "Next actions" section for top-priority, actionable tasks.

Run locally
```bash
python3 -m http.server 8000
```

Open http://localhost:8000 to preview the app.

---

## Completed (already implemented)

- Pure math: `calc()` accepts an optional state argument (improved testability).
- Constants extracted: `HOURS_PER_YEAR`, `DEFAULT_CURRENCY` (used through code).
- Accessibility: ARIA labels on dynamic inputs and enhanced focus styling.
- Persistence: localStorage auto-save/load and reset behavior.
- Visual/UX: simple revenue composition chart, offering list, per-offering metrics, improved tooltip with pin/close behavior and smooth follow (pin visuals later removed per preference).
- CSV export and scenario manager scaffolding (some UI present).

---

## Prioritized Backlog (high → low)

High priority — implement these first

1. Extract calculation logic into a small library (assets/lib/calc.js) and formatting helpers (assets/lib/format.js)
	- Why: Enables unit testing and isolates business logic from DOM.
	- Effort: ~2 hours
	- Outcome: Smaller `assets/app.js`, easier tests, easier refactor.

2. Add unit tests (Vitest) for core math functions
	- Why: Prevent regressions and validate edge cases (normalizeMix, rebalanceMix, calc in both modes).
	- Effort: ~3 hours (after extraction)
	- Outcome: Test suite and CI confidence.

3. Scenario management UI (Save / Load / Rename / Delete named scenarios)
	- Why: Users need discoverable persistence and scenario workflows.
	- Effort: ~3 hours (UI + JSON store schema)
	- Notes: store scenarios as {id, name, ts, state}; support export/import JSON.

4. Export improvements: CSV & share (polish CSV export for full summary and per-offering tables)
	- Why: High user value (analysis in Sheets/Excel).
	- Effort: ~1 hour
	- Outcome: Downloadable CSV(s) with clear headers, formatted numbers.

Medium priority — strengthen UX, visibility, and maintainability

5. Simple visualizations (utilization gauge & breakdown charts)
	- Why: Visual cues speed understanding.
	- Effort: ~3 hours
	- Options: small SVG utilization gauge; optional Chart.js for richer visuals.

6. Scenario comparison (what-if): snapshot and compare two scenarios with delta highlighting
	- Why: Powerful for planning decisions.
	- Effort: ~4 hours

7. Shareable URLs (encode compressed scenario in query string)
	- Why: Easy sharing without accounts.
	- Effort: ~2 hours
	- Notes: use lz-string compression; add a "Copy share link" action.

8. Add CI: run linters and tests on push/PR
	- Why: Prevent regressions and enforce style.
	- Effort: ~2 hours

Low priority / long-term

9. Industry presets (curated templates for onboarding)
	- Effort: ~4–6 hours

10. Multi-year forecasting & hiring recommendations
	 - Effort: 8+ hours

11. Optimizer mode (heuristic suggestions for price/mix)
	 - Effort: 8+ hours (research + algorithms)

12. Productization items: deploy scripts, packaging, mobile wrapper (Capacitor), PDF export, i18n

Tech debt & developer experience

- Add ESLint / Prettier (config + CI) — small, high ROI.
- Consider a tiny build step (esbuild) to enable module splitting without forcing users to run a build locally.
- Gradual typing (TypeScript) for core lib (optional, medium effort).

---

Notes
- This ROADMAP.md is now the single source of truth; the other docs were removed to avoid duplication. If you want a trimmed "quick view" later, we can add a short summary section at top.

Next actions (recommended)
1. Extract `calc()` into `assets/lib/calc.js` and `fmt` helpers.
2. Add unit tests for `normalizeMix`, `rebalanceMix`, and `calc()`.
3. Build the scenario manager UI and finalize CSV export formatting.
