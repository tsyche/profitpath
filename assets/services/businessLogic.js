// Business Logic
import { uuid } from '../utils/helpers';

// Clamp a number into [min, max]. Defined locally because rebalanceMix needs it
// and businessLogic.js runs as its own module (a bare `clamp` reference threw,
// silently breaking the forecast Auto-balance Mix % feature).
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Formatting utilities
const DEFAULT_CURRENCY = 'USD';
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtPct1 = (n) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';

export function validateBusinessLogic() {
  const issues = [];
  const warnings = [];

  // Validate global inputs
  if (state.fullTimeEmployees < 0) {
    issues.push({
      severity: 'error',
      message: 'Full-time employees cannot be negative',
      field: 'fullTimeEmployees',
      suggestion: 'Set to at least 0'
    });
  }

  if (state.partTimeEmployees < 0) {
    issues.push({
      severity: 'error',
      message: 'Part-time employees cannot be negative',
      field: 'partTimeEmployees',
      suggestion: 'Set to at least 0'
    });
  }

  if (state.fullTimeEmployees + state.partTimeEmployees < 1) {
    warnings.push({
      severity: 'warning',
      message: 'No employees defined',
      field: 'fullTimeEmployees',
      suggestion: 'Add at least 1 full-time or part-time employee for capacity'
    });
  }

  if (state.fullTimeEmployeePay < 0) {
    issues.push({
      severity: 'error',
      message: 'Full-time employee pay cannot be negative',
      field: 'fullTimeEmployeePay',
      suggestion: 'Enter a positive annual pay amount'
    });
  }

  if (state.partTimeEmployeePay < 0) {
    issues.push({
      severity: 'error',
      message: 'Part-time employee pay cannot be negative',
      field: 'partTimeEmployeePay',
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
        message: 'Offering ' + (index + 1) + ' has no name',
        field: 'offering-' + index + '-name',
        suggestion: 'Enter a descriptive name for this offering'
      });
    }

    if (offering.priceMonthly <= 0) {
      issues.push({
        severity: 'error',
        message: '"' + (offering.name || 'Unnamed offering') + '" has invalid price',
        field: 'offering-' + index + '-priceMonthly',
        suggestion: 'Monthly price must be greater than $0'
      });
    }

    if (offering.sessionsPerYear <= 0) {
      issues.push({
        severity: 'error',
        message: '"' + (offering.name || 'Unnamed offering') + '" has invalid sessions per year',
        field: 'offering-' + index + '-sessionsPerYear',
        suggestion: 'Must have at least 1 session per year'
      });
    }

    if (offering.hoursPerSession <= 0) {
      issues.push({
        severity: 'error',
        message: '"' + (offering.name || 'Unnamed offering') + '" has invalid hours per session',
        field: 'offering-' + index + '-hoursPerSession',
        suggestion: 'Each session must take at least 0.1 hours'
      });
    }

    if (offering.variableCostPerSession < 0) {
      issues.push({
        severity: 'error',
        message: '"' + (offering.name || 'Unnamed offering') + '" has negative variable costs',
        field: 'offering-' + index + '-variableCostPerSession',
        suggestion: 'Variable costs cannot be negative'
      });
    }

    if (offering.mixPct < 0 || offering.mixPct > 100) {
      issues.push({
        severity: 'error',
        message: '"' + (offering.name || 'Unnamed offering') + '" mix percentage is invalid',
        field: 'offering-' + index + '-mixPct',
        suggestion: 'Mix percentage must be between 0% and 100%'
      });
    }

    if (state.mode === 'current' && offering.currentClients < 0) {
      issues.push({
        severity: 'error',
        message: '"' + (offering.name || 'Unnamed offering') + '" has negative client count',
        field: 'offering-' + index + '-currentClients',
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
        message: 'Mix percentages sum to ' + (mixSum.toFixed(1)) + '% (should be 100%)',
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
        message: 'Utilization is ' + (fmtPct1(metrics.capacityPct)) + ' - consider overtime pay or hiring',
        field: 'utilization-high',
        suggestion: 'High utilization may indicate need for more staff or reduced workload'
      });
    } else if (metrics.capacityPct < 50 && metrics.clients > 0) {
      warnings.push({
        severity: 'info',
        message: 'Utilization is only ' + (fmtPct1(metrics.capacityPct)) + ' - opportunity for more clients',
        field: 'utilization-low',
        suggestion: 'Low utilization suggests capacity for additional business'
      });
    }

    // Check for potential profitability issues
    if (metrics.income < 0 && metrics.revenue > 0) {
      warnings.push({
        severity: 'warning',
        message: 'Currently operating at a loss: ' + (fmtMoney0(metrics.income)),
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
          message: 'Revenue per service hour (' + (fmtMoney0(revenuePerHour)) + ') seems low',
          field: 'pricing-efficiency',
          suggestion: 'Consider if pricing adequately covers your time and expertise'
        });
      } else if (revenuePerHour > 500) {
        warnings.push({
          severity: 'info',
          message: 'Revenue per service hour (' + (fmtMoney0(revenuePerHour)) + ') is very high',
          field: 'pricing-validation',
          suggestion: 'Verify this pricing is appropriate for your market and value delivered'
        });
      }
    }

  } catch (e) {
    let errorMsg = 'Unable to calculate metrics';
    let suggestion = 'Check that all required fields are filled in';

    // Provide more specific error messages based on state
    // Check structural issues first
    if (state.offerings && state.offerings.length === 0) {
      errorMsg = 'Cannot calculate without service offerings';
      suggestion = 'Add at least one service offering to perform calculations';
    } else if (!state.fullTimeEmployees && !state.partTimeEmployees) {
      errorMsg = 'Cannot calculate without employees';
      suggestion = 'Add at least one full-time or part-time employee';
    } else if (state.mode === 'current') {
      // In current mode, check if offerings have required fields
      const offeringIssues = [];
      if (state.offerings) {
        state.offerings.forEach((o, idx) => {
          if (!o.name) offeringIssues.push('Offering ' + (idx + 1) + ' has no name');
          if (!o.sessionsPerYear) offeringIssues.push('Offering ' + (idx + 1) + ' has no sessions');
          if (!o.hoursPerSession) offeringIssues.push('Offering ' + (idx + 1) + ' has no session length');
          if (typeof o.currentClients === 'undefined' || o.currentClients === null) offeringIssues.push('Offering ' + (idx + 1) + ' has no client count');
        });
      }
      if (offeringIssues.length > 0) {
        errorMsg = 'Current mode missing required data: ' + offeringIssues.join('; ');
        suggestion = 'Ensure all offerings have names, sessions, hours, and client counts';
      } else {
        errorMsg = 'Calculation error in current mode';
        suggestion = 'Check your offering details are correct';
      }
    } else {
      // Forecast mode
      errorMsg = 'Calculation error - check your data values';
      suggestion = 'Verify all numeric values are valid and non-negative';
    }

    warnings.push({
      severity: 'error',
      message: errorMsg,
      field: 'calculation-error',
      suggestion: suggestion
    });

    console.error('Calculation error in validateBusinessLogic():', e.message, {
      mode: state.mode,
      employees: (state.fullTimeEmployees || 0) + (state.partTimeEmployees || 0),
      offerings: state.offerings ? state.offerings.length : 0,
      errorDetails: e.toString()
    });
  }

  return { issues, warnings };
}

