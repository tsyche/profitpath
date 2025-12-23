/**
 * Calculation Engine for ProfitPath
 * Handles all business logic calculations with caching and debugging support
 */

// Constants
export const HOURS_PER_YEAR = 2080; // Standard paid hours per employee per year

// Utility functions
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Calculation cache to avoid redundant computations
const calculationCache = new Map();
const CACHE_MAX_SIZE = 50;

/**
 * Clears the calculation cache
 */
export function clearCalculationCache() {
  calculationCache.clear();
}

/**
 * Generates a cache key from calculation inputs
 */
function generateCacheKey(state) {
  // Create a deterministic string key from the state
  return JSON.stringify({
    mode: state.mode,
    employees: state.employees,
    employeePay: state.employeePay,
    monthlyCosts: state.monthlyCosts,
    productiveUtilizationPct: state.productiveUtilizationPct,
    targetUtilizationPct: state.targetUtilizationPct,
    offerings: state.offerings.map(o => ({
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
    .map((o) => ({
      ...o,
      name: (o.name || '').trim() || 'Offering',
      priceMonthly: Math.max(0, Number(o.priceMonthly) || 0),
      sessionsPerYear: Math.max(0, Number(o.sessionsPerYear) || 0),
      hoursPerSession: Math.max(0, Number(o.hoursPerSession) || 0),
      variableCostPerSession: Math.max(0, Number(o.variableCostPerSession) || 0),
      mixPct: Math.max(0, Number(o.mixPct) || 0),
      currentClients: Math.max(0, Math.floor(Number(o.currentClients) || 0)),
    }))
    .filter((o) => o.name.length > 0);
}

/**
 * Calculates capacity and utilization metrics
 * @param {Object} params - Calculation parameters
 * @returns {Object} Capacity metrics
 */
function calculateCapacity(params) {
  const { employees, productiveUtilizationPct, targetUtilizationPct } = params;

  const annualPaidHours = employees * HOURS_PER_YEAR;
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
  const annualPayroll = Math.max(0, employees - 1) * employeePay; // Excludes owner

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
 * Main calculation engine with caching and debugging support
 * @param {Object} stateInput - Application state (defaults to global state)
 * @param {Object} options - Calculation options
 * @returns {Object} Calculation results with intermediate steps
 */
export function calc(stateInput, options = {}) {
  const { enableCache = true, debug = false } = options;

  // Use global state if no input provided
  const s = stateInput || globalThis.state;
  if (!s) {
    throw new Error('No state provided and global state not available');
  }

  // Generate cache key for this calculation
  const cacheKey = generateCacheKey(s);

  // Check cache first
  if (enableCache && calculationCache.has(cacheKey)) {
    const cached = calculationCache.get(cacheKey);
    if (debug) console.log('Using cached calculation result');
    return cached;
  }

  // Input validation and sanitization
  const intermediate = {
    inputs: { ...s },
    sanitization: {},
    capacity: {},
    costs: {},
    modeResults: {},
    breakEven: {}
  };

  const employees = Math.max(1, Number(s.employees) || 1);
  const employeePay = Math.max(0, Number(s.employeePay) || 0);
  const monthlyCosts = Math.max(0, Number(s.monthlyCosts) || 0);
  const productiveUtilizationPct = clamp(Number(s.productiveUtilizationPct) || 0, 0, 100);
  const targetUtilizationPct = clamp(Number(s.targetUtilizationPct) || 0, 0, 150);

  intermediate.sanitization = {
    employees,
    employeePay,
    monthlyCosts,
    productiveUtilizationPct,
    targetUtilizationPct
  };

  // Sanitize offerings
  const offerings = sanitizeOfferings(s.offerings);
  intermediate.sanitization.offerings = offerings;

  const mode = s.mode;

  // Early return for no offerings
  if (!offerings.length) {
    const capacity = calculateCapacity({ employees, productiveUtilizationPct, targetUtilizationPct });
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

    if (enableCache) {
      calculationCache.set(cacheKey, result);
      if (calculationCache.size > CACHE_MAX_SIZE) {
        // Remove oldest entry (simple FIFO)
        const firstKey = calculationCache.keys().next().value;
        calculationCache.delete(firstKey);
      }
    }

    return result;
  }

  // Calculate capacity and costs
  const capacity = calculateCapacity({ employees, productiveUtilizationPct, targetUtilizationPct });
  const costs = calculateCosts({ employees, employeePay, monthlyCosts });

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
  const result = {
    mode,
    offerings,
    ...capacity,
    ...costs,
    ...modeResults,
    ...breakEven,
    income: modeResults.revenue - costs.totalFixedCosts - modeResults.variableCosts,
    ...(debug ? { _intermediate: intermediate } : {})
  };

  // Cache the result
  if (enableCache) {
    calculationCache.set(cacheKey, result);
    if (calculationCache.size > CACHE_MAX_SIZE) {
      const firstKey = calculationCache.keys().next().value;
      calculationCache.delete(firstKey);
    }
  }

  if (debug) {
    console.log('Calculation completed:', {
      mode,
      clients: result.clients,
      revenue: result.revenue,
      income: result.income,
      cacheSize: calculationCache.size
    });
  }

  return result;
}

/**
 * Gets cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return {
    size: calculationCache.size,
    maxSize: CACHE_MAX_SIZE,
    hitRate: 0 // Could be tracked with additional implementation
  };
}
