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

export const EXPENSE_FREQUENCIES: readonly ExpenseFrequency[] = ['weekly', 'monthly', 'annual', 'one-time'];

const MAX_EXPENSES = 100;
const MAX_EXPENSE_AMOUNT = 1e9;
const MAX_NAME_LENGTH = 100;
export const DEFAULT_LIFE_YEARS = 3;
const MAX_LIFE_YEARS = 30;
const PERIODS_PER_YEAR: Record<Exclude<ExpenseFrequency, 'one-time'>, number> = { weekly: 52, monthly: 12, annual: 1 };

/** Sanitizes untrusted expense rows. Unknown frequency falls back to monthly, unknown category to Other. */
export function sanitizeExpenses(raw: unknown, makeId: () => string = () => ''): Expense[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === 'object')
    .slice(0, MAX_EXPENSES)
    .map((e: Record<string, unknown>) => {
      const amount = Number(e.amount);
      const life = e.lifeYears === '' || e.lifeYears == null ? NaN : Number(e.lifeYears);
      return {
        id: typeof e.id === 'string' && e.id ? e.id.slice(0, 64) : makeId(),
        name: (typeof e.name === 'string' ? e.name : '').trim().slice(0, MAX_NAME_LENGTH),
        category: EXPENSE_CATEGORIES.includes(e.category as ExpenseCategory) ? (e.category as ExpenseCategory) : 'Other',
        amount: Number.isFinite(amount) ? Math.min(MAX_EXPENSE_AMOUNT, Math.max(0, amount)) : 0,
        frequency: EXPENSE_FREQUENCIES.includes(e.frequency as ExpenseFrequency) ? (e.frequency as ExpenseFrequency) : 'monthly',
        lifeYears: Number.isFinite(life) ? Math.min(MAX_LIFE_YEARS, Math.max(1, life)) : DEFAULT_LIFE_YEARS,
      };
    });
}

/** Yearly cost of one line; a one-time purchase is spread evenly over its useful life. */
export function annualizeExpense(e: Pick<Expense, 'amount' | 'frequency'> & { lifeYears?: number }): number {
  if (e.frequency === 'one-time') return e.amount / Math.max(1, e.lifeYears || DEFAULT_LIFE_YEARS);
  return e.amount * PERIODS_PER_YEAR[e.frequency];
}

export function annualExpenseTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + annualizeExpense(e), 0);
}

/** Monthly overhead as the user thinks of it: the free-form field plus all expense line items. */
export function totalMonthlyOverhead(state: { monthlyCosts?: unknown; expenses?: unknown }): number {
  const other = Number(state.monthlyCosts);
  return (Number.isFinite(other) ? Math.max(0, other) : 0) + annualExpenseTotal(sanitizeExpenses(state.expenses)) / 12;
}

/** Monthly spend in one expense category, summed over all its line items. */
export function monthlyCategorySpend(state: { expenses?: unknown }, category: ExpenseCategory): number {
  return annualExpenseTotal(sanitizeExpenses(state.expenses).filter((e) => e.category === category)) / 12;
}

/** Copy of a state with all overhead (monthlyCosts and expense amounts) scaled; used by what-if sliders. */
export function scaleOverhead<T extends { monthlyCosts?: number; expenses?: unknown }>(state: T, factor: number): T {
  return {
    ...state,
    monthlyCosts: (Number(state.monthlyCosts) || 0) * factor,
    expenses: sanitizeExpenses(state.expenses).map((e) => ({ ...e, amount: e.amount * factor })),
  };
}

export interface CostBreakdownRow {
  label: string;
  annual: number;
  pct: number;
}

/** Annual overhead by category (plus the free-form 'Other overhead' field), largest first. Ties out to annualFixedCosts. */
export function costBreakdown(state: { monthlyCosts?: unknown; expenses?: unknown }): CostBreakdownRow[] {
  const totals = new Map<string, number>();
  const other = Number(state.monthlyCosts);
  if (Number.isFinite(other) && other > 0) totals.set('Other overhead', other * 12);
  for (const e of sanitizeExpenses(state.expenses)) {
    totals.set(e.category, (totals.get(e.category) || 0) + annualizeExpense(e));
  }
  const sum = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .filter(([, annual]) => annual > 0)
    .map(([label, annual]) => ({ label, annual, pct: (annual / sum) * 100 }))
    .sort((a, b) => b.annual - a.annual);
}
