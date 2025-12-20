const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Constants for business model assumptions
const HOURS_PER_YEAR = 2080; // Standard paid hours per employee per year
const DEFAULT_CURRENCY = 'USD';
// Chart tooltip options: toggle what extra info to display
const CHART_TOOLTIP_OPTIONS = {
  showPercent: true,
  showServiceHoursPerClient: true,
};

function uuid() {
  // crypto.randomUUID is ideal, but not available in every environment.
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  // RFC4122-ish v4 fallback.
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  for (let i = 0; i < bytes.length; i++) bytes[i] = bytes[i] ?? Math.floor(Math.random() * 256);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtMoney2 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtPct1 = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

// Safe numeric parsing with optional range clamping
function safeParseNumber(value, defaultValue = 0, minVal = null, maxVal = null) {
  const num = Number(value) || defaultValue;
  if (minVal !== null && maxVal !== null) return clamp(num, minVal, maxVal);
  if (minVal !== null) return Math.max(num, minVal);
  if (maxVal !== null) return Math.min(num, maxVal);
  return num;
}

// Enhanced validation system for business logic and data integrity
function validateBusinessLogic() {
  const issues = [];
  const warnings = [];

  // Validate global inputs
  if (state.employees < 1) {
    issues.push({
      severity: 'error',
      message: 'Employees must be at least 1',
      field: 'employees',
      suggestion: 'Set employees to 1 (you can exclude yourself from payroll costs)'
    });
  }

  if (state.employeePay < 0) {
    issues.push({
      severity: 'error',
      message: 'Employee pay cannot be negative',
      field: 'employeePay',
      suggestion: 'Enter a positive annual pay amount'
    });
  }

  if (state.monthlyCosts < 0) {
    issues.push({
      severity: 'error',
      message: 'Monthly overhead costs cannot be negative',
      field: 'monthlyCosts',
      suggestion: 'Enter a positive monthly cost amount'
    });
  }

  if (state.productiveUtilizationPct <= 0 || state.productiveUtilizationPct > 100) {
    issues.push({
      severity: 'error',
      message: 'Productive utilization must be between 1% and 100%',
      field: 'productiveUtilizationPct',
      suggestion: 'Typical range is 70-90% for most service businesses'
    });
  }

  if (state.targetUtilizationPct <= 0 || state.targetUtilizationPct > 150) {
    issues.push({
      severity: 'error',
      message: 'Target utilization must be between 1% and 150%',
      field: 'targetUtilizationPct',
      suggestion: 'Typical target is 75-85% for sustainable operations'
    });
  }

  // Validate offerings
  if (state.offerings.length === 0) {
    issues.push({
      severity: 'warning',
      message: 'No service offerings defined',
      field: 'offerings',
      suggestion: 'Add at least one offering to see calculations'
    });
  }

  state.offerings.forEach((offering, index) => {
    if (!offering.name || offering.name.trim().length === 0) {
      issues.push({
        severity: 'error',
        message: `Offering ${index + 1} has no name`,
        field: `offering-${index}-name`,
        suggestion: 'Enter a descriptive name for this offering'
      });
    }

    if (offering.priceMonthly <= 0) {
      issues.push({
        severity: 'error',
        message: `"${offering.name || 'Unnamed offering'}" has invalid price`,
        field: `offering-${index}-priceMonthly`,
        suggestion: 'Monthly price must be greater than $0'
      });
    }

    if (offering.sessionsPerYear <= 0) {
      issues.push({
        severity: 'error',
        message: `"${offering.name || 'Unnamed offering'}" has invalid sessions per year`,
        field: `offering-${index}-sessionsPerYear`,
        suggestion: 'Must have at least 1 session per year'
      });
    }

    if (offering.hoursPerSession <= 0) {
      issues.push({
        severity: 'error',
        message: `"${offering.name || 'Unnamed offering'}" has invalid hours per session`,
        field: `offering-${index}-hoursPerSession`,
        suggestion: 'Each session must take at least 0.1 hours'
      });
    }

    if (offering.variableCostPerSession < 0) {
      issues.push({
        severity: 'error',
        message: `"${offering.name || 'Unnamed offering'}" has negative variable costs`,
        field: `offering-${index}-variableCostPerSession`,
        suggestion: 'Variable costs cannot be negative'
      });
    }

    if (offering.mixPct < 0 || offering.mixPct > 100) {
      issues.push({
        severity: 'error',
        message: `"${offering.name || 'Unnamed offering'}" mix percentage is invalid`,
        field: `offering-${index}-mixPct`,
        suggestion: 'Mix percentage must be between 0% and 100%'
      });
    }

    if (state.mode === 'current' && offering.currentClients < 0) {
      issues.push({
        severity: 'error',
        message: `"${offering.name || 'Unnamed offering'}" has negative client count`,
        field: `offering-${index}-currentClients`,
        suggestion: 'Client count cannot be negative'
      });
    }
  });

  // Business logic validations (warnings)
  if (state.mode === 'forecast') {
    const mixSum = state.offerings.reduce((sum, o) => sum + (Number(o.mixPct) || 0), 0);
    const delta = Math.abs(mixSum - 100);

    if (!state.lockMix && delta >= 0.1) {
      warnings.push({
        severity: 'warning',
        message: `Mix percentages sum to ${mixSum.toFixed(1)}% (should be 100%)`,
        field: 'mix-total',
        suggestion: 'Enable "Auto-balance Mix %" or manually adjust percentages to total 100%'
      });
    }

    if (state.lockMix && delta >= 0.1) {
      warnings.push({
        severity: 'info',
        message: 'Mix percentages will be auto-normalized for calculations',
        field: 'mix-normalized',
        suggestion: 'This is normal when mix lock is enabled'
      });
    }
  }

  // Calculate metrics for business logic validation
  try {
    const metrics = calc();

    if (metrics.capacityPct > 120) {
      warnings.push({
        severity: 'warning',
        message: `Utilization is ${fmtPct1(metrics.capacityPct)} - consider overtime pay or hiring`,
        field: 'utilization-high',
        suggestion: 'High utilization may indicate need for more staff or reduced workload'
      });
    } else if (metrics.capacityPct < 50 && metrics.clients > 0) {
      warnings.push({
        severity: 'info',
        message: `Utilization is only ${fmtPct1(metrics.capacityPct)} - opportunity for more clients`,
        field: 'utilization-low',
        suggestion: 'Low utilization suggests capacity for additional business'
      });
    }

    // Check for potential profitability issues
    if (metrics.income < 0 && metrics.revenue > 0) {
      warnings.push({
        severity: 'warning',
        message: `Currently operating at a loss: ${fmtMoney0(metrics.income)}`,
        field: 'profitability',
        suggestion: 'Consider increasing prices, reducing costs, or improving utilization'
      });
    }

    // Check for unrealistic pricing (revenue per hour too low or too high)
    if (metrics.serviceHours > 0) {
      const revenuePerHour = metrics.revenue / metrics.serviceHours;
      if (revenuePerHour < 25) {
        warnings.push({
          severity: 'info',
          message: `Revenue per service hour (${fmtMoney0(revenuePerHour)}) seems low`,
          field: 'pricing-efficiency',
          suggestion: 'Consider if pricing adequately covers your time and expertise'
        });
      } else if (revenuePerHour > 500) {
        warnings.push({
          severity: 'info',
          message: `Revenue per service hour (${fmtMoney0(revenuePerHour)}) is very high`,
          field: 'pricing-validation',
          suggestion: 'Verify this pricing is appropriate for your market and value delivered'
        });
      }
    }

  } catch (e) {
    warnings.push({
      severity: 'error',
      message: 'Unable to calculate metrics due to data issues',
      field: 'calculation-error',
      suggestion: 'Fix the validation errors above to enable calculations'
    });
  }

  return { issues, warnings };
}

// Validate and sanitize state loaded from localStorage
function validateAndSanitizeLoadedState() {
  let needsSave = false;

  // Sanitize global inputs
  if (state.employees < 1) {
    state.employees = 1;
    needsSave = true;
  }
  if (state.employeePay < 0) {
    state.employeePay = 60000;
    needsSave = true;
  }
  if (state.monthlyCosts < 0) {
    state.monthlyCosts = 250;
    needsSave = true;
  }
  if (state.productiveUtilizationPct <= 0 || state.productiveUtilizationPct > 100) {
    state.productiveUtilizationPct = 80;
    needsSave = true;
  }
  if (state.targetUtilizationPct <= 0 || state.targetUtilizationPct > 150) {
    state.targetUtilizationPct = 75;
    needsSave = true;
  }

  // Sanitize offerings
  state.offerings = state.offerings.filter(o => o && typeof o === 'object').map(offering => {
    const sanitized = { ...offering };
    let offeringChanged = false;

    if (!sanitized.name || typeof sanitized.name !== 'string') {
      sanitized.name = 'Unnamed Offering';
      offeringChanged = true;
    }

    if (typeof sanitized.priceMonthly !== 'number' || sanitized.priceMonthly <= 0) {
      sanitized.priceMonthly = 200;
      offeringChanged = true;
    }

    if (typeof sanitized.sessionsPerYear !== 'number' || sanitized.sessionsPerYear <= 0) {
      sanitized.sessionsPerYear = 12;
      offeringChanged = true;
    }

    if (typeof sanitized.hoursPerSession !== 'number' || sanitized.hoursPerSession <= 0) {
      sanitized.hoursPerSession = 1.0;
      offeringChanged = true;
    }

    if (typeof sanitized.variableCostPerSession !== 'number' || sanitized.variableCostPerSession < 0) {
      sanitized.variableCostPerSession = 0;
      offeringChanged = true;
    }

    if (typeof sanitized.mixPct !== 'number' || sanitized.mixPct < 0 || sanitized.mixPct > 100) {
      sanitized.mixPct = 0;
      offeringChanged = true;
    }

    if (typeof sanitized.currentClients !== 'number' || sanitized.currentClients < 0) {
      sanitized.currentClients = 0;
      offeringChanged = true;
    }

    if (offeringChanged) {
      needsSave = true;
    }

    return sanitized;
  });

  // If no offerings, add a default one
  if (state.offerings.length === 0) {
    state.offerings = defaultOfferings();
    needsSave = true;
  }

  // Save sanitized state if changes were made
  if (needsSave) {
    console.info('Sanitized invalid data loaded from localStorage');
    persistState();
  }
}

// Display validation messages in the UI
function updateValidationDisplay() {
  const validationContainer = $('#validationContainer');
  if (!validationContainer) return;

  const { issues, warnings } = validateBusinessLogic();

  // Clear existing messages
  validationContainer.innerHTML = '';

  // Create error messages
  if (issues.length > 0) {
    const errorsEl = document.createElement('div');
    errorsEl.className = 'validation-errors';

    issues.forEach(issue => {
      const errorEl = document.createElement('div');
      errorEl.className = `validation-item validation-${issue.severity}`;
      errorEl.innerHTML = `
        <div class="validation-message">
          <strong>${issue.severity === 'error' ? '⚠️' : 'ℹ️'}</strong>
          ${issue.message}
        </div>
        <div class="validation-suggestion">${issue.suggestion}</div>
      `;
      errorsEl.appendChild(errorEl);
    });

    validationContainer.appendChild(errorsEl);
  }

  // Create warning messages
  if (warnings.length > 0) {
    const warningsEl = document.createElement('div');
    warningsEl.className = 'validation-warnings';

    warnings.forEach(warning => {
      const warningEl = document.createElement('div');
      warningEl.className = `validation-item validation-${warning.severity}`;
      warningEl.innerHTML = `
        <div class="validation-message">
          <strong>${warning.severity === 'warning' ? '⚠️' : '💡'}</strong>
          ${warning.message}
        </div>
        <div class="validation-suggestion">${warning.suggestion}</div>
      `;
      warningsEl.appendChild(warningEl);
    });

    validationContainer.appendChild(warningsEl);
  }

  // Hide container if no messages
  validationContainer.style.display = (issues.length > 0 || warnings.length > 0) ? 'block' : 'none';
}

function defaultOfferings() {
  return [
    // Provide non-zero currentClients so switching modes immediately shows calculations.
    { id: uuid(), name: 'Weekly', priceMonthly: 200, sessionsPerYear: 52, hoursPerSession: 1.0, variableCostPerSession: 0, mixPct: 33.0, currentClients: 6 },
    { id: uuid(), name: 'Biweekly', priceMonthly: 140, sessionsPerYear: 26, hoursPerSession: 1.0, variableCostPerSession: 0, mixPct: 33.0, currentClients: 8 },
    { id: uuid(), name: 'Monthly', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1.0, variableCostPerSession: 0, mixPct: 34.0, currentClients: 10 },
  ];
}

const state = {
  mode: 'forecast', // 'forecast' | 'current'
  offerings: defaultOfferings(),
  employees: 1,
  employeePay: 60000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80, // percent of HOURS_PER_YEAR available for service delivery
  targetUtilizationPct: 75, // forecasting target
  lockMix: false, // forecasting-only: keep Mix % totals at 100 by adjusting other offerings
};

// Persist state to localStorage (global helper so other modules can call it)
function persistState() {
  try {
    localStorage.setItem('profitpath-state', JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

function normalizeMix(offerings) {
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

function rebalanceMix(changedIdx, nextMixPct) {
  const n = state.offerings.length;
  if (n <= 1) {
    if (state.offerings[0]) state.offerings[0].mixPct = 100;
    return;
  }

  const v = clamp(Number(nextMixPct) || 0, 0, 100);

  const prevOthersSum = state.offerings.reduce((acc, o, idx) => {
    if (idx === changedIdx) return acc;
    return acc + Math.max(0, Number(o.mixPct) || 0);
  }, 0);

  const targetOthersSum = 100 - v;

  // Assign the changed value first.
  if (state.offerings[changedIdx]) state.offerings[changedIdx].mixPct = v;

  // If there's no remaining mix, zero everything else.
  if (targetOthersSum <= 0) {
    state.offerings.forEach((o, idx) => {
      if (idx !== changedIdx) o.mixPct = 0;
    });
    return;
  }

  // If others are all zero, distribute evenly.
  if (prevOthersSum <= 0) {
    const even = targetOthersSum / (n - 1);
    state.offerings.forEach((o, idx) => {
      if (idx !== changedIdx) o.mixPct = even;
    });
    return;
  }

  // Otherwise, scale others proportionally so totals remain 100.
  state.offerings.forEach((o, idx) => {
    if (idx === changedIdx) return;
    const prev = Math.max(0, Number(o.mixPct) || 0);
    o.mixPct = (prev / prevOthersSum) * targetOthersSum;
  });

  // Correct floating point drift by nudging the last non-changed offering.
  const sum = state.offerings.reduce((acc, o) => acc + (Number(o.mixPct) || 0), 0);
  const drift = 100 - sum;
  if (Math.abs(drift) > 1e-9) {
    for (let idx = state.offerings.length - 1; idx >= 0; idx--) {
      if (idx === changedIdx) continue;
      state.offerings[idx].mixPct = Math.max(0, (Number(state.offerings[idx].mixPct) || 0) + drift);
      break;
    }
  }
}

function calc(stateInput) {
  // Accept state as parameter for testability; defaults to global state if not provided
  const s = stateInput || state;
  const employees = Math.max(1, Number(s.employees) || 1);
  const employeePay = Math.max(0, Number(s.employeePay) || 0);
  const monthlyCosts = Math.max(0, Number(s.monthlyCosts) || 0);
  const productiveUtilizationPct = clamp(Number(s.productiveUtilizationPct) || 0, 0, 100);

  const annualFixedCosts = monthlyCosts * 12;
  const annualPayroll = Math.max(0, employees - 1) * employeePay;

  const annualPaidHours = employees * HOURS_PER_YEAR;
  const annualServiceHours = annualPaidHours * (productiveUtilizationPct / 100);

  // sanitize offerings
  const offerings = s.offerings
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

  const mode = s.mode;

  if (!offerings.length) {
    return {
      mode,
      offerings,
      annualPaidHours,
      annualServiceHours,
      annualFixedCosts,
      annualPayroll,
      clients: 0,
      totalSessions: 0,
      serviceHours: 0,
      capacityPct: 0,
      revenue: 0,
      variableCosts: 0,
      income: -annualFixedCosts - annualPayroll,
      mixSum: 0,
      mixNormalized: false,
      // Break-even analysis (no offerings = infinite break-even)
      breakEvenClients: Infinity,
      breakEvenRevenue: Infinity,
      contributionMarginPerClient: 0,
      contributionMarginRatio: 0,
    };
  }

  let clients = 0;
  let totalSessions = 0;
  let serviceHours = 0;
  let capacityPct = 0;
  let revenue = 0;
  let variableCosts = 0;

  if (mode === 'forecast') {
    const { sum: mixSum, needsNormalization: mixNormalized, shares } = normalizeMix(offerings);

    const targetUtilizationPct = clamp(Number(s.targetUtilizationPct) || 0, 0, 150);
    serviceHours = annualServiceHours * (targetUtilizationPct / 100);

    // Per-customer expectations (weighted by mix shares).
    // shares[] always sums to 1, even if the user-entered mix doesn't sum to 100.
    const serviceHoursPerClient = offerings.reduce((acc, o, idx) => {
      const share = shares[idx] || 0;
      return acc + share * o.sessionsPerYear * o.hoursPerSession;
    }, 0);

    const sessionsPerClient = offerings.reduce((acc, o, idx) => acc + (shares[idx] || 0) * o.sessionsPerYear, 0);

    const revenuePerClient = offerings.reduce((acc, o, idx) => acc + (shares[idx] || 0) * (o.priceMonthly * 12), 0);

    const variableCostPerClient = offerings.reduce((acc, o, idx) => acc + (shares[idx] || 0) * (o.sessionsPerYear * o.variableCostPerSession), 0);

    clients = serviceHoursPerClient > 0 ? Math.floor(serviceHours / serviceHoursPerClient) : 0;
    totalSessions = clients * sessionsPerClient;
    revenue = clients * revenuePerClient;
    variableCosts = clients * variableCostPerClient;

    capacityPct = annualServiceHours > 0 ? (serviceHours / annualServiceHours) * 100 : 0;

    // Per-offering metrics for forecast mode
    const offeringMetrics = offerings.map((o, idx) => {
      const share = shares[idx] || 0;
      const offeringClients = Math.floor(clients * share);
      const offeringSessions = offeringClients * o.sessionsPerYear;
      const offeringRevenue = offeringClients * (o.priceMonthly * 12);
      const offeringVariableCosts = offeringSessions * o.variableCostPerSession;
      const offeringMargin = offeringRevenue - offeringVariableCosts;
      const offeringMarginPct = offeringRevenue > 0 ? (offeringMargin / offeringRevenue) * 100 : 0;
      const serviceHoursPerClientOffering = o.sessionsPerYear * o.hoursPerSession;

      return {
        revenue: offeringRevenue,
        variableCosts: offeringVariableCosts,
        margin: offeringMargin,
        marginPct: offeringMarginPct,
        serviceHoursPerClient: serviceHoursPerClientOffering,
      };
    });

    // Break-even analysis for forecast mode
    const totalFixedCosts = annualFixedCosts + annualPayroll;
    const contributionMarginPerClient = revenuePerClient - variableCostPerClient;
    const contributionMarginRatio = revenuePerClient > 0 ? contributionMarginPerClient / revenuePerClient : 0;

    const breakEvenClients = contributionMarginPerClient > 0 ? Math.ceil(totalFixedCosts / contributionMarginPerClient) : Infinity;
    const breakEvenRevenue = contributionMarginRatio > 0 ? totalFixedCosts / contributionMarginRatio : Infinity;

    return {
      mode,
      offerings,
      annualPaidHours,
      annualServiceHours,
      annualFixedCosts,
      annualPayroll,
      clients,
      totalSessions,
      serviceHours,
      capacityPct,
      revenue,
      variableCosts,
      income: revenue - annualFixedCosts - annualPayroll - variableCosts,
      mixSum,
      mixNormalized,
      targetUtilizationPct,
      productiveUtilizationPct,
      offeringMetrics,
      // Break-even analysis
      breakEvenClients,
      breakEvenRevenue,
      contributionMarginPerClient,
      contributionMarginRatio,
    };
  }

  // current mode
  clients = offerings.reduce((a, o) => a + o.currentClients, 0);
  totalSessions = offerings.reduce((a, o) => a + o.currentClients * o.sessionsPerYear, 0);
  serviceHours = offerings.reduce((a, o) => a + o.currentClients * o.sessionsPerYear * o.hoursPerSession, 0);
  revenue = offerings.reduce((a, o) => a + o.currentClients * o.priceMonthly * 12, 0);
  variableCosts = offerings.reduce((a, o) => a + o.currentClients * o.sessionsPerYear * o.variableCostPerSession, 0);

  capacityPct = annualServiceHours > 0 ? (serviceHours / annualServiceHours) * 100 : 0;

  // Per-offering metrics for current mode
  const offeringMetrics = offerings.map((o) => {
    const offeringRevenue = o.currentClients * (o.priceMonthly * 12);
    const offeringSessions = o.currentClients * o.sessionsPerYear;
    const offeringVariableCosts = offeringSessions * o.variableCostPerSession;
    const offeringMargin = offeringRevenue - offeringVariableCosts;
    const offeringMarginPct = offeringRevenue > 0 ? (offeringMargin / offeringRevenue) * 100 : 0;
    const serviceHoursPerClientOffering = o.sessionsPerYear * o.hoursPerSession;

    return {
      revenue: offeringRevenue,
      variableCosts: offeringVariableCosts,
      margin: offeringMargin,
      marginPct: offeringMarginPct,
      serviceHoursPerClient: serviceHoursPerClientOffering,
    };
  });

  // Break-even analysis for current mode
  const totalFixedCosts = annualFixedCosts + annualPayroll;

  // Calculate weighted average contribution margin per client
  const totalContributionMargin = offerings.reduce((sum, o) => {
    const clientContribution = (o.priceMonthly * 12) - (o.sessionsPerYear * o.variableCostPerSession);
    return sum + (o.currentClients * clientContribution);
  }, 0);

  const contributionMarginPerClient = clients > 0 ? totalContributionMargin / clients : 0;
  const contributionMarginRatio = revenue > 0 ? totalContributionMargin / revenue : 0;

  const breakEvenClients = contributionMarginPerClient > 0 ? Math.ceil(totalFixedCosts / contributionMarginPerClient) : Infinity;
  const breakEvenRevenue = contributionMarginRatio > 0 ? totalFixedCosts / contributionMarginRatio : Infinity;

  return {
    mode,
    offerings,
    annualPaidHours,
    annualServiceHours,
    annualFixedCosts,
    annualPayroll,
    clients,
    totalSessions,
    serviceHours,
    capacityPct,
    revenue,
    variableCosts,
    income: revenue - annualFixedCosts - annualPayroll - variableCosts,
    mixSum: offerings.reduce((a, o) => a + (o.mixPct || 0), 0),
    mixNormalized: false,
    productiveUtilizationPct,
    offeringMetrics,
    // Break-even analysis
    breakEvenClients,
    breakEvenRevenue,
    contributionMarginPerClient,
    contributionMarginRatio,
  };
}

function cssEscape(s) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(String(s));
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, (ch) => `\\${ch}`);
}

function captureTableFocus() {
  const el = document.activeElement;
  if (!(el instanceof HTMLInputElement)) return null;
  const k = el.dataset.k;
  const i = el.dataset.i;
  if (!k || i == null) return null;

  return {
    k,
    i,
    selectionStart: el.selectionStart,
    selectionEnd: el.selectionEnd,
  };
}

function restoreTableFocus(focus) {
  if (!focus) return;

  const sel = `#offeringsBody [data-k="${cssEscape(focus.k)}"][data-i="${cssEscape(focus.i)}"]`;
  const el = $(sel);
  if (!(el instanceof HTMLInputElement)) return;
  el.selectionStart = focus.selectionStart;
  el.selectionEnd = focus.selectionEnd;
  el.focus();
}

function renderSimpleChart(metrics) {
  const el = $('#simpleChart');
  if (!el) return;

  // Prefer top-level metrics, but fall back to summing per-offering metrics if needed
  const totalRevenue = Number(metrics.revenue) || (Array.isArray(metrics.offeringMetrics) ? metrics.offeringMetrics.reduce((a, m) => a + (Number(m.revenue) || 0), 0) : 0);
  const totalVariable = Number(metrics.variableCosts) || (Array.isArray(metrics.offeringMetrics) ? metrics.offeringMetrics.reduce((a, m) => a + (Number(m.variableCosts) || 0), 0) : 0);
  const totalContribution = Math.max(0, totalRevenue - totalVariable);

  if (totalRevenue <= 0) {
    el.innerHTML = '<div class="chart-empty">No revenue to display</div>';
    return;
  }

  // Build per-offering breakdown
  const data = (metrics.offerings || []).map((o, idx) => {
    const m = (metrics.offeringMetrics && metrics.offeringMetrics[idx]) || {};
    const rev = Number(m.revenue) || 0;
    const variable = Number(m.variableCosts) || 0;
    const contrib = Math.max(0, rev - variable);
    const serviceHoursPerClient = Number(o.sessionsPerYear || 0) * Number(o.hoursPerSession || 0);
    const pct = totalRevenue > 0 ? (rev / totalRevenue) : 0;
    return { name: o.name || `Offering ${idx + 1}`, rev, variable, contrib, serviceHoursPerClient, pct };
  });

  // SVG: draw each offering as variable (red) then contribution (green) adjacent; x coord in percentage of totalRevenue
  let x = 0;
  const rects = [];
  data.forEach((d) => {
    const revPct = (d.rev / totalRevenue) || 0;
    const varPct = (d.variable / totalRevenue) || 0;
    const contribPct = (d.contrib / totalRevenue) || 0;

    // variable rect
    if (varPct > 0) {
      rects.push({ x: x, w: varPct, color: 'rgba(251,113,133,0.6)', offering: d.name, type: 'variable', varVal: d.variable, contribVal: d.contrib, pct: d.pct, hours: d.serviceHoursPerClient });
    }

    // contribution rect (may be zero)
    if (contribPct > 0) {
      rects.push({ x: x + varPct, w: contribPct, color: 'rgba(52,211,153,0.6)', offering: d.name, type: 'contrib', varVal: d.variable, contribVal: d.contrib, pct: d.pct, hours: d.serviceHoursPerClient });
    }

    // (no per-offering labels rendered here to avoid overlap/size issues)

    x += revPct;
  });

  const svgParts = ['<svg viewBox="0 0 100 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'];
  rects.forEach((r) => {
    const xPos = (r.x * 100).toFixed(3);
    const w = (r.w * 100).toFixed(3);
    // include data attributes for a custom tooltip (avoid native <title> which can be inconsistent)
    const offeringAttr = escapeHtml(r.offering || '');
    const typeAttr = escapeHtml(r.type || '');
    const varAttr = escapeHtml(fmtMoney0(r.varVal || 0));
    const contribAttr = escapeHtml(fmtMoney0(r.contribVal || 0));
    const pctAttr = escapeHtml(((r.pct || 0) * 100).toFixed(0) + '%');
    const hoursAttr = escapeHtml((r.hours || 0).toFixed(1));
    svgParts.push(`<rect x="${xPos}" y="2" width="${w}" height="16" rx="3" fill="${r.color}" data-offering="${offeringAttr}" data-type="${typeAttr}" data-var="${varAttr}" data-contrib="${contribAttr}" data-pct="${pctAttr}" data-hours="${hoursAttr}"></rect>`);
  });

  // intentionally do not render per-offering inline labels (legend below provides totals)
  svgParts.push('</svg>');

  const legend = `
    <div class="chart-labels">
      <div class="left">
        <div class="pill-legend"><span class="legend-swatch legend-variable"></span><span>Variable: ${fmtMoney0(totalVariable)}</span></div>
        <div class="pill-legend"><span class="legend-swatch legend-margin"></span><span>Contribution: ${fmtMoney0(totalContribution)}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="center" style="font-family:var(--mono);color:var(--muted);">${Math.round((totalVariable / totalRevenue) * 100)}% / ${Math.round((totalContribution / totalRevenue) * 100)}%</div>
        <div class="right">Revenue: <strong>${fmtMoney0(totalRevenue)}</strong></div>
      </div>
    </div>
  `;

  // Build a compact offering list under the legend (name / pct / annual rev).
  const offeringItems = data.map((d) => {
    const pct = totalRevenue > 0 ? Math.round((d.rev / totalRevenue) * 100) : 0;
    return `<div class="offering-item"><div class="off-left"><span class="o-name">${escapeHtml(d.name)}</span><span class="o-pct">${pct}%</span></div><div class="o-val">${fmtMoney0(d.rev)}</div></div>`;
  }).join('');

  const offeringListHTML = `<div class="offering-list">${offeringItems}</div>`;

  // append a tooltip element used for hover
  el.innerHTML = svgParts.join('') + legend + offeringListHTML + '<div class="chart-tooltip" aria-hidden="true"></div>';

  // Set up hover and click event listeners for chart interactivity
  setupChartEventListeners(el);
}

function setupChartEventListeners(el) {
  // Variables for tooltip management
  let hideTimeout = null;
  let pinned = false;
  let pinnedRect = null;
  const HOVER_OFFSET = 6; // px gap between bar and tooltip when hovering
  let tooltipIsShown = false;

  function stopFollow() {
    // No longer using smooth follow animation
  }

  // updatePinnedIndicator is intentionally a no-op for visuals - we do not highlight pinned segments.
  // Keeping the function so other code can call it without needing edits.
  function updatePinnedIndicator(/* rectEl */) {
    // no-op: visual pinned indicators (outline/overlay) removed per UX preference
    // ensure any leftover data attributes are cleared
    el.querySelectorAll('rect[data-pinned]').forEach((r) => r.removeAttribute('data-pinned'));
  }

  function showTooltipForRect(rectEl, clientX = null, clientY = null, pinnedNow = false) {
    if (!rectEl) return;
    const offering = rectEl.getAttribute('data-offering') || '';
    const varVal = rectEl.getAttribute('data-var') || '';
    const contribVal = rectEl.getAttribute('data-contrib') || '';
    const pct = rectEl.getAttribute('data-pct') || '';
    const hours = rectEl.getAttribute('data-hours') || '';

    let html = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style=\"font-weight:700\">${offering}</div><div style=\"display:flex;gap:6px;align-items:center\"><button class=\"tooltip-pin\" aria-label=\"Pin tooltip\">📌</button><button class=\"tooltip-close\" aria-label=\"Close tooltip\">×</button></div></div>`;
    if (CHART_TOOLTIP_OPTIONS.showPercent) {
      html += `<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:6px">${pct}</div>`;
    }
    html += `<div style="font-family:var(--mono);font-size:12px">Variable: ${varVal}</div>`;
    html += `<div style="font-family:var(--mono);color:var(--accent);font-size:12px">Contribution: ${contribVal}</div>`;
    if (CHART_TOOLTIP_OPTIONS.showServiceHoursPerClient) {
      html += `<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:4px">Service hours/client: ${hours}</div>`;
    }

    const tooltip = el.querySelector('.chart-tooltip');
    if (!tooltip) return;

    tooltip.innerHTML = html;
    tooltip._currentRect = rectEl; // Store reference to current rectangle
    tooltip.classList.add('visible');
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'visible';

    // Update pin button state based on current pinned status
    const pinBtn = tooltip.querySelector('.tooltip-pin');
    if (pinBtn) {
      pinBtn.textContent = pinnedNow || pinned ? '📍' : '📌';
    }

    // Set up button event listeners
    setupTooltipButtons();

    // Positioning: if pinned, anchor to rect center; otherwise follow mouse if provided
    const containerBox = el.getBoundingClientRect();
    const rectBox = rectEl.getBoundingClientRect();
    const centerX = rectBox.left + rectBox.width / 2 - containerBox.left;
    const centerY = rectBox.top + rectBox.height / 2 - containerBox.top;

    // if hovering (not pinnedNow and not pinned), place tooltip at a static distance above the rect
    // otherwise (pinned or pinnedNow), allow centering near rect/mouse
    const tipRect = tooltip.getBoundingClientRect();
    const halfW = tipRect.width / 2;
    const leftMin = 8 + halfW;
    const leftMax = containerBox.width - 8 - halfW;

    // prefer anchoring to rect center horizontally
    const xAnchor = centerX;
    const leftClamped = Math.min(Math.max(xAnchor, leftMin), leftMax);

    if (!pinnedNow && !pinned) {
      // hovering behavior: always above at fixed offset
      const offset = HOVER_OFFSET; // px gap between bar and tooltip
      const topPos = Math.max(8, rectBox.top - containerBox.top - tipRect.height - offset);
      tooltip.classList.remove('below');

      // Position above the bar
      tooltip.style.left = `${leftClamped}px`;
      tooltip.style.top = `${topPos}px`;
      tooltipIsShown = true;
    } else {
      // pinned behavior: same as hover - always position above the bar
      const tipRect2 = tooltip.getBoundingClientRect();
      const topPos = Math.max(8, rectBox.top - containerBox.top - tipRect2.height - HOVER_OFFSET);

      tooltip.style.left = `${leftClamped}px`;
      tooltip.style.top = `${topPos}px`;
    }

    if (pinnedNow) {
      pinned = true;
      pinnedRect = rectEl;
      tooltip.classList.add('pinned');
      updatePinnedIndicator(rectEl);
    }
  }

  function hideTooltip() {
    if (pinned) return; // don't hide when pinned
    const tooltip = el.querySelector('.chart-tooltip');
    if (!tooltip) return;

    tooltip.classList.remove('visible');
    hideTimeout = setTimeout(() => {
      tooltip.style.display = 'none';
      tooltip.innerHTML = '';
      tooltipIsShown = false;
    }, 150); // Short delay for normal hide
  }

  function unpinTooltip() {
    pinned = false;
    pinnedRect = null;
    const tooltip = el.querySelector('.chart-tooltip');
    if (tooltip) {
      tooltip.classList.remove('pinned');
      tooltip.classList.remove('visible');
      updatePinnedIndicator(null);
      // Hide immediately
      tooltip.style.display = 'none';
      tooltipIsShown = false;
    }
  }

  function setupTooltipButtons() {
    const tooltip = el.querySelector('.chart-tooltip');
    if (!tooltip) return;

    // Remove existing event listeners to prevent duplicates
    const existingCloseBtn = tooltip.querySelector('.tooltip-close');
    const existingPinBtn = tooltip.querySelector('.tooltip-pin');

    if (existingCloseBtn) {
      existingCloseBtn.replaceWith(existingCloseBtn.cloneNode(true));
    }
    if (existingPinBtn) {
      existingPinBtn.replaceWith(existingPinBtn.cloneNode(true));
    }

    // Re-attach event listeners to fresh buttons
    const closeBtn = tooltip.querySelector('.tooltip-close');
    const pinBtn = tooltip.querySelector('.tooltip-pin');

    if (closeBtn) {
      closeBtn.onclick = (ev) => {
        ev.stopPropagation();
        pinned = false;
        pinnedRect = null;
        tooltip.classList.remove('pinned');
        tooltip.classList.remove('visible');
        updatePinnedIndicator(null);
        tooltip.style.display = 'none';
        tooltip.innerHTML = '';
        tooltipIsShown = false;
      };
    }

    if (pinBtn) {
      pinBtn.onclick = (ev) => {
        ev.stopPropagation();
        pinned = !pinned;
        if (pinned) {
          pinnedRect = tooltip._currentRect;
          tooltip.classList.add('pinned');
          pinBtn.textContent = '📍';
          updatePinnedIndicator(tooltip._currentRect);
        } else {
          pinnedRect = null;
          tooltip.classList.remove('pinned');
          pinBtn.textContent = '📌';
          updatePinnedIndicator(null);
        }
      };
    }
  }

  // Attach event listeners to all chart rectangles
  el.querySelectorAll('rect[data-offering]').forEach((rect) => {
    rect.addEventListener('mouseenter', (ev) => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      // if pinned (any pinned tooltip), do not change tooltip on hover
      if (pinned) return;
      showTooltipForRect(rect, ev.clientX, ev.clientY, false);
    });

    rect.addEventListener('mousemove', (ev) => {
      // when pinned, prevent tooltip from moving
      if (pinned) return;
      showTooltipForRect(rect, ev.clientX, ev.clientY, false);
    });

    rect.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // pin to this rect and snap tooltip to rect center
      showTooltipForRect(rect, null, null, true);
    });

    rect.addEventListener('mouseleave', () => {
      if (pinned && pinnedRect) return; // remain visible when pinned
      hideTooltip();
    });
  });

  // click outside to unpin (only add once)
  if (!document._chartClickHandler) {
    document._chartClickHandler = (ev) => {
      if (!pinned) return;
      if (!el.contains(ev.target)) unpinTooltip();
    };
    document.addEventListener('click', document._chartClickHandler);
  }

  // escape key to close (only add once)
  if (!document._chartKeyHandler) {
    document._chartKeyHandler = (ev) => {
      if (ev.key === 'Escape' && pinned) {
        unpinTooltip();
      }
    };
    document.addEventListener('keydown', document._chartKeyHandler);
  }
}

