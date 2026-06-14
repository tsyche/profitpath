// Regression tests for CSV formula-injection protection. Untrusted values
// (scenario/offering names, negative numbers) must not be executable as
// spreadsheet formulas when a CSV export is opened in Excel/Sheets.

import { describe, it, expect } from 'vitest';
import { csvCell } from '../../assets/services/miscService.js';

describe('csvCell — CSV formula-injection guard', () => {
  it('prefixes a quote on formula-trigger characters', () => {
    for (const dangerous of ['=SUM(A1)', '+1+1', '-1+1', '@cmd', '=HYPERLINK("http://evil")']) {
      const out = csvCell(dangerous);
      // Inside the surrounding quotes the value must start with a single quote.
      expect(out.startsWith('"\'')).toBe(true);
    }
  });

  it('guards negative numbers (they start with "-")', () => {
    expect(csvCell('-5000').startsWith('"\'')).toBe(true);
  });

  it('does not prefix safe values', () => {
    expect(csvCell('Consulting')).toBe('"Consulting"');
    expect(csvCell('1234')).toBe('"1234"');
  });

  it('doubles embedded double-quotes', () => {
    expect(csvCell('a "quoted" name')).toBe('"a ""quoted"" name"');
  });

  it('coerces null/undefined to an empty cell', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});
