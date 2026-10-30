import { required } from './test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as compression from 'fflate';
import { decodeScenarioBundle, encodeScenarioBundle, importScenarioBundle } from '../../assets/services/scenarioBundle';
import type { Scenario } from '../types';

vi.mock('fflate', { spy: true });

const sample = (name: string): Scenario => ({
  id: name,
  name,
  timestamp: 'now',
  createdAt: '2026-10-27T00:00:00Z',
  state: {
    mode: 'current' as const,
    offerings: [{ id: 'studio', name: 'Studio', priceMonthly: 60, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 10, mixPct: 100, currentClients: 2 }],
    fullTimeEmployees: 1,
    partTimeEmployees: 0,
    fullTimeEmployeePay: 60000,
    partTimeEmployeePay: 0,
    monthlyCosts: 250,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 75
  }
});

describe('scenario bundle links', () => {
  beforeEach(() => localStorage.clear());

  it('round trips selected scenarios and sanitizes their states', () => {
    const first = sample('Today');
    required(required(first).state.offerings)[0].priceMonthly = -100;
    const url = encodeScenarioBundle([first, sample('Raise prices')]);
    expect(url).toContain('?bundle=v1.');
    const entries = decodeScenarioBundle(url!.split('?bundle=')[1]);
    expect(entries?.map(entry => entry.name)).toEqual(['Today', 'Raise prices']);
    expect(required(required(entries)?.[0].state.offerings)[0].priceMonthly).toBe(0);
  });

  it('imports without overwriting an existing scenario name', () => {
    localStorage.setItem('profitpath-scenarios', JSON.stringify([sample('Today')]));
    const url = encodeScenarioBundle([sample('Today'), sample('Option B')])!;
    const entries = decodeScenarioBundle(url.split('?bundle=')[1])!;
    expect(importScenarioBundle(entries)).toBe(2);
    const saved = JSON.parse(localStorage.getItem('profitpath-scenarios')!);
    expect(saved.map((scenario: Scenario) => scenario.name)).toEqual(['Today', 'Today (imported 2)', 'Option B']);
    expect(new Set(saved.map((scenario: Scenario) => scenario.id)).size).toBe(3);
  });

  it('rejects malformed and oversized payloads', () => {
    expect(decodeScenarioBundle('v1.invalid')).toBeNull();
    expect(decodeScenarioBundle('v1.' + 'a'.repeat(20001))).toBeNull();
    expect(encodeScenarioBundle([])).toBeNull();
  });

  it('bounds the expansion allocation before inflating an untrusted bundle', () => {
    const spy = vi.spyOn(compression, 'inflateSync');
    try {
      const compressed = compression.deflateSync(compression.strToU8(JSON.stringify({ padding: 'x'.repeat(600000) })));
      const payload = 'v1.' + btoa(String.fromCharCode(...compressed)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(decodeScenarioBundle(payload)).toBeNull();
      expect(spy.mock.calls[0][1]?.out?.byteLength).toBe(500001);
    } finally {
      spy.mockRestore();
    }
  });
});
