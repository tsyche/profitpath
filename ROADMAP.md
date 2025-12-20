# ProfitPath — Consolidated Roadmap (single source of truth)


This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes completed items (so you can see recent progress) and a prioritized backlog.

Run locally
```bash
python3 -m http.server 8000
```

Open http://localhost:8000 to preview the app.

---

## Completed (already implemented)

- Calculation & testability
  - `calc(state?)` accepts an optional state argument (easier to test programmatically).
  - Core constants: `HOURS_PER_YEAR`, `DEFAULT_CURRENCY` are centralized.

- UX / UI
  - KPIs and Outputs fixed (clients, total sessions, service hours, utilization, revenue, costs, income).
  - Simple revenue composition chart with per-offering breakdown and hover tooltips (pin/close behavior implemented).
  - Collapsible Debug panel added at the bottom of the Outputs card (shows `calc()` JSON); state persists in `localStorage`.
  - Finalized single SVG header logo and cleaned up legacy logo variants.

- Persistence & export
  - localStorage auto-save/load of app state and scenario management (save/load/delete).
  - CSV export for scenario summary and per-offering rows.

---

## Prioritized Backlog (high → low)

High priority

1. Extract calculation logic into a small library (e.g., `assets/lib/calc.js`) and formatting helpers to enable unit tests and isolate business logic.
   - Effort: ~2 hours

2. Add unit tests (Vitest) for core math functions (normalizeMix, rebalanceMix, calc in both modes).
   - Effort: ~2–3 hours (after extraction)

3. Scenario manager polish: rename, import/export, and UI affordances for comparing scenarios.
   - Effort: ~3–4 hours

4. Export & sharing: polish CSV headers and add optional shareable URL encoding.
   - Effort: ~1–3 hours

Medium priority

5. Simple visualizations: utilization gauge and optional richer charts.
6. Scenario comparison (diff view).
7. Add CI with linting and tests.

Low priority / long-term

8. Industry presets, multi-year forecasting, and optimizer mode.

Tech debt & DX

- Add ESLint / Prettier and a small CI pipeline.
- Consider extracting a minimal build step (esbuild) only for developer ergonomics.

---

Notes

- The repo now contains a stable, single-page experience with the core calculation and UX pieces in place. If you want, I can extract the calc logic into a small module and add a unit test harness next.
