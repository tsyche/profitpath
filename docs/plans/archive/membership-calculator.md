# Membership and prepaid-credit calculator (ROADMAP item 24a)

> Archived 2026-10-25: shipped (ROADMAP 24a); folded into AGENTS.md/CLAUDE.md Core Modules and docs/experience-levels.md.
**TL;DR:** A display-only what-if panel: define up to 3 plans (monthly fee, included credits, member discount, eligible services) and up to 3 member profiles (visits per month per service), priced from the scenario's own offerings. For each plan x profile it shows what the member actually saves and what the business keeps, with every percentage naming its denominator. It never feeds `calc()` totals, so credits can't be double counted as revenue.

**Status:** Shipped 2026-10-25
**Fold into:** [AGENTS.md](../../../AGENTS.md) / [CLAUDE.md](../../../CLAUDE.md) "Core Modules" (calculation engine) and [experience-levels.md](../../experience-levels.md).

## Problem

- Membership design is a pricing decision made before any member exists. Today a membership can only be entered as a flat monthly price, which hides what matters:
  - A headline saving ("$120 of credits for $100") is not what a member saves on the services they actually buy.
  - Unused credits are pure margin (breakage), but the app can't show it.
  - Credit redemptions still consume the redeemed service's staff hours and cost.
- Motivated by the 2026-10-23 Sound Stage trial (memberships vs a punch card).

## Design

### Model (all monthly, steady state)

- **Catalog:** the scenario's offerings supply price per session (one-time: per sale), `Var $ / session`, labor %, and hours per session. No second price list. An offering's own `discountPct` is never read, so discounts can't stack implicitly.
- **Plan:** `{ name, monthlyFee, creditsPerMonth ($ value), memberDiscountPct, creditsAtMemberPrice, eligible: offering ids }`.
- **Profile:** `{ name, visits: { offeringId: visitsPerMonth } }`.
- **Redemption rule:** credits are list-price dollars, so eligible services draw down credits at list price. Anything beyond the credits is paid in cash at the member price, `price x (1 - memberDiscountPct)`. Ineligible services are paid in cash at list price. Stacking is opt-in per plan: `creditsAtMemberPrice` (default off) makes credits draw down at the member price. The default matches the Sound Stage rule (no stacking), but the tool does not forbid stacking, since other businesses differ.
- **Per plan x profile result:**
  - Member side: regular spend (all at list), member spend (`fee + cash`), savings $ and %, credits used, credits unused.
  - Business side: revenue (`fee + cash`), delivery cost for all services consumed, margin, staff hours consumed.
  - Headline vs actual: `headline saving = creditsPerMonth - monthlyFee` shown beside the actual saving, because the gap is the point of the tool.
- **No double counting:** revenue is `fee + cash` only. Credit redemption adds delivery cost and hours, never revenue.
- **Expiry:** a profile has fixed monthly visits, so rollover cannot change the steady-state answer (unused credits can never be used later). v1 therefore models use-it-or-lose-it; unused credits are breakage. Variable usage can come from profile ranges later.
- **Punch card:** a prepaid pack is a plan with `monthlyFee = packPrice / validMonths` and `creditsPerMonth = packCredits / validMonths`. A small helper in the UI may do that conversion; no separate model.

### Denominators (acceptance criterion)

| Figure | Denominator |
|---|---|
| Member savings % | regular spend (list price, same visits) |
| Business margin % | revenue (`fee + cash`) |
| Breakage % | credits granted |

Each label states its denominator in the text, e.g. "Savings (% of regular spend)".

### Worked example (becomes the first unit test)

- Plan: fee $100, credits $120/month, 0% discount, studio hour eligible. Studio hour lists at $60.
- Profile: 1 studio hour per month.
- Headline saving: $120 - $100 = +$20. Actual: regular $60, member $100, saving -$40 (-66.7% of regular spend). Credits used $60, unused $60 (50% breakage). The member loses money; the business collects $100 and delivers $60 of service.

### Where it lives

- `src/calculations/membership.ts`, pure and display-only, same shape as `marketPosition.ts`. No change to `calc()` or its cache key.
- UI: an `advanced-feature` section (intermediate+, it refines and compares) among the Outputs analysis panels. It moves with the rest of them in [ui-ux-pass.md](ui-ux-pass.md) Phase 3.
- State: new optional `plans[]` and `profiles[]`, persisted with the scenario (sanitizer, share URL, localStorage, CSV settings). Size-capped arrays like `expenses`.

## Phases

1. **Calc module:** `membership.ts` plus sanitizers and hand-computed unit tests (worked example, ineligible service, discount + credits with and without stacking, offering `discountPct` ignored, zero-fee plan, credits exceeding spend, empty profile, fuzz keys).
   **Gate:** unit, lint, typecheck at or below baseline.
2. **Persistence:** `types.ts`, miscService allowlist, share URL, storage, CSV (both paths, import), default/reset/template, fuzz allowed-key set.
   **Gate:** round-trip tests.
3. **UI:** plan and profile editors, comparison table (rows = profiles, columns = plans), headline-vs-actual line, level gating, e2e with hand-computed values at `intermediate`.
   **Gate:** Playwright chromium + firefox, axe clean.
4. **Finalize:** ROADMAP 24a to the shipped ledger, archive this plan, update docs and test counts.

## Out of scope (log as follow-ups)

- Feeding members into `calc()` (member counts, plan mix as an offering).
- Members supportable per capacity pool.
- Profile ranges (low/base/high) and rollover with variable usage.
- A recommended-plan optimizer.

## Risks

- **Looks like it should feed Outputs:** label the panel "what-if, not included in totals".
- **Persistence checklist is long** (new global state field); phase 2 exists to keep it separate from the math.
- **Section placement churn:** the UI pass will relocate it; keep IDs stable.

## Decisions log

| Date | Decision |
|---|---|
| 2026-10-25 | Credits redeem at list price; discount applies only to cash beyond credits (Claude's recommendation; Tim undecided) |
| 2026-10-25 | Stacking is a per-plan opt-in (`creditsAtMemberPrice`, default off) in v1. No-stacking is a TSS rule, not a tool limit |
| 2026-10-25 | 24a is next, ahead of the UI pass; membership design at TSS is still open, so this is a general tool |
