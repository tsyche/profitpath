# 📊 ProfitPath — Feature Overview & Priority Matrix

## Status at a Glance

```
┌─────────────────────────────────────────────────────────┐
│  High-Priority Improvements (DONE ✅)                    │
├─────────────────────────────────────────────────────────┤
│ ✅ Pure calc() function                                 │
│ ✅ ARIA labels for accessibility                        │
│ ✅ localStorage persistence                             │
│ ✅ Constants extracted (HOURS_PER_YEAR, etc.)          │
│ ✅ Enhanced focus styling                               │
│ ✅ Better property naming                               │
│ ✅ SEO meta tags                                        │
└─────────────────────────────────────────────────────────┘

Next: Choose 1-3 features from the roadmap below
```

---

## 🟢 QUICK WINS (Week 1)
**Implement these first for quick wins and user feedback**

```
┌─────────────────────────────────────────────────────────┐
│ #1: Add localStorage UI                                 │
├─────────────────────────────────────────────────────────┤
│ Time:    30 min                                         │
│ Value:   ⭐⭐⭐⭐ (user-facing)                         │
│ Effort:  Low (mostly UI)                                │
│                                                         │
│ What:    UI to save/load/manage named scenarios         │
│ Why:     Currently persistence is silent               │
│ Impact:  Makes persistence discoverable                │
│                                                         │
│ Adds:    "Manage Scenarios" button → modal with:        │
│          • List of saved scenarios                      │
│          • Load / Rename / Delete buttons               │
│          • Export scenario as JSON                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #2: Add CSV Export                                      │
├─────────────────────────────────────────────────────────┤
│ Time:    45 min                                         │
│ Value:   ⭐⭐⭐⭐ (high-demand feature)               │
│ Effort:  Low (data → string conversion)                 │
│                                                         │
│ What:    "Export as CSV" button downloads data          │
│ Why:     Users want to analyze in Excel/Sheets         │
│ Impact:  Major workflow improvement                     │
│                                                         │
│ Adds:    Button in Outputs card → download:            │
│          • offerings.csv (name, price, visits, etc.)    │
│          • results.csv (revenue, costs, income, etc.)   │
│          • File: profitpath-YYYY-MM-DD.csv             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #3: Add Per-Offering Metrics                            │
├─────────────────────────────────────────────────────────┤
│ Time:    1 hour                                         │
│ Value:   ⭐⭐⭐ (educational)                          │
│ Effort:  Low (calculations exist, just display)         │
│                                                         │
│ What:    Show profitability in each offering card       │
│ Why:     Users need to see which offerings are best     │
│ Impact:  Helps decision-making                          │
│                                                         │
│ Adds to each card (at bottom):                          │
│          Revenue: $12,400/yr                            │
│          Margin: 85% | Hours/customer: 52              │
│          Contribution: $10,540                          │
└─────────────────────────────────────────────────────────┘
```

**Week 1 Total: 2.5 hours. All features visible. Deploy together.**

---

## 🟡 MEDIUM PRIORITY (Week 2-3)
**Build after quick wins. Stability + visualization.**

```
┌─────────────────────────────────────────────────────────┐
│ #4: Extract Math to Module                              │
├─────────────────────────────────────────────────────────┤
│ Time:    2 hours                                        │
│ Value:   ⭐⭐⭐⭐ (testability)                         │
│ Effort:  Medium (refactoring)                           │
│ PREREQ:  Must do before #5 (tests)                     │
│                                                         │
│ What:    Move calc() to assets/lib/calc.js              │
│ Why:     Enables unit testing; cleaner code             │
│ Impact:  Easier to maintain & extend                    │
│                                                         │
│ Creates: assets/lib/calc.js                             │
│          assets/lib/format.js                           │
│ Updates: assets/app.js (import statements)              │
│                                                         │
│ Result:  app.js shrinks from 585 → 400 lines           │
│          Pure math functions, easy to test              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #5: Add Unit Tests                                      │
├─────────────────────────────────────────────────────────┤
│ Time:    3 hours                                        │
│ Value:   ⭐⭐⭐⭐ (confidence)                          │
│ Effort:  Medium (writing test cases)                    │
│ DEPENDS: On #4 (extract module first)                  │
│                                                         │
│ What:    Unit tests for all calculation logic           │
│ Why:     Prevent regressions; catch edge case bugs     │
│ Impact:  Catch bugs before users do                     │
│                                                         │
│ Tests:   normalizeMix() edge cases                      │
│          rebalanceMix() behavior                        │
│          calc() in both modes                           │
│          Over-capacity detection                        │
│                                                         │
│ Setup:   npm install vitest                             │
│ Run:     npm test                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #6: Add Simple Chart                                    │
├─────────────────────────────────────────────────────────┤
│ Time:    3 hours                                        │
│ Value:   ⭐⭐⭐ (visualization)                         │
│ Effort:  Medium (SVG or CSS graphics)                   │
│                                                         │
│ What:    Visual gauge for utilization + breakdown       │
│ Why:     Visual understanding beats numbers             │
│ Impact:  Easier to spot problems at a glance            │
│                                                         │
│ Options:                                                │
│ A) Simple SVG gauge (no dependencies)                  │
│ B) Chart.js library (pie/bar charts)                   │
│                                                         │
│ Shows:   Current utilization vs. target vs. max         │
│          Color-coded (green/yellow/red)                 │
│          Optional: Revenue/expense breakdown            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ #7: Scenario Comparison UI                              │
├─────────────────────────────────────────────────────────┤
│ Time:    4 hours                                        │
│ Value:   ⭐⭐⭐⭐ (business insight)                    │
│ Effort:  High (new UI pattern)                          │
│                                                         │
│ What:    Load two scenarios, compare side-by-side       │
│ Why:     "What-if" analysis requires comparing          │
│ Impact:  Major feature for strategic planning           │
│                                                         │
│ UI:      Two columns showing:                           │
│          • Scenario name                                │
│          • Key metrics (income, utilization, etc.)      │
│          • Delta highlighting (% change)                │
│                                                         │
│ Example: Scenario 1: +$12k | Scenario 2: +$18k (50%)   │
└─────────────────────────────────────────────────────────┘
```