function updateBreakEvenAnalysis(metrics) {
  const analysisEl = $('#breakEvenAnalysis');
  if (!analysisEl) return;

  if (!Number.isFinite(metrics.breakEvenRevenue) || metrics.breakEvenRevenue <= 0) {
    analysisEl.style.display = 'none';
    return;
  }

  const totalFixedCosts = metrics.annualFixedCosts + metrics.annualPayroll;
  const surplus = metrics.revenue - metrics.breakEvenRevenue;
  const surplusPct = metrics.breakEvenRevenue > 0 ? (surplus / metrics.breakEvenRevenue) * 100 : 0;

  let status = '';
  let statusColor = '';
  if (surplus > 0) {
    status = `Above break-even by ${fmtMoney0(surplus)} (${surplusPct.toFixed(1)}%)`;
    statusColor = 'var(--good)';
  } else if (surplus < 0) {
    status = `Below break-even by ${fmtMoney0(Math.abs(surplus))} (${Math.abs(surplusPct).toFixed(1)}%)`;
    statusColor = 'var(--bad)';
  } else {
    status = 'At break-even point';
    statusColor = 'var(--warn)';
  }

  const clientGap = metrics.breakEvenClients - metrics.clients;
  let clientStatus = '';
  if (clientGap > 0) {
    clientStatus = `Need ${fmtInt(clientGap)} more clients to break even`;
  } else if (clientGap < 0) {
    clientStatus = `${fmtInt(Math.abs(clientGap))} clients above break-even`;
  } else {
    clientStatus = 'At break-even client count';
  }

  analysisEl.innerHTML = `
    <div class="break-even-header">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text);">Break-Even Analysis</h4>
    </div>
    <div class="break-even-content">
      <div class="break-even-item">
        <span class="break-even-label">Status:</span>
        <span class="break-even-value" style="color: ${statusColor};">${status}</span>
      </div>
      <div class="break-even-item">
        <span class="break-even-label">Client status:</span>
        <span class="break-even-value">${clientStatus}</span>
      </div>
      <div class="break-even-item">
        <span class="break-even-label">Fixed costs covered:</span>
        <span class="break-even-value">${fmtPct1(Math.min(100, (metrics.revenue / metrics.breakEvenRevenue) * 100))}</span>
      </div>
      ${metrics.contributionMarginRatio > 0 ? `
      <div class="break-even-item">
        <span class="break-even-label">Contribution ratio:</span>
        <span class="break-even-value">${fmtPct1(metrics.contributionMarginRatio * 100)}</span>
      </div>
      ` : ''}
    </div>
  `;

  analysisEl.style.display = 'block';

}

