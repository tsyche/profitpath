# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project type
- Static, browser-only app (no backend, no build step).
- Entry point: `index.html`
- Runtime: modern browser (uses `type="module"`, `crypto.randomUUID()`, and `Intl.NumberFormat`).

## Common commands
### Run locally (recommended)
Because `assets/app.js` uses modern browser APIs that expect a secure context, prefer serving over `http://localhost` rather than opening `index.html` via `file://`.

- Start a simple local server from the repo root:
  - `python3 -m http.server 8000`
  - then open `http://localhost:8000/`

Alternative (if you already have Node installed):
- `npx http-server . -p 8000`

### Build / lint / test
- No project-specific build, lint, or test tooling/config was found in this repository.

## High-level architecture
### UI shell: `index.html`
- Pure HTML layout for the simulator.
- Defines all input controls and output KPI placeholders.
- Loads the app logic via `<script type="module" src="assets/app.js"></script>`.
- Key DOM anchors (IDs) used by the JS:
  - Inputs: `modeSelect`, `employees`, `employeePay`, `monthlyCosts`, `productiveUtilizationPct`, `targetUtilizationPct`
  - Offerings table body: `offeringsBody`
  - Action buttons: `addOfferingBtn`, `resetBtn`
  - Outputs/KPIs: `kpiIncome`, `kpiCustomers`, `kpiVisits`, `kpiHours`, `kpiCapacity`, `kpiRevenue`, `kpiFixedCosts`, `kpiPayroll`, `kpiVariableCosts`, `capacityBar`, `capacityLabel`

### App logic + rendering: `assets/app.js`
- Single-file app organized around:
  - `state`: holds the current mode (`forecast` vs `current`), global inputs, and the offerings array.
  - `calc()`: the “model” that sanitizes inputs and returns computed metrics (customers, visits, hours, revenue/costs, net income, utilization).
  - `render()`: re-renders the offerings table and all KPIs from `calc()` output.
  - `wire()`: attaches DOM event listeners and triggers `render()`.

Mode behavior:
- `forecast` mode:
  - Uses `mixPct` per offering; `normalizeMix()` is called to normalize mix to 100% for calculations.
  - Uses `targetUtilizationPct` to set `hoursUsed` as a fraction of annual service hours.
  - Derives total `customers` from available hours and weighted “hours per customer”.
- `current` mode:
  - Uses `currentCustomers` per offering.
  - Derives workload + utilization from customers × visits/year × hours/visit.

Where to make changes:
- Business/math changes: `calc()`.
- Offerings row UI/editability changes: the table row template inside `render()` (and keep `data-k` / `data-i` conventions in sync with `onTableInput`).
- Defaults: `defaultOfferings()` and `resetDefaults()`.

### Styling: `assets/styles.css`
- Single stylesheet for the full UI; uses CSS variables for theme colors and shared sizing.

## Repo-specific notes
- `.history/` is intentionally ignored (editor history snapshots).