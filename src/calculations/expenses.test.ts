import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { annualizeExpense, sanitizeExpenses, EXPENSE_CATEGORIES } from './expenses'
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
