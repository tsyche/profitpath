# Experience Levels

**TL;DR:** Beginner keeps the core simulator visible. Intermediate unlocks the Advisor and deeper analysis; Advanced adds charts and diagnostics.

ProfitPath exposes three experience levels that control which UI features are visible by default and which advanced controls are available in the Settings panel.

These levels are implemented as feature gates in `src/settings/index.ts` (see `FEATURE_GATES`) and applied in the UI by `assets/components/SettingsPanel.ts` (`updateUIForSettings`). Use the Settings panel to change levels; the selection is persisted to `localStorage`.

## Levels and feature mapping (current)

- Beginner (default)
  - Advanced calculations: OFF
  - Detailed breakdowns: OFF
  - Scenario comparison tools: OFF
  - Sensitivity analysis: OFF
  - Client mix optimizer: OFF
  - Advisor: OFF
  - Insights & What-Ifs, What Would It Take?: OFF
  - Advanced charts (heat map, radar, funnel): OFF
  - Capacity resources (booth, room pools): OFF
  - Membership What-If, Group runs: OFF
  - Ranges & confidence, Market position: OFF
  - Debug panel: OFF
  - Performance metrics: OFF
  - Tooltips: ON

- Intermediate
  - Advanced calculations: ON
  - Detailed breakdowns: ON
  - Scenario comparison tools: ON
  - Sensitivity analysis: ON
  - Client mix optimizer: ON
  - Advisor: ON
  - Insights & What-Ifs, What Would It Take?: ON
  - Capacity resources (booth, room pools): ON
  - Membership What-If, Group runs: ON
  - Ranges & confidence, Market position: ON
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
  - Advisor: ON
  - Insights & What-Ifs, What Would It Take?: ON
  - Capacity resources (booth, room pools): ON
  - Membership What-If, Group runs: ON
  - Ranges & confidence, Market position: ON
  - Advanced charts (heat map, radar, funnel): ON
  - Debug panel: ON
  - Performance metrics: ON
  - Tooltips: OFF (disabled by default for power users)

> **Export formats are not gated by experience level.** `FEATURE_GATES` still
> carries a `showExportOptions` flag, but `initializeProgressiveDisclosure()` in
> `assets/utils/progressiveDisclosure.ts` deliberately force-shows every export
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
- `.advisor-wrapper` — entry point containing the Insights, Reverse Calculator, Mix Optimizer, and Advanced Charts panels; chart link appears only at Advanced
- `.mix-optimizer-wrapper` — collapsible client mix optimizer panel
- `.insights-wrapper` — collapsible insights and what-if estimates panel (`showInsights`)
- `.reverse-calculator-wrapper` — collapsible "What Would It Take?" panel (`showReverseCalculator`)
- `.membership-wrapper` — collapsible Membership What-If panel (`.advanced-feature`, so intermediate and up)
- `#groupRunsSection` — collapsible Group runs table: fixed cost per run and break-even fill (`.advanced-feature`, so intermediate and up)
- `.advanced-charts-wrapper` — collapsible advanced charts panel (heat map, radar, funnel)
- The "What if?" wizard (`#whatIfModal`, header and drawer) is not gated: it is available at every level.

When adding a new feature flag, update `FEATURE_GATES` in `src/settings/index.ts` and ensure the corresponding DOM elements are toggled in `assets/components/SettingsPanel.ts`'s `updateUIForSettings`.

## Setup and Outputs layout

- Setup keeps Revenue, Net Income, and Utilization in a sticky summary while its card scrolls.
- Setup uses persisted native groups: Business basics, Offerings, and Costs begin open; Scenario notes and optional capacity assumptions begin closed. Invalid native fields reopen their owning group.
- Outputs Overview is always visible. Intermediate and Advanced users can open persisted Analyze and Customers tabs; Beginner sees no empty tab bar. Tabs support arrow-key focus movement and move focus to the active panel.
- Diagnostics remain outside those tabs and retain their existing Advanced gates.

## Developer notes

- `DEFAULT_SETTINGS` in `src/settings/index.ts` contains safe defaults used when no settings exist in localStorage.
- `setExperienceLevel(level)` will apply the feature gates and persist them.
- Consider adding UI tests that assert element visibility for each experience level to prevent regressions.

