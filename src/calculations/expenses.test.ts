import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { annualizeExpense, costBreakdown, sanitizeExpenses, scaleOverhead, totalMonthlyOverhead, EXPENSE_CATEGORIES } from './expenses'
import { sanitizeScenarioState } from '../../assets/services/miscService'

// Roadmap 27: structured expense line items. monthlyCosts stays as "other overhead".
const base = {
  mode: 'current',
  fullTimeEmployees: 1,
  partTimeEmployees: 0,
  fullTimeEmployeePay: 50000,
  partTimeEmployeePay: 0,
  monthlyCosts: 1000,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 100,
  offerings: [{ name: 'A', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 10 }]
}
const exp = (amount: unknown, frequency: unknown, extra: object = {}) => ({ name: 'X', category: 'Rent/Lease', amount, frequency, ...extra })

describe('annualizeExpense', () => {
  it('weekly x52, monthly x12, annual x1', () => {
    expect(annualizeExpense({ amount: 100, frequency: 'weekly' } as any)).toBe(5200)
    expect(annualizeExpense({ amount: 100, frequency: 'monthly' } as any)).toBe(1200)
    expect(annualizeExpense({ amount: 100, frequency: 'annual' } as any)).toBe(100)
  })
})

describe('sanitizeExpenses', () => {
  it('returns [] for non-arrays', () => {
    for (const v of [undefined, null, 'x', 42, {}]) expect(sanitizeExpenses(v)).toEqual([])
  })

  it('drops non-object rows and keeps valid ones', () => {
    expect(sanitizeExpenses([null, 7, 'x', exp(5, 'monthly')])).toHaveLength(1)
  })

  it('clamps amount to >= 0 and falls back on garbage', () => {
    for (const bad of [-5, 'abc', null, NaN, Infinity, undefined]) {
      expect(sanitizeExpenses([exp(bad, 'monthly')])[0].amount).toBe(0)
    }
    expect(sanitizeExpenses([exp(1e15, 'monthly')])[0].amount).toBe(1e9)
  })

  it('unknown frequency falls back to monthly, unknown category to Other', () => {
    const r = sanitizeExpenses([exp(5, 'daily', { category: 'Bogus' }), exp(5, 7, { category: 3 })])
    expect(r.map(e => e.frequency)).toEqual(['monthly', 'monthly'])
    expect(r.map(e => e.category)).toEqual(['Other', 'Other'])
  })

  it('keeps known categories and caps row count', () => {
    for (const c of EXPENSE_CATEGORIES) expect(sanitizeExpenses([exp(1, 'monthly', { category: c })])[0].category).toBe(c)
    expect(sanitizeExpenses(Array.from({ length: 500 }, () => exp(1, 'monthly')))).toHaveLength(100)
  })
})

describe('calc with expenses', () => {
  beforeEach(() => clearCalculationCache())

  it('legacy state (no expenses) is unchanged', () => {
    const r = calc(base as any)
    expect(r.annualFixedCosts).toBe(12000)
    expect(r.totalFixedCosts).toBe(62000)
  })

  it('expenses add to fixed costs and reduce income', () => {
    const a = calc(base as any)
    const b = calc({ ...base, expenses: [exp(100, 'weekly'), exp(50, 'monthly'), exp(600, 'annual')] } as any)
    const added = 5200 + 600 + 600
    expect(b.annualFixedCosts).toBe(12000 + added)
    expect(b.totalFixedCosts).toBe(a.totalFixedCosts + added)
    expect(b.income).toBe(a.income - added)
  })

  it('garbage expenses never produce NaN', () => {
    const r = calc({ ...base, expenses: [exp('abc', 'weekly'), null, exp(Infinity, 'annual')] } as any)
    expect(Number.isFinite(r.income)).toBe(true)
  })

  it('cache key includes expenses', () => {
    const a = calc({ ...base, expenses: [exp(100, 'monthly')] } as any)
    const b = calc({ ...base, expenses: [exp(100, 'weekly')] } as any)
    expect(b.income).toBeLessThan(a.income)
  })

  it('applies with no offerings too', () => {
    const r = calc({ ...base, offerings: [], expenses: [exp(100, 'monthly')] } as any)
    expect(r.annualFixedCosts).toBe(12000 + 1200)
  })
})

