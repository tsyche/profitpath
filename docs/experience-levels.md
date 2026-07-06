# Experience Levels

ProfitPath exposes three experience levels that control which UI features are visible by default and which advanced controls are available in the Settings panel.

These levels are implemented as feature gates in `src/settings/index.js` (see `FEATURE_GATES`) and applied in the UI by `assets/app.jsx` (`updateUIForSettings`). Use the Settings panel to change levels; the selection is persisted to `localStorage`.

## Levels and feature mapping (current)

- Beginner (default)
  - Advanced calculations: OFF
  - Detailed breakdowns: OFF
  - Scenario comparison tools: OFF
  - Sensitivity analysis: OFF
  - Client mix optimizer: OFF
  - Advanced charts (heat map, radar, funnel): OFF
  - Debug panel: OFF
  - Performance metrics: OFF
  - Tooltips: ON

- Intermediate
  - Advanced calculations: ON
  - Detailed breakdowns: ON
  - Scenario comparison tools: ON
  - Sensitivity analysis: ON
  - Client mix optimizer: ON
  - Advanced charts (heat map, radar, funnel): OFF
  - Debug panel: OFF
  - Performance metrics: OFF
  - Tooltips: ON

- Advanced
  - Advanced calculations: ON
  - Detailed breakdowns: ON
  - Scenario comparison tools: ON
  - Sensitivity analysis: ON
  - Client mix optimizer: ON
  - Advanced charts (heat map, radar, funnel): ON
  - Debug panel: ON
  - Performance metrics: ON
  - Tooltips: OFF (disabled by default for power users)

> **Export formats are not gated by experience level.** `FEATURE_GATES` still
> carries a `showExportOptions` flag, but `initializeProgressiveDisclosure()` in
> `assets/utils/progressiveDisclosure.js` deliberately force-shows every export
> option ("Always show all export options regardless of user level"). All
> formats (CSV, Excel, PDF, HTML, Email, Embed, Schedule) are available at every
> level — they are listed unconditionally in the menu's Export submenu.

## What UI elements are controlled

The app hides/shows elements by toggling display on selectors tied to feature keys. Key mappings include:

- `.advanced-calculations` — advanced calculation controls and inputs
- `.detailed-breakdown` — extra table rows, intermediate values, and chart breakdowns
- `.comparison-tools` — UI to compare scenarios side-by-side
- `.advanced-feature` / `.expert-feature` — advanced/expert-only panels (e.g. sensitivity analysis, mix optimizer, advanced charts, performance, debug). Note: `.export-option` elements carrying these classes are exempt — they are always shown (see note above).
- `.debug-wrapper` — collapsible debug panel under Outputs
- `.sensitivity-wrapper` — collapsible sensitivity analysis panel
- `.mix-optimizer-wrapper` — collapsible client mix optimizer panel
- `.advanced-charts-wrapper` — collapsible advanced charts panel (heat map, radar, funnel)

When adding a new feature flag, update `FEATURE_GATES` in `src/settings/index.js` and ensure the corresponding DOM elements are toggled in `assets/app.jsx`'s `updateUIForSettings`.

## Developer notes

- `DEFAULT_SETTINGS` in `src/settings/index.js` contains safe defaults used when no settings exist in localStorage.
- `setExperienceLevel(level)` will apply the feature gates and persist them.
- Consider adding UI tests that assert element visibility for each experience level to prevent regressions.

