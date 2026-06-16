/**
 * Calculation Engine for ProfitPath
 * Handles all business logic calculations with caching and debugging support
 */

import { clamp } from '../../assets/utils/helpers';

// Constants
export const HOURS_PER_YEAR = 2080; // Standard paid hours per employee per year

// Coerce to a finite number; non-finite values (NaN, ±Infinity) become the
// fallback so hostile inputs can't propagate NaN through the results
const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// Upper bounds for inputs so products of extreme-but-finite values
// (e.g. 1e308 pay × employees) can't overflow to Infinity downstream
const MAX_MONEY = 1e12;
const MAX_COUNT = 1e6;

// Calculation cache to avoid redundant computations
const calculationCache = new Map();
const CACHE_MAX_SIZE = 100;

// Performance metrics
let cacheHits = 0;
let cacheMisses = 0;
let lastCalcMs = 0;
let totalCalcs = 0;

/**
 * Clears the calculation cache
 */
export function clearCalculationCache() {
  calculationCache.clear();
}

function cacheSet(key, value) {
  calculationCache.set(key, value);
  if (calculationCache.size > CACHE_MAX_SIZE) {
    // Evict least recently used (Map insertion order = oldest first after LRU promotion)
    calculationCache.delete(calculationCache.keys().next().value);
  }
}

/**
 * Generates a cache key from calculation inputs
 */
function generateCacheKey(state) {
  // Create a deterministic string key from the state
  // Handle both new and old formats
  const employeeKey = 'fullTimeEmployees' in state ? {
    fullTimeEmployees: state.fullTimeEmployees,
    partTimeEmployees: state.partTimeEmployees,
    fullTimeEmployeePay: state.fullTimeEmployeePay,
    partTimeEmployeePay: state.partTimeEmployeePay
  } : {
    employees: state.employees,
    hoursPerWeek: state.hoursPerWeek,
    employeePay: state.employeePay
  };

  return JSON.stringify({
    mode: state.mode,
    ...employeeKey,
    monthlyCosts: state.monthlyCosts,
    productiveUtilizationPct: state.productiveUtilizationPct,
    targetUtilizationPct: state.targetUtilizationPct,
    offerings: (Array.isArray(state.offerings) ? state.offerings : []).filter(o => o && typeof o === 'object').map(o => ({
      name: o.name,
      priceMonthly: o.priceMonthly,
      sessionsPerYear: o.sessionsPerYear,
      hoursPerSession: o.hoursPerSession,
      variableCostPerSession: o.variableCostPerSession,
      mixPct: o.mixPct,
      currentClients: o.currentClients
    }))
  });
}

/**
 * Normalizes offering mix percentages and calculates shares
 * @param {Array} offerings - Array of service offerings
 * @returns {Object} Normalized mix data
 */
export function normalizeMix(offerings) {
  const sum = offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);

  // Return per-offering shares (sum to 1) for calculations.
  // NOTE: this does NOT mutate state or the offering values shown in the UI.
  if (sum <= 0) {
    const evenShare = offerings.length ? 1 / offerings.length : 0;
    return {
      sum: 0,
      needsNormalization: false,
      shares: offerings.map(() => evenShare),
    };
  }

  return {
    sum,
    needsNormalization: Math.abs(sum - 100) > 0.01,
    shares: offerings.map((o) => (Number(o.mixPct) || 0) / sum),
  };
}

/**
 * Sanitizes and validates offering data
 * @param {Array} offerings - Raw offerings from state
 * @returns {Array} Sanitized offerings
 */
function sanitizeOfferings(offerings) {
  return offerings
    .filter((o) => o && typeof o === 'object')
    .map((o) => ({
      ...o,
      name: (typeof o.name === 'string' ? o.name : '').trim() || 'Offering',
      priceMonthly: clamp(toFinite(o.priceMonthly), 0, MAX_MONEY),
      sessionsPerYear: clamp(toFinite(o.sessionsPerYear), 0, MAX_COUNT),
      hoursPerSession: clamp(toFinite(o.hoursPerSession), 0, MAX_COUNT),
      variableCostPerSession: clamp(toFinite(o.variableCostPerSession), 0, MAX_MONEY),
      mixPct: clamp(toFinite(o.mixPct), 0, 100),
      currentClients: clamp(Math.floor(toFinite(o.currentClients)), 0, MAX_COUNT),
    }))
    .filter((o) => o.name.length > 0);
}

