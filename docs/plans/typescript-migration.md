# TypeScript migration

**TL;DR:** Move ProfitPath from JavaScript to TypeScript in small, always-green steps. Phases 0-1 are done: `checkJs` is on with `strict` off, globals are declared, and a CI ratchet holds the baseline at 162 type errors (was 301). Next come shared types, leaf-first file renames, a strictness ladder, and the 3,720-line `assets/app.jsx` last. Vite and Vitest already handle `.ts`, so there is no build change.

**Status:** Building (Phases 0-2 done, Phase 3 started 2026-10-15)
**Fold into:** [AGENTS.md](../../AGENTS.md) "TypeScript Support" section, then delete this plan.

## Why

- 31 source files and 40 unit-test files hold the profitability math. Type errors there are silent wrong numbers.
- A compiler check on AI-written code is a cheap second reviewer.
- `tsconfig.json` and `typescript` were already installed but pointed at nothing. Now they do something.

## Baseline (measured 2026-10-14)

| Setting | Errors |
|---|---|
| `checkJs`, `strict: false` (current) | 301 |
| `checkJs`, `strict: true` (target) | 1,235 |

- **Non-strict hot spots:** `assets/app.jsx` 139, `assets/services/miscService.js` 27, `src/analytics/analytics-ui.js` 18, `assets/services/scenarioService.js` 16.
- **Non-strict causes:** mostly TS2339 (property does not exist, 241), usually untyped globals (`state`, `$`, `$$`, `XLSX`, `html2canvas`) and DOM elements typed as plain `Element`.
- **Strict adds:** about 450 implicit-any parameters (TS7006) and about 460 property errors. This is where real typing work lives.
- **Unaffected:** `vite build` passes unchanged; `tsc` is check-only (`noEmit`).

## Phases

```mermaid
flowchart LR
  P0[0. checkJs on, done] --> P1[1. Ratchet and globals, done]
  P1 --> P2[2. Shared types]
  P2 --> P3[3. Rename leaf-first]
  P3 --> P4[4. Strictness ladder]
  P3 --> P5[5. Split and convert app.jsx]
  P4 --> P6[6. strict true, lock in]
  P5 --> P6
```

### Phase 0: checkJs on (done)

- `tsconfig.json`: `allowJs`, `checkJs`, `noEmit`, `strict: false`; includes `src/`; test files excluded for now.
- `npm run typecheck` and `just typecheck` added.
- Interim rule in AGENTS.md: touched files become `.ts`, new code is `.ts`.

### Phase 1: ratchet and globals (done 2026-10-15)

- Result: 301 to 164 errors. `scripts/typecheck-ratchet.mjs` compares against `.typecheck-baseline`; `typecheck` runs in the unit job of `test.yml`. Globals live in `src/globals.d.ts` as `any`; Phase 2 replaces them with real types. The remaining errors are mostly DOM `Element` narrowing (TS2339).

_Original scope:_

- Add a baseline check (stored error count, CI fails if `typecheck` reports more) so the 301 can only fall.
- Declare the globals once in `src/globals.d.ts` (`state`, `$`, `$$`, `XLSX`, `html2canvas`, `window.__PP_PLATFORM__`). Expect a large drop in TS2339 and TS2304.
- Add `typecheck` to CI beside lint. Confirm CI minutes impact is negligible (about 10 s).

### Phase 2: shared types (done)

- Done 2026-10-15: `src/types.ts` has the calculation shapes (`CalcState`, `CalcResult`, `Offering`, ...) and `src/calculations/index.js` uses them via JSDoc; `state` in `assets/app.jsx` is typed `CalcState`. Baseline 164 to 162. Typing it caught a dead `.profit` read (per-offering Annual Profit always showed $0) and an early-return result missing the tax fields.
- Done 2026-10-15: `Settings`, `Scenario` and `SanitizedScenarioState` types (JSDoc on `src/settings`, the scenario helpers in `miscService`); `state`, `calc`, `lastMetrics`, `defaultOfferings` and the scenario functions in `src/globals.d.ts` are typed. Count unchanged at 162, error set identical. `calc()`'s argument is optional because it falls back to the global state.
- Left as `any` on purpose: UI/DOM helpers, CDN libraries and analytics globals. Type them as their files convert in Phase 3, not before. Export payloads are built inline as HTML/CSV strings, so there is no payload shape to type.