function render() {
  const focus = captureTableFocus();
  const metrics = calc();

  // Top-level inputs
  $('#modeSelect').value = state.mode;
  $('#employees').value = state.employees;
  $('#employeePay').value = state.employeePay;
  $('#monthlyCosts').value = state.monthlyCosts;
  $('#productiveUtilizationPct').value = state.productiveUtilizationPct;

  const isForecast = state.mode === 'forecast';
  $('#targetUtilizationPct').closest('.field').classList.toggle('hidden', !isForecast);
  $('#targetUtilizationPct').value = state.targetUtilizationPct;

  $('#lockMixField')?.classList.toggle('hidden', !isForecast);
  const lockMixEl = $('#lockMix');
  if (lockMixEl) lockMixEl.checked = Boolean(state.lockMix);

  // Style hint: highlight which table column is editable in the current mode.
  $('#offeringsTable')?.classList.toggle('mode-forecast', isForecast);
  $('#offeringsTable')?.classList.toggle('mode-current', !isForecast);

  // Offerings table
  const tbody = $('#offeringsBody');
  tbody.innerHTML = '';

  metrics.offerings.forEach((o, idx) => {
    const tr = document.createElement('tr');

    const mixCell = isForecast
      ? `<input aria-label="Mix % for ${escapeHtml(o.name)}" class="mode-edit" type="number" min="0" max="100" step="1" value="${(o.mixPct ?? 0).toFixed(1)}" data-k="mixPct" data-i="${idx}" />`
      : `<span class="muted">—</span>`;

    const clientsCell = isForecast
      ? `<span class="muted">—</span>`
      : `<input aria-label="Clients for ${escapeHtml(o.name)}" class="mode-edit" type="number" min="0" step="1" value="${o.currentClients ?? 0}" data-k="currentClients" data-i="${idx}" />`;

    const estClients = isForecast
      ? Math.floor(metrics.clients * ((o.mixPct || 0) / 100))
      : o.currentClients;

    const estSessions = isForecast
      ? Math.round(estClients * o.sessionsPerYear)
      : Math.round((o.currentClients || 0) * o.sessionsPerYear);

    tr.innerHTML = `
      <td class="cell-edit group-start group-inputs" data-label="Offering"><input aria-label="Offering name" type="text" value="${escapeHtml(o.name)}" data-k="name" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs" data-label="Price / mo"><input aria-label="Price per month for ${escapeHtml(o.name)}" type="number" min="0" step="10" value="${o.priceMonthly}" data-k="priceMonthly" data-i="${idx}" /></td>
  <td class="cell-edit group-inputs" data-label="Sessions / yr"><input aria-label="Sessions per year for ${escapeHtml(o.name)}" type="number" min="0" step="1" value="${o.sessionsPerYear}" data-k="sessionsPerYear" data-i="${idx}" /></td>
  <td class="cell-edit group-inputs" data-label="Hours / session"><input aria-label="Hours per session for ${escapeHtml(o.name)}" type="number" min="0" step="0.1" value="${o.hoursPerSession}" data-k="hoursPerSession" data-i="${idx}" /></td>
  <td class="cell-edit group-inputs group-end" data-label="Var $ / session"><input aria-label="Variable cost per session for ${escapeHtml(o.name)}" type="number" min="0" step="1" value="${o.variableCostPerSession}" data-k="variableCostPerSession" data-i="${idx}" /></td>
    <td class="cell-edit group-start group-mode" data-label="Mix % (forecast)">${mixCell}</td>
    <td class="cell-edit group-mode group-end" data-label="Clients (current)">${clientsCell}</td>
    <td class="cell-readonly group-start group-est" data-label="Est. clients"><span class="mono">${fmtInt(estClients)}</span></td>
  <td class="cell-readonly group-est" data-label="Est. sessions"><span class="mono">${fmtInt(estSessions)}</span></td>
      <td class="cell-readonly group-metrics" data-label="Annual Revenue"><span class="mono">${fmtMoney0(metrics.offeringMetrics[idx]?.revenue || 0)}</span></td>
      <td class="cell-readonly group-metrics" data-label="Margin %"><span class="mono" style="color: ${(metrics.offeringMetrics[idx]?.marginPct || 0) >= 50 ? 'var(--good)' : (metrics.offeringMetrics[idx]?.marginPct || 0) >= 30 ? 'var(--warn)' : 'var(--bad)'}">${fmtPct1(metrics.offeringMetrics[idx]?.marginPct || 0)}</span></td>
  <td class="cell-readonly group-metrics group-end" data-label="Service hours / client"><span class="mono">${(metrics.offeringMetrics[idx]?.serviceHoursPerClient || 0).toFixed(1)}</span></td>
      <td class="cell-edit group-actions" data-label="Actions">
        <button class="btn small danger" data-action="removeOffering" data-i="${idx}" aria-label="Remove ${escapeHtml(o.name)}">Remove</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  restoreTableFocus(focus);

  // Mix/mode note (used as the "what am I editing" banner, especially on small screens).
  const mixNote = $('#mixNote');
  mixNote.classList.remove('note-forecast', 'note-current', 'note-warn', 'note-lock');

  if (isForecast) {
    const sum = metrics.offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);
    const delta = Math.abs(sum - 100);

    mixNote.classList.add('note-forecast');
    if (state.lockMix) mixNote.classList.add('note-lock');
    if (!state.lockMix && delta >= 0.05) mixNote.classList.add('note-warn');

    mixNote.textContent = state.lockMix
      ? 'Forecast mode: editing Mix % (locked to 100%, auto-balancing others)'
      : (delta < 0.05
        ? `Forecast mode: editing Mix % (current total ${sum.toFixed(1)}%)`
        : `Forecast mode: editing Mix % (current total ${sum.toFixed(1)}% — auto-normalized for calculations)`);
  } else {
    const total = metrics.offerings.reduce((a, o) => a + (Number(o.currentClients) || 0), 0);
    mixNote.classList.add('note-current');
    mixNote.textContent = total > 0
      ? 'Current mode: editing Clients (utilization computed from workload)'
      : 'Current mode: start by entering Clients';
  }

  // KPIs
  updateOutputs(metrics);

  // Update validation messages
  updateValidationDisplay();
}

// Update only outputs (KPIs, capacity meter, chart, debug) without re-rendering the offerings table.
function updateOutputs(metrics) {
  try {
    $('#kpiClients').textContent = fmtInt(metrics.clients);
    $('#kpiSessions').textContent = fmtInt(metrics.totalSessions);
    $('#kpiServiceHours').textContent = fmtInt(metrics.serviceHours);
    $('#kpiCapacity').textContent = fmtPct1(metrics.capacityPct);

    $('#kpiRevenue').textContent = fmtMoney0(metrics.revenue);
    $('#kpiFixedCosts').textContent = fmtMoney0(metrics.annualFixedCosts);
    $('#kpiPayroll').textContent = fmtMoney0(metrics.annualPayroll);
    $('#kpiVariableCosts').textContent = fmtMoney0(metrics.variableCosts);

    // Break-even analysis
    const breakEvenClientsEl = $('#kpiBreakEvenClients');
    const breakEvenRevenueEl = $('#kpiBreakEvenRevenue');
    const contributionMarginEl = $('#kpiContributionMargin');

    if (breakEvenClientsEl) {
      breakEvenClientsEl.textContent = Number.isFinite(metrics.breakEvenClients) ? fmtInt(metrics.breakEvenClients) : '∞';
      breakEvenClientsEl.style.color = metrics.clients >= metrics.breakEvenClients ? 'var(--good)' : 'var(--bad)';
    }

    if (breakEvenRevenueEl) {
      breakEvenRevenueEl.textContent = Number.isFinite(metrics.breakEvenRevenue) ? fmtMoney0(metrics.breakEvenRevenue) : '$∞';
    }

    if (contributionMarginEl) {
      contributionMarginEl.textContent = fmtMoney0(metrics.contributionMarginPerClient);
      contributionMarginEl.style.color = metrics.contributionMarginPerClient > 0 ? 'var(--good)' : 'var(--bad)';
    }

    const incomeEl = $('#kpiIncome');
    if (incomeEl) {
      incomeEl.textContent = fmtMoney0(metrics.income);
      incomeEl.style.color = metrics.income >= 60000 ? 'var(--good)' : metrics.income >= 0 ? 'var(--warn)' : 'var(--bad)';
    }

    // Capacity meter
    const cap = clamp(metrics.capacityPct, 0, 150);
    const capBar = $('#capacityBar');
    if (capBar) capBar.style.width = `${(cap / 150) * 100}%`;
    const capLabel = $('#capacityLabel');
    if (capLabel) capLabel.textContent = metrics.capacityPct > 100
      ? `Over capacity: ${fmtPct1(metrics.capacityPct)} (overtime likely)`
      : `Utilization: ${fmtPct1(metrics.capacityPct)}`;

    // Render simple revenue composition chart
    try {
      renderSimpleChart(metrics);
    } catch (e) {
      console.warn('Chart render failed:', e);
    }

    // Update break-even analysis
    updateBreakEvenAnalysis(metrics);

    // Update debug panel if present
    const dbg = $('#debugPanel');
    if (dbg && $('#debugBody') && !$('#debugBody').classList.contains('collapsed')) {
      dbg.textContent = JSON.stringify(metrics, null, 2);
    }
  } catch (e) {
    console.warn('updateOutputs error:', e);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setStateFromInputs() {
  state.mode = $('#modeSelect').value;
  state.employees = Number($('#employees').value) || 1;
  state.employeePay = Number($('#employeePay').value) || 0;
  state.monthlyCosts = Number($('#monthlyCosts').value) || 0;
  state.productiveUtilizationPct = Number($('#productiveUtilizationPct').value) || 0;
  state.targetUtilizationPct = Number($('#targetUtilizationPct').value) || 0;
  state.lockMix = Boolean($('#lockMix')?.checked);
}

function onTableInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;

  const k = el.dataset.k;
  const i = Number(el.dataset.i);
  if (!k || !Number.isFinite(i)) return;

  const o = state.offerings[i];
  if (!o) return;

  // Validate and sanitize input based on field type
  let value = el.value;
  let validationError = null;

  if (k === 'priceMonthly') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Price must be greater than $0';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'variableCostPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed < 0) {
      validationError = 'Variable costs cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'sessionsPerYear') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed <= 0) {
      validationError = 'Must have at least 1 session per year';
      value = 1;
    } else {
      value = parsed;
    }
  } else if (k === 'hoursPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Session must take at least 0.1 hours';
      value = 0.1;
    } else {
      value = parsed;
    }
  } else if (k === 'currentClients') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed < 0) {
      validationError = 'Client count cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'mixPct') {
    const parsed = safeParseNumber(value, 0, 0, 100);
    value = parsed;
  }

  // Show validation error if any and provide auto-fix for some cases
  if (validationError) {
    console.warn(`Validation error for ${k}: ${validationError}`);

    // Auto-fix common issues
    if (k === 'priceMonthly' && value === 0 && o.priceMonthly === 0) {
      // Suggest a reasonable default price
      const suggestedPrice = o.name?.toLowerCase().includes('premium') ? 300 :
                            o.name?.toLowerCase().includes('basic') ? 100 : 200;
      console.info(`Suggestion: Try setting price to $${suggestedPrice}/month for "${o.name}"`);
    }

    if (k === 'hoursPerSession' && value === 0.1 && o.hoursPerSession === 0.1) {
      console.info(`Suggestion: Typical session lengths are 1-2 hours for service work`);
    }
  }

  if (k === 'name') {
    o.name = el.value;
  } else if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    rebalanceMix(i, value);
  } else {
    o[k] = value;
  }

  // Update state and outputs in-place without re-rendering the entire table to preserve focus.
  try {
    persistState();
  } catch (e) {
    console.warn('Failed to persist state on input:', e);
  }
  try {
    const metrics = calc();
    updateOutputs(metrics);
    updateValidationDisplay(); // Update validation messages after calculations
  } catch (e) {
    console.warn('Failed to refresh outputs on input:', e);
  }
  // If changing mix in locked forecast mode, re-render to update other mix inputs
  if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    render();
  }
}

function onTableClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === 'removeOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i)) {
      state.offerings.splice(i, 1);
      if (state.offerings.length === 0) state.offerings = defaultOfferings();
      render();
    }
  }
}

function addOffering() {
  state.offerings.push({
    id: uuid(),
    name: `Offering ${state.offerings.length + 1}`,
    priceMonthly: 100,
    sessionsPerYear: 12,
    hoursPerSession: 1.0,
    variableCostPerSession: 0,
    mixPct: 0,
    currentClients: 0,
  });
  render();
}

function resetDefaults() {
  state.offerings = defaultOfferings();
  state.employees = 1;
  state.employeePay = 60000;
  state.monthlyCosts = 250;
  state.productiveUtilizationPct = 80;
  state.targetUtilizationPct = 75;
  state.mode = 'forecast';
  localStorage.removeItem('profitpath-state');
  render();
}

function exportAsCSV() {
  const results = calc();

  // CSV header with summary metrics
  const lines = [
    'ProfitPath Export',
    new Date().toLocaleString(),
    '',
    'SUMMARY',
    `Mode,${state.mode}`,
    `Employees,${state.employees}`,
    `Employee Pay,${fmtMoney0(state.employeePay)}`,
    `Monthly Overhead,${fmtMoney0(state.monthlyCosts)}`,
    `Productive Utilization,${fmtPct1(state.productiveUtilizationPct)}`,
    `Target Utilization,${fmtPct1(state.targetUtilizationPct)}`,
    '',
    'RESULTS',
    `Total Revenue,${fmtMoney0(results.revenue)}`,
    `Total Variable Costs,${fmtMoney0(results.variableCosts)}`,
    `Contribution Margin,${fmtMoney0(Math.max(0, (results.revenue || 0) - (results.variableCosts || 0)))}`,
    `Fixed Overhead,${fmtMoney0(results.annualFixedCosts)}`,
    `Net Profit,${fmtMoney0(results.income)}`,
    `Profit Margin,${fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)}`,
    `Billable Hours,${fmtInt(results.serviceHours || 0)}`,
    `Utilization,${fmtPct1(results.capacityPct || 0)}`,
    '',
    'OFFERINGS',
    'Name,Price/Month,Sessions/Year,Hours/Session,Variable Cost/Session,Mix %,Current Clients,Annual Revenue,Clients Needed',
  ];

  state.offerings.forEach((o) => {
    const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
    const clientsNeeded = state.mode === 'forecast' ? Math.ceil((o.sessionsPerYear * state.employees * state.productiveUtilizationPct / 100) / o.sessionsPerYear) : o.currentClients;
    lines.push(
      `"${o.name}",${o.priceMonthly},${o.sessionsPerYear},${o.hoursPerSession},${o.variableCostPerSession},${o.mixPct},${o.currentClients},${fmtMoney0(annualRevenue)},${clientsNeeded}`
    );
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `profitpath-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Scenario Management
function getAllScenarios() {
  try {
    const saved = localStorage.getItem('profitpath-scenarios');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load scenarios:', e);
    return [];
  }
}

function saveScenario(name) {
  if (!name || !name.trim()) {
    alert('Please enter a scenario name');
    return;
  }

  try {
    const scenarios = getAllScenarios();
    const timestamp = new Date().toLocaleString();
    const scenario = {
      id: uuid(),
      name: name.trim(),
      timestamp,
      state: JSON.parse(JSON.stringify(state)), // Deep copy
    };

    scenarios.push(scenario);
    localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));

    // Clear input and re-render list
    $('#scenarioNameInput').value = '';
    renderScenariosList();
  } catch (e) {
    console.error('Failed to save scenario:', e);
    alert('Error saving scenario');
  }
}

