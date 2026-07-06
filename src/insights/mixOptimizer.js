/**
 * Client Mix Optimizer
 * Given current capacity and offerings, searches for the offering mix
 * (mixPct per offering) that maximizes profit or utilization within capacity.
 */

import { calc } from '../calculations/index.js';

const GRID_STEPS = 11; // 0%, 10%, ..., 100% per offering
const MAX_GRID_OFFERINGS = 5; // grid search combinations grow combinatorially; beyond this, hill-climb only

/**
 * Generates candidate mix vectors (percentages summing to 100) for N offerings
 * by walking a coarse grid, then refines the best candidate with a local search.
 * @param {number} count - Number of offerings
 * @returns {Array<number[]>} Candidate mix vectors
 */
function generateGridCandidates(count) {
  if (count <= 0) return [];
  if (count === 1) return [[100]];

  const candidates = [];
  const step = 100 / (GRID_STEPS - 1);

  const build = (remaining, slotsLeft, current) => {
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
 * @param {number[]} startMix - Starting mix percentages (sum to 100)
 * @param {Function} score - (mix) => number, higher is better
 * @returns {number[]} Refined mix
 */
function refineMix(startMix, score) {
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
  constructor(state, metrics) {
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
    if (!Array.isArray(offerings) || offerings.length < 2) {
      return null;
    }

    const scoreOf = (result) => objective === 'utilization' ? result.capacityPct : result.income;

    const runMix = (mixVector) => {
      const testState = {
        ...this.state,
        mode: 'forecast',
        offerings: offerings.map((o, idx) => ({ ...o, mixPct: mixVector[idx] }))
      };
      return calc(testState, { enableCache: false });
    };

    const candidates = offerings.length <= MAX_GRID_OFFERINGS ? generateGridCandidates(offerings.length) : [];
    let bestMix = offerings.map((o) => Number(o.mixPct) || 0);
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

    const currentIncome = this.metrics?.income ?? 0;
    const currentCapacityPct = this.metrics?.capacityPct ?? 0;

    return {
      objective,
      currentMix: offerings.map((o) => ({ name: o.name, mixPct: Number(o.mixPct) || 0 })),
      suggestedMix: offerings.map((o, idx) => ({ name: o.name, mixPct: Math.round(bestMix[idx] * 10) / 10 })),
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
 * @param {Object} state - Application state
 * @param {Object} metrics - Current calc() result
 * @param {'profit'|'utilization'} objective
 * @returns {Object|null} Optimization result
 */
export function optimizeMix(state, metrics, objective = 'profit') {
  const optimizer = new MixOptimizer(state, metrics);
  return optimizer.optimize(objective);
}
