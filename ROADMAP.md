# ProfitPath — Consolidated Roadmap (single source of truth)

This ROADMAP is the single source of truth for ideas, priorities, and next actions. It includes a prioritized backlog of future improvements.

See README.md for setup and development instructions.

---

## Recently Completed ✅

**Five Most Recent Completions (June 2026)**

1. **Code Audit & Security Hardening** — Recovered 20 hidden tests (test:run scope fixed to cover src/); fixed deprecated `escape()`/`unescape()` in share-link encode/decode; escaped `e.message` before innerHTML injection; migrated unprefixed localStorage keys (`onboardingCompleted`, `selectedIndustry`) to `profitpath-` namespace with backward-compatible migration shim; applied npm security patches (babel, postcss); minor package updates (vitest, vite, playwright, eslint)
2. **UI Modernization — merged to main** — Full Material-influenced dark/light theming, no-flash toggle, emerald default + runtime accent palettes, self-hosted Inter font, elevation/motion system, `prefers-reduced-motion` guard; slim app-bar redesign with hamburger drawer, at-a-glance KPIs, mode-toggle badge; all modals themed via design tokens; analytics dashboard internals themed; dead mobile\* handler bindings removed; `escapeHtml` consolidated to single implementation (`9e668c9`, `a8c4621`, `fea798c`, `5fbe65d`)
3. **Share/Copy UX Polish** — Click-to-copy on all shareable URL and embed code fields; fixed copy-on-click toast (TypeError on undefined clipboard); compare/share white-screen bug, share link unicode encoding, embed modal blur, dark mode text legibility (`5f803ca`, `27d2a9e`, `17b9cdf`, `9db5571`)
4. **Help & Onboarding Enhancements** — Contextual '?' help on KPI cards, Quick Reference modal, guided tour selector fixes, welcome dialog theming (`0c7a945`)
5. **Data Visualization & Visual Indicators** — SVG utilization ring, KPI status border tints (good/warn/danger), break-even progress bar (`f112a7a`)

**Earlier (April–May 2026)**
- Customer Acquisition & Growth Modeling — CAC, LTV, churn rate, growth projections
- Localization & Formatting Infrastructure — multi-currency, localized number formatting
- Accessibility & Mobile Experience — keyboard navigation, screen-reader optimization, touch targets
- Code Audit & Repo Hardening — XSS + CSV injection fixes, localStorage key-drift, ~8.5k dead lines removed, PWA manifest repaired
- Workflow Automation & CI/CD — justfile migration, GitHub Actions, GitHub Pages, sync-docs recipe
- Mobile App Infrastructure (Capacitor v5) — ios/android project structures, MOBILE_APP_STRATEGY.md
- Settings & Experience Level polish — feature gating, toast queue, tab-style selector, 22-test suite
- Interactive Scenario Comparison — side-by-side diff with summary metrics and sharing

---

## Recommended Next 3

1. ✅ **Read-only Scenario Sharing & Collaborative Comments**
   - View-only share links (`?readonly=1`) — inputs locked, banner shown, "Start your own" CTA
   - Presentation Notes field embedded in shared URL for context
   - Two-option share modal: View Only vs Editable links
   - `overscroll-behavior: contain` + idempotent `closeDrawer` as part of this release

2. **Tax & Financial Report Generator** (~2-3 hrs)
   - Quarterly income projection summaries
   - Tax liability report with itemization
   - Business performance summary for loan applications
   - PDF export with professional formatting
   - Extends app value beyond simulation; natural premium-tier candidate

3. **Performance Optimization & Caching** (~3-4 hrs)
   - Profile calculation engine; identify bottlenecks in the debug panel
   - Optimize cache hit rates (visible in performance panel)
   - Improve rendering performance for large datasets
   - Strategic unblock for heavier features (multi-year projections, advanced analytics)

---

## Fully Prioritized Backlog (high → low)

**Code Quality**

0. Burn down 140 test-file lint warnings
   - Majority are `no-unused-vars` (83) and `no-console` (54) in test files
   - Zero errors; all warnings are pre-existing and low-risk
   - Effort: ~1 hour

**Collaboration & Insights (High-Value Additions)**

1. Read-only Scenario Sharing & Collaborative Comments ← *Recommended next*
   - Generate shareable read-only links for scenarios
   - Annotation/comment system on calculations and offerings
   - Client presentation mode without editing risk
   - Effort: ~2-3 hours