export function rebalanceMix(changedIdx, nextMixPct) {
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

export function defaultOfferings() {
  return [
    // Provide non-zero currentClients so switching modes immediately shows calculations.
    { id: uuid(), name: 'Weekly', priceMonthly: 200, sessionsPerYear: 52, hoursPerSession: 1.0, variableCostPerSession: 0, mixPct: 33.0, currentClients: 6 },
    { id: uuid(), name: 'Biweekly', priceMonthly: 140, sessionsPerYear: 26, hoursPerSession: 1.0, variableCostPerSession: 0, mixPct: 33.0, currentClients: 8 },
    { id: uuid(), name: 'Monthly', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1.0, variableCostPerSession: 0, mixPct: 34.0, currentClients: 10 },
  ];
}

// Validation messages the user has dismissed this session. Keyed by severity+message
// so the same message stays hidden across re-renders (validation re-runs on every
// input change). Keys for messages that no longer apply are pruned, so a condition
// that clears and later recurs will surface again.
const dismissedValidationKeys = new Set();

function validationKey(item) {
  return (item.severity || '') + '::' + (item.message || '');
}

function buildValidationItem(item, icon) {
  const key = validationKey(item);
  const el = document.createElement('div');
  el.className = 'validation-item validation-' + (item.severity);
  el.dataset.vkey = key;
  el.innerHTML =
    '<div class="validation-message"><strong>' + icon + '</strong>' +
    '<span class="validation-text">' + (item.message) + '</span>' +
    '<button class="validation-dismiss" type="button" aria-label="Dismiss message">&times;</button>' +
    '</div><div class="validation-suggestion">' + (item.suggestion) + '</div>';

  el.querySelector('.validation-dismiss').addEventListener('click', () => {
    dismissedValidationKeys.add(key);
    updateValidationDisplay();
  });
  attachSwipeToDismiss(el, key);
  return el;
}

// Lightweight horizontal swipe-to-dismiss for touch devices.
function attachSwipeToDismiss(el, key) {
  let startX = 0, dx = 0, dragging = false;
  el.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX; dx = 0; dragging = true;
    el.style.transition = 'none';
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    dx = e.touches[0].clientX - startX;
    el.style.transform = 'translateX(' + dx + 'px)';
    el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 200));
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    el.style.transition = '';
    if (Math.abs(dx) > 80) {
      dismissedValidationKeys.add(key);
      updateValidationDisplay();
    } else {
      el.style.transform = '';
      el.style.opacity = '';
    }
  });
}

