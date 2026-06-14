// Regression tests for the forecast-mode "Auto-balance Mix %" feature.
// When one offering's mix % changes, the others must rebalance so the total
// stays at 100%. This was silently broken (rebalanceMix threw because `clamp`
// was never imported), leaving totals like 127%.

import { describe, it, expect } from 'vitest';
import { rebalanceMix } from '../../assets/services/businessLogic.js';

function setOfferings(...mixPcts) {
  global.state = {
    offerings: mixPcts.map((m, i) => ({
      id: 'o' + i, name: 'O' + i, priceMonthly: 100, sessionsPerYear: 12,
      hoursPerSession: 1, variableCostPerSession: 0, mixPct: m, currentClients: 0,
    })),
  };
}
const total = () => global.state.offerings.reduce((s, o) => s + Number(o.mixPct), 0);

describe('rebalanceMix (forecast Auto-balance Mix %)', () => {
  it('keeps the total at 100% when one offering changes', () => {
    setOfferings(33, 33, 34);
    rebalanceMix(0, 60);
    expect(global.state.offerings[0].mixPct).toBeCloseTo(60, 5);
    expect(total()).toBeCloseTo(100, 5);
  });

  it('distributes the remainder proportionally among the others', () => {
    setOfferings(50, 30, 20); // others 30:20 share the remaining 40 -> 24/16
    rebalanceMix(0, 60);
    expect(global.state.offerings[1].mixPct).toBeCloseTo(24, 5);
    expect(global.state.offerings[2].mixPct).toBeCloseTo(16, 5);
    expect(total()).toBeCloseTo(100, 5);
  });

  it('clamps an out-of-range input into [0, 100]', () => {
    setOfferings(33, 33, 34);
    rebalanceMix(0, 150);
    expect(global.state.offerings[0].mixPct).toBe(100);
    expect(total()).toBeCloseTo(100, 5);
  });

  it('distributes evenly when the other offerings are all zero', () => {
    setOfferings(100, 0, 0); // remaining 60 split evenly -> 30/30
    rebalanceMix(0, 40);
    expect(global.state.offerings[1].mixPct).toBeCloseTo(30, 5);
    expect(global.state.offerings[2].mixPct).toBeCloseTo(30, 5);
    expect(total()).toBeCloseTo(100, 5);
  });
});