2. Tax & Financial Report Generator ← *Recommended next*
   - Quarterly income projection summaries, tax liability, PDF export
   - Effort: ~2-3 hours

3. Performance Optimization & Caching ← *Recommended next*
   - Profile calc engine, optimize cache hit rates, improve rendering for large datasets
   - Unblocks multi-year projections, advanced analytics
   - Effort: ~3-4 hours

4. AI-Powered Profitability Insights Engine
   - Rules-based optimization suggestions ("increase price X by 10%")
   - Automated alerts for declining utilization
   - Competitive pricing recommendations
   - Auto-generated what-if scenarios
   - Impact: Transforms calculator into strategic advisor
   - Effort: ~3-4 hours

**Visual Design & Polish**

5. Micro-interactions & Animation Polish
   - ✅ Partially done: spring button press, card/KPI hover lift, motion easing, `prefers-reduced-motion` guard
   - Remaining: animated KPI counters (numbers rolling up on recalculation), CSS ripple on buttons, smoother modal/toast entrance
   - Effort: ~2 hours remaining

6. Modern Visual Effects & Color Enhancement
   - ✅ Done: light/dark mode, runtime accent palettes, self-hosted Inter, elevation scale
   - Remaining: subtle gradient layers on KPI boxes/section headers, typography rhythm pass
   - Effort: ~1-2 hours

**Advanced Analytics (4-6 Hour Tasks)**

7. Advanced Chart Types
   - Heat maps for multi-variable sensitivity analysis
   - Radar charts for balanced scorecard views
   - Funnel charts for customer journey
   - Geographic pricing maps
   - Effort: ~4-6 hours

8. Industry Benchmarks & Competitive Pricing
   - ✅ Templates complete (consulting, cleaning, landscaping, fitness, photography, handyman)
   - Remaining: industry benchmark comparisons, regional pricing data, success metric standards
   - Effort: ~4-6 hours (templates done; focus on benchmarking data)

9. Seasonal & Market Adjustments
   - Seasonal demand modeling with monthly/quarterly variations
   - Geographic pricing variations by region
   - Economic indicator integration
   - Effort: ~4-5 hours

**Mobile & Platform Support (Deferred — blocked by macOS version)**

10. Native Android & iOS App via Capacitor ⭐ DETAILED STRATEGY AVAILABLE
    - **⚠️ Blocked**: Capacitor v6+ requires Xcode 15+, which requires macOS Ventura (13.x). Current machine is macOS Monterey (12.6) / Xcode 14.2. The Capacitor v5 infrastructure (ios/, android/, capacitor.config.ts) is already in place — this unblocks automatically once macOS is upgraded. The 5 high-severity `tar` vulnerabilities in `@capacitor/cli` also resolve with the Capacitor v8 upgrade.
    - **See [MOBILE_APP_STRATEGY.md](MOBILE_APP_STRATEGY.md) for complete implementation guide**
    - Effort: ~36-45 hours remaining (Phase 1 partially done; revalidate after macOS upgrade):
      - Phase 1 (Setup revalidation): 1-2 hours
      - Phase 2 (iOS): 8-10 hours
      - Phase 3 (Android): 6-8 hours
      - Phase 4 (Post-launch): Ongoing (~1.5 hrs per update release)

**Enterprise Features (Scale Layer — Deferred)**

11. Advanced Scenario Management
    - Scenario versioning and history tracking
    - Bulk import/export operations
    - Team sharing and permissions (requires backend infrastructure)
    - Effort: ~8-10 hours

12. Integration & Automation
    - API for third-party integrations
    - Webhook notifications for key metrics
    - CRM/ERP system connections
    - **Note**: Requires backend infrastructure
    - Effort: ~10-12 hours

13. Multi-Year Strategic Planning
    - 3-5 year financial projections
    - Hiring and scaling recommendations
    - Investment payback analysis
    - Effort: ~8-10 hours

14. Optimizer Mode & AI Insights
    - Machine learning price optimization
    - Predictive analytics for business outcomes
    - **Note**: Significant scope, may require ML infrastructure
    - Effort: ~12-15 hours

---

## Monetization Strategy

### Current: Free Tier Only
ProfitPath is 100% free with all calculator features available. No monetization until the app is live and user feedback validates market demand.

### Future Freemium Model (Post-Launch, 3-6 Months)