export function updateValidationDisplay() {
  const validationContainer = $('#validationContainer');
  if (!validationContainer) return;

  const { issues, warnings } = validateBusinessLogic();

  // Prune dismissed keys whose message no longer applies, so a recurring issue
  // can resurface rather than staying hidden forever.
  const activeKeys = new Set([...issues, ...warnings].map(validationKey));
  for (const k of dismissedValidationKeys) {
    if (!activeKeys.has(k)) dismissedValidationKeys.delete(k);
  }

  const visibleIssues = issues.filter(i => !dismissedValidationKeys.has(validationKey(i)));
  const visibleWarnings = warnings.filter(w => !dismissedValidationKeys.has(validationKey(w)));

  // Always clear existing messages first
  validationContainer.innerHTML = '';

  // Track if we have any messages
  let hasMessages = false;

  // Create error messages (for structural/critical errors)
  if (visibleIssues.length > 0) {
    hasMessages = true;
    const errorsEl = document.createElement('div');
    errorsEl.className = 'validation-errors';

    visibleIssues.forEach(issue => {
      errorsEl.appendChild(buildValidationItem(issue, issue.severity === 'error' ? '⚠️' : 'ℹ️'));
    });

    validationContainer.appendChild(errorsEl);
  }

  // Create warning messages (for business logic issues and info)
  if (visibleWarnings.length > 0) {
    hasMessages = true;
    const warningsEl = document.createElement('div');
    warningsEl.className = 'validation-warnings';

    visibleWarnings.forEach(warning => {
      // Show appropriate icon based on severity
      const icon = (warning.severity === 'error' || warning.severity === 'warning') ? '⚠️' : '💡';
      warningsEl.appendChild(buildValidationItem(warning, icon));
    });

    validationContainer.appendChild(warningsEl);
  }

  // Set display based on whether we have messages
  validationContainer.style.display = hasMessages ? 'block' : 'none';
}
