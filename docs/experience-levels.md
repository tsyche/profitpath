# Experience Levels

ProfitPath exposes three experience levels that control which UI features are visible by default and which advanced controls are available in the Settings panel.

These levels are implemented as feature gates in `src/settings/index.js` (see `FEATURE_GATES`) and applied in the UI by `assets/app.jsx` (`updateUIForSettings`). Use the Settings panel to change levels; the selection is persisted to `localStorage`.

## Levels and feature mapping (current)

- Beginner (default)
  - Advanced calculations: OFF
  - Detailed breakdowns: OFF
  - Scenario comparison tools: OFF
  - Export options (Excel/PDF/HTML/Embed): OFF
  - Debug panel: OFF
  - Performance metrics: OFF
  - Tooltips: ON

- Intermediate
  - Advanced calculations: ON
  - Detailed breakdowns: ON
  - Scenario comparison tools: ON
  - Export options: OFF
  - Debug panel: OFF
  - Performance metrics: OFF
  - Tooltips: ON

- Advanced
  - Advanced calculations: ON
  - Detailed breakdowns: ON
  - Scenario comparison tools: ON
  - Export options: ON
  - Debug panel: ON
  - Performance metrics: ON
  - Tooltips: ON

## What UI elements are controlled

The app hides/shows elements by toggling display on selectors tied to feature keys. Key mappings include:

- `.advanced-calculations` — advanced calculation controls and inputs
- `.detailed-breakdown` — extra table rows, intermediate values, and chart breakdowns
- `.comparison-tools` — UI to compare scenarios side-by-side
- `.export-options` / `.advanced-feature` / `.expert-feature` — extra export formats and advanced export UI
- `.debug-panel` — collapsible debug panel under Outputs

When adding a new feature flag, update `FEATURE_GATES` in `src/settings/index.js` and ensure the corresponding DOM elements are toggled in `assets/app.jsx`'s `updateUIForSettings`.

## Developer notes

- `DEFAULT_SETTINGS` in `src/settings/index.js` contains safe defaults used when no settings exist in localStorage.
- `setExperienceLevel(level)` will apply the feature gates and persist them.
- Consider adding UI tests that assert element visibility for each experience level to prevent regressions.

