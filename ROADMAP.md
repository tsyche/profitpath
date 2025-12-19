# ProfitPath — Quick-Start Roadmap

## What's Done ✅

All 7 high-priority improvements are **complete and deployed**:
- Pure functions for testability
- ARIA labels for accessibility
- localStorage persistence
- Constants extracted
- Enhanced focus styling
- Better property naming
- SEO meta tags

**Status:** Production-ready. Zero breaking changes. Fully backward-compatible.

---

## What's Next? 📋

Choose from 11 planned features in prioritized order. Detailed specs are in `IMPROVEMENTS.md`.

### 🟢 **WEEK 1: Quick Wins** (Recommended next step)
**Total time: ~2.5 hours. Highest impact per hour.**

#### 1. Add localStorage UI (30 min)
- **What:** UI to save/load/manage named scenarios
- **Why:** Currently persistence is silent; users can't easily see or manage saved data
- **Value:** ⭐⭐⭐⭐ (user-facing feature)
- **Impact:** Makes persistence feature discoverable
- **Start here if:** You want visible scenario management

#### 2. Add CSV Export (45 min)
- **What:** "Export as CSV" button downloads offerings + results
- **Why:** Users want to analyze in Excel/Sheets or share external reports
- **Value:** ⭐⭐⭐⭐ (high demand feature)
- **Impact:** Major workflow improvement
- **Start here if:** You want data portability

#### 3. Add Per-Offering Metrics (1 hr)
- **What:** Show revenue, margin %, hours-per-customer in each offering card
- **Why:** Users need to see which offerings are most profitable
- **Value:** ⭐⭐⭐ (educational)
- **Impact:** Helps decision-making
- **Start here if:** You want more detailed offering analysis

---

### 🟡 **WEEK 2-3: Medium Priority** (After quick wins)
**Total time: ~5-8 hours. Stability, testing, visualization.**

