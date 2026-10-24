import type { Expense, ExpenseCategory, ExpenseFrequency } from '../types';

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'Rent/Lease',
  'Utilities',
  'Insurance',
  'Software/Subscriptions',
  'Marketing',
  'Equipment',
  'Loan Payments',
  'Professional Services',
  'Supplies/COGS',
  'Payment Processing',
  'Contractor/1099',
  'Other',
];

export const EXPENSE_FREQUENCIES: readonly ExpenseFrequency[] = ['weekly', 'monthly', 'annual'];

const MAX_EXPENSES = 100;
const MAX_EXPENSE_AMOUNT = 1e9;
const MAX_NAME_LENGTH = 100;
const PERIODS_PER_YEAR: Record<ExpenseFrequency, number> = { weekly: 52, monthly: 12, annual: 1 };

/** Sanitizes untrusted expense rows. Unknown frequency falls back to monthly, unknown category to Other. */
export function sanitizeExpenses(raw: unknown, makeId: () => string = () => ''): Expense[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === 'object')
    .slice(0, MAX_EXPENSES)
    .map((e: Record<string, unknown>) => {
      const amount = Number(e.amount);
      return {
        id: typeof e.id === 'string' && e.id ? e.id.slice(0, 64) : makeId(),
        name: (typeof e.name === 'string' ? e.name : '').trim().slice(0, MAX_NAME_LENGTH),
        category: EXPENSE_CATEGORIES.includes(e.category as ExpenseCategory) ? (e.category as ExpenseCategory) : 'Other',
        amount: Number.isFinite(amount) ? Math.min(MAX_EXPENSE_AMOUNT, Math.max(0, amount)) : 0,
        frequency: EXPENSE_FREQUENCIES.includes(e.frequency as ExpenseFrequency) ? (e.frequency as ExpenseFrequency) : 'monthly',
      };
    });
}

export function annualizeExpense(e: Pick<Expense, 'amount' | 'frequency'>): number {
  return e.amount * PERIODS_PER_YEAR[e.frequency];
}

export function annualExpenseTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + annualizeExpense(e), 0);
}
