# Usability Audit Report — Heuristics

**Scope**: ProfitPath web app (single-page calculator), Setup (`#controls`) + Outputs (`#outputs`) layout, gating, mobile ≤768px  |  **Persona**: recurring-service business owner, beginner→advanced experience levels, desktop + mobile  |  **Date**: 2026-10-27

## Executive Summary
- Total findings: Catastrophic 0 / Major 4 / Minor 6 / Cosmetic 3
- Top 3 critical issues:
  1. (H8/H6) Setup and Outputs are long single columns with 10+ collapsible sections; on mobile the edit→see loop requires heavy scrolling.
  2. (H6/H7) Gating is applied per-section ad hoc; the Setup column keeps growing (expenses, resources, ranges, market, wizard) with no grouping.
  3. (H1) Several advanced panels give no at-a-glance summary until expanded, so their value is hidden.
- Overall usability score: 7/10 (core loop is solid; IA is the weakness)

## Findings

### H1 Visibility of System Status
- Minor: Export menu and advanced panels render with no loading/progress state during heavy calc; toast feedback exists for copy/share but not for long-running exports. Fix: add a busy indicator on export trigger.
- Minor: Header KPIs (Revenue/Net income/Utilization) do update, but their status color logic (good/warn/danger) is not explained inline. Fix: tooltip or legend on first load.

### H2 Match Between System & Real World
- Cosmetic: Internal terms like "productive utilization" and "contribution margin" appear without plain-language gloss in beginner mode. Fix: keep glossary tooltips (already partially present) and ensure they show at beginner level.

### H3 User Control & Freedom
- Minor: Scenario comparison and modals close cleanly; undo/redo present. No systemic issue. (Positive: scroll-lock reference counting fixed.)

### H4 Consistency & Standards
- Minor: Section boxes mix `<details>` (ranges, group runs, market) and `<div>` wrappers (resources, membership) with inconsistent expand affordances. Fix: standardize on one collapsible primitive with consistent chevron + keyboard behavior.

### H5 Error Prevention
- Minor: Mix % and numeric inputs clamp on blur in some paths; ensure all numeric fields validate on input, not just submit. Fix: extend existing clamp to labor %, processing fee, and resource %.

### H6 Recognition Rather Than Recall
- Major: Setup column stacked 8+ sections (mode, staffing, overhead, utilization, offerings, expenses, resources, ranges, market, what-if). Fixed: persisted collapsible Setup groups with sensible defaults per level; see [25–26 shipped work](ledger/ROADMAP_SHIPPED.md#2026-10-27--2526-uiux-pass).
- Major: Outputs stacks core KPIs plus 6 advanced + 2 expert panels in one column; the analysis value is buried. Fix: Analysis tabs for sensitivity, mix optimizer, insights, reverse calculator, advanced charts (Phase 3).

### H7 Flexibility & Efficiency
- Major: No keyboard shortcuts beyond undo/redo; power users cannot jump between Setup/Outputs. Fix: add focus shortcuts (e.g. `/` search, `g` groups) — low priority, defer.
- Minor: No bulk edit for offerings (duplicate exists). Acceptable for v1.

### H8 Aesthetic & Minimalist Design
- Major: Information overload on a single scrollable page after expenses/resources/ranges/market/wizard landed. Fixed: the approved IA map and Outputs tabs; see [25–26 shipped work](ledger/ROADMAP_SHIPPED.md#2026-10-27--2526-uiux-pass).
- Cosmetic: KPI gradient polish is good; keep.

### H9 Help Recognize/Diagnose/Recover From Errors
- Minor: Errors are generally inline; share/import errors are plain-language. No systemic gap. (Positive.)

### H10 Help & Documentation
- Cosmetic: Quick Reference modal exists; contextual help buttons on KPIs exist. Good baseline.

## Prioritized Recommendations
Must fix (severity 3): (1) group Setup sections with persisted collapse state; (2) move Outputs analysis panels into tabs; (3) standardize collapsible primitive.
Should fix (severity 2): (4) export busy indicator; (5) numeric input clamping consistency; (6) header KPI status legend.
Nice to have (severity 1): (7) keyboard shortcuts; (8) plain-language glossary at beginner level.

## Positive Highlights
- Core edit→see loop (inputs + offerings + KPIs) is adjacent on wide screens.
- Progressive disclosure via experience levels is consistently applied.
- Undo/redo, scroll-lock, accessibility (axe clean) are solid.
- Export and share flows are discoverable via the drawer.

## Methodology Notes
Desk analysis by an AI agent simulating a UX expert, based on `index.html` structure, component files, and the ui-ux-pass plan — not real user testing. Heuristic evaluation catches ~75% of issues (Nielsen); validate high-stakes findings with real user testing. Live browser evidence (audit-ux-e2e) requires an opencode restart to load the newly configured Chrome MCP (port 9222) and is deferred to a follow-up pass.

Audit based on: interface description + source inspection (index.html, components); no screenshots or live URL fetched.
EOF
echo "written"
