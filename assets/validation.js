// ============================================================================
// VALIDATION FUNCTIONS - Refactored for better maintainability
// ============================================================================

import {
  MIN_EMPLOYEES,
  MAX_EMPLOYEES,
  MIN_PAY_THRESHOLD,
  MAX_PAY_THRESHOLD,
  MIN_UTILIZATION_WARNING,
  MAX_UTILIZATION_WARNING,
  MAX_UTILIZATION_CRITICAL,
  MIN_UTILIZATION_LOW
} from './constants.js';

export function validateGlobalInputs(state, issues) {
  // Validate employees
  if (state.employees < MIN_EMPLOYEES) {
    issues.push({
      severity: 'error',
      message: `Employees must be at least ${MIN_EMPLOYEES}`,
      field: 'employees',
      suggestion: 'Set employees to 1 (you can exclude yourself from payroll costs)'
    });
  }

  // Validate employee pay
  if (state.employeePay < 0) {
    issues.push({
      severity: 'error',
      message: 'Employee pay cannot be negative',
      field: 'employeePay',
      suggestion: 'Enter a positive annual pay amount'
    });
  }

  // Validate monthly costs
  if (state.monthlyCosts < 0) {
    issues.push({
      severity: 'error',
      message: 'Monthly overhead costs cannot be negative',
      field: 'monthlyCosts',
      suggestion: 'Enter a positive monthly cost amount'
    });
  }

  // Validate utilization percentages
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
}

export function validateOfferings(state, issues, warnings) {

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
    // Import calc here to avoid circular dependencies
    const { calc } = await import('./calculations.js');
    const metrics = calc();

    if (metrics.capacityPct > MAX_UTILIZATION_CRITICAL) {
      warnings.push({
        severity: 'warning',
        message: `Utilization is ${fmtPct1(metrics.capacityPct)} - consider overtime pay or hiring`,
        field: 'utilization-high',
        suggestion: 'High utilization may indicate need for more staff or reduced workload'
      });
    } else if (metrics.capacityPct < MIN_UTILIZATION_LOW && metrics.clients > 0) {
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
}

export function validateBusinessRules(state) {
  const issues = { errors: [], warnings: [], info: [] };

  // Employee validation
  if (state.employees < MIN_EMPLOYEES) {
    issues.errors.push(`Must have at least ${MIN_EMPLOYEES} employee`);
  } else if (state.employees > MAX_EMPLOYEES) {
    issues.warnings.push('Very large team size - calculations may be less accurate');
  }

  // Pay validation
  if (state.employeePay < MIN_PAY_THRESHOLD) {
    issues.warnings.push('Employee pay seems low - verify this is correct');
  } else if (state.employeePay > MAX_PAY_THRESHOLD) {
    issues.warnings.push('Employee pay seems very high - verify this is correct');
  }

  // Utilization validation
  if (state.productiveUtilizationPct < MIN_UTILIZATION_WARNING) {
    issues.warnings.push('Utilization below 50% may indicate inefficiency');
  } else if (state.productiveUtilizationPct > MAX_UTILIZATION_WARNING) {
    issues.warnings.push('Utilization above 95% may lead to burnout');
  }

  if (state.targetUtilizationPct > 150) {
    issues.warnings.push('Target utilization above 150% may be unrealistic');
  }

  // Offering validation
  if (state.offerings.length === 0) {
    issues.info.push('Add at least one service offering to see calculations');
  } else {
    state.offerings.forEach((offering, index) => {
      if (!offering.name || offering.name.trim() === '') {
        issues.errors.push(`Offering ${index + 1} needs a name`);
      }

      if (offering.priceMonthly <= 0) {
        issues.errors.push(`"${offering.name || 'Offering ' + (index + 1)}" needs a positive price`);
      }

      if (offering.sessionsPerYear <= 0) {
        issues.errors.push(`"${offering.name || 'Offering ' + (index + 1)}" needs sessions per year > 0`);
      }

      if (offering.hoursPerSession <= 0) {
        issues.errors.push(`"${offering.name || 'Offering ' + (index + 1)}" needs hours per session > 0`);
      }

      if (state.mode === 'forecast' && offering.mixPct < 0) {
        issues.errors.push(`"${offering.name || 'Offering ' + (index + 1)}" mix percentage cannot be negative`);
      }
    });

    // Mix percentage validation for forecast mode
    if (state.mode === 'forecast') {
      const totalMix = state.offerings.reduce((sum, o) => sum + (o.mixPct || 0), 0);
      if (Math.abs(totalMix - 100) > 0.1) {
        issues.warnings.push(`Mix percentages total ${totalMix.toFixed(1)}% (should be 100%)`);
      }
    }
  }

  return issues;
}

export function validateBusinessLogic(state) {
  const issues = [];
  const warnings = [];

  // Validate global inputs
  validateGlobalInputs(state, issues);

  // Validate offerings and business logic
  validateOfferings(state, issues, warnings);

  return { issues, warnings };
}
