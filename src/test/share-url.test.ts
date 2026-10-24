import { describe, it, expect, beforeEach } from 'vitest';
import { encodeScenarioToURL, decodeScenarioFromURL } from '../../assets/services/miscService';

const state: any = {
  mode: 'forecast',
  offerings: Array.from({ length: 12 }, (_, i) => ({ name: `Offering ${i} "quoted" & ünïcode ✓`, priceMonthly: 100 + i, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 5, mixPct: 8, currentClients: 3 })),
  notes: 'Notes with / + = and emoji 🎉',
};

function visit(url: string) {
  const u = new URL(url);
  window.history.replaceState({}, '', u.pathname + u.search);
}

describe('share URL encoding (roadmap 12o)', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'));

  it('round-trips unicode, quotes and symbols', () => {
    visit(encodeScenarioToURL(state)!);
    expect(decodeScenarioFromURL()).toEqual(state);
  });

  it('is much shorter than the legacy encoding', () => {
    const legacy = encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(state))));
    const url = encodeScenarioToURL(state)!;
    expect(url.split('?scenario=')[1].length).toBeLessThan(legacy.length / 3);
  });

  it('still decodes legacy links', () => {
    const legacy = encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(state))));
    window.history.replaceState({}, '', '/?scenario=' + legacy);
    expect(decodeScenarioFromURL()).toEqual(state);
  });

  it('refuses oversized v2 payloads without inflating them', () => {
    window.history.replaceState({}, '', '/?scenario=v2.' + 'A'.repeat(25000));
    expect(decodeScenarioFromURL()).toBeNull();
  });

  it('returns null for garbage instead of throwing', () => {
    window.history.replaceState({}, '', '/?scenario=v2.!!!notbase64');
    expect(decodeScenarioFromURL()).toBeNull();
  });
});