- Define the core shapes first in `src/types.ts`: scenario, inputs, calculation results, settings, export payloads.
- Start with `src/calculations/`, since everything else depends on its inputs and outputs. These types are what catch real bugs.
- Use them via JSDoc `@type` in files not yet renamed, so benefits arrive before the renames.

### Phase 3: rename, leaf-first

- Done 2026-10-15: `typescript-eslint` + `**/*.ts` ESLint block; Vite `esbuild` override replaced by `oxc.jsx` (the old `include` blocked `.ts` transforms); `src/calculations/index.ts` renamed with JSDoc converted to annotations (error set unchanged at 162). Its tests (`src/test/calculations.test.js` etc.) are still `.js` and move later.

- Order: `src/calculations`, `localization`, `settings`, `insights`, then `assets/utils`, `services`, `hooks`, `components`.
- Per file: `git mv x.js x.ts` as its own commit (keeps history), then fix types, then move its `.test.js` to `.test.ts`.
- Each step must leave `just test`, `just lint`, and the typecheck ratchet green.
- ESLint currently only matches `**/*.js` and `**/*.jsx`. Add `typescript-eslint` and a `**/*.ts` block before the first rename.
- E2E specs: `tests/e2e/app.spec.ts` is already TS; convert the rest last (Playwright runs `.ts` natively).
- Done 2026-10-15 (uncommitted): `localization`, `settings`, `insights`, `assets/utils`, `useTableFocus` renamed. Build, ratchet (162) and e2e (133) green.

### Phase 3b: analytics and accessibility

- `src/analytics/*.js` and `assets/accessibility.js` were not in the Phase 3 list. Convert after Phase 3, same recipe. Their globals and DOM helpers stay `any` per the rule above.

### Phase 4: strictness ladder

Turn flags on one at a time, fixing each before the next, in this order:

1. `noImplicitAny` (the roughly 450 TS7006 errors)
2. `strictNullChecks` (TS18047 and TS2322 families)
3. `strictFunctionTypes`, `strictBindCallApply`, the rest
4. `"strict": true` and delete the individual flags

### Phase 5: `assets/app.jsx`

- 3,720 lines, 139 errors, no real JSX (it uses a custom `h` factory through a Vite `oxc.jsx` pragma override).
- **Split first:** pull cohesive blocks into modules (dashboard, scenarios, export, etc.), then convert each as a normal Phase 3 file. Converting the monolith in place would be one unreviewable change.
- Finish by renaming the entry to `app.ts`, updating `index.html` (`src="assets/app.jsx"`) and `package.json` `main`, and dropping the `oxc.jsx` pragma override in `vite.config.js`.

### Phase 6: lock in

- `strict: true`, ratchet baseline at 0, ratchet check replaced by a plain `tsc` gate.
- Remove JS-only config (ESLint `.js` blocks, `allowJs`, `checkJs`).
- Fold the result into AGENTS.md and delete this plan.

## Risks

| Risk | Mitigation |
|---|---|
| Behavior change from renames | Rename-only commits; tests and e2e green each step; one module per change |
| Global mutable `state` fights typing | Type it once in `globals.d.ts`; revisit after `app.jsx` is split |
| `any` creep to make errors vanish | Ratchet counts it; `no-explicit-any` as a lint warning in Phase 3 |
| Capacitor/APK build breaks | Bundling stays in Vite; run the APK build once after Phase 3 and Phase 5 |
| Long-running migration stalls | Touched-files rule makes progress on its own; revisit order if a phase sits for 2 months |

## Done when

- No `.js` or `.jsx` under `assets/`, `src/`, or `tests/` (config files excepted).
- `tsc` passes with `strict: true` and zero baseline.
- `just test` and `just lint` pass, and the APK build still succeeds.
- AGENTS.md describes the final state and this plan is deleted.
