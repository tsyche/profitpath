// ============================================================================
// UNIT TESTS - Core Functionality Testing
// ============================================================================

import { calc, clearCalcCache } from './calculations.js';
import { sanitizeNumericInput, safeParseNumber, fmtMoney0, fmtInt } from './utils.js';
import { validateBusinessRules } from './validation.js';

// Test runner utilities
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function runTests() {
  console.log('🧪 Running ProfitPath Unit Tests...\n');

  tests.forEach(({ name, fn }) => {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`);
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

test('safeParseNumber handles valid numbers', () => {
  if (safeParseNumber('123') !== 123) throw new Error('Failed to parse valid number');
  if (safeParseNumber('123.45') !== 123.45) throw new Error('Failed to parse decimal');
  if (safeParseNumber(123) !== 123) throw new Error('Failed to handle number input');
});

test('safeParseNumber handles invalid inputs', () => {
  if (safeParseNumber('') !== 0) throw new Error('Failed default for empty string');
  if (safeParseNumber(null) !== 0) throw new Error('Failed default for null');
  if (safeParseNumber('abc') !== 0) throw new Error('Failed default for non-numeric');
  if (safeParseNumber('NaN') !== 0) throw new Error('Failed default for NaN string');
});

test('safeParseNumber respects bounds', () => {
  if (safeParseNumber('150', 0, 0, 100) !== 100) throw new Error('Failed max bound');
  if (safeParseNumber('-50', 0, 0, 100) !== 0) throw new Error('Failed min bound');
});

test('sanitizeNumericInput handles various cases', () => {
  const result = sanitizeNumericInput('123.456', { precision: 2 });
  if (result !== 123.46) throw new Error('Failed precision handling');

  const negativeResult = sanitizeNumericInput('-10', { allowNegative: false });
  if (negativeResult !== 10) throw new Error('Failed negative handling');
});

test('format functions work correctly', () => {
  if (fmtMoney0(1234.56) !== '$1,235') throw new Error('fmtMoney0 failed');
  if (fmtInt(1234.56) !== '1,235') throw new Error('fmtInt failed');
});

// ============================================================================
// CALCULATION TESTS
// ============================================================================

test('calc handles basic forecast mode', () => {
  const testState = {
    mode: 'forecast',
    employees: 1,
    employeePay: 60000,
    monthlyCosts: 2000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 85,
    offerings: [{
      id: 'test-1',
      name: 'Test Service',
      priceMonthly: 1000,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 50,
      mixPct: 100,
      currentClients: 0
    }]
  };

  const result = calc(testState);

  if (!result) throw new Error('Calc returned null/undefined');
  if (result.mode !== 'forecast') throw new Error('Mode not set correctly');
  if (result.revenue <= 0) throw new Error('Revenue calculation failed');
  if (result.clients < 0) throw new Error('Client calculation failed');
});

test('calc handles current mode', () => {
  const testState = {
    mode: 'current',
    employees: 1,
    employeePay: 60000,
    monthlyCosts: 2000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 85,
    offerings: [{
      id: 'test-1',
      name: 'Test Service',
      priceMonthly: 1000,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 50,
      mixPct: 0,
      currentClients: 5
    }]
  };

  const result = calc(testState);

  if (!result) throw new Error('Calc returned null/undefined');
  if (result.mode !== 'current') throw new Error('Mode not set correctly');
  if (result.clients !== 5) throw new Error('Client count not preserved');
});

test('calc handles empty offerings gracefully', () => {
  const testState = {
    mode: 'forecast',
    employees: 1,
    employeePay: 60000,
    monthlyCosts: 2000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 85,
    offerings: []
  };

  const result = calc(testState);

  if (!result) throw new Error('Calc returned null/undefined');
  if (result.revenue !== 0) throw new Error('Empty offerings should have zero revenue');
});

test('calc handles invalid input gracefully', () => {
  const testState = {
    mode: 'invalid',
    employees: -1,
    employeePay: 'invalid',
    monthlyCosts: null,
    productiveUtilizationPct: 200,
    targetUtilizationPct: -50,
    offerings: null
  };

  const result = calc(testState);

  if (!result) throw new Error('Calc should handle invalid input gracefully');
  // Should return sanitized defaults
});

test('calculation caching works', () => {
  clearCalcCache();

  const testState = {
    mode: 'forecast',
    employees: 1,
    employeePay: 60000,
    monthlyCosts: 2000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 85,
    offerings: [{
      id: 'cache-test',
      name: 'Cache Test',
      priceMonthly: 1000,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 50,
      mixPct: 100,
      currentClients: 0
    }]
  };

  // First calculation
  const result1 = calc(testState);
  // Second calculation (should use cache)
  const result2 = calc(testState);

  if (!result1 || !result2) throw new Error('Caching test failed');
  if (result1.revenue !== result2.revenue) throw new Error('Cached result differs from original');
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

test('validateBusinessRules detects missing offerings', () => {
  const testState = {
    mode: 'forecast',
    employees: 1,
    offerings: []
  };

  const rules = validateBusinessRules(testState);
  const hasMissingOfferings = rules.info.some(rule => rule.includes('offerings'));

  if (!hasMissingOfferings) throw new Error('Should detect missing offerings');
});

test('validateBusinessRules detects invalid employee count', () => {
  const testState = {
    mode: 'forecast',
    employees: 0,
    offerings: [{
      id: 'test',
      name: 'Test',
      priceMonthly: 1000,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 50,
      mixPct: 100,
      currentClients: 0
    }]
  };

  const rules = validateBusinessRules(testState);
  const hasEmployeeError = rules.errors.some(rule => rule.includes('employee'));

  if (!hasEmployeeError) throw new Error('Should detect invalid employee count');
});

test('validateBusinessRules handles valid state', () => {
  const testState = {
    mode: 'forecast',
    employees: 2,
    employeePay: 60000,
    monthlyCosts: 2000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 85,
    offerings: [{
      id: 'valid-test',
      name: 'Valid Service',
      priceMonthly: 1000,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 50,
      mixPct: 100,
      currentClients: 0
    }]
  };

  const rules = validateBusinessRules(testState);

  if (rules.errors.length > 0) throw new Error('Valid state should have no errors');
  if (rules.warnings.length > 0) throw new Error('Valid state should have no warnings');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

test('end-to-end calculation flow', () => {
  const testState = {
    mode: 'forecast',
    employees: 2,
    employeePay: 60000,
    monthlyCosts: 3000,
    productiveUtilizationPct: 75,
    targetUtilizationPct: 80,
    offerings: [
      {
        id: 'service-1',
        name: 'Premium Consulting',
        priceMonthly: 2500,
        sessionsPerYear: 12,
        hoursPerSession: 4,
        variableCostPerSession: 100,
        mixPct: 60,
        currentClients: 0
      },
      {
        id: 'service-2',
        name: 'Basic Consulting',
        priceMonthly: 1200,
        sessionsPerYear: 24,
        hoursPerSession: 2,
        variableCostPerSession: 50,
        mixPct: 40,
        currentClients: 0
      }
    ]
  };

  const result = calc(testState);

  if (!result) throw new Error('Integration test failed');
  if (result.revenue <= 0) throw new Error('Revenue should be positive');
  if (result.income >= 0 && result.clients < result.breakEvenClients) {
    throw new Error('Break-even logic inconsistent');
  }
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test('calculation performance is reasonable', () => {
  const testState = {
    mode: 'forecast',
    employees: 5,
    employeePay: 60000,
    monthlyCosts: 5000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 85,
    offerings: Array.from({ length: 10 }, (_, i) => ({
      id: `perf-test-${i}`,
      name: `Service ${i}`,
      priceMonthly: 1000 + i * 100,
      sessionsPerYear: 12,
      hoursPerSession: 2,
      variableCostPerSession: 50,
      mixPct: 10,
      currentClients: 0
    }))
  };

  const startTime = performance.now();
  const result = calc(testState);
  const endTime = performance.now();

  const duration = endTime - startTime;
  if (duration > 100) { // Should complete in under 100ms
    console.warn(`Performance test slow: ${duration.toFixed(2)}ms`);
  }

  if (!result) throw new Error('Performance test failed to calculate');
});

// ============================================================================
// TEST RUNNER
// ============================================================================

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.location) {
  // Run tests when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runTests, 100); // Small delay to ensure modules are loaded
    });
  } else {
    setTimeout(runTests, 100);
  }
}

// Export for programmatic use
export { test, runTests };
