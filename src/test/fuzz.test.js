/**
 * Fuzz tests for the calculation engine and untrusted-input sanitizers.
 *
 * Uses a seeded PRNG so failures are reproducible: when a case fails, the
 * assertion message includes the seed and iteration number.
 */
import { describe, it, expect } from 'vitest';
import { calc, clearCalculationCache } from '../calculations/index.js';
import { sanitizeScenarioState, escapeHtml } from '../../assets/services/miscService.js';

// Mulberry32 seeded PRNG — deterministic across runs
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 1337;
const ITERATIONS = 300;

// Pool of adversarial values mixed into otherwise-normal states
const HOSTILE_VALUES = [
  NaN, Infinity, -Infinity, -1, -1e9, 1e308, 0, -0,
  '', 'abc', '1e500', '-42', '  7  ', null, undefined,
  {}, [], true, false, '<script>alert(1)</script>', '__proto__',
  Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0.1, 1e-300
];

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// 50/50: a plausible number in range, or a hostile value
function fuzzNumber(rand, min, max) {
  if (rand() < 0.5) return min + rand() * (max - min);
  return pick(rand, HOSTILE_VALUES);
}

function fuzzOffering(rand) {
  if (rand() < 0.05) return pick(rand, [null, undefined, 42, 'junk', []]);
  return {
    name: rand() < 0.7 ? `Offer ${Math.floor(rand() * 100)}` : pick(rand, HOSTILE_VALUES),
    priceMonthly: fuzzNumber(rand, 0, 5000),
    sessionsPerYear: fuzzNumber(rand, 0, 365),
    hoursPerSession: fuzzNumber(rand, 0, 24),
    variableCostPerSession: fuzzNumber(rand, 0, 500),
    mixPct: fuzzNumber(rand, 0, 100),
    currentClients: fuzzNumber(rand, 0, 1000)
  };
}

function fuzzState(rand) {
  const offeringCount = Math.floor(rand() * 6);
  const state = {
    mode: pick(rand, ['forecast', 'current', 'garbage', null, undefined, 7]),
    offerings: rand() < 0.08
      ? pick(rand, [null, undefined, 'nope', 42, {}])
      : Array.from({ length: offeringCount }, () => fuzzOffering(rand)),
    monthlyCosts: fuzzNumber(rand, 0, 100000),
    productiveUtilizationPct: fuzzNumber(rand, 0, 100),
    targetUtilizationPct: fuzzNumber(rand, 0, 150)
  };

  if (rand() < 0.5) {
    state.fullTimeEmployees = fuzzNumber(rand, 0, 100);
    state.partTimeEmployees = fuzzNumber(rand, 0, 100);
    state.fullTimeEmployeePay = fuzzNumber(rand, 0, 500000);
    state.partTimeEmployeePay = fuzzNumber(rand, 0, 250000);
  } else {
    state.employees = fuzzNumber(rand, 1, 100);
    state.employeePay = fuzzNumber(rand, 0, 500000);
    state.hoursPerWeek = fuzzNumber(rand, 1, 80);
  }

  return state;
}

const FINITE_RESULT_FIELDS = [
  'revenue', 'variableCosts', 'income', 'clients', 'totalSessions',
  'serviceHours', 'capacityPct', 'annualPaidHours', 'annualServiceHours',
  'annualFixedCosts', 'annualPayroll', 'totalFixedCosts',
  'contributionMarginPerClient', 'contributionMarginRatio'
];