function loadScenario(scenarioId) {
  try {
    const scenarios = getAllScenarios();
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    // Restore state from scenario
    state.mode = scenario.state.mode ?? state.mode;
    state.offerings = scenario.state.offerings ?? state.offerings;
    state.employees = scenario.state.employees ?? state.employees;
    state.employeePay = scenario.state.employeePay ?? state.employeePay;
    state.monthlyCosts = scenario.state.monthlyCosts ?? state.monthlyCosts;
    state.productiveUtilizationPct = scenario.state.productiveUtilizationPct ?? state.productiveUtilizationPct;
    state.targetUtilizationPct = scenario.state.targetUtilizationPct ?? state.targetUtilizationPct;
    state.lockMix = scenario.state.lockMix ?? state.lockMix;

    persistState(); // Save loaded scenario as current state
    render();
    closeScenarioModal();
  } catch (e) {
    console.error('Failed to load scenario:', e);
    alert('Error loading scenario');
  }
}

function deleteScenario(scenarioId) {
  if (!confirm('Delete this scenario?')) return;

  try {
    let scenarios = getAllScenarios();
    scenarios = scenarios.filter((s) => s.id !== scenarioId);
    localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));
    renderScenariosList();
  } catch (e) {
    console.error('Failed to delete scenario:', e);
    alert('Error deleting scenario');
  }
}

