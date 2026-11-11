import { describe, expect, it } from 'vitest';
import { buildDecision, breakEvenSalesLoss, scanDriverCrossovers } from './decisionWorkbench';
import { displayPrice } from '../calculations/offeringPrice';
import {
  applyDriverToOffering, driverAfter, filledSeats, formatDriverDelta, formatDriverValue,
  groupRuns, listDriverDefs, loadedDriverValue, driverStatusText, scanWinnerChanges
} from './decisionDriver';
import type { CalcState } from '../types';

// Two options whose first winning integer price step is delta 10 (continuous tie at 9.5):
// income = clients × price × 12 − monthlyCosts × 12, so B − A = 120 × (10 + delta) − 2340.
const offering = {
  id: 'a', name: 'Studio', type: 'per-session' as const, priceMonthly: 10, sessionsPerYear: 12,
  hoursPerSession: 1, variableCostPerSession: 0, currentClients: 10, mixPct: 100, confidence: 'verified' as const
};
const today: CalcState = {
  mode: 'current' as const, currency: 'USD', fullTimeEmployees: 1, productiveUtilizationPct: 100,
  fullTimeEmployeePay: 0, monthlyCosts: 100, offerings: [offering]
};
const raise: CalcState = {
  ...today, monthlyCosts: 295,
  offerings: [{ ...offering, id: 'b', currentClients: 20 }]
};
const inputs = [{ name: 'Today', state: today }, { name: 'Raise', state: raise }];

const groupOffering = {
  ...offering, id: 'g', type: 'group' as const, seats: 10, fillPct: 80, currentClients: 77, costPerRun: 100
};
const groupState: CalcState = { ...today, offerings: [groupOffering] };