**Tier 1: Free (Current App)**
- All calculator features (forecast, current mode, scenario management)
- Basic exports (CSV)
- Experience levels 1-2 (Beginner/Intermediate)
- localStorage persistence

**Tier 2: Premium ($3.99/month or $32/year)**
- Full Advanced experience level (all features unlocked)
- Multi-format exports (PDF with charts, Excel with formulas, HTML)
- Scenario comparison (side-by-side diff)
- Sensitivity analysis
- Tax calculations & quarterly estimates
- Performance dashboard
- Estimated 5-15% conversion rate

**Tier 3: Pro ($7.99/month or $64/year) — Optional, if demand exists**
- Team sharing (read-only scenario links with comments)
- Automated email reporting
- White-label PDF export
- Priority support
- Estimated 1-5% conversion rate

### Why Not Ads?
Ads destroy trust in financial planning tools. Business owners need to feel confident, not distracted. "Opt-in ads to unlock premium" was considered and rejected: the app's target users are small business owners who skew privacy-conscious, the ad SDK would add tracking we explicitly don't want, and the UX complexity of a three-path paywall (pay / watch ads / do neither) is a support nightmare for a solo developer. Freemium subscription is the proven model for business SaaS.

### Why Not One-Time Purchase?
- Doesn't scale with a growing feature set
- Users expect ongoing improvements in a SaaS world
- Subscription enables sustainable development (especially hobby-scale)
- Easier to experiment with pricing
- *Exception*: a lifetime license option at a premium price point is worth exploring (see Alternative Access section below) — but as a separate SKU, not a replacement for subscriptions

### Alternative Access & Anti-SaaS Strategies

The SaaS model is under real pressure as AI commoditizes software. These options serve users who will never click "subscribe" and hedge against that trend:

**Referral Program**
- Existing users get X free months of Premium for each successful referral (e.g. 1 month per referral, capped at 12)
- Referral tracked by a short URL or promo code; no account required on either end (Play Billing handles identity)
- Doubles as a word-of-mouth growth channel with zero ad spend

**Card-on-File Trial**
- 7–14 day full Premium trial gated by a payment method on file (not a free trial that converts nobody)
- Converts to paid automatically; cancellation is one tap
- Optional: trial unlocked by completing a short in-app feedback survey instead of card, to maximize top-of-funnel reach

**Lifetime License (One-Time Purchase)**
- Single SKU at ~5–6× the annual price (e.g. $149–$179) sold directly or via Gumroad/Lemon Squeezy
- Targets the "I'm never paying another SaaS bill" buyer segment — a real and growing demographic
- Revenue is lumpy (one-time) but requires no ongoing relationship
- No-backend verification: Play Store APK uses Play Billing's one-time product; web app uses a signed license key (see Technical Notes)
- Offer it as a "Founding Member" tier at launch to reward early adopters; can close it later

**Supporter / Voluntary Tier**
- "Buy me a coffee" style voluntary payment for users who find the app valuable but don't need Premium features
- Implemented as a Gumroad tip link or a dedicated in-app button; no feature unlock tied to it
- Surprisingly effective for solo-dev tools with loyal users; low overhead
- Signals genuine appreciation and provides early social proof for the product

**Consumable AI Credits (Future)**
- If AI-powered features land (smart price optimization suggestions, anomaly detection on inputs, auto-generated financial narrative in exports), bill them as consumable credit packs rather than gating them behind a subscription tier
- Users buy a pack of credits (e.g. 50 analyses for $2.99), recharge as needed — no subscription required
- Aligns cost with value: heavy users pay more, casual users aren't punished
- Avoids the "I'm paying monthly for a feature I use twice a year" resentment

**Curated Affiliate Partnerships (Not Ads)**
- Surface contextual recommendations for genuinely useful adjacent tools: payroll software, scheduling apps, accounting integrations (QuickBooks, Wave), business insurance
- Implemented as a tasteful "Tools We Use" section or in-context suggestion (e.g. after a tax calc, link to Wave)
- Affiliate commission only; no display ad networks, no tracking pixels, no SDK installs
- Revenue is passive and scales with traffic; aligns with the "no ads" principle because we control the relationship
- Example: Housecall Pro, Jobber, or Gusto partnerships would be directly relevant to the user base

**Industry Template Pack DLC**
- Core industry templates stay free; specialized or niche packs sold as one-time in-app purchases ($0.99–$2.99 per pack)
- Examples: Medical/dental practices, food trucks, short-term rentals, auto detailing, music lessons
- Each pack is a curated set of pre-configured offerings, cost structures, and reasonable defaults
- Low development cost; customers self-select by vertical; builds a long tail of revenue

