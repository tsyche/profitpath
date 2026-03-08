// Business Logic
import { uuid } from '../utils/helpers';

export function validateBusinessLogic() {
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
    warnings.push({
      severity: 'error',
      message: 'Unable to calculate metrics due to data issues',
      field: 'calculation-error',
      suggestion: 'Fix the validation errors above to enable calculations'
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

export function updateValidationDisplay() {
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
      errorEl.className = 'validation-item validation-' + (issue.severity);
      errorEl.innerHTML = '<div class="validation-message"><strong>' + (issue.severity === 'error' ? '⚠️' : 'ℹ️') + '</strong>' + (issue.message) + '</div><div class="validation-suggestion">' + (issue.suggestion) + '</div>';
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
      warningEl.className = 'validation-item validation-' + (warning.severity);
      warningEl.innerHTML = '<div class="validation-message"><strong>' + (warning.severity === 'warning' ? '⚠️' : '💡') + '</strong>' + (warning.message) + '</div><div class="validation-suggestion">' + (warning.suggestion) + '</div>';
      warningsEl.appendChild(warningEl);
    });

    validationContainer.appendChild(warningsEl);
  }

  // Hide container if no messages
  validationContainer.style.display = (issues.length > 0 || warnings.length > 0) ? 'block' : 'none';
}
