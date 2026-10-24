import { describe, it, expect, afterEach } from 'vitest';
import { normalizeCurrency, formatMoney0, fmtMoney0, fmtMoneyK } from './currency';
import { sanitizeScenarioState } from '../../assets/services/miscService';

const base = { offerings: [{ name: 'A', priceMonthly: 100 }] };

describe('currency', () => {
  afterEach(() => { delete (globalThis as any).state; });

  it('normalizes unknown values to USD and keeps allowlisted codes', () => {
    expect(normalizeCurrency('EUR')).toBe('EUR');
    for (const bad of ['XXX', 'eur', '', 5, null, undefined, {}, '<script>']) expect(normalizeCurrency(bad)).toBe('USD');
  });

  it('formats with the right symbol and tells CAD/AUD apart from USD', () => {
    expect(formatMoney0(1234, 'EUR')).toContain('€');
    expect(formatMoney0(1234, 'GBP')).toContain('£');
    expect(formatMoney0(1234, 'USD')).not.toBe(formatMoney0(1234, 'CAD'));
    expect(formatMoney0(1234, 'USD')).not.toBe(formatMoney0(1234, 'AUD'));
  });

  it('fmtMoney0 and fmtMoneyK follow the active scenario currency', () => {
    (globalThis as any).state = { currency: 'GBP' };
    expect(fmtMoney0(1000)).toContain('£');
    expect(fmtMoneyK(5000)).toBe('£5k');
    expect(fmtMoneyK(-5000)).toBe('£-5k');
  });

  it('survives a missing state', () => {
    expect(fmtMoney0(1000)).toContain('$');
  });

  it('sanitizeScenarioState allowlists currency and defaults old scenarios to USD', () => {
    expect(sanitizeScenarioState({ ...base, currency: 'EUR' })?.currency).toBe('EUR');
    expect(sanitizeScenarioState({ ...base, currency: 'bogus' })?.currency).toBe('USD');
    expect(sanitizeScenarioState(base)?.currency).toBe('USD');
  });
});