describe('decision driver', () => {
  it('reproduces the workbench table at the slider base position without touching inputs', () => {
    const before = JSON.stringify(inputs);
    const plain = buildDecision(inputs, 'base');
    const atBase = buildDecision(inputs, 'base', null, { kind: 'price', rowIndex: 0, delta: 0 });
    expect(JSON.stringify(atBase.results)).toBe(JSON.stringify(plain.results));
    expect(JSON.stringify(atBase.offeringRows)).toBe(JSON.stringify(plain.offeringRows));
    expect(atBase.winner.name).toBe('Today');
    expect(JSON.stringify(inputs)).toBe(before);
  });

  it.each([
    { type: 'per-session' as const, priceMonthly: 50, sessionsPerYear: 24 },
    { type: 'one-time' as const, priceMonthly: 10, sessionsPerYear: 1 }
  ])('uses the displayed price unit for $type drivers', fields => {
    const row = { ...offering, ...fields };
    const moved = applyDriverToOffering(row, 'price', 10);
    expect(displayPrice(moved as typeof row)).toBeCloseTo(displayPrice(row) + 10);
    expect(loadedDriverValue('price', row)).toBe(displayPrice(row));
    const state = { ...today, offerings: [row] };
    const def = buildDecision([{ name: 'One', state }, { name: 'Two', state }], 'base').driverDefs.find(d => d.kind === 'price')!;
    expect(formatDriverValue(def, displayPrice(row), 'USD')).toBe(fields.type === 'one-time' ? '$120 / sale' : '$25 / session');
  });

  it('keeps zero and every scanned position on the native step grid', () => {
    const states = [today, raise].map(s => ({ ...s, offerings: [{ ...offering, priceMonthly: 350.25 }] }));
    const decision = buildDecision(states.map((state, i) => ({ name: String(i), state })), 'base');
    const def = decision.driverDefs.find(d => d.kind === 'price')!;
    expect(def.min / def.step).toBe(Math.round(def.min / def.step));
    expect(def.max / def.step).toBe(Math.round(def.max / def.step));
    const visited: number[] = [];
    scanWinnerChanges(def.min, def.max, def.step, delta => { visited.push(delta); return 0; });
    expect(visited).toContain(0);
  });

  it('keeps driven case values when calculating the sales-loss floor', () => {
    const state = { ...today, offerings: [{ ...offering, currentClients: 100, currentClientsLow: 10, currentClientsHigh: 200 }] };
    const alternative = { ...state, monthlyCosts: 200, offerings: [{ ...state.offerings[0], priceMonthly: 20 }] };
    const result = buildDecision([{ name: 'Base', state }, { name: 'Other', state: alternative }], 'conservative', null,
      { kind: 'clients', rowIndex: 0, delta: 5 });
    expect(result.results[0].metrics.clients).toBe(15);
    expect(result.results[1].loss).toEqual(breakEvenSalesLoss(result.results[0].state, result.results[1].state, 'base'));
  });

  it('keeps client and group-run writes within calculator limits', () => {
    expect(applyDriverToOffering({ ...offering, currentClients: 1e6 }, 'clients', 1).currentClients).toBe(1e6);
    expect(applyDriverToOffering(groupOffering, 'runs', 1e6).currentClients).toBeLessThanOrEqual(1e6);
  });

  it('omits an integer run control when fractional filled seats cannot represent each run', () => {
    const state = { ...today, offerings: [{ ...groupOffering, seats: 1, fillPct: 20, currentClients: 1 }] };
    const decision = buildDecision([{ name: 'One', state }, { name: 'Two', state }], 'base');
    expect(decision.driverDefs.some(d => d.kind === 'runs')).toBe(false);
    expect(decision.driverDefs.some(d => d.kind === 'fill')).toBe(true);
  });

  it('pins the price crossover where the leading option changes', () => {
    const def = listDriverDefs({
      rows: buildDecision(inputs, 'base').offeringRows,
      states: [today, raise], mode: 'current', optionNames: ['Today', 'Raise']
    }).find(d => d.kind === 'price')!;
    expect(def.min).toBe(-10);
    expect(def.max).toBe(10);
    expect(scanDriverCrossovers(inputs, 'base', def)).toEqual([{ delta: 10, winnerIndex: 1 }]);
    expect(buildDecision(inputs, 'base', null, { kind: 'price', rowIndex: 0, delta: 9 }).winner.name).toBe('Today');
    expect(buildDecision(inputs, 'base', null, { kind: 'price', rowIndex: 0, delta: 10 }).winner.name).toBe('Raise');
  });

  it('moves group drivers in runs through the seats × fill conversion', () => {
    expect(filledSeats(groupOffering)).toBe(8);
    expect(groupRuns(groupOffering)).toBe(10);
    const moved = applyDriverToOffering(groupOffering, 'runs', 2)!;
    expect(moved.currentClients).toBe(96);
    expect(groupRuns(moved)).toBe(12);
    expect(applyDriverToOffering(groupOffering, 'runs', 0)).toBe(groupOffering);
    expect(loadedDriverValue('runs', groupOffering)).toBe(10);
    expect(loadedDriverValue('runs', offering)).toBeNull();
  });

  it('clamps every driver to its legal bounds', () => {
    expect(applyDriverToOffering(offering, 'price', -1000)!.priceMonthly).toBe(0);
    expect(applyDriverToOffering(offering, 'clients', -500)!.currentClients).toBe(0);
    expect(applyDriverToOffering(groupOffering, 'fill', -1000)!.fillPct).toBe(1);
    expect(applyDriverToOffering(groupOffering, 'fill', 1000)!.fillPct).toBe(100);
    expect(applyDriverToOffering(offering, 'salesLoss', 500)!.salesLossPct).toBe(100);
    expect(applyDriverToOffering({ ...offering, salesLossPct: 10 }, 'salesLoss', -500)!.salesLossPct).toBe(0);
    expect(driverAfter('price', 10, -1000)).toBe(0);
    expect(driverAfter('fill', 80, -1000)).toBe(1);
  });

  it('offers only the drivers each mode and row type supports', () => {
    const rows = buildDecision(inputs, 'base').offeringRows;
    const current = listDriverDefs({ rows, states: [today, raise], mode: 'current', optionNames: ['Today', 'Raise'] });
    expect(current.map(d => d.kind)).toEqual(['price', 'clients', 'salesLoss']);
    const forecast = listDriverDefs({ rows, states: [today, raise], mode: 'forecast', optionNames: ['Today', 'Raise'] });
    expect(forecast.map(d => d.kind)).toEqual(['price', 'salesLoss']);

    const groupRows = buildDecision([{ name: 'Today', state: groupState }, { name: 'Raise', state: groupState }], 'base').offeringRows;
    const group = listDriverDefs({ rows: groupRows, states: [groupState, groupState], mode: 'current', optionNames: ['Today', 'Raise'] });
    expect(group.map(d => d.kind)).toEqual(['price', 'clients', 'runs', 'fill', 'salesLoss']);
    const runs = group.find(d => d.kind === 'runs')!;
    expect(runs.id).toBe('runs:0');
    expect(runs.rowName).toBe('Studio');
    expect(runs.baseValue).toBe(10);
    expect(runs.min).toBe(-10);
    expect(runs.max).toBe(10);
  });

  it('keeps slider scans bounded and describes the change for screen readers', () => {
    expect(scanWinnerChanges(0, 10, 1, () => 0)).toEqual([]);
    expect(scanWinnerChanges(5, 5, 1, () => 0)).toEqual([]);
    expect(scanWinnerChanges(0, 1000, 500, d => (d > 500 ? 1 : 0))).toEqual([{ delta: 1000, winnerIndex: 1 }]);
    // A 2000-wide span steps by 5, so the scan stays at 400 positions.
    expect(scanWinnerChanges(-1000, 1000, 5, () => 0)).toEqual([]);

    const def = listDriverDefs({
      rows: buildDecision(inputs, 'base').offeringRows,
      states: [today, raise], mode: 'current', optionNames: ['Today', 'Raise']
    }).find(d => d.kind === 'price')!;
    expect(driverStatusText({ def, delta: 0, currency: 'USD', crossovers: [], optionNames: ['Today', 'Raise'] }))
      .toContain('No change');
    const text = driverStatusText({
      def, delta: 10, currency: 'USD',
      crossovers: [{ delta: 10, winnerIndex: 1 }], optionNames: ['Today', 'Raise']
    });
    expect(text).toContain('Studio');
    expect(text).toContain('Leader changes at +$10 → Raise');
    expect(formatDriverDelta(def, 10, 'USD')).toBe('+$10');
    expect(formatDriverValue(def, 12, 'USD')).toBe('$12 / session');
    const fillDef = { ...def, kind: 'fill' as const, offering: groupOffering };
    expect(formatDriverValue(fillDef, 80.5, 'USD')).toBe('80.5%');
    expect(formatDriverDelta(fillDef, -2.5, 'USD')).toBe('-2.5%');
  });
});