**Week 2-3 Total: 12 hours. Combine with #1-3 for solid MVP.**

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

## 🎯 Weekly Breakdown

```
WEEK 1: Quick Wins (2.5 hours)
┌───────────────────────────────────┐
│ #1: localStorage UI      (30 min)  │ DEPLOY
│ #2: CSV Export          (45 min)  │ TOGETHER
│ #3: Per-offering metrics (1 hr)   │
└───────────────────────────────────┘
  ↓
  User feedback & validation

WEEK 2: Foundation (5 hours)
┌───────────────────────────────────┐
│ #4: Extract math module (2 hrs)   │
│ #5: Unit tests          (3 hrs)   │
└───────────────────────────────────┘
  ↓
  Code quality improved, confidence up

WEEK 3: Enhancement (4 hours)
┌───────────────────────────────────┐
│ #6: Simple chart        (3 hrs)   │
│ #7: Comparison UI       (4 hrs)   │
└───────────────────────────────────┘
  ↓
  Professional feature set

WEEK 4+: Advanced (12+ hours)
┌───────────────────────────────────┐
│ #8: Shareable URLs      (2 hrs)   │
│ #9: Industry presets    (6 hrs)   │
│ #10: Multi-year forecast (8 hrs)  │
│ #11: Optimizer mode     (8+ hrs)  │
└───────────────────────────────────┘
  ↓
  Market differentiation
```

---

## 💾 File Changes by Feature

| Feature | New Files | Modified Files | Complexity |
|---------|-----------|----------------|------------|
| #1 | — | app.js, index.html, styles.css | Medium |
| #2 | — | app.js | Low |
| #3 | — | app.js, styles.css | Low |
| #4 | lib/calc.js, lib/format.js | app.js | Medium |
| #5 | __tests__/calc.test.js, vitest.config.js | — | Medium |
| #6 | — | index.html, app.js, styles.css | Medium |
| #7 | — | app.js, index.html, styles.css | High |
| #8 | — | app.js | Low |
| #9 | lib/presets.js | app.js, index.html | Medium |
| #10 | — | app.js, index.html, styles.css | High |
| #11 | lib/optimizer.js | app.js | Very High |

---

## 🚀 Which Should You Pick?

**If you have 30 minutes:** #2 (CSV Export)
**If you have 1 hour:** #1 + #2 (localStorage UI + CSV)
**If you have 2.5 hours:** #1 + #2 + #3 (all quick wins)
**If you have a day:** Add #4 + #5 (foundation)
**If you have a week:** Add #6 + #7 (enhancement)

---

## 📖 Documentation Map

```
Start here ──→ ROADMAP.md (5 min read)
                   ↓
         Choose feature ──→ IMPROVEMENTS.md (details)
                   ↓
         Implement ──→ Follow step-by-step guide I provide
                   ↓
         Verify ──→ VERIFICATION.md (test cases)
                   ↓
         Deploy ──→ Push to production ✅
```

---

## Next Step

**Tell me which feature you want to build:**

- 🟢 #1: localStorage UI
- 🟢 #2: CSV Export  
- 🟢 #3: Per-offering metrics
- 🟡 #4: Extract math module
- 🟡 #5: Unit tests
- 🟡 #6: Simple chart
- 🟡 #7: Comparison UI
- 🔴 #8-11: Long-term features

I'll provide the exact implementation steps! 🚀
