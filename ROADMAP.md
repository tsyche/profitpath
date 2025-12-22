# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes completed items (so you can see recent progress) and a prioritized backlog.

See README.md for setup and development instructions.

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

- ✅ **Build System**: Added minimal esbuild configuration for development ergonomics (completed)
- 🚧 **TypeScript Migration** (In Progress): Set up TypeScript configuration and converted constants file as example (20-30 hours total)

---

## Top 3 Next Priorities

Based on user impact and market expansion:

1. **Multi-Currency Support**

   - Enable international users with proper currency handling and formatting
   - 8-10 hours effort, critical for global adoption and professional use

2. **Industry Templates & Presets**

   - Pre-built scenarios for common business types to improve onboarding
   - 4-6 hours effort, reduces time-to-value for new users

3. **Advanced Mobile Experience**

   - Touch gestures, mobile-specific optimizations, and PWA enhancements
   - 4-6 hours effort, improves mobile user retention and experience

---

Notes

- The repo contains a stable, production-ready profitability simulator with comprehensive error handling, performance optimizations, PWA capabilities, and extensive export functionality.
- **Recently completed**: All major tech debt items including performance optimization, service worker implementation, CI/CD pipeline, comprehensive documentation, and advanced testing infrastructure.
- **Next priorities**: Multi-currency support for international users, industry-specific templates, and enhanced mobile experience for broader adoption.
- Enterprise features represent significant scope expansion and may require backend infrastructure changes.