/**
 * Calculates capacity and utilization metrics
 * @param {Object} params - Calculation parameters
 * @returns {Object} Capacity metrics
 */
function calculateCapacity(params) {
  const { employees, productiveUtilizationPct, targetUtilizationPct, totalAnnualPaidHours } = params;

  // Use provided totalAnnualPaidHours if available, otherwise calculate from employees
  const annualPaidHours = totalAnnualPaidHours || (employees * HOURS_PER_YEAR);
  const annualServiceHours = annualPaidHours * (productiveUtilizationPct / 100);

  return {
    annualPaidHours,
    annualServiceHours,
    targetServiceHours: annualServiceHours * (targetUtilizationPct / 100)
  };
}

/**
 * Calculates cost metrics
 * @param {Object} params - Calculation parameters
 * @returns {Object} Cost metrics
 */
function calculateCosts(params) {
  const { employees, employeePay, monthlyCosts } = params;

  const annualFixedCosts = monthlyCosts * 12;
  const annualPayroll = employees * employeePay;

  return {
    annualFixedCosts,
    annualPayroll,
    totalFixedCosts: annualFixedCosts + annualPayroll
  };
}

/**
 * Calculates metrics for forecast mode
 * @param {Array} offerings - Sanitized offerings
 * @param {Object} capacity - Capacity metrics
 * @param {Object} costs - Cost metrics
 * @returns {Object} Forecast mode results
 */
function calculateForecastMode(offerings, capacity, costs) {
  const { sum: mixSum, needsNormalization: mixNormalized, shares } = normalizeMix(offerings);

  // Per-customer expectations (weighted by mix shares)
  const serviceHoursPerClient = offerings.reduce((acc, o, idx) => {
    const share = shares[idx] || 0;
    return acc + share * o.sessionsPerYear * o.hoursPerSession;
  }, 0);

  const sessionsPerClient = offerings.reduce((acc, o, idx) =>
    acc + (shares[idx] || 0) * o.sessionsPerYear, 0);

  const revenuePerClient = offerings.reduce((acc, o, idx) =>
    acc + (shares[idx] || 0) * (o.priceMonthly * 12), 0);

  const variableCostPerClient = offerings.reduce((acc, o, idx) =>
    acc + (shares[idx] || 0) * (o.sessionsPerYear * o.variableCostPerSession), 0);

  const clients = serviceHoursPerClient > 0 ?
    Math.floor(capacity.targetServiceHours / serviceHoursPerClient) : 0;

  const totalSessions = clients * sessionsPerClient;
  const revenue = clients * revenuePerClient;
  const variableCosts = clients * variableCostPerClient;

  const capacityPct = capacity.annualServiceHours > 0 ?
    (capacity.targetServiceHours / capacity.annualServiceHours) * 100 : 0;

  // Per-offering metrics
  const offeringMetrics = offerings.map((o, idx) => {
    const share = shares[idx] || 0;
    const offeringClients = Math.floor(clients * share);
    const offeringSessions = offeringClients * o.sessionsPerYear;
    const offeringRevenue = offeringClients * (o.priceMonthly * 12);
    const offeringVariableCosts = offeringSessions * o.variableCostPerSession;
    const offeringMargin = offeringRevenue - offeringVariableCosts;

    return {
      name: o.name,
      clients: offeringClients,
      sessions: offeringSessions,
      revenue: offeringRevenue,
      variableCosts: offeringVariableCosts,
      margin: offeringMargin,
      marginPct: offeringRevenue > 0 ? (offeringMargin / offeringRevenue) * 100 : 0
    };
  });

  return {
    clients,
    totalSessions,
    serviceHours: capacity.targetServiceHours,
    capacityPct,
    revenue,
    variableCosts,
    offeringMetrics,
    mixSum,
    mixNormalized,
    serviceHoursPerClient
  };
}

