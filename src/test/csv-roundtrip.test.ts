import { describe, it, expect } from 'vitest';
import { buildCSV, importFromCSV, splitCsvLine } from '../../assets/services/miscService';

const state = {
  mode: 'forecast',
  fullTimeEmployees: 3,
  partTimeEmployees: 1,
  fullTimeEmployeePay: 60000,
  partTimeEmployeePay: 30000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 75,
  offerings: [
    { id: 'o1', name: 'Coaching, "premium"', priceMonthly: 1000, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 10, mixPct: 100, currentClients: 4, laborPctOfPrice: 0, type: 'subscription', seats: 1, fillPct: 100, salesLossPct: 20, salesLossPctLow: 5, salesLossPctHigh: 40 },
  ],
  expenses: [
    { id: 'e1', name: 'Rent, main office', category: 'Rent/Lease', amount: 1200, frequency: 'monthly' },
    { id: 'e2', name: '=cmd', category: 'Insurance', amount: 900, frequency: 'annual' },
    { id: 'e3', name: 'Cleaning', category: 'Supplies/COGS', amount: 20, frequency: 'weekly' },
  ],
};
const results = { revenue: 1234567, variableCosts: 1000, income: 99999, capacityPct: 50 };

describe('CSV export -> import round trip', () => {
  const r: any = importFromCSV(buildCSV(state, results));

  it('succeeds on its own export', () => {
    expect(r.success).toBe(true);
  });

  it('restores settings, even with locale-formatted result rows present', () => {
    expect(r.data.settings).toMatchObject({
      employees: 3, partTimeEmployees: 1, employeePay: 60000, partTimeEmployeePay: 30000,
      monthlyCosts: 250, productiveUtilizationPct: 80, targetUtilizationPct: 75,
    });
  });

  it('restores offerings with commas and quotes in the name', () => {
    expect(r.data.offerings).toHaveLength(1);
    expect(r.data.offerings[0]).toMatchObject({
      name: 'Coaching, "premium"',
      salesLossPct: 20,
      salesLossPctLow: 5,
      salesLossPctHigh: 40
    });
  });

  it('restores expenses and undoes the formula-guard prefix', () => {
    expect(r.data.expenses.map((e: any) => [e.name, e.category, e.amount, e.frequency])).toEqual([
      ['Rent, main office', 'Rent/Lease', 1200, 'monthly'],
      ['=cmd', 'Insurance', 900, 'annual'],
      ['Cleaning', 'Supplies/COGS', 20, 'weekly'],
    ]);
    expect(r.data.expenses.every((e: any) => e.id)).toBe(true);
  });
});

describe('importFromCSV expenses section', () => {
  const offerings = 'Offerings\nName,P,S,H,V,M,C\nA,100,12,1,0,100,0\n';

  it('legacy CSV without the section leaves expenses undefined so existing ones are kept', () => {
    expect((importFromCSV(offerings) as any).data.expenses).toBeUndefined();
  });

  it('an empty section gives an empty list so existing expenses are cleared', () => {
    const csv = offerings + 'Expenses\nName,Category,Amount,Frequency\n';
    expect((importFromCSV(csv) as any).data.expenses).toEqual([]);
  });

  it('round-trips a scenario with zero expenses to an empty list', () => {
    const st = { ...state, expenses: [] };
    expect((importFromCSV(buildCSV(st, results)) as any).data.expenses).toEqual([]);
  });

  it('works for the "# Fixed Expenses" template header', () => {
    const csv = offerings + '# Fixed Expenses\n# note\nName,Category,Amount,Frequency\nRent,Rent/Lease,100,monthly';
    expect((importFromCSV(csv) as any).data.expenses).toHaveLength(1);
  });

  it('sanitizes garbage rows', () => {
    const csv = offerings + 'Expenses\nName,Category,Amount,Frequency\n,Insurance,5,monthly\nX,Nope,abc,daily\nY,Marketing,-50,WEEKLY';
    const ex = (importFromCSV(csv) as any).data.expenses;
    expect(ex.map((e: any) => [e.name, e.category, e.amount, e.frequency])).toEqual([
      ['X', 'Other', 0, 'monthly'],
      ['Y', 'Marketing', 0, 'weekly'],
    ]);
  });

  it('template header lines no longer swallow settings', () => {
    const csv = '# Business Settings\nemployees,5\n# Offerings\nName,P,S,H,V,M,C\nA,100,12,1,0,100,0';
    expect((importFromCSV(csv) as any).data.settings.employees).toBe(5);
  });
});

describe('splitCsvLine', () => {
  it('handles quotes, escaped quotes and empty cells', () => {
    expect(splitCsvLine('a,"b,c","d ""e""",')).toEqual(['a', 'b,c', 'd "e"', '']);
  });
});
