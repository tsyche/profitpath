import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCSV, importFromCSV, sanitizeScenarioState, encodeScenarioToURL, decodeScenarioFromURL
} from '../../assets/services/miscService';

const offering = (name: string, resource?: string) => ({
  id: name, name, priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0,
  mixPct: 50, currentClients: 2, laborPctOfPrice: 0, type: 'subscription', seats: 1, fillPct: 100,
  ...(resource ? { resource } : {})
});

const state: any = {
  mode: 'forecast',
  fullTimeEmployees: 2,
  partTimeEmployees: 0,
  fullTimeEmployeePay: 60000,
  partTimeEmployeePay: 30000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 75,
  offerings: [offering('Tanning', 'r1'), offering('Cuts')],
  expenses: [],
  resources: [{ id: 'r1', name: 'Booth, "main"', hoursPerWeek: 40, weeksPerYear: 50 }]
};
const results = { revenue: 1, variableCosts: 0, income: 1, capacityPct: 50 };

describe('resources: sanitizeScenarioState', () => {
  it('keeps resources and valid tags', () => {
    const out = sanitizeScenarioState(state)!;
    expect(out.resources).toEqual(state.resources);
    expect(out.offerings.map((o) => o.resource)).toEqual(['r1', undefined]);
  });

  it('drops a tag pointing at a missing resource', () => {
    const out = sanitizeScenarioState({ ...state, resources: [] })!;
    expect(out.offerings[0].resource).toBeUndefined();
  });

  it('defaults to no resources for legacy payloads', () => {
    const { resources: _drop, ...legacy } = state;
    expect(sanitizeScenarioState(legacy)!.resources).toEqual([]);
  });
});

describe('resources: share URL round trip', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'));

  it('survives encode -> decode -> sanitize', () => {
    const u = new URL(encodeScenarioToURL(state)!);
    window.history.replaceState({}, '', u.pathname + u.search);
    const out = sanitizeScenarioState(decodeScenarioFromURL() as any)!;
    expect(out.resources).toEqual(state.resources);
    expect(out.offerings[0].resource).toBe('r1');
  });
});

describe('resources: CSV round trip', () => {
  const r: any = importFromCSV(buildCSV(state, results));

  it('restores resources with hostile characters in the name', () => {
    expect(r.success).toBe(true);
    expect(r.data.resources.map((x: any) => [x.name, x.hoursPerWeek, x.weeksPerYear])).toEqual([['Booth, "main"', 40, 50]]);
  });

  it('re-links the tag by name to the imported resource id', () => {
    const id = r.data.resources[0].id;
    expect(r.data.offerings.map((o: any) => o.resource)).toEqual([id, undefined]);
  });

  it('legacy CSV without the section leaves resources undefined and offerings untagged', () => {
    const legacy: any = importFromCSV('Offerings\nName,P,S,H,V,M,C\nA,100,12,1,0,100,0\n');
    expect(legacy.data.resources).toBeUndefined();
    expect(legacy.data.offerings[0].resource).toBeUndefined();
  });

  it('an empty section gives an empty list so existing resources are cleared', () => {
    const empty: any = importFromCSV('Resources\nName,Hours/week,Weeks/year\nOfferings\nName,P,S,H,V,M,C\nA,100,12,1,0,100,0\n');
    expect(empty.data.resources).toEqual([]);
  });
});
