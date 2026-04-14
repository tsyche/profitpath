// ============================================================================
// CALCULATION ENGINE - Refactored for Better Maintainability and Testability
// ============================================================================

import { state } from './main.js';
import { HOURS_PER_YEAR } from './constants.js';
import { handleCalculationError } from './shared.js';

// Performance optimization: Cache for calculation results
const calcCache = new Map();
const CACHE_SIZE_LIMIT = 50;

// Clear cache when state changes significantly
export function clearCalcCache() {
  calcCache.clear();
}

// Get cache key from state
function getCacheKey(state) {
  return JSON.stringify({
    mode: state.mode,
    offerings: state.offerings,
    employees: state.employees,
    employeePay: state.employeePay,
    monthlyCosts: state.monthlyCosts,
    productiveUtilizationPct: state.productiveUtilizationPct,
    targetUtilizationPct: state.targetUtilizationPct,
  });
}

// Error handling utilities

export function sanitizeGlobalInputs(inputState) {
  return {
    employees: Math.max(1, Math.floor(inputState.employees || 1)),
    employeePay: Math.max(0, inputState.employeePay || 60000),
    monthlyCosts: Math.max(0, inputState.monthlyCosts || 0),
    productiveUtilizationPct: Math.max(1, Math.min(100, inputState.productiveUtilizationPct || 80)),
    targetUtilizationPct: Math.max(1, Math.min(150, inputState.targetUtilizationPct || 85))
  };
}

export function calculateGlobalMetrics(globals) {
  return {
    annualPaidHours: globals.employees * HOURS_PER_YEAR,
    annualServiceHours: globals.annualPaidHours * (globals.productiveUtilizationPct / 100),
    annualFixedCosts: globals.monthlyCosts * 12 + globals.employees * globals.employeePay
  };
}

export function sanitizeOfferings(rawOfferings) {
  return rawOfferings.map(offering => ({
    id: offering.id || crypto.randomUUID?.() || 'temp-id',
    name: (offering.name || '').trim() || `Offering ${rawOfferings.indexOf(offering) + 1}`,
    priceMonthly: Math.max(0.01, offering.priceMonthly || 100),
    sessionsPerYear: Math.max(1, Math.floor(offering.sessionsPerYear || 12)),
    hoursPerSession: Math.max(0.1, offering.hoursPerSession || 1),
    variableCostPerSession: Math.max(0, offering.variableCostPerSession || 0),
    mixPct: Math.max(0, Math.min(100, offering.mixPct || 0)),
    currentClients: Math.max(0, Math.floor(offering.currentClients || 0))
  }));
}

export function calculateForecastMode(offerings, globals) {
  let totalRevenue = 0;
  let totalServiceHours = 0;
  let totalVariableCosts = 0;
  let totalSessions = 0;
  let totalClients = 0;

  offerings.forEach(offering => {
    // Calculate estimated clients based on mix percentage
    const estClients = Math.floor(globals.annualServiceHours * (offering.mixPct / 100) / offering.hoursPerSession / offering.sessionsPerYear);
    const sessions = estClients * offering.sessionsPerYear;
    const revenue = sessions * offering.priceMonthly;
    const serviceHours = sessions * offering.hoursPerSession;
    const variableCosts = sessions * offering.variableCostPerSession;

    totalClients += estClients;
    totalSessions += sessions;
    totalRevenue += revenue;
    totalServiceHours += serviceHours;
    totalVariableCosts += variableCosts;

    // Update offering with calculated values
    offering.calculatedClients = estClients;
    offering.calculatedSessions = sessions;
    offering.calculatedRevenue = revenue;
  });

  const capacityPct = totalServiceHours > 0 ? (totalServiceHours / globals.annualServiceHours) * 100 : 0;
  const fixedCosts = globals.annualFixedCosts;
  const totalCosts = fixedCosts + totalVariableCosts;
  const income = totalRevenue - totalCosts;

  return {
    mode: 'forecast',
    clients: totalClients,
    totalSessions,
    serviceHours: totalServiceHours,
    capacityPct,
    revenue: totalRevenue,
    fixedCosts,
    variableCosts: totalVariableCosts,
    totalCosts,
    income,
    breakEvenClients: Math.ceil(fixedCosts / ((totalRevenue / totalClients) || 1)),
    contributionMarginPerClient: totalClients > 0 ? ((totalRevenue - totalVariableCosts) / totalClients) : 0
  };
}