#### 4. Extract Math Module (2 hrs) — PREREQUISITE FOR #5
- **What:** Move `calc()`, `normalizeMix()` to `assets/lib/calc.js`
- **Why:** Enables unit testing; cleaner architecture
- **Value:** ⭐⭐⭐⭐ (testability)
- **Must do before:** Unit tests (#5)

#### 5. Add Unit Tests (3 hrs) — DEPENDS ON #4
- **What:** Test all calculation logic edge cases
- **Why:** Prevent regressions; catch bugs early
- **Value:** ⭐⭐⭐⭐ (confidence)
- **Prerequisite:** #4 (extract module first)

#### 6. Add Simple Chart (3 hrs)
- **What:** Visual gauge or bar chart for utilization/revenue breakdown
- **Why:** Visual understanding beats numbers
- **Value:** ⭐⭐⭐ (visualization)
- **Impact:** Easier to spot capacity issues

#### 7. Scenario Comparison UI (4 hrs)
- **What:** Load two scenarios side-by-side with delta highlighting
- **Why:** "What-if" analysis requires comparing scenarios
- **Value:** ⭐⭐⭐⭐ (business insight)
- **Impact:** Major feature for strategic planning

---

### 🟠 **WEEK 3-4: Platform & Deployment**
**Total time: ~1-2 days. Expands reach and reliability.**

#### 8. Deploy Webapp to VPS (2-4 hrs)
- **What:** Set up and deploy the static webapp to a VPS (e.g., DigitalOcean, Linode)
- **How:** Use Nginx or Caddy as a reverse proxy; optionally Dockerize for easy updates
- **Why:** Enables public access, custom domain, and SSL
- **Value:** ⭐⭐⭐⭐ (production-ready hosting)
- **Start here if:** You want a live, public site

#### 9. Mobile App Setup (Android/iOS) (1-2 days)
- **What:** Convert the webapp to a mobile app using Capacitor, Cordova, or React Native WebView
- **How:** Wrap the static app, configure icons/splash, test on devices, publish to Play Store/App Store
- **Why:** Reach mobile users, offline access, app store presence
- **Value:** ⭐⭐⭐⭐ (broadens audience)
- **Start here if:** You want a native-like mobile experience

---

## Implementation Decision Tree

**Choose your next feature:**

```
Are you a developer who wants to improve the codebase?
├─ YES → Start with #4 (Extract math module) + #5 (Unit tests)
│        Then move to UI features
└─ NO → Start with #1, #2, or #3 (visible quick wins)

Do you want to iterate with users first?
├─ YES → Deploy #1, #2, #3 in Week 1
│        Gather feedback
│        Plan #4-11 based on what users request
└─ NO → Build what you think is most valuable next

Do you need to maintain/test the code?
├─ YES → Do #4 (extract module) before anything else
│        Then #5 (tests)
└─ NO → Skip #4-5; go straight to #1, #2, #3

Is this a commercial product?
├─ YES → Priority: #1, #2, #3 (user-facing), then #8, #9 (market diff)
└─ NO → Priority: Whatever interests you most
```

---

## Development Workflow

### Before you start ANY feature:
1. Create a new branch: `git checkout -b feature/csv-export`
2. Make changes on the branch
3. Test locally: `python3 -m http.server 9000`
4. Commit with clear message: `git commit -m "feat: add CSV export"`

### After each feature:
1. Test in browser (manual QA)
2. Check localStorage still works
3. Test on mobile (DevTools → responsive design)
4. Run any tests: `npm test` (after #5)
5. Merge to main: `git merge`
6. Deploy (upload to hosting)

---

## Estimated Timeline

| Timeline | What | Time |
|----------|------|------|
| **Week 1** | #1 + #2 + #3 | 2.5 hrs |
| **Week 2** | #4 + #5 + #6 | 8 hrs |
| **Week 3** | #7 | 4 hrs |
| **Week 3-4** | #8, #9 | 16+ hrs |
| **Week 4+** | #10, #11 | 8+ hrs |
| **TOTAL** | All features | ~30 hours |

---

## FAQ: Which Feature Should I Build First?

**"I want to ship something fast"**
→ Do #2 (CSV Export, 45 min). Users love it. Easy win.

**"I want to improve code quality"**
→ Do #4 (Extract module, 2 hrs) + #5 (Tests, 3 hrs). Pays off longterm.

**"I want to wow users"**
→ Do #7 (Scenario comparison, 4 hrs). Most impactful for workflows.

**"I want to reduce support questions"**
→ Do #1 (localStorage UI, 30 min) + #3 (Metrics, 1 hr). Users understand better.

**"I want a balanced roadmap"**
→ Do Week 1 (#1 + #2 + #3), then Week 2 (#4 + #5 + #6).

---

## File Changes Reference

| Feature | Files | Complexity |
|---------|-------|------------|
| #1: localStorage UI | `app.js`, `index.html`, `styles.css` | Medium |
| #2: CSV Export | `app.js` | Low |
| #3: Per-offering metrics | `app.js`, `styles.css` | Low |
| #4: Extract module | Create `lib/calc.js`, update `app.js` | Medium |
| #5: Unit tests | Create `__tests__/`, `vitest.config.js` | High |
| #6: Chart | `index.html`, `app.js`, `styles.css` | Medium |
| #7: Comparison UI | `app.js`, `index.html`, `styles.css` | High |
| #8: URLs | `app.js` | Low |
| #9: Presets | Create `lib/presets.js`, update `app.js` | Medium |
| #10: Multi-year | `app.js`, `index.html` | High |
| #11: Optimizer | `app.js` (new module) | Very High |

---

## Quick Commands

```bash
# Test locally
python3 -m http.server 9000

# Create feature branch
git checkout -b feature/csv-export

# After edits, view changes
git diff assets/app.js

# Commit feature
git commit -m "feat: add CSV export"

# When ready for tests (after #4)
npm install --save-dev vitest
npm test

# Build test suite (after #5)
npm run test:watch
```

---

## Next Action

**Pick one feature from 🟢 QUICK WINS and tell me which one:**

1. **Add localStorage UI** (manage scenarios)
2. **Add CSV Export** (download data)
3. **Add per-offering metrics** (revenue, margin %)

I'll provide:
- Step-by-step implementation guide
- Code snippets (copy-paste ready)
- Testing checklist
- Before/after screenshots

Which would you like to build? 🚀
