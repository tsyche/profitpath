import { describe, it, expect } from 'vitest';
import { uniqueCopyName } from '../../assets/services/scenarioService';

describe('uniqueCopyName', () => {
  it('appends " copy"', () => {
    expect(uniqueCopyName('Plan', ['Plan'])).toBe('Plan copy');
  });

  it('numbers further copies, ignoring case and whitespace', () => {
    expect(uniqueCopyName('Plan', ['Plan', ' plan COPY '])).toBe('Plan copy 2');
    expect(uniqueCopyName('Plan', ['Plan', 'Plan copy', 'Plan copy 2'])).toBe('Plan copy 3');
  });
});