describe('Fuzz: calculation engine', () => {
  it('never throws and never produces NaN for arbitrary inputs', () => {
    const rand = mulberry32(SEED);

    for (let i = 0; i < ITERATIONS; i++) {
      const state = fuzzState(rand);
      let result;
      try {
        result = calc(state, { enableCache: false });
      } catch (e) {
        throw new Error(`calc threw on seed=${SEED} iteration=${i}: ${e.message}\nstate=${JSON.stringify(state)}`);
      }

      for (const field of FINITE_RESULT_FIELDS) {
        const v = result[field];
        expect(Number.isNaN(v), `${field} is NaN at seed=${SEED} iteration=${i}\nstate=${JSON.stringify(state)}`).toBe(false);
        expect(Number.isFinite(v), `${field}=${v} not finite at seed=${SEED} iteration=${i}\nstate=${JSON.stringify(state)}`).toBe(true);
      }

      // breakEven values may legitimately be Infinity but never NaN
      expect(Number.isNaN(result.breakEvenClients)).toBe(false);
      expect(Number.isNaN(result.breakEvenRevenue)).toBe(false);

      // Core accounting identity must always hold
      expect(result.income).toBeCloseTo(result.revenue - result.totalFixedCosts - result.variableCosts, 6);

      // Sanity bounds
      expect(result.revenue).toBeGreaterThanOrEqual(0);
      expect(result.variableCosts).toBeGreaterThanOrEqual(0);
      expect(result.clients).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns identical results with and without caching', () => {
    const rand = mulberry32(SEED + 1);
    clearCalculationCache();

    for (let i = 0; i < 50; i++) {
      const state = fuzzState(rand);
      const uncached = calc(state, { enableCache: false });
      const cachedFirst = calc(state, { enableCache: true });
      const cachedSecond = calc(state, { enableCache: true });

      expect(cachedFirst.income).toBe(uncached.income);
      expect(cachedSecond.revenue).toBe(uncached.revenue);
      expect(cachedSecond.clients).toBe(uncached.clients);
    }
  });
});

describe('Fuzz: sanitizeScenarioState', () => {
  it('returns null or a fully-clamped state for arbitrary input, without prototype pollution', () => {
    const rand = mulberry32(SEED + 2);
    const protoSnapshot = Object.getOwnPropertyNames(Object.prototype).sort().join(',');

    const garbageInputs = [
      null, undefined, 0, 42, 'string', true, [], [1, 2], () => {},
      JSON.parse('{"__proto__": {"polluted": true}}'),
      { offerings: 'not-an-array' },
      { offerings: [] },
      { offerings: [null, undefined, 'junk'] }
    ];

    for (const input of garbageInputs) {
      const result = sanitizeScenarioState(input);
      expect(result === null || typeof result === 'object').toBe(true);
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const result = sanitizeScenarioState(fuzzState(rand));
      if (result === null) continue;

      // Only allowlisted keys survive
      const allowed = new Set([
        'mode', 'offerings', 'fullTimeEmployees', 'partTimeEmployees',
        'fullTimeEmployeePay', 'partTimeEmployeePay', 'monthlyCosts',
        'productiveUtilizationPct', 'targetUtilizationPct', 'lockMix', 'loadedTemplate'
      ]);
      for (const key of Object.keys(result)) {
        expect(allowed.has(key), `unexpected key ${key} at iteration=${i}`).toBe(true);
      }

      expect(['forecast', 'current']).toContain(result.mode);
      expect(Number.isFinite(result.fullTimeEmployees)).toBe(true);
      expect(result.productiveUtilizationPct).toBeGreaterThanOrEqual(1);
      expect(result.productiveUtilizationPct).toBeLessThanOrEqual(100);
      expect(result.targetUtilizationPct).toBeLessThanOrEqual(150);

      for (const o of result.offerings) {
        expect(typeof o.name).toBe('string');
        expect(o.name.length).toBeGreaterThan(0);
        expect(o.name.length).toBeLessThanOrEqual(120);
        expect(Number.isFinite(o.priceMonthly)).toBe(true);
        expect(o.priceMonthly).toBeGreaterThanOrEqual(0);
        expect(o.sessionsPerYear).toBeGreaterThanOrEqual(1);
        expect(o.hoursPerSession).toBeGreaterThanOrEqual(0.1);
        expect(o.mixPct).toBeGreaterThanOrEqual(0);
        expect(o.mixPct).toBeLessThanOrEqual(100);
      }
    }

    // No prototype pollution from any of the inputs
    expect(Object.getOwnPropertyNames(Object.prototype).sort().join(',')).toBe(protoSnapshot);
    expect({}.polluted).toBeUndefined();
  });

  it('maps legacy employees/employeePay fields onto fullTime fields', () => {
    const result = sanitizeScenarioState({
      employees: 7,
      employeePay: 85000,
      offerings: [{ name: 'Svc', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 0 }]
    });
    expect(result.fullTimeEmployees).toBe(7);
    expect(result.fullTimeEmployeePay).toBe(85000);
    expect(result.partTimeEmployees).toBe(0);
  });
});

describe('Fuzz: escapeHtml', () => {
  it('never lets active HTML characters through', () => {
    const rand = mulberry32(SEED + 3);
    const samples = [
      '<script>alert(1)</script>',
      '"><img src=x onerror=alert(1)>',
      "'; DROP TABLE offerings; --",
      '&<>"\'',
      ...Array.from({ length: 100 }, () =>
        Array.from({ length: Math.floor(rand() * 30) }, () =>
          String.fromCharCode(32 + Math.floor(rand() * 200))).join(''))
    ];

    for (const s of samples) {
      const escaped = escapeHtml(s);
      expect(escaped).not.toMatch(/[<>"']/);
    }

    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(123)).toBe('123');
  });
});
