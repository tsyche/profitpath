# Features overview

All feature planning and the prioritized backlog have been consolidated into `ROADMAP.md`. For the single canonical list of ideas, priorities, and recommended next steps, open `ROADMAP.md` in the repo root.

**✅ Shareable URLs & Collaboration implemented** - Users can now share scenarios via URL and collaborate with stakeholders.

---

## 🔴 LONG-TERM FEATURES (Week 4+)
**Build if market demand justifies the effort.**

```
┌─────────────────────────────────────────────────────────┐
│ #8: Shareable URLs                                      │
├─────────────────────────────────────────────────────────┤
│ Time:    2 hours                                        │
│ Value:   ⭐⭐⭐ (sharing)                               │
│ Effort:  Low (compression + encoding)                   │
│                                                         │
│ What:    Encode state in URL query string               │
│ Why:     Share scenarios without needing accounts       │
│ Impact:  Enable collaboration & feedback               │
│                                                         │
│ Example: ?scenario=Abc123XyZ...                         │
│ Library: lz-string (2KB gzip)                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #9: Industry Presets                                    │
├─────────────────────────────────────────────────────────┤
│ Time:    6 hours                                        │
│ Value:   ⭐⭐⭐ (onboarding)                            │
│ Effort:  Medium (data entry + UI)                       │
│                                                         │
│ What:    Pre-built scenarios for common businesses      │
│ Why:     New users need examples to get started         │
│ Impact:  Reduce time to first insight                   │
│                                                         │
│ Presets:                                                │
│ • Landscaping maintenance                              │
│ • House cleaning                                        │
│ • Consulting/coaching                                  │
│ • Personal training                                    │
│ • Handyman services                                    │
│ • Virtual assistant                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #10: Multi-Year Forecasting                             │
├─────────────────────────────────────────────────────────┤
│ Time:    8 hours                                        │
│ Value:   ⭐⭐ (niche, advanced)                         │
│ Effort:  High (financial modeling)                      │
│                                                         │
│ What:    Project 5 years forward with hiring recs       │
│ Why:     Businesses plan long-term                      │
│ Impact:  Strategic planning tool                        │
│                                                         │
│ Shows:   Year-by-year revenue/costs/income              │
│          "When to hire" suggestions                     │
│          Growth curves (customer growth %)              │
│          Break-even analysis                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #11: Optimizer Mode                                     │
├─────────────────────────────────────────────────────────┤
│ Time:    8+ hours                                       │
│ Value:   ⭐⭐ (nice-to-have)                            │
│ Effort:  Very High (algorithm design)                   │
│                                                         │
│ What:    "Tell me what to do" mode                      │
│ Why:     Users want optimization suggestions            │
│ Impact:  Reduces guesswork                              │
│                                                         │
│ Shows:   Top 5 price/mix suggestions                    │
│          Projected impact on profit                     │
│          Implementation difficulty                     │
│                                                         │
│ Example: "Increase Weekly price +10% → +$12k income"   │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Priority Matrix Visualization

```
                    HIGH VALUE
                        ↑
        #7              │              #1, #2
     Comparison         │           Quick Wins
        ★★★★            │            ★★★★
                        │
     #10, #11          │   #4, #5, #6
    Long-term          │  Foundation
     ★★                │    ★★★★
                        │
    ────────────────────┼──────────────────→ EFFORT
        LOW EFFORT                  HIGH EFFORT
    (Quick to build)            (Takes weeks)
```

**Strategy:** Build bottom-right (#4-7) for solid foundation, then top-left (#1-3) for quick wins.

---

# Features overview

This file provides a short, current summary of notable features and pointers to the canonical backlog in `ROADMAP.md`.

Implemented / delivered (high-level)
- Core calculation engine (`calc()`): forecast and current modes, accepts an optional state argument for easier testing.
- KPIs and outputs: Clients, Annual sessions, Service hours, Utilization, Revenue, Fixed/Payroll/Variable costs, Net income.
- Business Intelligence: Break-even analysis with visual indicators and contribution margin calculations.
- Advanced Export & Reporting: Multi-format export (CSV, Excel with formulas, PDF with charts, HTML pages), email sharing, automated report scheduling.
- Data Validation: Comprehensive input validation with contextual error messages and business logic checks.
- Visuals: Revenue composition chart with interactive tooltips (pin/close), utilization gauge, and profit/loss waterfall charts.
- Persistence: Auto-save/load of app state to `localStorage` and saved debug panel state.
- CSV export and scenario save/load/delete UI.
- UI/UX: Responsive mobile layout, collapsible debug panel, enhanced tooltip positioning.
- Finalized header logo (single SVG) and removed legacy logo variants.

Where to find more detail
- The prioritized backlog and next actions live in `ROADMAP.md` (single source of truth).

Selected long-term ideas (examples)
- Shareable URLs (encode scenario in query string) — useful for sharing scenarios without accounts.
- Industry presets — curated templates to speed onboarding.
- Multi-year forecasting & hiring recommendations — for strategic planning.

If you want a fully detailed backlog view, open `ROADMAP.md`.