/**
 * Calculates metrics for current operations mode
 * @param {Array} offerings - Sanitized offerings
 * @param {Object} capacity - Capacity metrics
 * @param {Object} costs - Cost metrics
 * @returns {Object} Current mode results
 */
function calculateCurrentMode(offerings, capacity, costs) {
  let clients = 0;
  let totalSessions = 0;
  let serviceHours = 0;
  let revenue = 0;
  let variableCosts = 0;

  // Calculate from actual current clients
  offerings.forEach(o => {
    const offeringSessions = o.currentClients * o.sessionsPerYear;
    const offeringRevenue = o.currentClients * (o.priceMonthly * 12);
    const offeringVariableCosts = offeringSessions * o.variableCostPerSession;
    const offeringServiceHours = offeringSessions * o.hoursPerSession;

    clients += o.currentClients;
    totalSessions += offeringSessions;
    serviceHours += offeringServiceHours;
    revenue += offeringRevenue;
    variableCosts += offeringVariableCosts;
  });

  const capacityPct = capacity.annualServiceHours > 0 ?
    (serviceHours / capacity.annualServiceHours) * 100 : 0;

  // Per-offering metrics
  const offeringMetrics = offerings.map(o => {
    const offeringSessions = o.currentClients * o.sessionsPerYear;
    const offeringRevenue = o.currentClients * (o.priceMonthly * 12);
    const offeringVariableCosts = offeringSessions * o.variableCostPerSession;
    const offeringMargin = offeringRevenue - offeringVariableCosts;

    return {
      name: o.name,
      clients: o.currentClients,
      sessions: offeringSessions,
      revenue: offeringRevenue,
      variableCosts: offeringVariableCosts,
      margin: offeringMargin,
      marginPct: offeringRevenue > 0 ? (offeringMargin / offeringRevenue) * 100 : 0
    };
  });

  return {
    clients,
    totalSessions,
    serviceHours,
    capacityPct,
    revenue,
    variableCosts,
    offeringMetrics,
    mixSum: offerings.reduce((a, o) => a + (o.mixPct || 0), 0),
    mixNormalized: false
  };
}

/**
 * Calculates break-even analysis
 * @param {Object} results - Calculation results
 * @param {Object} costs - Cost metrics
 * @returns {Object} Break-even metrics
 */
function calculateBreakEven(results, costs) {
  const { revenue, clients } = results;

  // Calculate weighted average contribution margin per client
  const totalContributionMargin = results.offeringMetrics.reduce((sum, metric) =>
    sum + metric.margin, 0);

  const contributionMarginPerClient = clients > 0 ? totalContributionMargin / clients : 0;
  const contributionMarginRatio = revenue > 0 ? totalContributionMargin / revenue : 0;

  const breakEvenClients = contributionMarginPerClient > 0 ?
    Math.ceil(costs.totalFixedCosts / contributionMarginPerClient) : Infinity;

  const breakEvenRevenue = contributionMarginRatio > 0 ?
    costs.totalFixedCosts / contributionMarginRatio : Infinity;

  return {
    breakEvenClients,
    breakEvenRevenue,
    contributionMarginPerClient,
    contributionMarginRatio
  };
}

/**
 * Calculate tax estimates (2024 US rates, single filer, simplified)
 * @param {number} income - Pre-tax owner income (net profit before taxes)
 * @returns {Object} Tax estimates: seTax, federalTax, quarterlyEst, takeHome, effectiveRate
 */
