# ProfitPath — Feature Roadmap

## Status ✅

**Completed & Deployed:**
- Pure functions for testability
- ARIA labels for accessibility
- localStorage persistence + UI
- Constants extracted
- Enhanced focus styling
- Better property naming
- SEO meta tags
- Responsive layout optimization (inputs & outputs 774px)
- CSV Export
- Per-Offering Metrics (revenue, margin %, hours per customer)

**Status:** Production-ready. Fully backward-compatible.

---

## What's Next? 📋

Choose from remaining planned features in prioritized order.

###  **Medium Priority** (8-10 hours total)

#### Extract Math Module (2 hrs)
- **What:** Move `calc()`, `normalizeMix()` to `assets/lib/calc.js`
- **Why:** Enables unit testing; cleaner architecture
- **Value:** ⭐⭐⭐⭐ (testability)
- **Prerequisite for:** Unit tests

#### Add Unit Tests (3 hrs)
- **What:** Test all calculation logic edge cases
- **Why:** Prevent regressions; catch bugs early
- **Value:** ⭐⭐⭐⭐ (confidence)
- **Requires:** Extract math module first

#### Add Simple Chart (3 hrs)
- **What:** Visual gauge or bar chart for utilization/revenue breakdown
- **Why:** Visual understanding beats numbers
- **Value:** ⭐⭐⭐ (visualization)
- **Impact:** Easier to spot capacity issues

#### Scenario Comparison UI (4 hrs)
- **What:** Load two scenarios side-by-side with delta highlighting
- **Why:** "What-if" analysis requires comparing scenarios
- **Value:** ⭐⭐⭐⭐ (business insight)
- **Impact:** Major feature for strategic planning

---

### 🟠 **Platform & Deployment** (1-2 days total)

#### Deploy Webapp to VPS (2-4 hrs)
- **What:** Set up and deploy the static webapp to a VPS (e.g., DigitalOcean, Linode)
- **How:** Use Nginx or Caddy as a reverse proxy; optionally Dockerize
- **Why:** Enables public access, custom domain, and SSL
- **Value:** ⭐⭐⭐⭐ (production-ready hosting)

#### Mobile App Setup (1-2 days)
- **What:** Convert the webapp to a mobile app using Capacitor or React Native WebView
- **How:** Wrap the static app, configure icons/splash, publish to stores
- **Why:** Reach mobile users, offline access, app store presence
- **Value:** ⭐⭐⭐⭐ (broadens audience)

---

## Decision: What to Build Next?

**Want visible user improvements?**
→ Per-Offering Metrics (1 hr) — users see which offerings are most profitable

**Want better code?**
→ Extract Math Module (2 hrs) + Unit Tests (3 hrs) — foundation for everything else

**Want to wow users?**
→ Scenario Comparison UI (4 hrs) — enables powerful "what-if" analysis

**Want to go live?**
→ Deploy to VPS (2-4 hrs) — gives you a live URL and custom domain

---

## Quick Commands

```bash
# Test locally
python3 -m http.server 9000

# Create feature branch
git checkout -b feature/per-offering-metrics

# After edits
git commit -m "feat: add per-offering metrics"
```
