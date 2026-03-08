import { describe, it, expect, beforeEach } from 'vitest'
import { calc } from '../calculations/index.js'

// Mock the DOM functions that the app uses
global.$ = (selector) => {
  // Simple mock implementation for testing
  const mockElement = {
    value: '',
    innerHTML: '',
    style: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
      toggle: vi.fn()
    },
    addEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
  return mockElement
}

global.$$ = (selector) => []

describe('Business Logic Calculations', () => {
  beforeEach(() => {
    // Reset any global state before each test
    global.state = {
      mode: 'forecast',
      employees: 1,
      employeePay: 50000,
      monthlyCosts: 1000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [
        {
          name: 'Basic Service',
          priceMonthly: 100,
          sessionsPerYear: 12,
          hoursPerSession: 2,
          variableCostPerSession: 20,
          mixPct: 100,
          currentClients: 5
        }
      ]
    }
  })

  it('should calculate basic profitability', () => {
    const result = calc(global.state)

    expect(result.revenue).toBeGreaterThan(0)
    expect(result.income).toBeDefined()
    expect(result.clients).toBeGreaterThan(0)
    expect(result.capacityPct).toBeGreaterThan(0)
  })

  it('should handle forecast vs current mode correctly', () => {
    // Test forecast mode
    global.state.mode = 'forecast'
    const forecastResult = calc(global.state)

    // Test current mode
    global.state.mode = 'current'
    const currentResult = calc(global.state)

    // Both should produce valid results
    expect(forecastResult.mode).toBe('forecast')
    expect(currentResult.mode).toBe('current')
    expect(forecastResult.clients).toBeGreaterThan(0)
    expect(currentResult.clients).toBeGreaterThan(0)
  })

  it('should validate business inputs', () => {
    // Test with invalid inputs
    global.state.employees = -1
    global.state.employeePay = -1000
    global.state.monthlyCosts = -500

    const result = calc(global.state)

    // Should sanitize negative values to valid ranges
    expect(result.annualPayroll).toBeGreaterThanOrEqual(0)
    expect(result.annualFixedCosts).toBeGreaterThanOrEqual(0)
  })

  it('should calculate break-even analysis', () => {
    const result = calc(global.state)

    expect(result.breakEvenClients).toBeDefined()
    expect(result.breakEvenClients).toBeGreaterThan(0)
    expect(typeof result.breakEvenClients).toBe('number')
  })

  it('should handle multiple service offerings', () => {
    global.state.offerings = [
      {
        name: 'Premium Service',
        priceMonthly: 200,
        sessionsPerYear: 12,
        hoursPerSession: 3,
        variableCostPerSession: 50,
        mixPct: 60,
        currentClients: 3
      },
      {
        name: 'Basic Service',
        priceMonthly: 100,
        sessionsPerYear: 12,
        hoursPerSession: 1,
        variableCostPerSession: 10,
        mixPct: 40,
        currentClients: 5
      }
    ]

    const result = calc(global.state)

    expect(result.revenue).toBeGreaterThan(0)
    expect(result.clients).toBeGreaterThan(0)
    expect(result.capacityPct).toBeGreaterThan(0)
  })
})