function renderScenariosList() {
  const list = $('#scenariosList');
  const scenarios = getAllScenarios();

  if (scenarios.length === 0) {
    list.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
    return;
  }

  list.innerHTML = scenarios
    .map(
      (s) => `
    <div class="scenario-item">
      <div>
        <div class="scenario-item-name">${escapeHtml(s.name)}</div>
        <div class="scenario-item-meta">Saved ${s.timestamp}</div>
      </div>
      <div class="scenario-item-actions">
        <button class="btn small" data-action="load-scenario" data-scenario-id="${escapeHtml(s.id)}">Load</button>
        <button class="btn small danger" data-action="delete-scenario" data-scenario-id="${escapeHtml(s.id)}">Delete</button>
      </div>
    </div>
  `
    )
    .join('');

  // Wire up load/delete buttons
  $$('[data-action="load-scenario"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scenarioId;
      loadScenario(id);
    });
  });

  $$('[data-action="delete-scenario"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scenarioId;
      deleteScenario(id);
    });
  });
}

function openScenarioModal() {
  $('#scenariosModal').classList.remove('hidden');
  $('#scenarioNameInput').focus();
  renderScenariosList();
}

function closeScenarioModal() {
  $('#scenariosModal').classList.add('hidden');
}

function wire() {
  // Load persisted state from localStorage if available
  try {
    const saved = localStorage.getItem('profitpath-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge saved state with defaults to handle new fields gracefully
      state.mode = parsed.mode ?? state.mode;
      state.offerings = parsed.offerings ?? state.offerings;
      state.employees = parsed.employees ?? state.employees;
      state.employeePay = parsed.employeePay ?? state.employeePay;
      state.monthlyCosts = parsed.monthlyCosts ?? state.monthlyCosts;
      state.productiveUtilizationPct = parsed.productiveUtilizationPct ?? state.productiveUtilizationPct;
      state.targetUtilizationPct = parsed.targetUtilizationPct ?? state.targetUtilizationPct;
      state.lockMix = parsed.lockMix ?? state.lockMix;

      // Validate loaded data and sanitize if needed
      validateAndSanitizeLoadedState();
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }

  // migrate existing save calls to global persistState
  $('#modeSelect').addEventListener('change', () => {
    setStateFromInputs();
    persistState();
    render();
  });

  $('#lockMix')?.addEventListener('change', () => {
    setStateFromInputs();

    // If enabling the lock, immediately rebalance without changing relative weights.
    if (state.mode === 'forecast' && state.lockMix) {
      const sum = state.offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);
      if (sum > 0) {
        state.offerings.forEach((o) => (o.mixPct = ((Number(o.mixPct) || 0) / sum) * 100));
      }
    }

    persistState();
    render();
  });

  $$('#controls input').forEach((el) => {
    el.addEventListener('input', () => {
      setStateFromInputs();
      persistState();
      render();
    });
  });

  $('#addOfferingBtn').addEventListener('click', addOffering);
  $('#resetBtn').addEventListener('click', resetDefaults);
  $('#exportBtn').addEventListener('click', exportAsCSV);

  $('#offeringsBody').addEventListener('input', onTableInput);
  $('#offeringsBody').addEventListener('click', onTableClick);

  // Save state when table content changes
  $('#offeringsBody').addEventListener('input', persistState);
  $('#offeringsBody').addEventListener('click', () => setTimeout(persistState, 0));

  // Scenario modal wiring
  $('#scenariosBtn').addEventListener('click', openScenarioModal);
  $('#scenariosCloseBtn').addEventListener('click', closeScenarioModal);
  $('#scenariosOverlay').addEventListener('click', closeScenarioModal);

  $('#saveScenarioBtn').addEventListener('click', () => {
    const name = $('#scenarioNameInput').value;
    saveScenario(name);
  });

  // Allow Enter key to save scenario
  $('#scenarioNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const name = $('#scenarioNameInput').value;
      saveScenario(name);
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#scenariosModal').classList.contains('hidden')) {
      closeScenarioModal();
    }
  });
}

