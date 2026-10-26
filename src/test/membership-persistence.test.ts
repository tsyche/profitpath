import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCSV, importFromCSV, sanitizeScenarioState, encodeScenarioToURL, decodeScenarioFromURL
} from '../../assets/services/miscService';
import { pruneMembership } from '../calculations/membership';

const offering = (name: string) => ({
  id: name, name, priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0,
  mixPct: 50, currentClients: 2, laborPctOfPrice: 0, type: 'per-session', seats: 1, fillPct: 100
});

const plans = [
  { id: 'pl1', name: 'Gold, "VIP"', monthlyFee: 100, creditsPerMonth: 120, memberDiscountPct: 10, creditsAtMemberPrice: true, eligible: ['Studio, "A"', 'Mixing'] },
  { id: 'pl2', name: '=SUM(A1)', monthlyFee: 0, creditsPerMonth: 0, memberDiscountPct: 20, creditsAtMemberPrice: false, eligible: [] }
];
const profiles = [{ id: 'pr1', name: 'Regular', visits: { 'Studio, "A"': 2, Mixing: 1.5 } }];

const state: any = {
  mode: 'forecast',
  fullTimeEmployees: 2,
  partTimeEmployees: 0,
  fullTimeEmployeePay: 60000,
  partTimeEmployeePay: 30000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 75,
  offerings: [offering('Studio, "A"'), offering('Mixing')],
  expenses: [],
  resources: [],
  membershipPlans: plans,
  memberProfiles: profiles
};
const results = { revenue: 1, variableCosts: 0, income: 1, capacityPct: 50 };

describe('membership: pruneMembership', () => {
  it('drops eligible ids and visit keys that are not offerings', () => {
    const out = pruneMembership(
      [{ ...plans[0], eligible: ['a', 'gone'] }],
      [{ id: 'p', name: 'P', visits: { a: 1, gone: 3 } }],
      new Set(['a'])
    );
    expect(out.plans[0].eligible).toEqual(['a']);
    expect(out.profiles[0].visits).toEqual({ a: 1 });
  });
});

describe('membership: sanitizeScenarioState', () => {
  it('keeps plans and profiles that reference real offerings', () => {
    const out = sanitizeScenarioState(state)!;
    expect(out.membershipPlans).toEqual(plans);
    expect(out.memberProfiles).toEqual(profiles);
  });

  it('prunes references to offerings that no longer exist', () => {
    const out = sanitizeScenarioState({ ...state, offerings: [offering('Mixing')] })!;
    expect(out.membershipPlans[0].eligible).toEqual(['Mixing']);
    expect(out.memberProfiles[0].visits).toEqual({ Mixing: 1.5 });
  });

  it('defaults to none for legacy payloads', () => {
    const { membershipPlans: _p, memberProfiles: _m, ...legacy } = state;
    const out = sanitizeScenarioState(legacy)!;
    expect(out.membershipPlans).toEqual([]);
    expect(out.memberProfiles).toEqual([]);
  });
});

describe('membership: share URL round trip', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'));

  it('survives encode -> decode -> sanitize', () => {
    const u = new URL(encodeScenarioToURL(state)!);
    window.history.replaceState({}, '', u.pathname + u.search);
    const out = sanitizeScenarioState(decodeScenarioFromURL() as any)!;
    expect(out.membershipPlans).toEqual(plans);
    expect(out.memberProfiles).toEqual(profiles);
  });
});

describe('membership: CSV round trip', () => {
  const r: any = importFromCSV(buildCSV(state, results));
  const idOf = (name: string) => r.data.offerings.find((o: any) => o.name === name).id;

  it('restores plans with hostile names, fields and flags', () => {
    expect(r.success).toBe(true);
    expect(r.data.membershipPlans.map((p: any) => [p.name, p.monthlyFee, p.creditsPerMonth, p.memberDiscountPct, p.creditsAtMemberPrice]))
      .toEqual([['Gold, "VIP"', 100, 120, 10, true], ['=SUM(A1)', 0, 0, 20, false]]);
  });

  it('re-links eligibility by name to the imported offering ids', () => {
    expect(r.data.membershipPlans[0].eligible).toEqual([idOf('Studio, "A"'), idOf('Mixing')]);
    expect(r.data.membershipPlans[1].eligible).toEqual([]);
  });

  it('re-links profile visits by name, keeping fractions', () => {
    expect(r.data.memberProfiles).toHaveLength(1);
    expect(r.data.memberProfiles[0].name).toBe('Regular');
    expect(r.data.memberProfiles[0].visits).toEqual({ [idOf('Studio, "A"')]: 2, [idOf('Mixing')]: 1.5 });
  });

  it('legacy CSV without the sections leaves them undefined', () => {
    const legacy: any = importFromCSV('Offerings\nName,P,S,H,V,M,C\nA,100,12,1,0,100,0\n');
    expect(legacy.data.membershipPlans).toBeUndefined();
    expect(legacy.data.memberProfiles).toBeUndefined();
  });

  it('empty sections give empty lists so existing plans are cleared', () => {
    const csv = 'Membership Plans\nName,Fee\nMember Profiles\nName,Visits\nOfferings\nName,P,S,H,V,M,C\nA,100,12,1,0,100,0\n';
    const empty: any = importFromCSV(csv);
    expect(empty.data.membershipPlans).toEqual([]);
    expect(empty.data.memberProfiles).toEqual([]);
  });

  it('ignores a malformed visits cell instead of failing the import', () => {
    const csv = 'Member Profiles\nName,Visits\nBad,not json\nOfferings\nName,P,S,H,V,M,C\nA,100,12,1,0,100,0\n';
    const bad: any = importFromCSV(csv);
    expect(bad.success).toBe(true);
    expect(bad.data.memberProfiles[0].visits).toEqual({});
  });
});

describe('membership: visit bounds round trip', () => {
  const ranged = [{ id: 'pr1', name: 'Regular', visits: { 'Studio, "A"': 2, Mixing: 1.5 }, visitsLow: { 'Studio, "A"': 0.5 }, visitsHigh: { Mixing: 4 } }];

  it('share-URL sanitizer keeps the bounds', () => {
    const out = sanitizeScenarioState({ ...state, memberProfiles: ranged })!;
    expect(out.memberProfiles[0].visitsLow).toEqual({ 'Studio, "A"': 0.5 });
    expect(out.memberProfiles[0].visitsHigh).toEqual({ Mixing: 4 });
  });

  it('CSV round-trips the bounds by offering name', () => {
    const r: any = importFromCSV(buildCSV({ ...state, memberProfiles: ranged }, results));
    const p = r.data.memberProfiles[0];
    const idOf = (n: string) => r.data.offerings.find((o: any) => o.name === n).id;
    expect(p.visitsLow).toEqual({ [idOf('Studio, "A"')]: 0.5 });
    expect(p.visitsHigh).toEqual({ [idOf('Mixing')]: 4 });
  });

  it('a legacy two-column profile row imports with no bounds', () => {
    const csv = buildCSV({ ...state, memberProfiles: profiles }, results).replace(',Visits Low,Visits High', '');
    const p = (importFromCSV(csv) as any).data.memberProfiles[0];
    expect(Object.keys(p)).not.toContain('visitsLow');
    expect(Object.keys(p.visits)).toHaveLength(2);
  });
});