function calculateTax(income) {
  if (income <= 0) {
    return {
      seTax: 0,
      federalTax: 0,
      quarterlyEst: 0,
      takeHome: Math.max(0, income),
      effectiveRate: 0
    };
  }

  // Self-employment tax (15.3% up to $168,600, then 2.9% above on 92.35% of income)
  const seBase = income * 0.9235;
  const ssTax = Math.min(seBase, 168600) * 0.153;
  const medicareTax = Math.max(0, seBase - 168600) * 0.029;
  const seTax = ssTax + medicareTax;

  // Federal income tax (owner deducts half of SE tax and standard deduction of $14,600)
  const taxableIncome = Math.max(0, income - seTax / 2 - 14600);

  // 2024 tax brackets for single filer
  const brackets = [
    [11600, 0.10],
    [35550, 0.12],
    [53375, 0.22],
    [91425, 0.24],
    [51775, 0.32],
    [365625, 0.35],
    [Infinity, 0.37]
  ];

  let federalTax = 0;
  let remaining = taxableIncome;

  for (const [width, rate] of brackets) {
    if (remaining <= 0) break;
    const taxableInThisBracket = Math.min(remaining, width);
    federalTax += taxableInThisBracket * rate;
    remaining -= width;
  }

  const totalTax = seTax + federalTax;
  const effectiveRate = income > 0 ? Math.round((totalTax / income) * 100) : 0;

  return {
    seTax: Math.round(seTax),
    federalTax: Math.round(federalTax),
    quarterlyEst: Math.round(totalTax / 4),
    takeHome: Math.round(income - totalTax),
    effectiveRate
  };
}

/**
 * Main calculation engine with caching and debugging support
 * @param {Object} stateInput - Application state (defaults to global state)
 * @param {Object} options - Calculation options
 * @returns {Object} Calculation results with intermediate steps
 */