**B2B / Consultant License**
- White-label rights or a multi-client license for business coaches, consultants, and accountants who would use ProfitPath as a client-facing tool
- Priced as an annual seat license rather than individual subscriptions (e.g. $99–$299/yr for up to 10 client scenarios)
- Distribution vector: one consultant selling to their book of clients = organic growth with zero marketing spend
- Future option; only worth pursuing once the core product has proven traction

**"Privacy-First, No Cloud" as a Paid Differentiator**
- The entire category of SaaS financial tools sends data to a server. ProfitPath doesn't — everything stays on device
- This is currently an implicit feature; make it explicit and use it as a premium marketing claim
- Could support a premium "verified offline" tier or simply use it as conversion copy to justify paying vs. using a free tool that mines data
- Dovetails naturally with the "no account required" architecture

### No-Backend Licensing Architecture
If any paid tier is offered on the web (GitHub Pages build), a backend-free verification model is required:
- **Android APK**: Play Billing handles licensing natively via local IPC to the Play Store app — no server call needed post-purchase; works fully offline
- **Web app**: On purchase (Lemon Squeezy / Gumroad), a serverless function (Cloudflare Worker / Vercel Edge) issues a signed JWT license key; the public key is embedded in the web bundle at build time; the app verifies the signature locally — zero phone-home after purchase
- If an account system becomes necessary (e.g. cross-device sync for paid features), defer until there's real demand; adding auth is a multi-week project with ongoing maintenance

### Implementation Timeline
1. **Phase 1** (Now → App Store Launch): Free tier only. Focus on quality and user acquisition.
2. **Phase 2** (3-6 months post-launch): Add Premium subscription via RevenueCat (2-3 hour integration). Add referral program and optional supporter tip link. Monitor conversion rates.
3. **Phase 3** (6-12 months): Evaluate Pro tier based on demand. Launch lifetime license as a limited Founding Member offer. Consider industry template packs if user base has clear vertical clusters.
4. **Phase 4** (12+ months): Affiliate partnerships, B2B/consultant licensing, AI credit packs if AI features ship.

### Revenue Projections (Conservative Estimate)
- **Year 1**: Free tier only (~1,000-5,000 downloads, $0 recurring + occasional tips)
- **Year 2**: Premium tier + 5% conversion @ $32/yr = ~$1,600-8,000 ARR; lifetime licenses add lump-sum one-time revenue
- **Year 3**: Improve conversion to 8% + Pro tier at 1% + affiliates = ~$6,000-30,000 ARR

*Note: These are rough estimates. Actual revenue depends entirely on marketing effort. As a hobby project, expect conservative adoption unless you actively market.*

### Technical Notes
- **RevenueCat** (recommended): Unified dashboard for iOS/Android in-app purchases + subscriptions. ~20% fee after platform cuts. 2-3 hour integration.
- **Stripe**: More complex, requires backend or serverless functions. Better long-term control, higher overhead.
- **Lemon Squeezy / Gumroad**: Best choice for lifetime license and direct web sales; handles VAT, chargebacks, and license key issuance out of the box.

### Build-Time Monetization Toggle
Monetization must be exclusive to the officially signed Play Store build — never present in the GitHub Pages web build, sideloaded/debug APKs, or any other distribution channel.

- Gate paywalled features behind a single build-time flag (e.g. `VITE_MONETIZATION_ENABLED`, read via `import.meta.env` and baked in at build time, not runtime-toggleable in the shipped bundle).
- The flag is set to `true` only in the release workflow that produces the signed Play Store bundle/APK; every other build target (web deploy, debug/dev APK, CI test builds) defaults to `false`.
- Tree-shake/dead-code-eliminate the RevenueCat (or chosen billing SDK) integration entirely when the flag is off, so it's not just hidden but absent from the bundle — reduces APK size for free builds and removes any temptation/ability to reverse-engineer paywall bypass from a build that was never meant to have it.
- Add a CI check or test asserting the flag is `false` in `build-apk.yml`'s default job and only flipped in the dedicated signed-release job, so a future workflow edit can't accidentally ship monetization in an unsigned/test build.

---

## Status & Notes

