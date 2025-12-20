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

Medium priority

5. Simple visualizations: utilization gauge and optional richer charts.
6. Scenario comparison (diff view).
7. Add CI with linting and tests.

Technical Foundation & Quality (Foundation Layer)

8. Enhanced Data Validation & Error Handling
   - Input validation with contextual error messages (e.g., "Mix % must sum to 100%" with auto-fix suggestions)
   - Business logic validation (e.g., warn when utilization exceeds 100%)
   - Graceful degradation for edge cases
   - Effort: ~2-3 hours

9. Calculation Engine Refactoring
   - Extract `calc()` into separate module with better separation of concerns
   - Add calculation pipeline with intermediate results for debugging
   - Implement calculation caching for performance
   - Effort: ~3-4 hours

10. Advanced Formatting & Localization
    - Multiple currency support beyond USD
    - Localized number formatting
    - Configurable decimal precision per metric
    - Effort: ~2 hours

Business Intelligence & Analytics (Core Enhancement)

11. Break-Even Analysis
    - Calculate break-even points (clients needed, revenue required)
    - Show break-even lines on charts
    - Break-even sensitivity analysis
    - Effort: ~3-4 hours

12. Sensitivity Analysis & What-If Scenarios
    - "What if" sliders for key variables (pricing, costs, utilization)
    - Tornado charts showing impact of variable changes
    - Monte Carlo simulation for risk assessment
    - Effort: ~6-8 hours

13. Tax & Financial Calculations
    - Self-employment tax calculations
    - Quarterly tax estimates
    - Depreciation tracking
    - Profit sharing calculations
    - Effort: ~4-5 hours

14. Customer Acquisition & Growth Modeling
    - Customer acquisition cost (CAC) tracking
    - Customer lifetime value (LTV) calculations
    - Churn rate modeling
    - Growth rate projections
    - Effort: ~4-6 hours

Enhanced User Experience (UX Layer)

15. Shareable URLs & Collaboration
    - Encode scenarios in URL fragments for sharing
    - Social media sharing with preview cards
    - Embeddable calculator widgets
    - Effort: ~3-4 hours

16. Advanced Export & Reporting
    - PDF report generation with charts
    - Excel export with formulas
    - Email sharing functionality
    - Automated report scheduling
    - Effort: ~5-7 hours

17. Guided Experience & Onboarding
    - Interactive walkthrough for new users
    - Industry-specific setup wizards
    - Progressive disclosure of advanced features
    - Contextual help tooltips
    - Effort: ~4-5 hours

18. Accessibility & Mobile Experience
    - Full keyboard navigation
    - Screen reader optimization
    - Mobile-responsive design improvements
    - Touch gesture support
    - Effort: ~3-4 hours

Advanced Visualizations (Presentation Layer)

19. Rich Dashboard Visualizations
    - Cash flow timeline charts
    - Profit/loss waterfall diagrams
    - Utilization gauge with historical trends
    - KPI trend lines with forecasting
    - Effort: ~6-8 hours

20. Interactive Scenario Comparison
    - Side-by-side scenario comparison
    - Diff highlighting for changes
    - Scenario blending (weighted averages)
    - Correlation analysis between variables
    - Effort: ~5-6 hours

21. Advanced Chart Types
    - Heat maps for multi-variable sensitivity
    - Radar charts for balanced scorecard
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

Industry Intelligence & Templates (Domain Layer)

22. Industry Presets & Benchmarks
    - Curated templates for common service businesses
    - Industry benchmark comparisons
    - Regional pricing data
    - Success metric tracking
    - Effort: ~6-8 hours

23. Seasonal & Market Adjustments
    - Seasonal demand modeling
    - Geographic pricing variations
    - Market rate comparisons
    - Economic indicator integration
    - Effort: ~4-5 hours

Enterprise Features (Scale Layer)

24. Advanced Scenario Management
    - Scenario versioning and history
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions
    - Effort: ~8-10 hours

25. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing
    - CRM/ERP system connections
    - Effort: ~10-12 hours

26. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

27. Optimizer Mode & AI Insights
    - Automated optimization suggestions
    - Machine learning price optimization
    - Predictive analytics
    - Competitive analysis tools
    - Effort: ~12-15 hours

Tech debt & DX

- Add ESLint / Prettier and a small CI pipeline.
- Consider extracting a minimal build step (esbuild) only for developer ergonomics.

---

## Top 3 Next Priorities

Based on codebase analysis and logical dependencies:

1. **Enhanced Data Validation & Error Handling** (#8)
   - Prevents user frustration, improves data quality, enables more robust calculations
   - 2-3 hours effort, can start immediately

2. **Break-Even Analysis** (#11)
   - Fundamental business intelligence users expect from a profitability simulator
   - Makes the tool much more actionable for business planning
   - 3-4 hours effort, builds on validation

3. **Shareable URLs & Collaboration** (#15)
   - Enables collaboration and broader adoption
   - 3-4 hours effort, can be implemented independently

---

Notes

- The repo now contains a stable, single-page experience with the core calculation and UX pieces in place.
- The roadmap has been expanded from 8 items to 27 items across 6 logical categories.
- Focus on foundation layer items (8-10) for reliability, then core enhancements (11-14) for business value, then UX improvements (15-18) for usability.
- Enterprise features (24-27) represent significant scope expansion and may require backend infrastructure.