export function calc(stateInput, options = {}) {
  const { enableCache = true, debug = false } = options;
  const startTime = performance.now();
  totalCalcs++;

  // Use global state if no input provided
  const s = stateInput || globalThis.state;
  if (!s) {
    throw new Error('No state provided and global state not available');
  }

  // Generate cache key for this calculation
  const cacheKey = generateCacheKey(s);

  // Check cache first (LRU: delete + re-insert moves the entry to Map tail)
  if (enableCache && calculationCache.has(cacheKey)) {
    const cached = calculationCache.get(cacheKey);
    calculationCache.delete(cacheKey);
    calculationCache.set(cacheKey, cached);
    cacheHits++;
    if (debug) console.log('Using cached calculation result');
    lastCalcMs = performance.now() - startTime;
    return cached;
  }

  cacheMisses++;

  // Input validation and sanitization
  const intermediate = {
    inputs: { ...s },
    sanitization: {},
    capacity: {},
    costs: {},
    modeResults: {},
    breakEven: {}
  };

  // Handle both new (fullTime/partTime) and old (employees/hoursPerWeek) formats
  let fullTimeEmployees, partTimeEmployees, fullTimeEmployeePay, partTimeEmployeePay, totalAnnualPaidHours, totalPayroll;

  if ('fullTimeEmployees' in s && 'partTimeEmployees' in s) {
    // New format
    fullTimeEmployees = clamp(toFinite(s.fullTimeEmployees), 0, MAX_COUNT);
    partTimeEmployees = clamp(toFinite(s.partTimeEmployees), 0, MAX_COUNT);
    fullTimeEmployeePay = clamp(toFinite(s.fullTimeEmployeePay), 0, MAX_MONEY);
    partTimeEmployeePay = clamp(toFinite(s.partTimeEmployeePay), 0, MAX_MONEY);

    const fullTimeHoursPerYear = 40 * 52; // 2080
    const partTimeHoursPerYear = 20 * 52; // 1040
    totalAnnualPaidHours = (fullTimeEmployees * fullTimeHoursPerYear) + (partTimeEmployees * partTimeHoursPerYear);
    totalPayroll = (fullTimeEmployees * fullTimeEmployeePay) + (partTimeEmployees * partTimeEmployeePay);
  } else {
    // Old format - convert to new format
    const employees = clamp(toFinite(s.employees, 1), 1, MAX_COUNT);
    const employeePay = clamp(toFinite(s.employeePay), 0, MAX_MONEY);
    const hoursPerWeek = clamp(toFinite(s.hoursPerWeek, 40) || 40, 1, 168);
    const hoursPerYear = hoursPerWeek * 52;

    fullTimeEmployees = employees;
    partTimeEmployees = 0;
    fullTimeEmployeePay = employeePay;
    partTimeEmployeePay = 0;
    totalAnnualPaidHours = employees * hoursPerYear;
    totalPayroll = employees * employeePay;
  }

  // For compatibility with rest of code, use combined values
  const employees = fullTimeEmployees + partTimeEmployees || 1; // At least 1 for calculations
  const employeePay = employees > 0 ? totalPayroll / employees : 0; // Average pay per employee

  const monthlyCosts = clamp(toFinite(s.monthlyCosts), 0, MAX_MONEY);
  const productiveUtilizationPct = clamp(toFinite(s.productiveUtilizationPct), 0, 100);
  const targetUtilizationPct = clamp(toFinite(s.targetUtilizationPct), 0, 150);

  intermediate.sanitization = {
    fullTimeEmployees,
    partTimeEmployees,
    fullTimeEmployeePay,
    partTimeEmployeePay,
    totalAnnualPaidHours,
    totalPayroll,
    employees,
    employeePay,
    monthlyCosts,
    productiveUtilizationPct,
    targetUtilizationPct
  };

  // Sanitize offerings
  const offerings = sanitizeOfferings(Array.isArray(s.offerings) ? s.offerings : []);
  intermediate.sanitization.offerings = offerings;

  const mode = s.mode;

  // Early return for no offerings
  if (!offerings.length) {
    const capacity = calculateCapacity({ employees, productiveUtilizationPct, targetUtilizationPct, totalAnnualPaidHours });
    const costs = calculateCosts({ employees, employeePay, monthlyCosts });

    const result = {
      mode,
      offerings,
      ...capacity,
      ...costs,
      clients: 0,
      totalSessions: 0,
      serviceHours: 0,
      capacityPct: 0,
      revenue: 0,
      variableCosts: 0,
      income: -costs.totalFixedCosts,
      mixSum: 0,
      mixNormalized: false,
      breakEvenClients: Infinity,
      breakEvenRevenue: Infinity,
      contributionMarginPerClient: 0,
      contributionMarginRatio: 0,
      offeringMetrics: [],
      ...(debug ? { _intermediate: intermediate } : {})
    };

    if (enableCache) cacheSet(cacheKey, result);

    return result;
  }

  // Calculate capacity and costs
  const capacity = calculateCapacity({ employees, productiveUtilizationPct, targetUtilizationPct, totalAnnualPaidHours });
  const costs = calculateCosts({ employees, employeePay: totalPayroll / (employees || 1), monthlyCosts });

  intermediate.capacity = capacity;
  intermediate.costs = costs;

  // Calculate mode-specific results
  const modeResults = mode === 'forecast' ?
    calculateForecastMode(offerings, capacity, costs) :
    calculateCurrentMode(offerings, capacity, costs);

  intermediate.modeResults = modeResults;

  // Calculate break-even analysis
  const breakEven = calculateBreakEven(modeResults, costs);
  intermediate.breakEven = breakEven;

  // Compile final result
  const income = modeResults.revenue - costs.totalFixedCosts - modeResults.variableCosts;
  const taxCalcs = calculateTax(income);

  const result = {
    mode,
    offerings,
    ...capacity,
    ...costs,
    ...modeResults,
    ...breakEven,
    income,
    ...taxCalcs,
    ...(debug ? { _intermediate: intermediate } : {})
  };

  if (enableCache) cacheSet(cacheKey, result);

  lastCalcMs = performance.now() - startTime;

  if (debug) {
    console.log('Calculation completed:', {
      mode,
      clients: result.clients,
      revenue: result.revenue,
      income: result.income,
      cacheSize: calculationCache.size,
      calcTimeMs: lastCalcMs.toFixed(2)
    });
  }

  return result;
}

/**
 * Gets cache statistics
 * @returns {Object} Cache statistics
 */
/**
 * Gets cache statistics
 * @returns {Object} Cache statistics including hit rate and timing
 */
export function getCacheStats() {
  const hitRate = totalCalcs > 0 ? Math.round((cacheHits / totalCalcs) * 100) : 0;
  return {
    size: calculationCache.size,
    maxSize: CACHE_MAX_SIZE,
    hitRate,
    hits: cacheHits,
    misses: cacheMisses,
    lastCalcMs: lastCalcMs.toFixed(2),
    totalCalcs
  };
}
