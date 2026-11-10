// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decodeScenarioBundle, encodeDecisionLink, sanitizeScenarioState } from '../sharing/decisionLink';
import type { CalcState } from '../types';

const state: CalcState = {
  mode: 'current', offerings: [{
    id: 'studio', name: 'Studio', priceMonthly: -25, sessionsPerYear: 12,
    hoursPerSession: 1, variableCostPerSession: 10, currentClients: 20, mixPct: 100
  }],
  monthlyCosts: 100
};
const options = ['Option 0', 'Option A', 'Option B'].map((name, i) => ({
  name, state: { ...state, monthlyCosts: 100 + i }
}));

describe('external decision links without browser globals', () => {
  it('round trips ordered options through the shared sanitizer and decision metadata', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    const link = encodeDecisionLink(options, {
      baseUrl: 'https://profitpath.tsyche.workers.dev/', selectedCase: 'conservative', annualGoal: 100000
    });
    const url = new URL(link!);
    expect(url.searchParams.get('decision')).toBe('1');
    expect(url.searchParams.get('case')).toBe('conservative');
    expect(url.searchParams.get('goal')).toBe('100000');
    expect(decodeScenarioBundle(url.searchParams.get('bundle')!)).toEqual(
      options.map(o => ({ name: o.name, state: sanitizeScenarioState(o.state as Record<string, unknown>) }))
    );
  });

  it('retains option and payload limits', () => {
    const config = { baseUrl: 'https://example.com/' };
    expect(encodeDecisionLink(options.slice(0, 1), config)).toBeNull();
    expect(encodeDecisionLink([...options, ...options], config)).toBeNull();
    expect(encodeDecisionLink(options, { ...config, annualGoal: -1 })).toBeNull();
    expect(encodeDecisionLink([{ name: 'Invalid', state: {} }, options[0]], config)).toBeNull();
    const four = encodeDecisionLink([...options, { ...options[0], name: 'Option C' }], config);
    expect(four).not.toBeNull();
    expect(new URL(four!).searchParams.has('goal')).toBe(false);
    expect(decodeScenarioBundle(new URL(four!).searchParams.get('bundle')!)).toHaveLength(4);
    expect(decodeScenarioBundle('v1.' + 'a'.repeat(20001))).toBeNull();
  });
});
