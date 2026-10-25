/**
 * Client Mix Optimizer
 * Given current capacity and offerings, searches for the offering mix
 * (mixPct per offering) that maximizes profit or utilization within capacity.
 */

import { calc, normalizeOfferingType } from '../calculations/index';

const GRID_STEPS = 11; // 0%, 10%, ..., 100% per offering
const MAX_GRID_OFFERINGS = 5; // grid search combinations grow combinatorially; beyond this, hill-climb only

/**
 * Generates candidate mix vectors (percentages summing to 100) for N offerings
 * by walking a coarse grid, then refines the best candidate with a local search.
 * @param count - Number of offerings
 * @returns Candidate mix vectors
 */
function generateGridCandidates(count: number): Array<number[]> {
  if (count <= 0) return [];
  if (count === 1) return [[100]];

  const candidates: any[] = [];
  const step = 100 / (GRID_STEPS - 1);

  const build = (remaining: any, slotsLeft: any, current: any) => {
    if (slotsLeft === 1) {
      candidates.push([...current, remaining]);
      return;
    }
    for (let v = 0; v <= remaining; v += step) {
      build(remaining - v, slotsLeft - 1, [...current, v]);
    }
  };

  build(100, count, []);
  return candidates;
}

/**
 * Nudges each offering's mix by +/- delta and keeps improvements (hill-climbing).
 * @param startMix - Starting mix percentages (sum to 100)
 * @param score - (mix) => number, higher is better
 * @returns Refined mix
 */
function refineMix(startMix: number[], score: (...args: any[]) => any): number[] {
  let best = [...startMix];
  let bestScore = score(best);
  const deltas = [5, 1];

  for (const delta of deltas) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < best.length; i++) {
        for (let j = 0; j < best.length; j++) {
          if (i === j) continue;
          if (best[i] < delta) continue;
          const candidate = [...best];
          candidate[i] -= delta;
          candidate[j] += delta;
          const candidateScore = score(candidate);
          if (candidateScore > bestScore) {
            best = candidate;
            bestScore = candidateScore;
            improved = true;
          }
        }
      }
    }
  }

  return best;
}

export class MixOptimizer {
  state: any;
  metrics: any;

  constructor(state: any, metrics: any) {
    this.state = state;
    this.metrics = metrics;
  }

  /**
   * Finds the offering mix that maximizes the given objective.
   * @param {'profit'|'utilization'} objective
   * @returns {Object|null} Optimization result
   */
  optimize(objective = 'profit') {
    const offerings = this.state?.offerings;
    if (!Array.isArray(offerings)) {
      return null;
    }

    // One-time sales use no staff hours and have no demand cap in the model, so the
    // search would pour all mix into them. Keep their share fixed and search the rest.
    const movable = offerings.map((o, idx) => idx).filter((idx) => normalizeOfferingType(offerings[idx].type) !== 'one-time');
    if (movable.length < 2) {
      return null;
    }
    const pinnedPct = offerings.reduce((sum, o, idx) => movable.includes(idx) ? sum : sum + (Number(o.mixPct) || 0), 0);
    const budget = Math.max(0, 100 - pinnedPct);

    // Maps a mix vector over the movable offerings (sums to 100) to a full mix vector.
    const expand = (vec: number[]) => offerings.map((o, idx) => {
      const k = movable.indexOf(idx);
      return k === -1 ? (Number(o.mixPct) || 0) : vec[k] * budget / 100;
    });

    const scoreOf = (result: any) => objective === 'utilization' ? result.capacityPct : result.income;

    const runMix = (vec: any) => {
      const mixVector = expand(vec);
      const testState = {
        ...this.state,
        mode: 'forecast',
        offerings: offerings.map((o, idx) => ({ ...o, mixPct: mixVector[idx] }))
      };
      return calc(testState, { enableCache: false });
    };

    const candidates = movable.length <= MAX_GRID_OFFERINGS ? generateGridCandidates(movable.length) : [];
    const movableTotal = movable.reduce((sum, idx) => sum + (Number(offerings[idx].mixPct) || 0), 0);
    let bestMix = movable.map((idx) => movableTotal > 0 ? (Number(offerings[idx].mixPct) || 0) * 100 / movableTotal : 100 / movable.length);
    let bestResult = runMix(bestMix);
    let bestScore = scoreOf(bestResult);

    for (const candidate of candidates) {
      const result = runMix(candidate);
      const candidateScore = scoreOf(result);
      if (candidateScore > bestScore) {
        bestMix = candidate;
        bestResult = result;
        bestScore = candidateScore;
      }
    }

    const refinedMix = refineMix(bestMix, (mix) => scoreOf(runMix(mix)));
    const refinedResult = runMix(refinedMix);
    if (scoreOf(refinedResult) > bestScore) {
      bestMix = refinedMix;
      bestResult = refinedResult;
      bestScore = scoreOf(refinedResult);
    }
    const bestFullMix = expand(bestMix);

    const currentIncome = this.metrics?.income ?? 0;
    const currentCapacityPct = this.metrics?.capacityPct ?? 0;

    return {
      objective,
      currentMix: offerings.map((o) => ({ name: o.name, mixPct: Number(o.mixPct) || 0 })),
      suggestedMix: offerings.map((o, idx) => ({ name: o.name, mixPct: Math.round(bestFullMix[idx] * 10) / 10 })),
      currentIncome,
      projectedIncome: bestResult.income,
      incomeDelta: bestResult.income - currentIncome,
      currentCapacityPct,
      projectedCapacityPct: bestResult.capacityPct,
      capacityDelta: bestResult.capacityPct - currentCapacityPct,
      improved: objective === 'utilization'
        ? bestResult.capacityPct > currentCapacityPct
        : bestResult.income > currentIncome,
      message: objective === 'utilization'
        ? `Shifting mix toward ${bestResult.offeringMetrics.slice().sort((a, b) => b.clients - a.clients)[0]?.name || 'higher-demand offerings'} could raise utilization from ${currentCapacityPct.toFixed(1)}% to ${bestResult.capacityPct.toFixed(1)}%.`
        : `Optimizing the mix could raise projected annual profit from $${Math.round(currentIncome).toLocaleString()} to $${Math.round(bestResult.income).toLocaleString()}.`
    };
  }
}

/**
 * Public API for mix optimization
 * @param state - Application state
 * @param metrics - Current calc() result
 * @returns Optimization result
 */
export function optimizeMix(state: Record<string, any>, metrics: Record<string, any>, objective: 'profit'|'utilization' = 'profit'): Record<string, any>|null {
  const optimizer = new MixOptimizer(state, metrics);
  return optimizer.optimize(objective);
}
