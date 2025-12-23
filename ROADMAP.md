# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Top 3 Suggested Tasks

Based on user impact and technical foundation:

1. **Extract Calculation Logic**

   - Refactor core calculation logic into a separate, testable library
   - ~2 hours effort, enables unit testing and modularity

2. **Add Unit Tests**

   - Implement unit tests for core math and business logic functions
   - ~2-3 hours effort, improves code reliability and prevents regressions

3. **Calculation Engine Refactoring**

   - Extract `calc()` into separate module with better separation of concerns
   - Add calculation pipeline with intermediate results for debugging
   - Implement calculation caching for performance
   - ~3-4 hours effort

---

## Fully Prioritized Backlog (high → low)

**High priority**

1. Simple visualizations: utilization gauge and optional richer charts.
2. Scenario comparison (diff view).
3. Add CI with linting and tests.

Technical Foundation & Quality (Foundation Layer)

4. Calculation Engine Refactoring

   - Extract `calc()` into separate module with better separation of concerns
   - Add calculation pipeline with intermediate results for debugging
   - Implement calculation caching for performance
   - Effort: ~3-4 hours

5. Advanced Formatting & Localization
   - Multiple currency support beyond USD
   - Localized number formatting
   - Configurable decimal precision per metric
   - Effort: ~2 hours

Business Intelligence & Analytics (Core Enhancement)

6. Sensitivity Analysis & What-If Scenarios

    - "What if" sliders for key variables (pricing, costs, utilization)
    - Tornado charts showing impact of variable changes
    - Monte Carlo simulation for risk assessment
    - Effort: ~6-8 hours

7. Tax & Financial Calculations

    - Self-employment tax calculations
    - Quarterly tax estimates
    - Depreciation tracking
    - Profit sharing calculations
    - Effort: ~4-5 hours

8. Customer Acquisition & Growth Modeling
    - Customer acquisition cost (CAC) tracking
    - Customer lifetime value (LTV) calculations
    - Churn rate modeling
    - Growth rate projections
    - Effort: ~4-6 hours

Enhanced User Experience (UX Layer)

9. Shareable URLs & Collaboration

    - Encode scenarios in URL fragments for sharing
    - Social media sharing with preview cards
    - Embeddable calculator widgets
    - Effort: ~3-4 hours

10. Guided Experience & Onboarding

    - Interactive walkthrough for new users
    - Industry-specific setup wizards
    - Progressive disclosure of advanced features
    - Contextual help tooltips
    - Effort: ~4-5 hours

11. Accessibility & Mobile Experience
    - Full keyboard navigation
    - Screen reader optimization
    - Mobile-responsive design improvements
    - Touch gesture support
    - Effort: ~3-4 hours

Advanced Visualizations (Presentation Layer)

12. Interactive Scenario Comparison

    - Side-by-side scenario comparison
    - Diff highlighting for changes
    - Scenario blending (weighted averages)
    - Correlation analysis between variables
    - Effort: ~5-6 hours

13. Advanced Chart Types
    - Heat maps for multi-variable sensitivity
    - Radar charts for balanced scorecard
    - Funnel charts for customer journey
    - Geographic pricing maps
    - Effort: ~4-6 hours

Industry Intelligence & Templates (Domain Layer)

14. Industry Presets & Benchmarks

    - Curated templates for common service businesses
    - Industry benchmark comparisons
    - Regional pricing data
    - Success metric tracking
    - Effort: ~6-8 hours

15. Seasonal & Market Adjustments
    - Seasonal demand modeling
    - Geographic pricing variations
    - Market rate comparisons
    - Economic indicator integration
    - Effort: ~4-5 hours

Enterprise Features (Scale Layer)

16. Advanced Scenario Management

    - Scenario versioning and history
    - Bulk import/export operations
    - Scenario templates and inheritance
    - Team sharing and permissions
    - Effort: ~8-10 hours

17. Integration & Automation

    - API for third-party integrations
    - Webhook notifications for key metrics
    - Automated data syncing
    - CRM/ERP system connections
    - Effort: ~10-12 hours

18. Multi-Year Strategic Planning

    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Strategic milestone tracking
    - Effort: ~8-10 hours

19. Optimizer Mode & AI Insights
    - Automated optimization suggestions
    - Machine learning price optimization
    - Predictive analytics
    - Competitive analysis tools
    - Effort: ~12-15 hours

---

Notes

- The repo contains a stable, production-ready profitability simulator with comprehensive error handling, performance optimizations, PWA capabilities, and extensive export functionality.
- **Recently completed**: All major tech debt items including performance optimization, service worker implementation, CI/CD pipeline, comprehensive documentation, advanced testing infrastructure, scenario comparison tools, enhanced CSV export with professional headers and shareable URL encoding, and improved mobile hamburger menu with better UX, icon consistency, and navigation.
- **Next priorities**: Advanced data visualization, calculation engine refactoring, and multi-currency support for enhanced decision making and global adoption.
- Enterprise features represent significant scope expansion and may require backend infrastructure changes.