wire();

// Run initial render in a safe guard so any runtime errors are reported to the debug panel
try {
  render();
} catch (e) {
  console.error('Render failed:', e);
  const dbg = $('#debugPanel');
  if (dbg) dbg.textContent = `Render error: ${e && e.stack ? e.stack : String(e)}`;
}

// Smoke test: expose a quick debug rendering of calc() into the debug panel (useful when loading the page locally)
try {
  const dbg = $('#debugPanel');
  if (dbg) {
    const res = calc();
    dbg.textContent = JSON.stringify(res, null, 2);
    console.info('ProfitPath calc() smoke result:', res);
  }
} catch (e) {
  console.warn('Smoke test failed:', e);
  const dbg = $('#debugPanel');
  if (dbg) dbg.textContent = `Smoke test error: ${e && e.stack ? e.stack : String(e)}`;
}

// Global error handler to surface errors into the debug panel for easier debugging
window.addEventListener('error', (ev) => {
  const dbg = $('#debugPanel');
  const msg = ev?.error?.stack || ev?.message || String(ev);
  console.error('Uncaught error:', ev.error || ev.message || ev);
  if (dbg) dbg.textContent = `Uncaught error: ${msg}`;
});

// Debug panel toggle wiring: collapsible panel above the simple chart
function initDebugPanel() {
  const toggle = $('#debugToggle');
  const body = $('#debugBody');
  const pre = $('#debugPanel');
  if (!toggle || !body || !pre) return;

  // Update pre with calc() output and set a concise summary on the toggle
  function refreshDebug() {
    try {
      const res = calc();
      pre.textContent = JSON.stringify(res, null, 2);
      toggle.textContent = `▶ Debug — clients: ${res.clients || 0}, revenue: ${fmtMoney0(res.revenue || 0)}`;
    } catch (e) {
      pre.textContent = `Error generating debug: ${e && e.stack ? e.stack : String(e)}`;
      toggle.textContent = `▶ Debug — error`;
    }
  }

  // restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-debug-expanded');
  const expanded = stored === '1';
  if (expanded) {
    body.classList.remove('collapsed');
    body.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    const expandedNow = !isCollapsed;
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    localStorage.setItem('profitpath-debug-expanded', expandedNow ? '1' : '0');
    // refresh content when expanding
    if (expandedNow) refreshDebug();
  });

  // refresh periodically (keeps the debug info up to date while editing)
  setInterval(refreshDebug, 1500);
  // initial refresh
  refreshDebug();
}

// Initialize debug panel after DOM is ready
try {
  initDebugPanel();
} catch (e) {
  console.warn('Failed to init debug panel:', e);
}

// Persist chosen logo so future loads remember the finalized variant
try {
  localStorage.setItem('profitpath-logo', 'final');
  document.documentElement.setAttribute('data-logo', 'final');
} catch (e) {
  // non-fatal
}
