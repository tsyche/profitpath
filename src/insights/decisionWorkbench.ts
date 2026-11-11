import type { CalcState, Offering, OfferingMetric } from '../types';
import { calc } from '../calculations';
import { applyRangeCase, type RangeCase } from '../calculations/rangeCase';
import { normalizeCurrency } from '../calculations/currency';
import { displayPrice } from '../calculations/offeringPrice';
import {
  applyDriverToOffering, listDriverDefs, scanWinnerChanges,
  type DriverCrossover, type DriverDef, type DriverSpec
} from './decisionDriver';

export interface DecisionOption {
  name: string;
  state: CalcState;
}

/** IDs survive duplicates; a unique name/type also matches separately imported options. */
export function matchOffering(offering: Offering, source: Offering[], target: Offering[]): number {
  const byId = target.flatMap((row, i) => row.id && row.id === offering.id ? [i] : []);
  if (byId.length === 1 && source.filter(row => row.id === offering.id).length === 1) return byId[0];
  const key = (row: Offering) => `${row.type || 'subscription'}:${(row.name || '').trim().toLowerCase()}`;
  const matches = target.flatMap((row, i) => key(row) === key(offering) ? [i] : []);
  return matches.length === 1 && source.filter(row => key(row) === key(offering)).length === 1 ? matches[0] : -1;
}

export interface LossThreshold {
  pct: number | null;
  reason: string;
  conservative?: boolean;
}

/** Total loss on raised services, replacing their loss assumption; other assumptions stay fixed. */
export function breakEvenSalesLoss(baseline: CalcState, option: CalcState, selectedCase: RangeCase): LossThreshold {
  const base = applyRangeCase(baseline, selectedCase);
  const alternative = applyRangeCase(option, selectedCase);
  const first = base.offerings || [];
  const rows = alternative.offerings || [];
  const price = (row: Offering) => displayPrice({ ...row, priceMonthly: row.priceMonthly || 0, sessionsPerYear: row.sessionsPerYear || 1 });
  const raised = rows.flatMap((row, i) => {
    const match = matchOffering(row, rows, first);
    return match >= 0 && (row.type || 'subscription') === (first[match].type || 'subscription') &&
      price(row) > price(first[match]) ? [i] : [];
  });
  if (!raised.length) return { pct: null, reason: 'No matched price increases' };
  const zeroLoss = { ...alternative, offerings: rows.map((row, i) => raised.includes(i) ? { ...row, salesLossPct: 0 } : row) };
  // Cohort costs fall in steps. Keeping every original run cost gives a safe,
  // monotone lower bound instead of assuming the actual profit curve is smooth.
  const groupCosts = raised.filter(i => alternative.mode === 'current' && rows[i].type === 'group' && (rows[i].costPerRun || 0) > 0);
  const stress = { ...zeroLoss, offerings: zeroLoss.offerings.map((row, i) => groupCosts.includes(i) ? { ...row, costPerRun: 0 } : row) };
  const stressMetrics = calc(stress, { ignoreCase: true });
  const retainedRunCosts = Math.max(0, stressMetrics.income - calc(zeroLoss, { ignoreCase: true }).income);
  // Lost negative-contribution sales can help profit. Ignore that benefit when
  // finding the safe interval, so rounding cannot create a false recovery.
  const fixedLossRows = raised.filter(i => stressMetrics.offeringMetrics[i].contributionPerClientMonthly <= 0);
  const conservative = groupCosts.length > 0 || fixedLossRows.length > 0;
  const income = calc(base, { ignoreCase: true }).income;
  const holds = (loss: number) => calc({
    ...stress, offerings: stress.offerings.map((row, i) => raised.includes(i) && !fixedLossRows.includes(i) ? { ...row, salesLossPct: loss } : row)
  }, { ignoreCase: true }).income - retainedRunCosts >= income;
  if (!holds(0)) return { pct: null, reason: 'Below baseline even with no sales loss' };
  if (holds(100)) return { pct: 100, conservative, reason: 'Still matches baseline at 100% loss on raised services' };
  let low = 0;
  let high = 100;
  for (let i = 0; i < 45; i++) {
    const mid = (low + high) / 2;
    if (holds(mid)) low = mid;
    else high = mid;
  }
  let pct = Math.floor(low * 10) / 10;
  const next = Math.round((pct + 0.1) * 10) / 10;
  if (holds(next)) pct = next;
  return { pct, conservative, reason: 'Total loss on raised services while still matching baseline income' };
}

interface OfferingGroup {
  offering: Offering;
  source: Offering[];
  /** Offering index each option uses for this matched row; null when absent. */
  indices: (number | null)[];
}

/**
 * Which offering index each option uses for a matched row, from the cased (undriven)
 * states so a driver change can never alter row identity. Ambiguous duplicate names
 * stay separate instead of silently pairing unrelated rows.
 */
