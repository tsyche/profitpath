// Roadmap 12k/12l: Duplicate offering, and new rows taking the unassigned mix.
import { describe, it, expect } from 'vitest';
import { duplicateOffering, remainingMix } from '../../assets/services/businessLogic';

const o = (mixPct: number, extra: object = {}) => ({ id: 'a', name: 'Tier', priceMonthly: 100, mixPct, currentClients: 7, ...extra });

describe('remainingMix', () => {
  it('fills the gap to 100 and never goes negative', () => {
    expect(remainingMix([])).toBe(100);
    expect(remainingMix([o(37)])).toBe(63);
    expect(remainingMix([o(60), o(40)])).toBe(0);
    expect(remainingMix([o(80), o(40)])).toBe(0);
  });

  it('ignores junk mix values and rounds float noise', () => {
    expect(remainingMix([o(33.33), o(33.33), o(NaN as any), null as any])).toBe(33.34);
  });
});

describe('duplicateOffering', () => {
  it('copies every field, renames, zeroes clients and takes only the unassigned mix', () => {
    const src = o(50, { type: 'group', seats: 8, fillPct: 70, confidence: 'guess', note: 'n' });
    const copy = duplicateOffering(src, [src, o(30)], () => 'new-id');
    expect(copy).toMatchObject({ id: 'new-id', name: 'Tier (copy)', type: 'group', seats: 8, fillPct: 70, confidence: 'guess', note: 'n', priceMonthly: 100, mixPct: 20, currentClients: 0 });
    expect(src.id).toBe('a');
    expect(src.currentClients).toBe(7);
  });

  it('keeps the mix total at 100 when it already was', () => {
    const list = [o(60), o(40)];
    expect(duplicateOffering(list[0], list, () => 'x').mixPct).toBe(0);
  });

  it('keeps long names within bounds', () => {
    expect(duplicateOffering(o(0, { name: 'x'.repeat(200) }), [], () => 'x').name.length).toBeLessThanOrEqual(100);
  });
});
