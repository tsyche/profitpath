import { describe, it, expect } from 'vitest';
import { countErrors, evaluate } from '../../scripts/typecheck-ratchet.mjs';

describe('typecheck ratchet', () => {
  it('counts tsc error lines only', () => {
    const out = "a.js(1,1): error TS2339: x\nb.js(2,2): error TS2304: y\nFound 2 errors in 2 files.\n";
    expect(countErrors(out)).toBe(2);
    expect(countErrors('')).toBe(0);
  });

  it('fails when errors exceed the baseline', () => {
    expect(evaluate(11, 10).ok).toBe(false);
  });

  it('passes at the baseline and when errors fall', () => {
    expect(evaluate(10, 10).ok).toBe(true);
    const better = evaluate(9, 10);
    expect(better.ok).toBe(true);
    expect(better.message).toContain('--update');
  });
});