export function buildOfferingGroups(states: CalcState[]): OfferingGroup[] {
  const groups: OfferingGroup[] = [];
  states.forEach((state, optionIndex) => {
    const offerings = state.offerings || [];
    offerings.forEach((offering, i) => {
      const group = groups.find(g => g.indices[optionIndex] === null &&
        matchOffering(offering, offerings, g.source) === g.source.indexOf(g.offering));
      if (group) group.indices[optionIndex] = i;
      else groups.push({ offering, source: offerings, indices: states.map((_, oi) => oi === optionIndex ? i : null) });
    });
  });
  return groups;
}

/** One option's state with the driver applied to its matched row; a no-op returns the same object. */
function applyDriverToState(state: CalcState, groups: OfferingGroup[], driver: DriverSpec | null, optionIndex: number): CalcState {
  if (!driver) return state;
  const idx = groups[driver.rowIndex]?.indices[optionIndex];
  if (idx === null || idx === undefined) return state;
  const offerings = state.offerings || [];
  let changed = false;
  const driven = offerings.map((o, i) => {
    if (i !== idx) return o;
    const next = applyDriverToOffering(o, driver.kind, driver.delta);
    if (next !== o) changed = true;
    return next;
  });
  return changed ? { ...state, offerings: driven } : state;
}

export function buildDecision(
  options: DecisionOption[],
  selectedCase: RangeCase,
  annualGoal: number | null = null,
  driver: DriverSpec | null = null
) {
  if (options.length < 2 || options.length > 4) throw new Error('Choose two to four saved scenarios.');
  const currency = normalizeCurrency(options[0].state.currency);
  const mode = options[0].state.mode || 'forecast';
  if (options.some(o => normalizeCurrency(o.state.currency) !== currency || (o.state.mode || 'forecast') !== mode)) {
    throw new Error('Choose scenarios with the same currency and calculation mode. Currency conversion and mixed-mode rankings are not supported.');
  }
  const goal = annualGoal !== null && Number.isFinite(annualGoal) && annualGoal >= 0 ? annualGoal : null;
  const casedStates = options.map(option => applyRangeCase(option.state, selectedCase));
  const groups = buildOfferingGroups(casedStates);
  // The driver is a lens over the loaded values: it moves cased copies inside this call
  // and never reaches saved scenarios, bundles or share links.
  const drivenStates = casedStates.map((state, optionIndex) => applyDriverToState(state, groups, driver, optionIndex));
  const results = options.map((option, index) => {
    const state = drivenStates[index];
    const metrics = calc(state, { ignoreCase: true });
    const revenueShare = (confidence: Offering['confidence']) => metrics.revenue > 0
      ? metrics.offeringMetrics.reduce((sum, row, i) => sum + ((state.offerings || [])[i]?.confidence === confidence ? row.revenue : 0), 0) / metrics.revenue * 100 : 0;
    return { ...option, state, metrics, guessRevenuePct: revenueShare('guess'), untaggedRevenuePct: revenueShare(undefined),
      goalGap: goal === null ? null : metrics.income - goal,
      loss: index === 0 ? null : breakEvenSalesLoss(drivenStates[0], state, selectedCase) };
  });
  const baseline = results[0];
  const winner = results.reduce((best, row) => row.metrics.income > best.metrics.income ? row : best, baseline);
  const offeringRows: { name: string; values: (OfferingMetric | null)[]; inputs: (Offering | null)[]; indices: (number | null)[] }[] =
    groups.map(g => ({
      name: g.offering.name || 'Unnamed offering',
      values: g.indices.map((idx, optionIndex) => idx === null ? null : results[optionIndex].metrics.offeringMetrics[idx]),
      inputs: g.indices.map((idx, optionIndex) => idx === null ? null : drivenStates[optionIndex].offerings?.[idx] ?? null),
      indices: g.indices
    }));
  const driverDefs = listDriverDefs({ rows: offeringRows, states: casedStates, mode, optionNames: options.map(o => o.name) });
  return { currency, mode, selectedCase, goal, results, winner, offeringRows, improvement: winner.metrics.income - baseline.metrics.income, driver, driverDefs };
}

/**
 * Slider positions where the leading option changes, scanned with calc only (no loss
 * solver) so a 400-step walk over four options stays interactive. Ties keep the earlier
 * option, matching buildDecision's winner rule.
 */
export function scanDriverCrossovers(
  options: DecisionOption[],
  selectedCase: RangeCase,
  def: DriverDef
): DriverCrossover[] {
  const casedStates = options.map(option => applyRangeCase(option.state, selectedCase));
  const groups = buildOfferingGroups(casedStates);
  const driver: DriverSpec = { kind: def.kind, rowIndex: def.rowIndex, delta: 0 };
  const winnerAt = (delta: number) => {
    let bestIndex = 0;
    let bestIncome = -Infinity;
    casedStates.forEach((state, optionIndex) => {
      const income = calc(applyDriverToState(state, groups, { ...driver, delta }, optionIndex), { ignoreCase: true }).income;
      if (income > bestIncome) { bestIncome = income; bestIndex = optionIndex; }
    });
    return bestIndex;
  };
  return scanWinnerChanges(def.min, def.max, def.step, winnerAt);
}