describe('sanitizeScenarioState expenses', () => {
  const st = (expenses: unknown) => sanitizeScenarioState({ offerings: [{ name: 'A', priceMonthly: 100 }], expenses })!

  it('round-trips and assigns ids', () => {
    const e = st([exp(75, 'weekly', { category: 'Insurance', name: 'Policy' })]).expenses![0]
    expect(e).toMatchObject({ name: 'Policy', category: 'Insurance', amount: 75, frequency: 'weekly' })
    expect(e.id).toBeTruthy()
  })

  it('absent or garbage becomes []', () => {
    expect(st(undefined).expenses).toEqual([])
    expect(st('nope').expenses).toEqual([])
  })
})

describe('overhead helpers', () => {
  it('totalMonthlyOverhead = monthlyCosts + annualized expenses / 12', () => {
    expect(totalMonthlyOverhead({ monthlyCosts: 100, expenses: [exp(12, 'weekly'), exp(1200, 'annual')] } as any)).toBeCloseTo(100 + 52 + 100, 9)
  })

  it('totalMonthlyOverhead tolerates legacy and garbage state', () => {
    expect(totalMonthlyOverhead({ monthlyCosts: 250 } as any)).toBe(250)
    expect(totalMonthlyOverhead({ monthlyCosts: 'x', expenses: 'nope' } as any)).toBe(0)
    expect(totalMonthlyOverhead({} as any)).toBe(0)
  })

  it('scaleOverhead scales monthlyCosts and every expense, without mutating the input', () => {
    const state = { monthlyCosts: 100, expenses: [exp(50, 'monthly')] } as any
    const scaled = scaleOverhead(state, 1.2)
    expect(scaled.monthlyCosts).toBeCloseTo(120, 9)
    expect(scaled.expenses[0].amount).toBeCloseTo(60, 9)
    expect(state.monthlyCosts).toBe(100)
    expect(state.expenses[0].amount).toBe(50)
  })

  it('scaled overhead moves calc income by the full overhead delta (what-if must not skip expenses)', () => {
    const state = { ...base, expenses: [exp(100, 'weekly')] } as any
    const a = calc(state)
    const b = calc(scaleOverhead(state, 1.5))
    expect(a.income - b.income).toBeCloseTo(0.5 * (12000 + 5200), 6)
  })
})

describe('costBreakdown', () => {
  const ex = (category: string, amount: number, frequency = 'monthly') => ({ id: category + amount, name: 'x', category, amount, frequency });

  it('sums annualized amounts per category, largest first, and ties out to fixed costs', () => {
    const state = { monthlyCosts: 100, expenses: [ex('Insurance', 1200, 'annual'), ex('Rent/Lease', 1000), ex('Insurance', 10, 'weekly')] };
    const rows = costBreakdown(state);
    expect(rows.map((r) => [r.label, r.annual])).toEqual([
      ['Rent/Lease', 12000],
      ['Other overhead', 1200],
      ['Insurance', 1720],
    ].sort((a, b) => (b[1] as number) - (a[1] as number)));
    expect(rows.reduce((s, r) => s + r.annual, 0)).toBe(totalMonthlyOverhead(state) * 12);
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(100);
  });

  it('returns nothing when there are no costs', () => {
    expect(costBreakdown({ monthlyCosts: 0, expenses: [] })).toEqual([]);
  });

  it('keeps Other-category expenses and other overhead as separate rows', () => {
    const rows = costBreakdown({ monthlyCosts: 50, expenses: [ex('Other', 10)] });
    expect(rows.map((r) => r.label).sort()).toEqual(['Other', 'Other overhead']);
  });
});