export function calculateCurrentMode(offerings, globals) {
  let totalRevenue = 0;
  let totalServiceHours = 0;
  let totalVariableCosts = 0;
  let totalSessions = 0;
  let totalClients = 0;

  offerings.forEach(offering => {
    const clients = offering.currentClients || 0;
    const sessions = clients * offering.sessionsPerYear;
    const revenue = sessions * offering.priceMonthly;
    const serviceHours = sessions * offering.hoursPerSession;
    const variableCosts = sessions * offering.variableCostPerSession;

    totalClients += clients;
    totalSessions += sessions;
    totalRevenue += revenue;
    totalServiceHours += serviceHours;
    totalVariableCosts += variableCosts;
  });

  const capacityPct = totalServiceHours > 0 ? (totalServiceHours / globals.annualServiceHours) * 100 : 0;
  const fixedCosts = globals.annualFixedCosts;
  const totalCosts = fixedCosts + totalVariableCosts;
  const income = totalRevenue - totalCosts;

  return {
    mode: 'current',
    clients: totalClients,
    totalSessions,
    serviceHours: totalServiceHours,
    capacityPct,
    revenue: totalRevenue,
    fixedCosts,
    variableCosts: totalVariableCosts,
    totalCosts,
    income,
    breakEvenClients: Math.ceil(fixedCosts / ((totalRevenue / totalClients) || 1)),
    contributionMarginPerClient: totalClients > 0 ? ((totalRevenue - totalVariableCosts) / totalClients) : 0
  };
}

/**
 * Main calculation engine - refactored for better maintainability and testability
 * @param {Object} stateInput - Optional state override for testing
 * @returns {Object} Complete calculation results
 */
export function calc(stateInput) {
  try {
    // Accept state as parameter for testability; defaults to global state if not provided
    const s = stateInput || state;

    // Input validation
    if (!s || typeof s !== 'object') {
      throw new Error('Invalid state object provided to calc()');
    }

    // Performance optimization: Check cache first
    const cacheKey = stateInput ? null : getCacheKey(s); // Don't cache when testing with custom state
    if (cacheKey && calcCache.has(cacheKey)) {
      return calcCache.get(cacheKey);
    }

    // Sanitize inputs
    const globals = sanitizeGlobalInputs(s);
    const globalMetrics = calculateGlobalMetrics(globals);
    const offerings = sanitizeOfferings(s.offerings || []);

    // Calculate mode-specific results
    const modeResults = s.mode === 'forecast' ?
      calculateForecastMode(offerings, { ...globals, ...globalMetrics }) :
      calculateCurrentMode(offerings, { ...globals, ...globalMetrics });

    // Prepare complete results
    const result = {
      mode: s.mode,
      offerings,
      annualPaidHours: globalMetrics.annualPaidHours,
      annualServiceHours: globalMetrics.annualServiceHours,
      annualFixedCosts: globalMetrics.annualFixedCosts,
      annualPayroll: globalMetrics.annualPayroll,
      ...modeResults,
      contributionMarginRatio: modeResults.revenue > 0 ? ((modeResults.revenue - modeResults.variableCosts) / modeResults.revenue) * 100 : 0
    };

    // Performance optimization: Cache the result
    if (cacheKey) {
      if (calcCache.size >= CACHE_SIZE_LIMIT) {
        // Remove oldest entry (simple FIFO)
        const firstKey = calcCache.keys().next().value;
        calcCache.delete(firstKey);
      }
      calcCache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    return handleCalculationError('main calculation', error, {
      mode: 'forecast',
      offerings: [],
      annualPaidHours: 0,
      annualServiceHours: 0,
      annualFixedCosts: 0,
      annualPayroll: 0,
      revenue: 0,
      income: 0,
      clients: 0,
      totalSessions: 0,
      serviceHours: 0,
      capacityPct: 0,
      breakEvenClients: Infinity,
      contributionMarginPerClient: 0,
      contributionMarginRatio: 0
    });
  }
}