- **Current status**: Application is fully functional with comprehensive test coverage (315 unit tests across 33 files, 1 skipped, plus 170 Playwright e2e across chromium + firefox), dev server stable. June 2026: completed UI modernization (merged to main), data visualization KPI indicators, help & onboarding enhancements, compare/share bug fixes, click-to-copy UX, and a full code audit with security hardening.
- **Foundation complete**: ✅ Modern Vite build system, ✅ comprehensive test suite, ✅ analytics refactor, ✅ documentation consolidated, ✅ experience levels with feature gating, ✅ micro-interactions & animation polish, ✅ simple visualizations (gauge & waterfall), ✅ scenario comparison (side-by-side diff with exports and sharing), ✅ CSV import, ✅ undo/redo, ✅ performance dashboard, ✅ data visualization KPI indicators, ✅ help & onboarding enhancements, ✅ UI modernization (dark/light, Material, app-bar, all-modals theming).
- **Latest milestones** (June 2026):
  - Code Audit: Recovered 20 hidden tests; fixed deprecated escape()/unescape() in share links; localStorage key namespace migration; npm security patches
  - UI Modernization (merged): Dark/light themes, Material refresh, app-bar redesign, all-modals theming, runtime accent palettes, analytics dashboard fully themed, dead mobile code removed, escapeHtml consolidated
  - Data Visualization: SVG utilization ring, KPI status border tints (good/warn/danger), break-even progress bar
  - Help & Onboarding: Contextual '?' help on complex KPIs, Quick Reference modal, fixed guided tour selectors
  - Share/Copy UX: Click-to-copy on all shareable URL and embed code fields; compare/share/embed bug fixes
- **Next priorities**: Read-only Scenario Sharing → Tax & Financial Report Generator → Performance Optimization (see Recommended Next 3 above)
- **Strategic positioning**: Core financial-modeling + reach + polish foundation is complete. Focus now shifts to collaboration (read-only sharing), extending app value (financial reporting), and performance headroom. Mobile app deferred until macOS upgrade enables Xcode 15+. Enterprise features deferred until market demand validates investment.
- **Known debt**: 140 test-file lint warnings (no errors; pre-existing, low risk). Capacitor stuck at v5.7.8 due to Xcode 14.2 / macOS Monterey — 5 high-severity tar vulnerabilities in @capacitor/cli will resolve when Capacitor v8 upgrade is unblocked by macOS upgrade.

### User Feedback & Research Loop

This section tracks common feature requests, friction points, and competitive gaps reported by users:

- **Collaboration**: Teams requesting read-only sharing and comment features for client presentations
- **Financial Reporting**: Users wanting tax liability estimates and quarterly summaries
- **Performance**: Large scenario reports occasionally show slowdowns with multi-service businesses
- **Accessibility**: Keyboard navigation and screen reader support (shipped)
- **Localization**: Multi-currency support and localized formatting (shipped)
- **Analytics**: CAC/LTV tracking and growth modeling (shipped)
- **Help/Onboarding**: Better contextual help and guided tour (shipped)

**How to use**: Update this list after customer conversations, support tickets, or user interviews. Use to validate roadmap priorities and surface unexpected user needs.

### Test Coverage Status (June 2026)
- **315 unit tests** across 33 files (1 skipped), plus **170 Playwright e2e** across chromium + firefox
- **Pass rate**: 100% of unit tests passing (1 intentional skip); 100% e2e passing; 0 lint errors
- **Health score**: 9/10 — production-ready with excellent feature gating, UI regression, security, and help/onboarding coverage
- **Key test areas**:
  - ✅ **Calculation Engine** (40+ tests): Mode switching, mix normalization, caching, edge cases
  - ✅ **Scenarios** (35+ tests): Creation, loading, comparison, workflow validation
  - ✅ **Feature Gating** (45+ tests): All experience levels, visibility transitions, debug panel behavior
  - ✅ **Export/Import** (25+ E2E tests): CSV, Excel, PDF, email, clipboard export
  - ✅ **Tooltips** (50+ tests): All three tooltip systems, XSS prevention, state tracking
  - ✅ **Security** (E2E): XSS and CSV injection regression suite
  - ✅ **UI/UX**: Mobile UI, modal functionality, scenario comparison, help system, feedback system
  - ✅ **Analytics**: Analytics and feedback system tests
  - ✅ **Visualizations**: Chart data validation, visual consistency
  - ✅ **Performance**: Cache statistics, calculation timing, feature gate tests
