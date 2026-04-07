import { describe, it, expect, beforeEach } from 'vitest'
import { calc, normalizeMix, clearCalculationCache, getCacheStats } from './index.js'

describe('Calculation Engine', () => {
  beforeEach(() => {
    clearCalculationCache()
  })

  describe('normalizeMix', () => {
    it('should normalize mix percentages to sum to 1', () => {
      const offerings = [
        { mixPct: 50 },
        { mixPct: 30 },
        { mixPct: 20 }
      ]

      const result = normalizeMix(offerings)

      expect(result.sum).toBe(100)
      expect(result.needsNormalization).toBe(false)
      expect(result.shares).toEqual([0.5, 0.3, 0.2])
    })

    it('should handle mix that doesn\'t sum to 100', () => {
      const offerings = [
        { mixPct: 40 },
        { mixPct: 20 }
      ]

      const result = normalizeMix(offerings)

      expect(result.sum).toBe(60)
      expect(result.needsNormalization).toBe(true)
      expect(result.shares).toEqual([40/60, 20/60])
    })

    it('should handle zero mix percentages', () => {
      const offerings = [
        { mixPct: 0 },
        { mixPct: 0 },
        { mixPct: 0 }
      ]

      const result = normalizeMix(offerings)

      expect(result.sum).toBe(0)
      expect(result.needsNormalization).toBe(false)
      expect(result.shares).toEqual([1/3, 1/3, 1/3])
    })
  })

  describe('calc - Basic functionality', () => {
    it('should calculate basic profitability for forecast mode', () => {
      const state = {
        mode: 'forecast',
        employees: 2,
        employeePay: 50000,
        monthlyCosts: 1000,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: [
          {
            name: 'Consulting',
            priceMonthly: 200,
            sessionsPerYear: 12,
            hoursPerSession: 2,
            variableCostPerSession: 50,
            mixPct: 100,
            currentClients: 5
          }
        ]
      }

      const result = calc(state)

      expect(result.mode).toBe('forecast')
      expect(result.clients).toBeGreaterThan(0)
      expect(result.revenue).toBeGreaterThan(0)
      expect(result.income).toBeDefined()
      expect(result.capacityPct).toBeGreaterThan(0)
    })

    it('should calculate for current operations mode', () => {
      const state = {
        mode: 'current',
        employees: 2,
        employeePay: 50000,
        monthlyCosts: 1000,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: [
          {
            name: 'Consulting',
            priceMonthly: 200,
            sessionsPerYear: 12,
            hoursPerSession: 2,
            variableCostPerSession: 50,
            mixPct: 100,
            currentClients: 5
          }
        ]
      }

      const result = calc(state)

      expect(result.mode).toBe('current')
      expect(result.clients).toBe(5)
      expect(result.revenue).toBe(5 * 200 * 12) // 5 clients * $200/month * 12 months
      expect(result.capacityPct).toBeGreaterThan(0)
    })

    it('should handle no offerings gracefully', () => {
      const state = {
        mode: 'forecast',
        employees: 1,
        employeePay: 0,
        monthlyCosts: 1000,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: []
      }

      const result = calc(state)

      expect(result.clients).toBe(0)
      expect(result.revenue).toBe(0)
      expect(result.breakEvenClients).toBe(Infinity)
    })
  })

  describe('calc - Caching', () => {
    it('should cache calculation results', () => {
      const state = {
        mode: 'forecast',
        employees: 1,
        employeePay: 50000,
        monthlyCosts: 1000,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: [
          {
            name: 'Service',
            priceMonthly: 100,
            sessionsPerYear: 12,
            hoursPerSession: 1,
            variableCostPerSession: 20,
            mixPct: 100,
            currentClients: 1
          }
        ]
      }

      // First calculation
      const result1 = calc(state, { enableCache: true })
      const cacheStats1 = getCacheStats()

      // Second calculation with same input should use cache
      const result2 = calc(state, { enableCache: true })
      const cacheStats2 = getCacheStats()

      expect(result1).toEqual(result2)
      expect(cacheStats2.size).toBe(1)
    })

    it('should clear cache when requested', () => {
      const state = {
        mode: 'forecast',
        employees: 1,
        employeePay: 50000,
        monthlyCosts: 1000,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: []
      }

      calc(state)
      expect(getCacheStats().size).toBe(1)

      clearCalculationCache()
      expect(getCacheStats().size).toBe(0)
    })
  })

  describe('calc - Debug mode', () => {
    it('should include intermediate results in debug mode', () => {
      const state = {
        mode: 'forecast',
        employees: 1,
        employeePay: 0,
        monthlyCosts: 1000,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: [
          {
            name: 'Service',
            priceMonthly: 100,
            sessionsPerYear: 12,
            hoursPerSession: 1,
            variableCostPerSession: 20,
            mixPct: 100,
            currentClients: 1
          }
        ]
      }

      const result = calc(state, { debug: true })

      expect(result._intermediate).toBeDefined()
      expect(result._intermediate.inputs).toBeDefined()
      expect(result._intermediate.sanitization).toBeDefined()
      expect(result._intermediate.capacity).toBeDefined()
      expect(result._intermediate.costs).toBeDefined()
      expect(result._intermediate.modeResults).toBeDefined()
      expect(result._intermediate.breakEven).toBeDefined()
    })
  })

  describe('calc - Validation', () => {
    it('should sanitize input values', () => {
      const state = {
        mode: 'forecast',
        employees: -5, // Invalid
        employeePay: -1000, // Invalid
        monthlyCosts: -500, // Invalid
        productiveUtilizationPct: 150, // Too high
        targetUtilizationPct: 200, // Too high
        offerings: [
          {
            name: '   ', // Empty name
            priceMonthly: -50, // Invalid
            sessionsPerYear: -10, // Invalid
            hoursPerSession: -1, // Invalid
            variableCostPerSession: -20, // Invalid
            mixPct: -30, // Invalid
            currentClients: -5 // Invalid
          }
        ]
      }

      const result = calc(state)

      // Should sanitize to valid values
      expect(result.annualFixedCosts).toBe(0) // monthlyCosts sanitized to 0
      // Other validations should work as expected
    })
  })

  describe('calc - Payroll Logic', () => {
    it('should include all employees in annual payroll (no -1 owner exclusion)', () => {
      const state = {
        mode: 'forecast',
        employees: 1,
        employeePay: 60000,
        monthlyCosts: 0,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: []
      }

      const result = calc(state)

      // Previously this would have been 0 due to (employees - 1)
      expect(result.annualPayroll).toBe(60000)
    })

    it('should calculate payroll correctly for multiple employees', () => {
      const state = {
        mode: 'forecast',
        employees: 3,
        employeePay: 50000,
        monthlyCosts: 0,
        productiveUtilizationPct: 80,
        targetUtilizationPct: 100,
        offerings: []
      }

      const result = calc(state)
      expect(result.annualPayroll).toBe(150000)
    })
  })
})
