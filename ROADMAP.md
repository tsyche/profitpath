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
  - **Responsive mobile layout** with proper width utilization on small screens.
  - **Enhanced tooltip positioning** with smooth hover tracking and reliable pinning/unpinning.

- Persistence & export
  - localStorage auto-save/load of app state and scenario management (save/load/delete).
  - CSV export for scenario summary and per-offering rows.

- Data Validation & Business Intelligence
  - **Comprehensive input validation** with contextual error messages and auto-fix suggestions.
  - **Business logic validation** including utilization warnings and profitability checks.
  - **Break-even analysis** with visual indicators, contribution margin calculations, and client/revenue break-even points.
  - **Graceful error handling** with data sanitization and recovery.

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

Technical Foundation & Quality (Foundation Layer)

8. Calculation Engine Refactoring
   - Extract `calc()` into separate module with better separation of concerns
   - Add calculation pipeline with intermediate results for debugging
   - Implement calculation caching for performance
   - Effort: ~3-4 hours

9. Advanced Formatting & Localization
    - Multiple currency support beyond USD
    - Localized number formatting
    - Configurable decimal precision per metric
    - Effort: ~2 hours

Business Intelligence & Analytics (Core Enhancement)

10. Sensitivity Analysis & What-If Scenarios
    - "What if" sliders for key variables (pricing, costs, utilization)
    - Tornado charts showing impact of variable changes
    - Monte Carlo simulation for risk assessment
    - Effort: ~6-8 hours

11. Tax & Financial Calculations
    - Self-employment tax calculations
    - Quarterly tax estimates
    - Depreciation tracking
    - Profit sharing calculations
    - Effort: ~4-5 hours

12. Customer Acquisition & Growth Modeling
    - Customer acquisition cost (CAC) tracking
    - Customer lifetime value (LTV) calculations
    - Churn rate modeling
    - Growth rate projections
    - Effort: ~4-6 hours

Enhanced User Experience (UX Layer)

13. Shareable URLs & Collaboration
    - Encode scenarios in URL fragments for sharing
    - Social media sharing with preview cards
    - Embeddable calculator widgets
    - Effort: ~3-4 hours

14. Advanced Export & Reporting
    - PDF report generation with charts
    - Excel export with formulas
    - Email sharing functionality
    - Automated report scheduling
    - Effort: ~5-7 hours

15. Guided Experience & Onboarding
    - Interactive walkthrough for new users
    - Industry-specific setup wizards
    - Progressive disclosure of advanced features
    - Contextual help tooltips
    - Effort: ~4-5 hours

16. Accessibility & Mobile Experience
    - Full keyboard navigation
    - Screen reader optimization
    - Mobile-responsive design improvements
    - Touch gesture support
    - Effort: ~3-4 hours

Advanced Visualizations (Presentation Layer)

17. Rich Dashboard Visualizations
    - Cash flow timeline charts
    - Profit/loss waterfall diagrams
    - Utilization gauge with historical trends
    - KPI trend lines with forecasting
    - Effort: ~6-8 hours

18. Interactive Scenario Comparison
    - Side-by-side scenario comparison
    - Diff highlighting for changes
    - Scenario blending (weighted averages)
    - Correlation analysis between variables
    - Effort: ~5-6 hours

19. Advanced Chart Types
    - Heat maps for multi-variable sensitivity
    - Radar charts for balanced scorecard
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

Industry Intelligence & Templates (Domain Layer)

20. Industry Presets & Benchmarks
    - Curated templates for common service businesses
    - Industry benchmark comparisons
    - Regional pricing data
    - Success metric tracking
    - Effort: ~6-8 hours

21. Seasonal & Market Adjustments
    - Seasonal demand modeling
    - Geographic pricing variations
    - Market rate comparisons
    - Economic indicator integration
    - Effort: ~4-5 hours

Enterprise Features (Scale Layer)

22. Advanced Scenario Management
    - Scenario versioning and history
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions
    - Effort: ~8-10 hours

23. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing
    - CRM/ERP system connections
    - Effort: ~10-12 hours

24. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

25. Optimizer Mode & AI Insights
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

Based on user impact and business value:

1. **Shareable URLs & Collaboration** (#14)
   - Critical for user adoption - enables sharing scenarios with stakeholders
   - 3-4 hours effort, high user impact, can be implemented independently

2. **Advanced Export & Reporting** (#13)
   - Users need better ways to export and present their analysis results
   - 5-7 hours effort, improves usability and professional presentation

3. **Rich Dashboard Visualizations** (#16)
   - Enhanced visual insights make the tool more compelling and easier to understand
   - 6-8 hours effort, improves user engagement and decision-making

---

Notes

- The repo now contains a stable, production-ready profitability simulator with comprehensive data validation, break-even analysis, and polished UX.
- **Recently completed**: Enhanced data validation (#8) and break-even analysis (#11) - core business intelligence features now available.
- **Next priorities**: Calculation engine refactoring (#8), shareable URLs (#14), and localization (#9) for improved maintainability and user experience.
- Enterprise features (22-25) represent significant scope expansion and may require backend infrastructure.
