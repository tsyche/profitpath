import { calc } from '../src/calculations/index.js';
import {
  loadSettings,
  updateSetting,
  setExperienceLevel
} from '../src/settings/index.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Constants for business model assumptions
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
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}

const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtPct1 = (n) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';

// Lazy loading utility for scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) {
      resolve(); // Already loaded
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

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

// Make state accessible to calculations module
globalThis.state = state;

// Persist state to localStorage (global helper so other modules can call it)
function persistState() {
  try {
    localStorage.setItem('profitpath-state', JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
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

// calc function moved to src/calculations/index.js

function cssEscape(s) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(String(s));
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + (ch) + '\\');
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

  const sel = '#offeringsBody [data-k="' + cssEscape(focus.k) + '"][data-i="' + cssEscape(focus.i) + '"]';
  const el = $(sel);
  if (!(el instanceof HTMLInputElement)) return;
  el.selectionStart = focus.selectionStart;
  el.selectionEnd = focus.selectionEnd;
  el.focus();
}

// Lazy chart loading with Intersection Observer
function lazyLoadChart(metrics) {
  const chartEl = $('#simpleChart');
  if (!chartEl) return;

  // If chart is already rendered, just update it
  if (chartEl.querySelector('svg')) {
    try {
      renderSimpleChart(metrics);
    } catch (e) {
      console.warn('Chart render failed:', e);
    }
    return;
  }

  // Set up intersection observer for lazy loading
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        try {
          renderSimpleChart(metrics);
        } catch (e) {
          console.warn('Chart render failed:', e);
        }
        observer.disconnect(); // Only load once
      }
    });
  }, { threshold: 0.1 }); // Load when 10% visible

  observer.observe(chartEl);

  // Fallback: load after a short delay if intersection observer doesn't trigger
  setTimeout(() => {
    if (!chartEl.querySelector('svg')) {
      try {
        renderSimpleChart(metrics);
      } catch (e) {
        console.warn('Chart render failed:', e);
      }
      observer.disconnect();
    }
  }, 1000);
}

function renderSimpleChart(metrics) {
  const el = $('#simpleChart');
  if (!el) return;

  // Hide any existing tooltips before rendering new chart
  const existingTooltip = el.querySelector('.chart-tooltip');
  if (existingTooltip) {
    existingTooltip.classList.remove('visible', 'pinned');
    existingTooltip.style.display = 'none';
    existingTooltip.innerHTML = '';
  }

  // Clean up any existing document event handlers to prevent stale closures
  if (document._chartClickHandler) {
    document.removeEventListener('click', document._chartClickHandler);
    document._chartClickHandler = null;
  }
  if (document._chartKeyHandler) {
    document.removeEventListener('keydown', document._chartKeyHandler);
    document._chartKeyHandler = null;
  }

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
    return { name: o.name || 'Offering ' + (idx + 1), rev, variable, contrib, serviceHoursPerClient, pct };
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
    // include data attributes for a custom tooltip (avoid native <title>which can be inconsistent)
    const offeringAttr = escapeHtml(r.offering || '');
    const typeAttr = escapeHtml(r.type || '');
    const varAttr = escapeHtml(fmtMoney0(r.varVal || 0));
    const contribAttr = escapeHtml(fmtMoney0(r.contribVal || 0));
    const pctAttr = escapeHtml(((r.pct || 0) * 100).toFixed(0) + '%');
    const hoursAttr = escapeHtml((r.hours || 0).toFixed(1));
    svgParts.push('<rect x="' + (xPos) + '" y="2" width="' + (w) + '" height="16" rx="3" fill="' + (r.color) + '" data-offering="' + (offeringAttr) + '" data-type="' + (typeAttr) + '" data-var="' + (varAttr) + '" data-contrib="' + (contribAttr) + '" data-pct="' + (pctAttr) + '" data-hours="' + (hoursAttr) + '"></rect>');
  });

  // intentionally do not render per-offering inline labels (legend below provides totals)
  svgParts.push('</svg>');

  const legend = '<div class="chart-labels"><div class="left"><div class="pill-legend"><span class="legend-swatch legend-variable"></span><span>Variable: ' + (fmtMoney0(totalVariable)) + '</span></div><div class="pill-legend"><span class="legend-swatch legend-margin"></span><span>Contribution: ' + (fmtMoney0(totalContribution)) + '</span></div></div><div style="display:flex;align-items:center;gap:12px"><div class="center" style="font-family:var(--mono);color:var(--muted);">' + (Math.round((totalVariable / totalRevenue) * 100)) + '% / ' + (Math.round((totalContribution / totalRevenue) * 100)) + '%</div><div class="right">Revenue: <strong>' + (fmtMoney0(totalRevenue)) + '</strong></div></div></div>';

  // Build a compact offering list under the legend (name / pct / annual rev).
  const offeringItems = data.map((d) => {
    const pct = totalRevenue > 0 ? Math.round((d.rev / totalRevenue) * 100) : 0;
    return '<div class="offering-item"><div class="off-left"><span class="o-name">' + (escapeHtml(d.name)) + '</span><span class="o-pct">' + (pct) + '%</span></div><div class="o-val">' + (fmtMoney0(d.rev)) + '</div></div>';
  }).join('');

  const offeringListHTML = '<div class="offering-list">' + (offeringItems) + '</div>';

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


  // updatePinnedIndicator is intentionally a no-op for visuals-we do not highlight pinned segments.
  // Keeping the function so other code can call it without needing edits.
  function updatePinnedIndicator(/* rectEl */) {
    // no-op: visual pinned indicators (outline/overlay) removed per UX preference
    // ensure any leftover data attributes are cleared
    el.querySelectorAll('rect[data-pinned]').forEach((r) => r.removeAttribute('data-pinned'));
  }

  function showTooltipForRect(rectEl, _clientX = null, _clientY = null, pinnedNow = false) {
    if (!rectEl) return;
    const offering = rectEl.getAttribute('data-offering') || '';
    const varVal = rectEl.getAttribute('data-var') || '';
    const contribVal = rectEl.getAttribute('data-contrib') || '';
    const pct = rectEl.getAttribute('data-pct') || '';
    const hours = rectEl.getAttribute('data-hours') || '';

    let html = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="font-weight:700">' + (offering) + '</div><div style="display:flex;gap:6px;align-items:center"><button class="tooltip-pin" aria-label="Pin tooltip">📌</button><button class="tooltip-close" aria-label="Close tooltip">×</button></div></div>';
    if (CHART_TOOLTIP_OPTIONS.showPercent) {
      html += '<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:6px">' + (pct) + '</div>';
    }
    html += '<div style="font-family:var(--mono);font-size:12px">Variable: ' + (varVal) + '</div>';
    html += '<div style="font-family:var(--mono);color:var(--accent);font-size:12px">Contribution: ' + (contribVal) + '</div>';
    if (CHART_TOOLTIP_OPTIONS.showServiceHoursPerClient) {
      html += '<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:4px">Service hours / client: ' + (hours) + '</div>';
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
      tooltip.style.left = (leftClamped) + 'px';
      tooltip.style.top = (topPos) + 'px';
    } else {
      // pinned behavior: same as hover-always position above the bar
      const tipRect2 = tooltip.getBoundingClientRect();
      const topPos = Math.max(8, rectBox.top - containerBox.top - tipRect2.height - HOVER_OFFSET);

      tooltip.style.left = (leftClamped) + 'px';
      tooltip.style.top = (topPos) + 'px';
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

  // click outside to unpin
  document._chartClickHandler = (ev) => {
    if (!pinned) return;
    if (!el.contains(ev.target)) unpinTooltip();
  };
  document.addEventListener('click', document._chartClickHandler);

  // escape key to close
  document._chartKeyHandler = (ev) => {
    if (ev.key === 'Escape' && pinned) {
      unpinTooltip();
    }
  };
  document.addEventListener('keydown', document._chartKeyHandler);
}

function updateBreakEvenAnalysis(metrics) {
  const analysisEl = $('#breakEvenAnalysis');
  if (!analysisEl) return;

  if (!Number.isFinite(metrics.breakEvenRevenue) || metrics.breakEvenRevenue <= 0) {
    analysisEl.style.display = 'none';
    return;
  }

  const surplus = metrics.revenue - metrics.breakEvenRevenue;
  const surplusPct = metrics.breakEvenRevenue > 0 ? (surplus / metrics.breakEvenRevenue) * 100 : 0;

  let status = '';
  let statusColor = '';
  if (surplus > 0) {
    status = 'Above break-even by ' + (fmtMoney0(surplus)) + ' (' + (surplusPct.toFixed(1)) + '%)';
    statusColor = 'var(--good)';
  } else if (surplus < 0) {
    status = 'Below break-even by ' + (fmtMoney0(Math.abs(surplus))) + ' (' + (Math.abs(surplusPct).toFixed(1)) + '%)';
    statusColor = 'var(--bad)';
  } else {
    status = 'At break-even point';
    statusColor = 'var(--warn)';
  }

  const clientGap = metrics.breakEvenClients - metrics.clients;
  let clientStatus = '';
  if (clientGap > 0) {
    clientStatus = 'Need ' + (fmtInt(clientGap)) + ' more clients to break even';
  } else if (clientGap < 0) {
    clientStatus = (fmtInt(Math.abs(clientGap))) + ' clients above break-even';
  } else {
    clientStatus = 'At break-even client count';
  }

  analysisEl.innerHTML = '<div class="break-even-header"><h4 style="margin:0 0 8px 0;font-size:14px;color:var(--text);">Break-Even Analysis</h4></div><div class="break-even-content"><div class="break-even-item"><span class="break-even-label">Status:</span><span class="break-even-value" style="color:' + (statusColor) + ';">' + (status) + '</span></div><div class="break-even-item"><span class="break-even-label">Client status:</span><span class="break-even-value">' + (clientStatus) + '</span></div><div class="break-even-item"><span class="break-even-label">Fixed costs covered:</span><span class="break-even-value">' + (fmtPct1(Math.min(100, (metrics.revenue / metrics.breakEvenRevenue) * 100))) + '</span></div>' + (metrics.contributionMarginRatio > 0 ? '<div class="break-even-item"><span class="break-even-label">Contribution ratio:</span><span class="break-even-value">' + (fmtPct1(metrics.contributionMarginRatio * 100)) + '</span></div>' : '') + '</div>';

  analysisEl.style.display = 'block';

}

function updateRichVisualizations(metrics) {
  const vizEl = $('#richVisualizations');
  if (!vizEl) return;

  // Only show if we have meaningful data
  if (!metrics || metrics.clients <= 0) {
    vizEl.style.display = 'none';
    return;
  }

  // Create utilization gauge
  const utilizationGauge = createUtilizationGauge(metrics);

  // Create profit/loss waterfall (simplified version)
  const profitWaterfall = createProfitWaterfall(metrics);

  vizEl.innerHTML = '<div class="viz-header"><h4 style="margin:0 0 12px 0;font-size:14px;color:var(--text);">Rich Visualizations</h4></div><div class="viz-content"><div class="viz-item"><h5 style="margin:0 0 8px 0;font-size:12px;color:var(--muted);font-weight:600;">Utilization Gauge</h5>' + (utilizationGauge) + '</div><div class="viz-item"><h5 style="margin:0 0 8px 0;font-size:12px;color:var(--muted);font-weight:600;">Profit Waterfall</h5>' + (profitWaterfall) + '</div></div>';

  vizEl.style.display = 'block';
}

function createUtilizationGauge(metrics) {
  const utilization = Math.min(150, Math.max(0, metrics.capacityPct || 0));
  const angle = (utilization / 150) * 180; // Semi-circle gauge

  return '<div class="utilization-gauge"><svg viewBox="0 0 120 80" class="gauge-svg"><!--Background arc--><path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/><!--Utilization arc--><path d="M 10 70 A 50 50 0 0 1 ' + (10 + Math.cos((angle - 90) * Math.PI / 180) * 50 + 50) + ' ' + (70 - Math.sin((angle - 90) * Math.PI / 180) * 50) + '" fill="none" stroke="' + (utilization > 100 ? 'var(--bad)' : utilization > 75 ? 'var(--warn)' : 'var(--good)') + '" stroke-width="8"/><!--Needle--><line x1="60" y1="70" x2="' + (60 + Math.cos((angle - 90) * Math.PI / 180) * 40) + '" y2="' + (70 - Math.sin((angle - 90) * Math.PI / 180) * 40) + '" stroke="var(--accent)" stroke-width="3"/><!--Center dot--><circle cx="60" cy="70" r="4" fill="var(--accent)"/></svg><div class="gauge-labels"><div class="gauge-value">' + (fmtPct1(utilization)) + '</div><div class="gauge-text">Utilization</div></div></div>';
}

function createProfitWaterfall(metrics) {
  const items = [
    { label: 'Revenue', value: metrics.revenue, color: 'var(--good)' },
    { label: 'Variable Costs', value: -metrics.variableCosts, color: 'var(--bad)' },
    { label: 'Fixed Costs', value: -metrics.annualFixedCosts - metrics.annualPayroll, color: 'var(--bad)' },
    { label: 'Net Profit', value: metrics.income, color: metrics.income >= 0 ? 'var(--good)' : 'var(--bad)' }
  ];

  let runningTotal = 0;
  const bars = items.map((item, index) => {
    const startY = runningTotal;
    const endY = runningTotal + item.value;
    runningTotal = endY;

    const height = Math.abs(item.value);
    const y = Math.min(startY, endY);
    const barHeight = Math.max(1, height * 0.5); // Scale for visibility

    return '<rect x="' + (index * 25 + 5) + '" y="' + (60 - y * 0.5 - barHeight) + '" width="15" height="' + (barHeight) + '" fill="' + (item.color) + '" opacity="0.7"/><text x="' + (index * 25 + 12.5) + '" y="75" text-anchor="middle" font-size="8" fill="var(--muted)">' + (item.label.split(' ')[0]) + '</text>';
  }).join('');

  return '<div class="profit-waterfall"><svg viewBox="0 0 100 80" class="waterfall-svg">' + (bars) + '<!--Zero line--><line x1="0" y1="60" x2="100" y2="60" stroke="var(--border)" stroke-width="1"/></svg><div class="waterfall-summary"><div class="summary-item"><span class="summary-label">Net:</span><span class="summary-value" style="color:' + (metrics.income >= 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtMoney0(metrics.income)) + '</span></div></div></div>';
}

function render() {
  const focus = captureTableFocus();

  let metrics;
  try {
    metrics = calc();
  } catch (e) {
    console.error('Calculation failed in render:', e);
    // Return early with error state
    const dbg = $('#debugPanel');
    if (dbg) {
      dbg.textContent = 'Calculation error: ' + (e && e.stack ? e.stack : String(e));
      dbg.style.display = 'block';
    }
    return;
  }

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
      ? '<input aria-label="Mix % for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" max="100" step="1" value="' + ((o.mixPct ?? 0).toFixed(1)) + '" data-k="mixPct" data-i="' + (idx) + '" />'
      : '<span class="muted">—</span>';

    const clientsCell = isForecast
      ? '<span class="muted">—</span>'
      : '<input aria-label="Clients for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" step="1" value="' + (o.currentClients ?? 0) + '" data-k="currentClients" data-i="' + (idx) + '" />';

    const estClients = isForecast
      ? Math.floor(metrics.clients * ((o.mixPct || 0) / 100))
      : o.currentClients;

    const estSessions = isForecast
      ? Math.round(estClients * o.sessionsPerYear)
      : Math.round((o.currentClients || 0) * o.sessionsPerYear);

    tr.innerHTML = '<td class="cell-edit group-start group-inputs" data-label="Offering"><input aria-label="Offering name" type="text" value="' + (escapeHtml(o.name)) + '" data-k="name" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Price / mo"><input aria-label="Price per month for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="10" value="' + (o.priceMonthly) + '" data-k="priceMonthly" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Sessions / yr"><input aria-label="Sessions per year for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.sessionsPerYear) + '" data-k="sessionsPerYear" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs" data-label="Hours / session"><input aria-label="Hours per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="0.1" value="' + (o.hoursPerSession) + '" data-k="hoursPerSession" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-inputs group-end" data-label="Var $ / session"><input aria-label="Variable cost per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.variableCostPerSession) + '" data-k="variableCostPerSession" data-i="' + (idx) + '"/></td>' +
      '<td class="cell-edit group-start group-mode" data-label="Mix % (forecast)">' + (mixCell) + '</td>' +
      '<td class="cell-edit group-mode group-end" data-label="Clients (current)">' + (clientsCell) + '</td>' +
      '<td class="cell-readonly group-start group-est" data-label="Est. clients"><span class="mono">' + (fmtInt(estClients)) + '</span></td>' +
      '<td class="cell-readonly group-est" data-label="Est. sessions"><span class="mono">' + (fmtInt(estSessions)) + '</span></td>' +
      '<td class="cell-readonly group-metrics" data-label="Annual Revenue"><span class="mono">' + (fmtMoney0(metrics.offeringMetrics[idx]?.revenue || 0)) + '</span></td>' +
      '<td class="cell-readonly group-metrics" data-label="Margin %"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.marginPct || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtPct1(metrics.offeringMetrics[idx]?.marginPct || 0)) + '</span></td>' +
      '<td class="cell-readonly group-metrics group-end" data-label="Annual Profit"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.profit || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtMoney0(metrics.offeringMetrics[idx]?.profit || 0)) + '</span></td>' +
      '<td class="cell-edit group-actions" data-label="Actions"><button class="btn small danger" data-action="removeOffering" data-i="' + (idx) + '" aria-label="Remove ' + (escapeHtml(o.name)) + '">Remove</button></td>';

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
        ? 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '%)'
        : 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '% — auto-normalized for calculations)');
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
    if (capBar) capBar.style.width = ((cap / 150) * 100) + '%';
    const capLabel = $('#capacityLabel');
    if (capLabel) capLabel.textContent = metrics.capacityPct > 100
      ? 'Over capacity: ' + (fmtPct1(metrics.capacityPct)) + '(overtime likely)'
      : 'Utilization: ' + (fmtPct1(metrics.capacityPct));

    // Lazy load simple revenue composition chart when visible
    lazyLoadChart(metrics);

    // Update break-even analysis
    updateBreakEvenAnalysis(metrics);

    // Update rich visualizations
    updateRichVisualizations(metrics);

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

  // Validate and sanitize inputs
  state.employees = Math.max(1, Math.floor(safeParseNumber($('#employees').value, 1)));
  state.employeePay = Math.max(0, safeParseNumber($('#employeePay').value, 0));
  state.monthlyCosts = Math.max(0, safeParseNumber($('#monthlyCosts').value, 0));
  state.productiveUtilizationPct = clamp(safeParseNumber($('#productiveUtilizationPct').value, 80), 0, 100);
  state.targetUtilizationPct = clamp(safeParseNumber($('#targetUtilizationPct').value, 75), 0, 150);
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
    // Validation error handled-value has been sanitized

    // Auto-fix common issues
    if (k === 'priceMonthly' && value === 0 && o.priceMonthly === 0) {
      // Suggest a reasonable default price
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
    name: 'Offering ' + (state.offerings.length + 1),
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
  let results;
  try {
    results = calc();
  } catch (e) {
    console.error('Calculation failed in exportAsCSV:', e);
    alert('Error: Could not generate CSV export due to calculation error. Please check your inputs.');
    return;
  }

  // CSV header with summary metrics
  const lines = [
    'ProfitPath Business Analysis Report',
    'Generated: ' + (new Date().toLocaleString()),
    'Analysis Mode: ' + (state.mode === 'forecast' ? 'Forecast(Planning)' : 'Current(Operations Analysis)'),
    '',
    'BUSINESS PARAMETERS',
    'Parameter,Value,Unit',
    'Number of Employees, ' + (state.employees) + ', people',
    'Annual Employee Compensation, ' + (fmtMoney0(state.employeePay)) + ', USD / year',
    'Monthly Overhead Costs, ' + (fmtMoney0(state.monthlyCosts)) + ', USD / month',
    'Productive Utilization Target, ' + (fmtPct1(state.productiveUtilizationPct)) + ',% of available hours',
    'Overall Utilization Target, ' + (fmtPct1(state.targetUtilizationPct)) + ',% of total capacity',
    '',
    'FINANCIAL RESULTS',
    'Metric,Value,Unit',
    'Total Annual Revenue, ' + (fmtMoney0(results.revenue)) + ', USD / year',
    'Total Variable Costs, ' + (fmtMoney0(results.variableCosts)) + ', USD / year',
    'Gross Contribution Margin, ' + (fmtMoney0(Math.max(0, (results.revenue || 0) - (results.variableCosts || 0)))) + ', USD / year',
    'Fixed Overhead Costs, ' + (fmtMoney0(results.annualFixedCosts)) + ', USD / year',
    'Net Profit(Loss), ' + (fmtMoney0(results.income)) + ', USD / year',
    'Profit Margin, ' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)) + ',% of revenue',
    'Total Billable Hours, ' + (fmtInt(results.serviceHours || 0)) + ', hours / year',
    'Capacity Utilization, ' + (fmtPct1(results.capacityPct || 0)) + ',% of total capacity',
    '',
    'SERVICE OFFERINGS BREAKDOWN',
    'Service Name,Monthly Price,Sessions per Year,Hours per Session,Variable Cost per Session,Client Mix %,Current Clients,Projected Annual Revenue,Capacity Required',
  ];

  state.offerings.forEach((o) => {
    const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
    const capacityRequired = state.mode === 'forecast' ? Math.ceil((o.sessionsPerYear * state.employees * state.productiveUtilizationPct / 100) / o.sessionsPerYear) : o.currentClients;
    lines.push(
      '"' + (o.name) + '", ' + (o.priceMonthly) + ', ' + (o.sessionsPerYear) + ', ' + (o.hoursPerSession) + ', ' + (o.variableCostPerSession) + ', ' + (o.mixPct) + ', ' + (o.currentClients) + ', ' + (fmtMoney0(annualRevenue)) + ', ' + (capacityRequired)
    );
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-export-' + (new Date().toISOString().split('T')[0]) + '.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function shareViaEmail() {
  let results;
  try {
    results = calc();
  } catch (e) {
    console.error('Calculation failed in shareViaEmail:', e);
    alert('Error: Could not generate email report due to calculation error. Please check your inputs.');
    return;
  }

  const subject = encodeURIComponent('ProfitPath Report - ' + (new Date().toLocaleDateString()));
  const body = encodeURIComponent('ProfitPath Business Analysis Report\n\nGenerated: ' + (new Date().toLocaleString()) + '\n\nBUSINESS SUMMARY:\n  - Mode: ' + (state.mode) + '\n  - Employees: ' + (state.employees) + '\n  - Employee Pay: ' + (fmtMoney0(state.employeePay)) + '\n  - Monthly Overhead: ' + (fmtMoney0(state.monthlyCosts)) + '\n  - Productive Utilization: ' + (fmtPct1(state.productiveUtilizationPct)) + '\n\nFINANCIAL RESULTS:\n  - Total Revenue: ' + (fmtMoney0(results.revenue || 0)) + '\n  - Total Variable Costs: ' + (fmtMoney0(results.variableCosts || 0)) + '\n  - Net Profit: ' + (fmtMoney0(results.income || 0)) + '\n  - Profit Margin: ' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)) + '\n  - Utilization: ' + (fmtPct1(results.capacityPct || 0)) + '\n\nSERVICE OFFERINGS:\n' + (state.offerings.map(o => '- ' + (o.name) + ': ' + (fmtMoney0(o.priceMonthly)) + '/month').join('\n')) + '\n\n--- This report was generated using ProfitPath - a service business simulator.\nFor the full report with charts and detailed analysis, please see the attached export file.\n\nView the interactive simulator: ' + (window.location.origin) + (window.location.pathname));

  const mailtoLink = 'mailto:?subject=' + (subject) + '&body=' + (body);
  window.open(mailtoLink);
}

function showScheduleDialog() {
  // Create modal dialog
  const modal = document.createElement('div');
  modal.innerHTML = '<div id="scheduleModal" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;"><div class="modal-content" style="background:white;padding:30px;border-radius:8px;max-width:500px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);"><h3 style="margin-top:0;color:#1f2937;">Automated Report Scheduling</h3><p style="color:#6b7280;margin-bottom:20px;">Schedule automatic report generation and downloads.</p><form id="scheduleForm"><div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">Frequency:</label><select id="scheduleFrequency" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div><div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">Format:</label><select id="scheduleFormat" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;"><option value="pdf">PDF Report</option><option value="excel">Excel Workbook</option><option value="csv">CSV Spreadsheet</option><option value="html">HTML Page</option></select></div><div style="margin-bottom:20px;"><label style="display:block;margin-bottom:5px;font-weight:500;">Next Run:</label><div id="nextRunTime" style="color:#6b7280;font-size:0.9em;">Next run: calculating...</div></div><div style="display:flex;gap:10px;justify-content:flex-end;"><button type="button" id="cancelSchedule" style="padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:4px;cursor:pointer;">Cancel</button><button type="submit" style="padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">Start Scheduling</button></div></form><div id="scheduleStatus" style="margin-top:15px;padding:10px;border-radius:4px;display:none;"></div></div></div>';

  document.body.appendChild(modal);

  // Update next run time
  updateNextRunTime();

  // Event listeners
  document.getElementById('cancelSchedule').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  document.getElementById('scheduleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    startScheduling();
    document.body.removeChild(modal);
  });

  document.getElementById('scheduleFrequency').addEventListener('change', updateNextRunTime);
}

function updateNextRunTime() {
  const frequency = document.getElementById('scheduleFrequency')?.value || 'daily';
  const now = new Date();
  let nextRun;

  switch (frequency) {
    case 'daily':
      nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      nextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      break;
  }

  const nextRunElement = document.getElementById('nextRunTime');
  if (nextRunElement) {
    nextRunElement.textContent = 'Next run: ' + nextRun.toLocaleString();
  }
}

function startScheduling() {
  const frequency = document.getElementById('scheduleFrequency').value;
  const format = document.getElementById('scheduleFormat').value;

  // Clear any existing schedule
  if (window.scheduleInterval) {
    clearInterval(window.scheduleInterval);
  }

  let intervalMs;
  switch (frequency) {
    case 'daily':
      intervalMs = 24 * 60 * 60 * 1000; // 24 hours
      break;
    case 'weekly':
      intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      break;
    case 'monthly':
      intervalMs = 30 * 24 * 60 * 60 * 1000; // ~30 days
      break;
  }

  // Show status
  const statusElement = document.getElementById('scheduleStatus');
  if (statusElement) {
    statusElement.style.display = 'block';
    statusElement.style.background = '#d1fae5';
    statusElement.style.color = '#065f46';
    statusElement.textContent = '✅ Scheduling started: ' + format.toUpperCase() + ' reports every ' + frequency;
  }

  // Start scheduling
  window.scheduleInterval = setInterval(() => {
    try {
      switch (format) {
        case 'pdf':
          exportAsPDF();
          break;
        case 'excel':
          exportAsExcel();
          break;
        case 'csv':
          exportAsCSV();
          break;
        case 'html':
          exportAsHTML();
          break;
      }

      // Track export event
      if (window.profitPathAnalytics) {
        window.profitPathAnalytics.trackExport(format, 1, { scheduled: true });
      }

      // Show contextual feedback prompt
      if (window.feedbackUI) {
        window.feedbackUI.showContextualPrompt({
          action: 'scheduled ' + (format.toUpperCase()) + ' export',
          feature: 'exports'
        }, 3000);
      }

      // Show download notification
      showNotification('Scheduled ' + (format.toUpperCase()) + ' report downloaded', 'success');
    } catch (error) {
      console.error('Scheduled export failed:', error);
      showNotification('Scheduled export failed', 'error');
    }
  }, intervalMs);

  // Store schedule info for persistence
  localStorage.setItem('profitpath-schedule', JSON.stringify({
    frequency,
    format,
    started: Date.now(),
    intervalMs
  }));

  showNotification('Report scheduling started(' + (frequency) + ' ' + (format.toUpperCase()) + ')', 'success');
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = 'position: fixed;top: 20px;right: 20px;padding: 12px 16px;border-radius: 6px;color: white;font-weight: 500;z-index: 3000;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);max-width: 300px;';

  if (type === 'success') {
    notification.style.background = '#059669';
  } else if (type === 'error') {
    notification.style.background = '#dc2626';
  } else {
    notification.style.background = '#3b82f6';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 5000);
}

// Restore scheduling on page load
function restoreScheduling() {
  const scheduleData = localStorage.getItem('profitpath-schedule');
  if (scheduleData) {
    try {
      const { started, intervalMs } = JSON.parse(scheduleData);
      const elapsed = Date.now() - started;

      if (elapsed < intervalMs) {
        // Schedule hasn't triggered yet, restore it
        const remaining = intervalMs - elapsed;
        setTimeout(() => {
          startScheduling();
        }, remaining);
      } else {
        // Schedule should have triggered, clear it
        localStorage.removeItem('profitpath-schedule');
      }
    } catch (error) {
      console.warn('Could not restore scheduling:', error);
      localStorage.removeItem('profitpath-schedule');
    }
  }
}

async function exportAsExcel() {
  // Lazy load XLSX library
  if (!window.XLSX) {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    } catch (e) {
      console.error('Failed to load XLSX library:', e);
      alert('Error: Could not load Excel export library. Please try again.');
      return;
    }
  }

  let results;
  try {
    results = calc();
  } catch (e) {
    console.error('Calculation failed in exportAsExcel:', e);
    alert('Error: Could not generate Excel export due to calculation error. Please check your inputs.');
    return;
  }
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['ProfitPath Export'],
    [new Date().toLocaleString()],
    [''],
    ['SUMMARY'],
    ['Mode', state.mode],
    ['Employees', state.employees],
    ['Employee Pay', state.employeePay],
    ['Monthly Overhead', state.monthlyCosts],
    ['Productive Utilization', state.productiveUtilizationPct / 100],
    ['Target Utilization', state.targetUtilizationPct / 100],
    [''],
    ['RESULTS'],
    ['Total Revenue', results.revenue || 0],
    ['Total Variable Costs', results.variableCosts || 0],
    ['Contribution Margin', '=B13-B14'],
    ['Fixed Overhead', results.annualFixedCosts || 0],
    ['Net Profit', '=B15-B16'],
    ['Profit Margin', '=B17/B13'],
    ['Billable Hours', results.serviceHours || 0],
    ['Utilization', (results.capacityPct || 0) / 100],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];

  // Format as percentages where appropriate
  summarySheet['E6'] = { t: 'n', v: state.productiveUtilizationPct / 100, z: '0.00%' };
  summarySheet['E7'] = { t: 'n', v: state.targetUtilizationPct / 100, z: '0.00%' };
  summarySheet['E18'] = { t: 'n', v: (results.capacityPct || 0) / 100, z: '0.00%' };
  summarySheet['E19'] = { t: 'n', v: ((results.income || 0) / (results.revenue || 1)), z: '0.00%' };

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Offerings sheet
  const offeringsData = [
    ['Name', 'Price/Month', 'Sessions/Year', 'Hours/Session', 'Variable Cost/Session', 'Mix %', 'Current Clients', 'Annual Revenue', 'Clients Needed'],
  ];

  state.offerings.forEach((o) => {
    const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
    const clientsNeeded = state.mode === 'forecast' ? Math.ceil((o.sessionsPerYear * state.employees * state.productiveUtilizationPct / 100) / o.sessionsPerYear) : o.currentClients;
    offeringsData.push([
      o.name,
      o.priceMonthly,
      o.sessionsPerYear,
      o.hoursPerSession,
      o.variableCostPerSession,
      o.mixPct / 100,
      o.currentClients,
      annualRevenue,
      clientsNeeded
    ]);
  });

  const offeringsSheet = XLSX.utils.aoa_to_sheet(offeringsData);
  offeringsSheet['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
  ];

  // Format mix percentage column
  for (let i = 1; i < offeringsData.length; i++) {
    offeringsSheet[XLSX.utils.encode_cell({ r: i, c: 5 })].z = '0.00%';
  }

  XLSX.utils.book_append_sheet(workbook, offeringsSheet, 'Offerings');

  // Write file
  XLSX.writeFile(workbook, 'profitpath-export-' + (new Date().toISOString().split('T')[0]) + '.xlsx');

  // Track export event
  if (window.profitPathAnalytics) {
    window.profitPathAnalytics.trackExport('excel', 1);
  }

  // Show contextual feedback prompt
  if (window.feedbackUI) {
    window.feedbackUI.showContextualPrompt({
      action: 'Excel export completed',
      feature: 'exports'
    }, 2000);
  }
}

async function exportAsPDF() {
  // Lazy load PDF and canvas libraries
  if (!window.jspdf) {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    } catch (e) {
      console.error('Failed to load jsPDF library:', e);
      alert('Error: Could not load PDF export library. Please try again.');
      return;
    }
  }

  if (!window.html2canvas) {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    } catch (e) {
      console.error('Failed to load html2canvas library:', e);
      alert('Error: Could not load chart capture library. Please try again.');
      return;
    }
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let results;
  try {
    results = calc();
  } catch (e) {
    console.error('Calculation failed in exportAsPDF:', e);
    alert('Error: Could not generate PDF export due to calculation error. Please check your inputs.');
    return;
  }

  // Title
  doc.setFontSize(20);
  doc.text('ProfitPath Report', 20, 30);

  // Date
  doc.setFontSize(12);
  doc.text('Generated: ' + (new Date().toLocaleString()), 20, 45);

  // Summary section
  doc.setFontSize(16);
  doc.text('Summary', 20, 65);

  doc.setFontSize(11);
  let yPos = 80;
  const lineHeight = 7;

  doc.text('Mode: ' + (state.mode), 20, yPos);
  yPos += lineHeight;
  doc.text('Employees: ' + (state.employees), 20, yPos);
  yPos += lineHeight;
  doc.text('Employee Pay: ' + (fmtMoney0(state.employeePay)), 20, yPos);
  yPos += lineHeight;
  doc.text('Monthly Overhead: ' + (fmtMoney0(state.monthlyCosts)), 20, yPos);
  yPos += lineHeight;
  doc.text('Productive Utilization: ' + (fmtPct1(state.productiveUtilizationPct)), 20, yPos);
  yPos += lineHeight;
  doc.text('Target Utilization: ' + (fmtPct1(state.targetUtilizationPct)), 20, yPos);

  // Results section
  yPos += lineHeight * 2;
  doc.setFontSize(16);
  doc.text('Results', 20, yPos);
  yPos += lineHeight * 2;

  doc.setFontSize(11);
  doc.text('Total Revenue: ' + (fmtMoney0(results.revenue || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Total Variable Costs: ' + (fmtMoney0(results.variableCosts || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Contribution Margin: ' + (fmtMoney0(Math.max(0, (results.revenue || 0) - (results.variableCosts || 0)))), 20, yPos);
  yPos += lineHeight;
  doc.text('Fixed Overhead: ' + (fmtMoney0(results.annualFixedCosts || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Net Profit: ' + (fmtMoney0(results.income || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Profit Margin: ' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)), 20, yPos);
  yPos += lineHeight;
  doc.text('Billable Hours: ' + (fmtInt(results.serviceHours || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Utilization: ' + (fmtPct1(results.capacityPct || 0)), 20, yPos);

  // Try to capture charts if they exist
  try {
    const chartElements = document.querySelectorAll('.chart-container svg, #utilizationGauge svg, #profitWaterfall svg');
    if (chartElements.length > 0) {
      // Add new page for charts
      doc.addPage();

      doc.setFontSize(16);
      doc.text('Visualizations', 20, 30);

      let chartYPos = 50;
      for (let i = 0; i < Math.min(chartElements.length, 2); i++) {
        try {
          const canvas = await html2canvas(chartElements[i], {
            backgroundColor: '#ffffff',
            scale: 2
          });
          const imgData = canvas.toDataURL('image/png');

          // Calculate dimensions to fit on page
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (chartYPos + imgHeight > 270) {
            doc.addPage();
            chartYPos = 30;
          }

          doc.addImage(imgData, 'PNG', 20, chartYPos, imgWidth, imgHeight);
          chartYPos += imgHeight + 20;
        } catch (chartError) {
          console.warn('Could not capture chart:', chartError);
        }
      }
    }
  } catch (error) {
    console.warn('Could not add charts to PDF:', error);
  }

  // Add offerings table on new page if needed
  if (state.offerings.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Service Offerings', 20, 30);

    doc.setFontSize(10);
    let tableY = 45;

    // Table headers
    doc.text('Name', 20, tableY);
    doc.text('Price/Month', 80, tableY);
    doc.text('Sessions/Year', 110, tableY);
    doc.text('Hours/Session', 140, tableY);
    doc.text('Annual Revenue', 170, tableY);

    tableY += 8;
    doc.line(20, tableY, 190, tableY);

    // Table data
    state.offerings.forEach((o) => {
      tableY += 6;
      if (tableY > 270) {
        doc.addPage();
        tableY = 30;
      }

      const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
      doc.text(o.name.substring(0, 20), 20, tableY);
      doc.text(fmtMoney0(o.priceMonthly), 80, tableY);
      doc.text(o.sessionsPerYear.toString(), 110, tableY);
      doc.text(o.hoursPerSession.toString(), 140, tableY);
      doc.text(fmtMoney0(annualRevenue), 170, tableY);
    });
  }

  doc.save('profitpath-report-' + (new Date().toISOString().split('T')[0]) + '.pdf');

  // Track export event
  if (window.profitPathAnalytics) {
    window.profitPathAnalytics.trackExport('pdf', 1);
  }

  // Show contextual feedback prompt
  if (window.feedbackUI) {
    window.feedbackUI.showContextualPrompt({
      action: 'PDF export completed',
      feature: 'exports'
    }, 2000);
  }
}

function exportAsHTML() {
  let results;
  try {
    results = calc();
  } catch (e) {
    console.error('Calculation failed in exportAsHTML:', e);
    alert('Error: Could not generate HTML export due to calculation error. Please check your inputs.');
    return;
  }

  // Create simple HTML content
  const htmlContent = '<!DOCTYPE html><html><head><title>ProfitPath Report</title><style>body{font-family:sans-serif;margin:20px;}</style></head><body><h1>ProfitPath Report</h1><p>Generated: ' + new Date().toLocaleDateString() + '</p><h2>Results</h2><p>Revenue: ' + (fmtMoney0(results.revenue || 0)) + '</p><p>Profit: ' + (fmtMoney0(results.income || 0)) + '</p></body></html>';

  // Download the HTML file
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-report-' + new Date().toISOString().split('T')[0] + '.html');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Track export event
  if (window.profitPathAnalytics) {
    window.profitPathAnalytics.trackExport('html', 1);
  }

  // Show contextual feedback prompt
  if (window.feedbackUI) {
    window.feedbackUI.showContextualPrompt({
      action: 'HTML export completed',
      feature: 'exports'
    }, 2000);
  }
}

// Scenario Management
function getAllScenarios() {
  try {
    const saved = localStorage.getItem('profitpath_scenarios');
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

    // Track scenario save
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackScenarioAction('create', {
        scenarioName: name.trim(),
        totalScenarios: scenarios.length
      });
    }

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

    // Handle both old format (scenario.state) and new format (scenario.data)
    const scenarioData = scenario.state || scenario.data;
    if (!scenarioData) {
      console.error('Scenario data not found in expected format');
      return;
    }

    // Restore state from scenario
    state.mode = scenarioData.mode ?? state.mode;
    state.offerings = scenarioData.offerings ?? state.offerings;
    state.employees = scenarioData.employees ?? state.employees;
    state.employeePay = scenarioData.employeePay ?? state.employeePay;
    state.monthlyCosts = scenarioData.monthlyCosts ?? state.monthlyCosts;
    state.productiveUtilizationPct = scenarioData.productiveUtilizationPct ?? state.productiveUtilizationPct;
    state.targetUtilizationPct = scenarioData.targetUtilizationPct ?? state.targetUtilizationPct;
    state.lockMix = scenarioData.lockMix ?? state.lockMix;

    persistState(); // Save loaded scenario as current state
    render();
    closeScenarioModal();

    // Track scenario load
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackScenarioAction('load', {
        scenarioName: scenario.name,
        scenarioId: scenarioId
      });
    }
  } catch (e) {
    console.error('Failed to load scenario:', e);
    alert('Error loading scenario');
  }
}

// Prevent multiple simultaneous deletions
let isDeletingScenario = false;

function deleteScenario(scenarioId) {
  // Prevent re-entrant calls
  if (isDeletingScenario) return;
  isDeletingScenario = true;

  // Create custom confirmation dialog to avoid native confirm issues
  const modal = document.createElement('div');
  modal.innerHTML = '<div id="confirmModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;"><div style="background:white;padding:20px;border-radius:8px;max-width:400px;width:90%;text-align:center;"><p style="margin:0 0 20px 0;color:#374151;">Delete this scenario?</p><div style="display:flex;gap:10px;justify-content:center;"><button id="confirmYes" style="padding:8px 16px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;">Delete</button><button id="confirmNo" style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:4px;cursor:pointer;">Cancel</button></div></div></div>';

  document.body.appendChild(modal);

  function cleanup() {
    if (modal.parentNode) {
      document.body.removeChild(modal);
    }
    isDeletingScenario = false;
  }

  document.getElementById('confirmYes').onclick = () => {
    cleanup();

    try {
      // Get scenarios once and filter
      let scenarios = getAllScenarios();
      const initialLength = scenarios.length;
      scenarios = scenarios.filter((s) => s.id !== scenarioId);

      // Only update if we actually removed something
      if (scenarios.length < initialLength) {
        localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));

        // Track scenario deletion
        if (window.profitPathAnalytics) {
          window.profitPathAnalytics.trackScenarioAction('delete', {
            scenarioId: scenarioId,
            remainingScenarios: scenarios.length
          });
        }

        // Defer rendering to next tick to avoid blocking
        setTimeout(() => renderScenariosList(), 0);
      }
    } catch (e) {
      console.error('Failed to delete scenario:', e);
      alert('Error deleting scenario');
    }
  };

  document.getElementById('confirmNo').onclick = () => {
    cleanup();
  };
}

function renderScenariosList() {
  const list = $('#scenariosList');
  const scenarios = getAllScenarios();

  if (scenarios.length === 0) {
    list.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
    return;
  }

  // Use document fragment for better performance with many scenarios
  const fragment = document.createDocumentFragment();

  scenarios.forEach((s) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'scenario-item';

    itemDiv.innerHTML = '<div><div class="scenario-item-name">' + escapeHtml(s.name) + '</div><div class="scenario-item-meta">Saved ' + s.timestamp + '</div></div><div class="scenario-item-actions"><button class="btn small load-btn" data-scenario-id="' + escapeHtml(s.id) + '">Load</button><button class="btn small danger delete-btn" data-scenario-id="' + escapeHtml(s.id) + '">Delete</button></div>';

    fragment.appendChild(itemDiv);
  });

  list.innerHTML = '';
  list.appendChild(fragment);

  // Event listeners are attached via delegation in openScenarioModal
}

function openScenarioModal() {
  const modal = $('#scenariosModal');
  modal.classList.remove('hidden');

  // Set up event delegation for scenario buttons if not already done
  if (!modal._scenarioDelegationSet) {
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('.load-btn, .delete-btn');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const scenarioId = btn.dataset.scenarioId;
      if (!scenarioId) return;

      if (btn.classList.contains('load-btn')) {
        loadScenario(scenarioId);
      } else if (btn.classList.contains('delete-btn')) {
        deleteScenario(scenarioId);
      }
    });
    modal._scenarioDelegationSet = true;
  }

  $('#scenarioNameInput').focus();
  renderScenariosList();
}

function closeScenarioModal() {
  $('#scenariosModal').classList.add('hidden');
}

// Shareable URLs & Collaboration
function encodeScenarioToURL(state) {
  try {
    // Create a clean copy of the state for sharing (exclude internal properties)
    const shareableState = {
      mode: state.mode,
      offerings: state.offerings.map(o => ({
        name: o.name,
        priceMonthly: o.priceMonthly,
        sessionsPerYear: o.sessionsPerYear,
        hoursPerSession: o.hoursPerSession,
        variableCostPerSession: o.variableCostPerSession,
        mixPct: o.mixPct,
        currentClients: o.currentClients
      })),
      employees: state.employees,
      employeePay: state.employeePay,
      monthlyCosts: state.monthlyCosts,
      productiveUtilizationPct: state.productiveUtilizationPct,
      targetUtilizationPct: state.targetUtilizationPct,
      lockMix: state.lockMix
    };

    // Encode to base64 (URL-safe)
    const jsonString = JSON.stringify(shareableState);
    const encoded = btoa(encodeURIComponent(jsonString));

    // Create shareable URL
    const baseUrl = window.location.origin + window.location.pathname;
    return baseUrl + '#scenario=' + encoded;
  } catch (e) {
    console.error('Failed to encode scenario:', e);
    return null;
  }
}

function decodeScenarioFromURL() {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#scenario=')) return null;

    const encoded = hash.slice(10); // Remove '#scenario='
    const jsonString = decodeURIComponent(atob(encoded));
    const state = JSON.parse(jsonString);

    return state;
  } catch (e) {
    console.error('Failed to decode scenario from URL:', e);
    return null;
  }
}

function loadScenarioFromURL() {
  const urlState = decodeScenarioFromURL();
  if (!urlState) return false;

  try {
    // Validate and merge URL state with defaults
    state.mode = urlState.mode || state.mode;
    state.employees = urlState.employees || state.employees;
    state.employeePay = urlState.employeePay || state.employeePay;
    state.monthlyCosts = urlState.monthlyCosts || state.monthlyCosts;
    state.productiveUtilizationPct = urlState.productiveUtilizationPct || state.productiveUtilizationPct;
    state.targetUtilizationPct = urlState.targetUtilizationPct || state.targetUtilizationPct;
    state.lockMix = urlState.lockMix !== undefined ? urlState.lockMix : state.lockMix;

    // Handle offerings
    if (Array.isArray(urlState.offerings)) {
      state.offerings = urlState.offerings.map(o => ({
        id: uuid(),
        name: o.name || 'Offering',
        priceMonthly: o.priceMonthly || 0,
        sessionsPerYear: o.sessionsPerYear || 0,
        hoursPerSession: o.hoursPerSession || 0,
        variableCostPerSession: o.variableCostPerSession || 0,
        mixPct: o.mixPct || 0,
        currentClients: o.currentClients || 0
      }));

      // Ensure at least one offering
      if (state.offerings.length === 0) {
        state.offerings = [{
          id: uuid(),
          name: 'Sample Offering',
          priceMonthly: 1000,
          sessionsPerYear: 12,
          hoursPerSession: 2,
          variableCostPerSession: 0,
          mixPct: 100,
          currentClients: 0,
        }];
      }
    }

    persistState(); // Save URL scenario to localStorage
    return true;
  } catch (e) {
    console.error('Failed to load scenario from URL:', e);
    return false;
  }
}

function updateSocialMetaTags(scenarioData) {
  // Calculate key metrics for the meta description
  const revenue = scenarioData.mode === 'forecast' ?
    calc({ ...scenarioData, clients: scenarioData.offerings.reduce((sum, o) => sum + (o.currentClients || 0), 0) }).revenue :
    scenarioData.offerings.reduce((sum, o) => sum + (o.priceMonthly * (o.currentClients || 0)), 0);

  const description = 'Business Scenario: $' + revenue.toLocaleString() + ' / month revenue, ' + scenarioData.employees + ' employees, ' + scenarioData.offerings.length + ' services.';

  // Update meta tags
  updateMetaTag('description', description);
  updateMetaTag('og:description', description);
  updateMetaTag('twitter:description', description);
  updateMetaTag('og:title', 'ProfitPath — Business Scenario');
  updateMetaTag('twitter:title', 'ProfitPath — Business Scenario');

  // Update URL
  const shareUrl = encodeScenarioToURL(scenarioData);
  updateMetaTag('og:url', shareUrl);
  updateMetaTag('twitter:url', shareUrl);
}

function updateMetaTag(name, content) {
  const meta = document.querySelector('meta[name="' + name + '"]') || document.querySelector('meta[property="' + name + '"]');
  if (meta) {
    meta.setAttribute('content', content);
  }
}

// Embeddable widget functionality
function _initializeEmbeddableWidget() {
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbed = urlParams.get('embed') === 'true';

  if (isEmbed) {
    // Hide non-essential UI elements for embedded version
    const elementsToHide = [
      '.header-actions',
      '#hamburgerBtn',
      '.footer',
      '.mobile-menu-overlay'
    ];

    elementsToHide.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
      }
    });

    // Add embedded styling
    const style = document.createElement('style');
    style.textContent = 'body { margin: 0;padding: 0;} .container { max-width: none;padding: 0;} .header { margin-bottom: 0;padding: 10px;} .header h1 { font-size: 18px;margin: 0;} .card { margin: 10px 0;}';
    document.head.appendChild(style);

    // Adjust container for embedding
    const container = document.querySelector('.container');
    if (container) {
      container.style.maxWidth = '100%';
      container.style.padding = '0';
      container.style.margin = '0';
    }
  }
}

// Generate embed code for sharing
function generateEmbedCode() {
  const shareUrl = encodeScenarioToURL(state);
  const embedUrl = shareUrl + (shareUrl.includes('?') ? '&' : '?') + 'embed=true';

  const embedCode = '<iframe src="' + embedUrl + '" width="100%" height="600" frameborder="0" style="border:1px solid #e5e7eb;border-radius:8px;"></iframe><p><a href="' + shareUrl + '" target="_blank">View full calculator →</a></p>';

  return embedCode;
}

function showEmbedCode() {
  const embedCode = generateEmbedCode();

  // Copy to clipboard if available
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(embedCode).then(() => {
      alert('Embed code copied to clipboard!\n\nPaste this code into your website to embed the calculator.');
    }).catch(() => {
      // Fallback: show the code
      showEmbedDialog(embedCode);
    });
  } else {
    // Fallback: show the code
    showEmbedDialog(embedCode);
  }
}

function showEmbedDialog(embedCode) {
  const dialog = document.createElement('div');
  dialog.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.5);display: flex;align-items: center;justify-content: center;z-index: 10000;';

  dialog.innerHTML = '<div style="background:white;padding:20px;border-radius:8px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;"><h3 style="margin-top:0;">Embed Calculator Widget</h3><p>Copy this code to embed the calculator on your website:</p><textarea style="width:100%;height:150px;font-family:monospace;font-size:12px;" readonly>' + embedCode + '</textarea><div style="margin-top:15px;text-align:right;"><button class="embed-close-btn" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button></div></div>';

  document.body.appendChild(dialog);

  // Add event listener for close button
  setTimeout(() => {
    const closeBtn = dialog.querySelector('.embed-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.remove());
    }
  }, 10);
}

function shareScenario() {
  const shareUrl = encodeScenarioToURL(state);
  if (!shareUrl) {
    alert('Failed to create shareable URL. Please try again.');
    return;
  }

  // Update social media meta tags with scenario data
  updateSocialMetaTags(state);

  // Copy to clipboard if available
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Shareable URL copied to clipboard!\n\nYou can now share this link with stakeholders.\n\nSocial media previews will show scenario details.');
    }).catch(() => {
      // Fallback: show the URL
      prompt('Copy this shareable URL:', shareUrl);
    });
  } else {
    // Fallback for older browsers
    prompt('Copy this shareable URL:', shareUrl);
  }
}

// Mobile menu functions
function toggleMobileMenu() {
  const overlay = $('#mobileMenuOverlay');
  const hamburger = $('#hamburgerBtn');

  if (overlay && hamburger) {
    const isActive = overlay.classList.contains('active');
    if (isActive) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }
}

function openMobileMenu() {
  const overlay = $('#mobileMenuOverlay');
  const hamburger = $('#hamburgerBtn');

  if (overlay && hamburger) {
    overlay.classList.add('active');
    hamburger.classList.add('active');
  }
}

function closeMobileMenu() {
  const overlay = $('#mobileMenuOverlay');
  const hamburger = $('#hamburgerBtn');

  if (overlay && hamburger) {
    overlay.classList.remove('active');
    hamburger.classList.remove('active');

    // Auto-collapse all submenus when closing menu
    const exportOptions = $('#mobileExportOptions');
    const templatesOptions = $('#mobileTemplatesOptions');
    const settingsSection = document.querySelector('.mobile-menu .settings-section');
    if (exportOptions) exportOptions.style.display = 'none';
    if (templatesOptions) templatesOptions.style.display = 'none';
    if (settingsSection) {
      settingsSection.style.display = 'none';
      // Clean up event listeners
      if (settingsSection._cleanupSettingsListener) {
        settingsSection._cleanupSettingsListener();
        delete settingsSection._cleanupSettingsListener;
      }
    }
  }
}

// ============================================================================
// INDUSTRY TEMPLATES SYSTEM
// ============================================================================

// Industry-specific templates for common business types
const INDUSTRY_TEMPLATES = {
  consulting: {
    name: 'Management Consulting',
    description: 'Professional consulting services template',
    config: {
      mode: 'forecast',
      employees: 2,
      employeePay: 85000,
      monthlyCosts: 3000,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80,
      offerings: [{
        id: 'strategy-consulting',
        name: 'Strategy Consulting',
        priceMonthly: 5000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 200,
        mixPct: 60,
        currentClients: 0
      }, {
        id: 'operational-consulting',
        name: 'Operational Consulting',
        priceMonthly: 3500,
        sessionsPerYear: 12,
        hoursPerSession: 6,
        variableCostPerSession: 150,
        mixPct: 40,
        currentClients: 0
      }]
    }
  },

  cleaning: {
    name: 'Cleaning Services',
    description: 'House and office cleaning services template',
    config: {
      mode: 'forecast',
      employees: 3,
      employeePay: 35000,
      monthlyCosts: 1500,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 90,
      offerings: [{
        id: 'residential-cleaning',
        name: 'Residential Cleaning',
        priceMonthly: 180,
        sessionsPerYear: 52,
        hoursPerSession: 2,
        variableCostPerSession: 15,
        mixPct: 70,
        currentClients: 0
      }, {
        id: 'office-cleaning',
        name: 'Office Cleaning',
        priceMonthly: 800,
        sessionsPerYear: 52,
        hoursPerSession: 4,
        variableCostPerSession: 60,
        mixPct: 30,
        currentClients: 0
      }]
    }
  },

  landscaping: {
    name: 'Landscaping Services',
    description: 'Lawn care and landscaping services template',
    config: {
      mode: 'forecast',
      employees: 4,
      employeePay: 45000,
      monthlyCosts: 2500,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'lawn-maintenance',
        name: 'Lawn Maintenance',
        priceMonthly: 120,
        sessionsPerYear: 26,
        hoursPerSession: 1.5,
        variableCostPerSession: 20,
        mixPct: 60,
        currentClients: 0
      }, {
        id: 'full-landscaping',
        name: 'Full Landscaping',
        priceMonthly: 800,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 120,
        mixPct: 40,
        currentClients: 0
      }]
    }
  },

  handyman: {
    name: 'Handyman Services',
    description: 'Home repair and maintenance services template',
    config: {
      mode: 'forecast',
      employees: 2,
      employeePay: 55000,
      monthlyCosts: 1800,
      productiveUtilizationPct: 78,
      targetUtilizationPct: 82,
      offerings: [{
        id: 'minor-repairs',
        name: 'Minor Repairs',
        priceMonthly: 150,
        sessionsPerYear: 24,
        hoursPerSession: 2,
        variableCostPerSession: 30,
        mixPct: 50,
        currentClients: 0
      }, {
        id: 'major-projects',
        name: 'Major Projects',
        priceMonthly: 1200,
        sessionsPerYear: 12,
        hoursPerSession: 6,
        variableCostPerSession: 200,
        mixPct: 50,
        currentClients: 0
      }]
    }
  },

  fitness: {
    name: 'Fitness Training',
    description: 'Personal training and fitness services template',
    config: {
      mode: 'forecast',
      employees: 1,
      employeePay: 40000,
      monthlyCosts: 800,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 90,
      offerings: [{
        id: 'personal-training',
        name: 'Personal Training',
        priceMonthly: 80,
        sessionsPerYear: 48,
        hoursPerSession: 1,
        variableCostPerSession: 5,
        mixPct: 70,
        currentClients: 0
      }, {
        id: 'group-classes',
        name: 'Group Classes',
        priceMonthly: 40,
        sessionsPerYear: 48,
        hoursPerSession: 1,
        variableCostPerSession: 3,
        mixPct: 30,
        currentClients: 0
      }]
    }
  },

  photography: {
    name: 'Photography Services',
    description: 'Photography and media services template',
    config: {
      mode: 'forecast',
      employees: 1,
      employeePay: 45000,
      monthlyCosts: 1200,
      productiveUtilizationPct: 70,
      targetUtilizationPct: 75,
      offerings: [{
        id: 'wedding-photography',
        name: 'Wedding Photography',
        priceMonthly: 2500,
        sessionsPerYear: 8,
        hoursPerSession: 12,
        variableCostPerSession: 150,
        mixPct: 50,
        currentClients: 0
      }, {
        id: 'portrait-sessions',
        name: 'Portrait Sessions',
        priceMonthly: 300,
        sessionsPerYear: 24,
        hoursPerSession: 2,
        variableCostPerSession: 25,
        mixPct: 30,
        currentClients: 0
      }, {
        id: 'commercial-work',
        name: 'Commercial Work',
        priceMonthly: 800,
        sessionsPerYear: 12,
        hoursPerSession: 4,
        variableCostPerSession: 50,
        mixPct: 20,
        currentClients: 0
      }]
    }
  }
};

// Load an industry template
function loadIndustryTemplate(templateKey) {
  const template = INDUSTRY_TEMPLATES[templateKey];
  if (!template) {
    alert('Template not found');
    return;
  }

  if (!confirm('Load ' + template.name + ' template ? This will replace your current configuration.')) {
    return;
  }

  try {
    // Load the template configuration
    Object.assign(state, template.config);
    validateAndSanitizeLoadedState();

    // Update the UI
    render();

    // Show success message
    alert('✅ Loaded ' + template.name + ' template!\n\nThis provides typical pricing and configuration for ' + template.description.toLowerCase() + '. Adjust the values as needed for your specific business.');
  } catch (e) {
    console.error('Error loading template:', e);
    alert('Error loading template. Please try again.');
  }
}

// ============================================================================
// TEST SCENARIOS SYSTEM
// ============================================================================

// Comprehensive test scenarios covering various UI states and edge cases
const TEST_SCENARIOS = {
  'default': {
    name: 'Default Consulting Setup',
    description: 'Standard consulting setup for testing',
    data: {
      mode: 'forecast',
      employees: 1,
      employeePay: 60000,
      monthlyCosts: 2000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'test-consulting',
        name: 'Consulting Service',
        priceMonthly: 2500,
        sessionsPerYear: 12,
        hoursPerSession: 4,
        variableCostPerSession: 100,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'high-profit': {
    name: 'High Profit Scenario',
    description: 'Very profitable setup with high margins',
    data: {
      mode: 'forecast',
      employees: 2,
      employeePay: 80000,
      monthlyCosts: 5000,
      productiveUtilizationPct: 90,
      targetUtilizationPct: 95,
      offerings: [{
        id: 'premium-service',
        name: 'Premium Consulting',
        priceMonthly: 15000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 500,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'loss-making': {
    name: 'Loss Making Scenario',
    description: 'Operating at a loss-needs price adjustment',
    data: {
      mode: 'forecast',
      employees: 4,
      employeePay: 90000,
      monthlyCosts: 15000,
      productiveUtilizationPct: 70,
      targetUtilizationPct: 75,
      offerings: [{
        id: 'unprofitable-service',
        name: 'Underpriced Service',
        priceMonthly: 800,
        sessionsPerYear: 12,
        hoursPerSession: 3,
        variableCostPerSession: 400,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'multi-service': {
    name: 'Multi-Service Business',
    description: 'Business with multiple service offerings',
    data: {
      mode: 'forecast',
      employees: 3,
      employeePay: 70000,
      monthlyCosts: 8000,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 90,
      offerings: [{
        id: 'basic-service',
        name: 'Basic Service',
        priceMonthly: 1200,
        sessionsPerYear: 12,
        hoursPerSession: 2,
        variableCostPerSession: 50,
        mixPct: 40,
        currentClients: 0
      }, {
        id: 'premium-service',
        name: 'Premium Service',
        priceMonthly: 5000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 200,
        mixPct: 35,
        currentClients: 0
      }, {
        id: 'enterprise-service',
        name: 'Enterprise Service',
        priceMonthly: 15000,
        sessionsPerYear: 6,
        hoursPerSession: 20,
        variableCostPerSession: 1000,
        mixPct: 25,
        currentClients: 0
      }]
    }
  },

  'over-capacity': {
    name: 'Over Capacity Scenario',
    description: 'Business operating above target utilization',
    data: {
      mode: 'forecast',
      employees: 2,
      employeePay: 75000,
      monthlyCosts: 6000,
      productiveUtilizationPct: 95,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'popular-service',
        name: 'Popular Service',
        priceMonthly: 3000,
        sessionsPerYear: 24,
        hoursPerSession: 3,
        variableCostPerSession: 150,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'under-capacity': {
    name: 'Under Capacity Scenario',
    description: 'Business with low utilization-opportunity for growth',
    data: {
      mode: 'forecast',
      employees: 4,
      employeePay: 65000,
      monthlyCosts: 10000,
      productiveUtilizationPct: 45,
      targetUtilizationPct: 80,
      offerings: [{
        id: 'niche-service',
        name: 'Niche Service',
        priceMonthly: 8000,
        sessionsPerYear: 8,
        hoursPerSession: 6,
        variableCostPerSession: 300,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'current-mode': {
    name: 'Current Mode Business',
    description: 'Business with existing clients (current mode)',
    data: {
      mode: 'current',
      employees: 2,
      employeePay: 70000,
      monthlyCosts: 4000,
      productiveUtilizationPct: 78,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'managed-service',
        name: 'Managed Service',
        priceMonthly: 2500,
        sessionsPerYear: 12,
        hoursPerSession: 4,
        variableCostPerSession: 100,
        mixPct: 0, // Not used in current mode
        currentClients: 8
      }]
    }
  },

  'zero-values': {
    name: 'Zero Values Edge Case',
    description: 'Edge case with zero values to test boundary conditions',
    data: {
      mode: 'forecast',
      employees: 1,
      employeePay: 0,
      monthlyCosts: 0,
      productiveUtilizationPct: 0,
      targetUtilizationPct: 100,
      offerings: [{
        id: 'free-service',
        name: 'Free Service',
        priceMonthly: 0,
        sessionsPerYear: 1,
        hoursPerSession: 0.1,
        variableCostPerSession: 0,
        mixPct: 100,
        currentClients: 0
      }]
    }
  },

  'break-even-test': {
    name: 'Break-Even Analysis Test',
    description: 'Scenario designed to test break-even calculations',
    data: {
      mode: 'forecast',
      employees: 1,
      employeePay: 50000,
      monthlyCosts: 2000,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85,
      offerings: [{
        id: 'break-even-service',
        name: 'Break-Even Service',
        priceMonthly: 2500,
        sessionsPerYear: 12,
        hoursPerYear: 4,
        variableCostPerSession: 200,
        mixPct: 100,
        currentClients: 0
      }]
    }
  }
};

// Load test scenarios into localStorage (only if test flag is present), or clear them if not present
function loadTestScenarios() {
  const urlParams = new URLSearchParams(window.location.search);

  if (!urlParams.has('loadTestScenarios')) {
    // Clear test scenarios if the flag is not present
    try {
      const existingScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const nonTestScenarios = existingScenarios.filter(s => !s.name?.startsWith('[TEST]'));
      localStorage.setItem('profitpath-scenarios', JSON.stringify(nonTestScenarios));
    } catch (e) {
      // Ignore localStorage errors
    }
    return false; // Flag not present, scenarios cleared
  }

  try {
    const scenarios = Object.entries(TEST_SCENARIOS).map(([key, scenario]) => ({
      id: 'test-' + key + '-' + Date.now(),
      name: '[TEST] ' + scenario.name,
      timestamp: Date.now() + Object.keys(TEST_SCENARIOS).indexOf(key) * 1000,
      data: scenario.data
    }));

    // Get existing scenarios
    let existingScenarios = [];
    try {
      const saved = localStorage.getItem('profitpath-scenarios');
      if (saved) {
        existingScenarios = JSON.parse(saved);
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Add test scenarios (avoid duplicates)
    const allScenarios = [...existingScenarios];
    scenarios.forEach(testScenario => {
      const exists = allScenarios.some(s => s.name === testScenario.name);
      if (!exists) {
        allScenarios.push(testScenario);
      }
    });

    // Save back to localStorage
    localStorage.setItem('profitpath-scenarios', JSON.stringify(allScenarios));

    // Remove the flag from URL and show success
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);

    // Show notification
    setTimeout(() => {
      alert('Loaded ' + scenarios.length + ' test scenarios!\n\nCheck the Scenarios menu for [TEST] scenarios.');
    }, 100);

    return scenarios.length;
  } catch (error) {
    console.error('Error loading test scenarios:', error);
    return 0;
  }
}

// Load specific test scenario by key
function loadSpecificTestScenario(key) {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('testScenario') || urlParams.get('testScenario') !== key) {
    return false;
  }

  const scenario = TEST_SCENARIOS[key];
  if (!scenario) {
    console.error('Test scenario not found:', key);
    return false;
  }

  try {
    // Load the scenario data
    Object.assign(state, scenario.data);
    validateAndSanitizeLoadedState();

    // Remove the flag from URL
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);

    return true;
  } catch (error) {
    console.error('Error loading test scenario:', error);
    return false;
  }
}

function wire(skipLocalStorageLoading = false) {
  // Load persisted state from localStorage if available (unless we loaded from URL)
  if (!skipLocalStorageLoading) {
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

  // Templates dropdown functionality
  const templatesBtn = $('#templatesBtn');
  if (templatesBtn) {
    templatesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const dropdown = templatesBtn.closest('.templates-dropdown');
      const menu = $('#templatesMenu');
      if (!dropdown || !menu) return;

      // If this menu is already active, just close it
      if (menu.style.display === 'block') {
        menu.style.display = 'none';
      } else {
        // Close other dropdowns and open this one
        closeAllDropdowns();
        menu.style.display = 'block';
      }
    });
  }

  // Function to refresh desktop settings dropdown with current values
  function refreshDesktopSettings() {
    try {
      const settings = loadSettings ? loadSettings() : {};

      // Update experience level radios
      const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
      experienceRadios.forEach(radio => {
        radio.checked = radio.value === settings.experienceLevel;
      });

      // Update feature checkboxes
      const checkboxes = document.querySelectorAll('#settingsMenu input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        const settingKey = checkbox.id;
        checkbox.checked = settings[settingKey];
      });
    } catch (error) {
      console.warn('Error refreshing desktop settings:', error);
    }
  }

  // Global settings change listener-refresh desktop settings when any setting changes
  window.addEventListener('settingsChanged', () => {
    setTimeout(refreshDesktopSettings, 10); // Small delay to ensure settings are saved
  });

  // Initialize desktop settings on page load
  setTimeout(refreshDesktopSettings, 100);

  // Desktop Settings Cog Button
  const settingsCogBtn = $('#settingsCogBtn');
  if (settingsCogBtn) {
    settingsCogBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const dropdown = document.querySelector('.settings-dropdown');
      if (!dropdown) {
        console.error('Settings dropdown not found');
        return;
      }
      // If this dropdown is already active, just close it
      if (dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
      } else {
        // Close other dropdowns and open this one
        closeAllDropdowns();
        // Refresh settings values before showing
        refreshDesktopSettings();

        // Position the menu directly under the cog button
        const menu = dropdown.querySelector('.settings-menu');
        if (menu) {
          const buttonRect = settingsCogBtn.getBoundingClientRect();
          const menuWidth = 320; // max-width from CSS
          const viewportWidth = window.innerWidth;

          menu.style.position = 'fixed';
          menu.style.top = (buttonRect.bottom + 4) + 'px';

          // Calculate left position, ensuring menu stays on screen
          let leftPos = buttonRect.left + buttonRect.width / 2;
          const menuHalfWidth = menuWidth / 2;

          // If centering would put menu off left edge
          if (leftPos - menuHalfWidth < 10) {
            leftPos = menuHalfWidth + 10;
          }
          // If centering would put menu off right edge
          else if (leftPos + menuHalfWidth > viewportWidth - 10) {
            leftPos = viewportWidth - menuHalfWidth - 10;
          }

          menu.style.left = leftPos + 'px';
          menu.style.transform = 'translateX(-50%)';
          menu.style.right = 'auto';
        }

        dropdown.classList.add('active');
      }
    });
  }


  // Helper function to close all dropdowns
  function closeAllDropdowns() {
    // Close all types of dropdowns
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
    // Also close templates and export menus
    const templatesMenu = $('#templatesMenu');
    if (templatesMenu) {
      templatesMenu.style.display = 'none';
    }
    const exportMenu = $('#exportMenu');
    if (exportMenu) {
      exportMenu.style.display = 'none';
    }
  }

  // Settings management
  function initializeSettings() {
    const settings = loadSettings();

    // Set experience level radio buttons
    const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
    experienceRadios.forEach(radio => {
      radio.checked = radio.value === settings.experienceLevel;
      radio.addEventListener('change', (e) => {
        setExperienceLevel(e.target.value);
        initializeSettings(); // Reinitialize to apply new settings
        updateUIForSettings();
      });
    });

    // Set feature toggles
    const checkboxes = [
      'showAdvancedCalculations',
      'showDetailedBreakdown',
      'showComparisonTools',
      'showExportOptions',
      'showDebugPanel',
      'compactMode',
      'showTooltips'
    ];

    checkboxes.forEach(key => {
      const checkbox = $('#' + key);
      if (checkbox) {
        checkbox.checked = settings[key];
        checkbox.addEventListener('change', (e) => {
          updateSetting(key, e.target.checked);
          updateUIForSettings();
        });
      }
    });
  }

  function updateUIForSettings() {
    const settings = loadSettings();

    // Show/hide elements based on feature gates
    const elementsToToggle = [
      { selector: '.advanced-calculations', setting: 'showAdvancedCalculations' },
      { selector: '.detailed-breakdown', setting: 'showDetailedBreakdown' },
      { selector: '.comparison-tools', setting: 'showComparisonTools' },
      { selector: '.export-options', setting: 'showExportOptions' },
      { selector: '.debug-panel', setting: 'showDebugPanel' }
    ];

    elementsToToggle.forEach(({ selector, setting }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = settings[setting] ? 'block' : 'none';
      });
    });

    // Apply compact mode
    document.body.classList.toggle('compact-mode', settings.compactMode);

    // Update tooltips visibility
    // This would require additional implementation
  }

  // Initialize settings on app load
  initializeSettings();
  updateUIForSettings();

  // Template selection handlers
  document.querySelectorAll('.template-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const template = e.target.dataset.template;
      const menu = $('#templatesMenu');
      if (menu) menu.style.display = 'none';

      // Track template usage
      if (window.profitPathAnalytics) {
        window.profitPathAnalytics.trackTemplateUsage(template, e.target.textContent.trim());
      }

      loadIndustryTemplate(template);
    });
  });

  // Export dropdown functionality
  const exportBtn = $('#exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const dropdown = exportBtn.closest('.export-dropdown');
      const menu = $('#exportMenu');
      if (!dropdown || !menu) return;

      // If this menu is already active, just close it
      if (menu.style.display === 'block') {
        menu.style.display = 'none';
      } else {
        // Close other dropdowns and open this one
        closeAllDropdowns();
        menu.style.display = 'block';
      }
    });
  }

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    // Close templates dropdown and menu
    if (!e.target.closest('.templates-dropdown')) {
      document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
      const templatesMenu = $('#templatesMenu');
      if (templatesMenu) {
        templatesMenu.style.display = 'none';
      }
    }

    // Close export dropdown and menu
    if (!e.target.closest('.export-dropdown')) {
      document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
      const exportMenu = $('#exportMenu');
      if (exportMenu) {
        exportMenu.style.display = 'none';
      }
    }

    // Close settings dropdown
    if (!e.target.closest('.settings-dropdown') && !e.target.closest('#settingsCogBtn')) {
      document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
    }
  });

  // Export format handlers
  document.querySelectorAll('.export-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const format = e.target.dataset.format;
      const menu = $('#exportMenu');
      if (menu) menu.style.display = 'none';

      switch (format) {
        case 'csv':
          exportAsCSV();
          break;
        case 'excel':
          exportAsExcel();
          break;
        case 'pdf':
          exportAsPDF();
          break;
        case 'html':
          exportAsHTML();
          break;
        case 'email':
          shareViaEmail();
          break;
        case 'embed':
          showEmbedCode();
          break;
        case 'schedule':
          showScheduleDialog();
          break;
      }
    });
  });
  $('#shareBtn').addEventListener('click', shareScenario);

  // Hamburger menu
  const hamburgerBtn = $('#hamburgerBtn');
  const mobileMenuOverlay = $('#mobileMenuOverlay');
  const mobileMenuClose = $('#mobileMenuClose');
  const mobileExportBtn = $('#mobileExportBtn');
  const _mobileShareBtn = $('#mobileShareBtn');
  const _mobileScenariosBtn = $('#mobileScenariosBtn');

  // Attach mobile settings handler when menu opens
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (mobileMenuOverlay.classList.contains('active')) {
          // Menu opened, attach settings handler
          setTimeout(() => {
            // Mobile Tour Button
            const mobileTourBtn = $('#mobileTourBtn');
            if (mobileTourBtn && !mobileTourBtn._handlerAttached) {
              mobileTourBtn._handlerAttached = true;
              mobileTourBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startGuidedTour();
                // Close mobile menu after starting tour
                setTimeout(() => {
                  const overlay = $('#mobileMenuOverlay');
                  const hamburger = $('#hamburgerBtn');
                  if (overlay && hamburger) {
                    overlay.classList.remove('active');
                    hamburger.classList.remove('active');
                  }
                }, 100);
              });
            }

            const mobileSettingsBtn = $('#mobileSettingsBtn');
            if (mobileSettingsBtn && !mobileSettingsBtn._settingsHandlerAttached) {
              mobileSettingsBtn._settingsHandlerAttached = true;
              mobileSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Toggle inline settings section
                const existingSettings = document.querySelector('.mobile-menu .settings-section');
                if (existingSettings) {
                  existingSettings.style.display = existingSettings.style.display === 'none' ? 'block' : 'none';
                } else {
                  const settingsSection = document.createElement('div');
                  settingsSection.className = 'settings-section';
                  settingsSection.style.cssText = 'margin-top: 12px;padding: 12px;background: rgba(255, 255, 255, 0.05);border-radius: 8px;border: 1px solid rgba(255, 255, 255, 0.1);';
                  settingsSection.innerHTML = '<div style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--text);">Experience Level</div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;"><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="beginner" style="accent-color:#007bff;">Beginner</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="intermediate" style="accent-color:#007bff;">Intermediate</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="advanced" style="accent-color:#007bff;">Advanced</label></div><div style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--text);">Advanced Features</div><div style="display:flex;flex-direction:column;gap:6px;"><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileShowAdvancedCalculations" style="accent-color:#007bff;">Advanced calculations</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileShowDetailedBreakdown" style="accent-color:#007bff;">Detailed breakdowns</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileShowComparisonTools" style="accent-color:#007bff;">Scenario comparison</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileShowExportOptions" style="accent-color:#007bff;">Export options</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileShowDebugPanel" style="accent-color:#007bff;">Debug panel</label></div>';

                  mobileSettingsBtn.parentNode.insertBefore(settingsSection, mobileSettingsBtn.nextSibling);

                  // Function to refresh mobile checkboxes after settings change
                  const refreshMobileCheckboxes = () => {
                    const currentSettings = loadSettings ? loadSettings() : {};
                    const mobileCheckboxes = settingsSection.querySelectorAll('input[type="checkbox"]');
                    mobileCheckboxes.forEach(checkbox => {
                      const settingKey = checkbox.id.replace('mobile', '').replace(/^\w/, c => c.toLowerCase());
                      checkbox.checked = currentSettings[settingKey];
                    });
                    // Also refresh experience level radios
                    const mobileRadios = settingsSection.querySelectorAll('input[name="mobileExperienceLevel"]');
                    mobileRadios.forEach(radio => {
                      radio.checked = radio.value === currentSettings.experienceLevel;
                    });
                  };

                  // Listen for global settings changes to keep mobile UI in sync
                  const handleSettingsChange = () => refreshMobileCheckboxes();
                  window.addEventListener('settingsChanged', handleSettingsChange);

                  // Store cleanup function for when menu closes
                  settingsSection._cleanupSettingsListener = () => {
                    window.removeEventListener('settingsChanged', handleSettingsChange);
                  };

                  // Initialize with current settings
                  const settings = loadSettings ? loadSettings() : {};
                  const experienceRadios = settingsSection.querySelectorAll('input[name="mobileExperienceLevel"]');
                  experienceRadios.forEach(radio => {
                    radio.checked = radio.value === settings.experienceLevel;
                    radio.addEventListener('change', (e) => {
                      if (setExperienceLevel) setExperienceLevel(e.target.value);
                      if (updateUIForSettings) updateUIForSettings();
                      // Refresh mobile checkboxes to reflect new feature gates
                      setTimeout(refreshMobileCheckboxes, 10);
                      // Desktop settings will be refreshed automatically via settingsChanged event
                    });
                  });

                  const checkboxes = settingsSection.querySelectorAll('input[type="checkbox"]');
                  checkboxes.forEach(checkbox => {
                    const settingKey = checkbox.id.replace('mobile', '').replace(/^\w/, c => c.toLowerCase());
                    checkbox.checked = settings[settingKey];
                    checkbox.addEventListener('change', (e) => {
                      if (updateSetting) updateSetting(settingKey, e.target.checked);
                      if (updateUIForSettings) updateUIForSettings();
                      // Desktop settings will be refreshed automatically via settingsChanged event
                    });
                  });
                }
              });
            }
          }, 100);
        }
      }
    });
  });
  observer.observe(mobileMenuOverlay, { attributes: true, attributeFilter: ['class'] });

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleMobileMenu);
  }

  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', (e) => {
      if (e.target === mobileMenuOverlay) {
        closeMobileMenu();
      }
    });
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileMenu);
  }

  // Function to close all mobile submenus
  const _closeAllMobileSubmenus = () => {
    const submenuIds = ['mobileExportOptions', 'mobileTemplatesOptions'];
    submenuIds.forEach(id => {
      // Prefer getElementById for id strings, fall back to querySelector
      const submenu = document.getElementById(id) || document.querySelector('#' + id) || document.querySelector('.' + id);
      if (submenu) submenu.style.display = 'none';
    });

    // Also collapse any inline settings section inserted into the mobile menu
    const settingsSection = document.querySelector('.mobile-menu .settings-section');
    if (settingsSection) settingsSection.style.display = 'none';
  };

  if (mobileExportBtn) {
    setTimeout(() => {
      // This is a temporary fix for the syntax error
    }, 100);
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleMobileMenu);
  }
}

const mobileExportCsv = $('#mobileExportCsv');
const mobileExportExcel = $('#mobileExportExcel');
const mobileExportPdf = $('#mobileExportPdf');
const mobileExportHtml = $('#mobileExportHtml');
const mobileExportEmail = $('#mobileExportEmail');

if (mobileExportCsv) {
  mobileExportCsv.addEventListener('click', () => {
    exportAsCSV();
    closeMobileMenu();
  });
}

if (mobileExportExcel) {
  mobileExportExcel.addEventListener('click', () => {
    exportAsExcel();
    closeMobileMenu();
  });
}

if (mobileExportPdf) {
  mobileExportPdf.addEventListener('click', () => {
    exportAsPDF();
    closeMobileMenu();
  });
}

if (mobileExportHtml) {
  mobileExportHtml.addEventListener('click', () => {
    exportAsHTML();
    closeMobileMenu();
  });
}

if (mobileExportEmail) {
  mobileExportEmail.addEventListener('click', () => {
    shareViaEmail();
    closeMobileMenu();
  });
}

const mobileExportEmbed = $('#mobileExportEmbed');
if (mobileExportEmbed) {
  mobileExportEmbed.addEventListener('click', () => {
    showEmbedCode();
    closeMobileMenu();
  });
}

const mobileShareBtn = $('#mobileShareBtn');

if (mobileShareBtn) {
  mobileShareBtn.addEventListener('click', () => {
    shareScenario();
    closeMobileMenu();
  });
}

const mobileTemplatesBtn = $('#mobileTemplatesBtn');
if (mobileTemplatesBtn) {
  mobileTemplatesBtn.addEventListener('click', () => {
    const options = $('#mobileTemplatesOptions');
    if (options) {
      _closeAllMobileSubmenus();
      options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
    }
  });
}

// Close any open mobile submenus
function _closeAllMobileSubmenus() {
  try {
    document.querySelectorAll('.mobile-submenu').forEach(el => {
      if (el && el.style) el.style.display = 'none';
    });
    // Also hide known submenu containers
    const containers = ['#mobileTemplatesOptions', '#mobileExportOptions', '#mobileShareOptions'];
    containers.forEach(sel => {
      const c = document.querySelector(sel);
      if (c && c.style) c.style.display = 'none';
    });
  } catch (e) {
    // Fail silently in environments without DOM
  }
}

document.querySelectorAll('.mobile-templates-options .mobile-submenu-btn').forEach(option => {
  option.addEventListener('click', (e) => {
    e.preventDefault();
    const template = e.target.dataset.template;
    const menu = $('#mobileTemplatesOptions');
    if (menu) menu.style.display = 'none';

    // Track template usage
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackTemplateUsage(template, e.target.textContent.trim());
    }

    loadIndustryTemplate(template);
    closeMobileMenu(); // Close mobile menu after loading template
  });
});

const mobileScenariosBtn = $('#mobileScenariosBtn');

if (mobileScenariosBtn) {
  mobileScenariosBtn.addEventListener('click', () => {
    openScenarioModal();
    closeMobileMenu();
  });
}

const mobileAnalyticsBtn = $('#mobileAnalyticsBtn');
if (mobileAnalyticsBtn) {
  mobileAnalyticsBtn.addEventListener('click', () => {
    // More robust check for analytics UI
    const checkAnalyticsUI = () => {
      if (window.profitPathAnalyticsUI) {
        // Check if method exists on instance or prototype
        if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
          window.profitPathAnalyticsUI.showAnalyticsDashboard();
        } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
          // Call via prototype if instance method not available
          window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
        } else {
          console.warn('Mobile Analytics UI method not available, retrying...');
          setTimeout(checkAnalyticsUI, 100);
        }
      } else {
        console.warn('Mobile Analytics UI not loaded yet');
        setTimeout(checkAnalyticsUI, 100);
      }
    };
    checkAnalyticsUI();
    closeMobileMenu();
  });
}

const mobileFeedbackBtn = $('#mobileFeedbackBtn');
if (mobileFeedbackBtn) {
  mobileFeedbackBtn.addEventListener('click', () => {
    // More robust check for feedback UI
    const checkFeedbackUI = () => {
      if (window.feedbackUI) {
        // Check if method exists on instance or prototype
        if (typeof window.feedbackUI.openFeedbackModal === 'function') {
          window.feedbackUI.openFeedbackModal();
        } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
          // Call via prototype if instance method not available
          window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
        } else {
          console.warn('Mobile Feedback UI method not available, retrying...');
          setTimeout(checkFeedbackUI, 100);
        }
      } else {
        console.warn('Mobile Feedback UI not loaded yet');
        setTimeout(checkFeedbackUI, 100);
      }
    };
    checkFeedbackUI();
    closeMobileMenu();
  });
}

const mobileHelpBtn = $('#mobileHelpBtn');
if (mobileHelpBtn) {
  mobileHelpBtn.addEventListener('click', () => {
    // Call the same help menu function as desktop
    if (typeof showHelpMenu === 'function') {
      showHelpMenu();
    } else {
      console.warn('showHelpMenu function not available');
    }
    closeMobileMenu();
  });
}

const mobileSettingsBtn = $('#mobileSettingsBtn');
if (mobileSettingsBtn) {
  mobileSettingsBtn.addEventListener('click', () => {
    const settingsCogBtn = $('#settingsCogBtn');
    if (settingsCogBtn) {
      settingsCogBtn.click();
    }
    closeMobileMenu();
  });
}

$('#offeringsBody').addEventListener('input', onTableInput);
$('#offeringsBody').addEventListener('click', onTableClick);

// Save state when table content changes
$('#offeringsBody').addEventListener('input', persistState);
$('#offeringsBody').addEventListener('click', () => setTimeout(persistState, 0));

// Scenario modal wiring
$('#scenariosBtn').addEventListener('click', openScenarioModal);
$('#scenariosCloseBtn').addEventListener('click', closeScenarioModal);
$('#scenariosOverlay').addEventListener('click', closeScenarioModal);

// Desktop menu buttons wiring - defer until scripts are loaded
function setupDesktopMenuButtons() {
  const analyticsBtn = $('#analyticsBtn');
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
      // More robust check for analytics UI
      const checkAnalyticsUI = () => {
        if (window.profitPathAnalyticsUI) {
          // Check if method exists on instance or prototype
          if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
            window.profitPathAnalyticsUI.showAnalyticsDashboard();
          } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
            // Call via prototype if instance method not available
            window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
          } else {
            console.warn('Analytics UI method not available, retrying...');
            setTimeout(checkAnalyticsUI, 100);
          }
        } else {
          console.warn('Analytics UI not loaded yet');
          setTimeout(checkAnalyticsUI, 100);
        }
      };
      checkAnalyticsUI();
    });
  }

  const desktopFeedbackBtn = $('#desktopFeedbackBtn');
  if (desktopFeedbackBtn) {
    desktopFeedbackBtn.addEventListener('click', () => {
      // More robust check for feedback UI
      const checkFeedbackUI = () => {
        if (window.feedbackUI) {
          // Check if method exists on instance or prototype
          if (typeof window.feedbackUI.openFeedbackModal === 'function') {
            window.feedbackUI.openFeedbackModal();
          } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
            // Call via prototype if instance method not available
            window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
          } else {
            console.warn('Feedback UI method not available, retrying...');
            setTimeout(checkFeedbackUI, 100);
          }
        } else {
          console.warn('Feedback UI not loaded yet');
          setTimeout(checkFeedbackUI, 100);
        }
      };
      checkFeedbackUI();
    });
  }
}

// Setup desktop buttons after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDesktopMenuButtons);
} else {
  setupDesktopMenuButtons();
}

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


// ============================================================================
// SCENARIO COMPARISON SYSTEM
// ============================================================================

// Helper to get selected scenario IDs from dropdowns
function getSelectedComparisonScenarios() {
  const scenario1Id = $('#compareScenario1').value;
  const scenario2Id = $('#compareScenario2').value;
  return { scenario1Id, scenario2Id };
}

// Populate scenario dropdowns
function populateComparisonDropdowns() {
  const scenarios = getAllScenarios();
  const select1 = $('#compareScenario1');
  const select2 = $('#compareScenario2');
  if (!select1 || !select2) return;

  select1.innerHTML = '<option value="">Select first scenario...</option>';
  select2.innerHTML = '<option value="">Select second scenario...</option>';

  scenarios.forEach(s => {
    const option1 = document.createElement('option');
    option1.value = s.id;
    option1.textContent = s.name;
    select1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = s.id;
    option2.textContent = s.name;
    select2.appendChild(option2);
  });
}

// Render the comparison table
function renderComparisonResults(metrics1, metrics2) {
  const comparisonResultsEl = $('#comparisonResults');
  if (!comparisonResultsEl) return;

  // Render into the wrapper div, not directly into comparisonResultsEl
  const tableWrap = comparisonResultsEl.querySelector('.comparison-table-wrap');
  if (!tableWrap) return;

  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt },
    { label: 'Annual Sessions', key: 'annualSessions', format: fmtInt },
    { label: 'Service Hours', key: 'serviceHours', format: fmtInt },
    { label: 'Utilization', key: 'utilizationPct', format: fmtPct1 },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
    { label: 'Fixed Costs', key: 'annualFixedCosts', format: fmtMoney0 },
    { label: 'Payroll', key: 'annualPayroll', format: fmtMoney0 },
    { label: 'Variable Costs', key: 'annualVariableCosts', format: fmtMoney0 },
    { label: 'Net Income', key: 'netIncome', format: fmtMoney0 },
    { label: 'Break-Even Clients', key: 'breakEvenClients', format: fmtInt },
    { label: 'Break-Even Revenue', key: 'breakEvenRevenue', format: fmtMoney0 },
    { label: 'Contribution Margin', key: 'contributionMarginPerClient', format: fmtMoney0 },
  ];

  let tableHtml = '<table class="comparison-table"><thead><tr><th>Metric</th><th class="scenario-col">Scenario 1</th><th class="scenario-col">Scenario 2</th><th class="difference-col">Difference</th></tr></thead><tbody>';

  metricsToCompare.forEach(m => {
    const val1 = metrics1[m.key];
    const val2 = metrics2[m.key];
    const diff = val2 - val1;

    let diffClass = 'difference-neutral';
    if (m.key.includes('income') || m.key.includes('revenue') || m.key.includes('margin')) {
      if (diff > 0) diffClass = 'difference-positive';
      else if (diff < 0) diffClass = 'difference-negative';
    } else if (m.key.includes('cost')) {
      if (diff > 0) diffClass = 'difference-negative';
      else if (diff < 0) diffClass = 'difference-positive';
    } else if (m.key.includes('utilization') || m.key.includes('clients') || m.key.includes('sessions') || m.key.includes('hours')) {
      if (diff > 0) diffClass = 'difference-positive';
      else if (diff < 0) diffClass = 'difference-negative';
    }

    tableHtml += '<tr><td class="metric-name">' + m.label + '</td><td class="scenario-col">' + m.format(val1) + '</td><td class="scenario-col">' + m.format(val2) + '</td><td class="difference-col ' + diffClass + '">' + m.format(diff) + '</td></tr>';
  });

  tableHtml += '</tbody></table>';
  tableWrap.innerHTML = tableHtml; // Assign to wrapper
  comparisonResultsEl.style.display = 'block';
}

// Handle comparison logic
function handleComparison() {
  const comparisonErrorEl = $('#comparisonError');
  if (comparisonErrorEl) comparisonErrorEl.style.display = 'none'; // Hide previous error

  const { scenario1Id, scenario2Id } = getSelectedComparisonScenarios();
  const scenarios = getAllScenarios();

  const scenario1 = scenarios.find(s => s.id === scenario1Id);
  const scenario2 = scenarios.find(s => s.id === scenario2Id);

  if (!scenario1 || !scenario2) {
    $('#comparisonResults').style.display = 'none';
    return;
  }

  // Calculate metrics for both scenarios
  const metrics1 = calc(scenario1.data || scenario1.state); // Handle older scenario structure
  const metrics2 = calc(scenario2.data || scenario2.state); // Handle older scenario structure

  renderComparisonResults(metrics1, metrics2);
}

// Update scenarios list and comparison dropdowns when modal opens
const scenariosModal = $('#scenariosModal');
if (scenariosModal) {
  // Original scenario modal close and button handlers (delegated)
  scenariosModal.addEventListener('click', (e) => {
    // Only close modal if clicking on close button, overlay, or outside modal content
    if (e.target.closest('.modal-header .btn-close') ||
      e.target.closest('#scenariosOverlay') ||
      e.target.closest('#scenariosModal') ||
      e.target.closest('.modal-content')) {
      closeScenarioModal();
    } else if (e.target.closest('.load-btn, .delete-btn')) {
      const btn = e.target.closest('.load-btn, .delete-btn');
      const scenarioId = btn.dataset.scenarioId;
      if (!scenarioId) return;

      if (btn.classList.contains('load-btn')) {
        loadScenario(scenarioId);
        closeScenarioModal();
      } else if (btn.classList.contains('delete-btn')) {
        deleteScenario(scenarioId);
        closeScenarioModal();
      }
    }
    // Handle comparison dropdowns to prevent default behavior from closing modal
    else if (e.target.closest('.scenario-select')) {
      e.stopPropagation();
    }
  });

  // Populate comparison dropdowns when the modal becomes visible
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (!scenariosModal.classList.contains('hidden')) {
          populateComparisonDropdowns();
          handleComparison(); // Also run comparison if both are selected
        } else {
          // Hide comparison results when modal is closed
          $('#comparisonResults').style.display = 'none';
        }
      }
    }
  });
  observer.observe(scenariosModal, { attributes: true, attributeFilter: ['class'] });

  // Initial population when app loads
  populateComparisonDropdowns();
}

// Event listeners for comparison dropdowns and button
const compareBtn = $('#compareBtn');
if (compareBtn) {
  compareBtn.addEventListener('click', handleComparison);
}

const compareScenario1 = $('#compareScenario1');
if (compareScenario1) {
  compareScenario1.addEventListener('change', handleComparison);
}

const compareScenario2 = $('#compareScenario2');
if (compareScenario2) {
  compareScenario2.addEventListener('change', handleComparison);
}

// Load scenario from URL first (if present), then localStorage
const loadedFromURL = loadScenarioFromURL();

// Check for test scenario loading
loadTestScenarios();
loadSpecificTestScenario(Object.keys(TEST_SCENARIOS).find(key => new URLSearchParams(window.location.search).get('testScenario') === key));

wire(loadedFromURL);

// Restore any scheduled report generation
restoreScheduling();

// Run initial render in a safe guard so any runtime errors are reported to the debug panel
try {
  render();
} catch (e) {
  console.error('Render failed:', e);
  const dbg = $('#debugPanel');
  if (dbg) dbg.textContent = 'Render error: ' + (e && e.stack ? e.stack : String(e));
}


// Global error handler to surface errors into the debug panel for easier debugging
window.addEventListener('error', (ev) => {
  const dbg = $('#debugPanel');
  const msg = ev?.error?.stack || ev?.message || String(ev);
  console.error('Uncaught error:', ev.error || ev.message || ev);
  if (dbg) dbg.textContent = 'Uncaught error: ' + msg;
});

// Debug panel toggle wiring: collapsible panel above the simple chart
function initDebugPanel() {
  const toggle = $('#debugToggle');
  const body = $('#debugBody');
  const pre = $('#debugPanel');
  if (!toggle || !body || !pre) return;

  // Update pre with calc() output and set a concise summary on the toggle
  function refreshDebug() {
    // Only refresh if debug panel is initialized and visible
    if (!pre || pre.style.display === 'none') return;

    try {
      const res = calc();
      pre.textContent = JSON.stringify(res, null, 2);
      toggle.textContent = '▶ Debug — clients: ' + (res.clients || 0) + ', revenue: ' + fmtMoney0(res.revenue || 0);
    } catch (e) {
      pre.textContent = 'Error generating debug: ' + (e && e.stack ? e.stack : String(e));
      toggle.textContent = '▶ Debug — error';
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

// Register service worker for PWA functionality
// TEMPORARILY DISABLED-forcing network CSS loading
/*
if ('serviceWorker' in navigator) {
        window.addEventListener('load', () =>{
          navigator.serviceWorker.register('/sw.js')
            .then((registration) =>{
              // Service Worker registered successfully
 
              // Handle service worker updates
              registration.addEventListener('updatefound', () =>{
                const newWorker=registration.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () =>{
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      // New version available
                      if (confirm('A new version of ProfitPath is available. Reload to update?')) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                      }
                    }
                  });
                }
              });
            })
            .catch((_error) =>{
              // Service Worker registration failed
            });
        });
}
      */

// Onboarding system for guided experience
const _initializeOnboarding = () => {
  // Check if user has completed onboarding
  const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';

  // Always show help button (users can access help anytime)
  addOnboardingHelpButton();

  // Show welcome message for new users who haven't completed onboarding
  if (!onboardingCompleted) {
    setTimeout(() => {
      showWelcomeDialog();
    }, 1000);
  }

  // Initialize contextual tooltips
  initializeContextualTooltips();

  // Initialize progressive disclosure
  initializeProgressiveDisclosure();
}

// Initialize onboarding system after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initializeOnboarding);
} else {
  _initializeOnboarding();
}

// Scroll lock helpers for guided tour
let _tourScrollLocked = false;
let _tourPrevHtmlOverflow = '';
let _tourPrevBodyOverflow = '';
function _preventTourScroll(e) {
  // allow certain inputs inside the tour dialog (handled by pointer events), but
  // generally prevent default touch/wheel scrolling while tour is active
  e.preventDefault();
}

function _trapTourKeys(e) {
  // Prevent keyboard scrolling keys while tour active
  const blocked = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (blocked.includes(e.key)) {
    e.preventDefault();
  }
}

function lockScrollForTour() {
  if (_tourScrollLocked) return;
  _tourScrollLocked = true;
  try {
    _tourPrevHtmlOverflow = document.documentElement.style.overflow || '';
    _tourPrevBodyOverflow = document.body.style.overflow || '';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } catch (e) {
    // ignore
  }
  document.addEventListener('touchmove', _preventTourScroll, { passive: false });
  document.addEventListener('wheel', _preventTourScroll, { passive: false });
  document.addEventListener('keydown', _trapTourKeys, { passive: false });
}

function unlockScrollForTour() {
  if (!_tourScrollLocked) return;
  _tourScrollLocked = false;
  try {
    document.documentElement.style.overflow = _tourPrevHtmlOverflow || '';
    document.body.style.overflow = _tourPrevBodyOverflow || '';
  } catch (e) {
    // ignore
  }
  document.removeEventListener('touchmove', _preventTourScroll);
  document.removeEventListener('wheel', _preventTourScroll);
  document.removeEventListener('keydown', _trapTourKeys);
}

function addOnboardingHelpButton() {
  // The help button is now in the HTML, just add event listeners
  const helpButton = document.getElementById('helpBtn');
  if (!helpButton) return;

  helpButton.addEventListener('click', showHelpMenu);
}

function showWelcomeDialog() {
  const dialog = createOnboardingDialog({
    title: 'Welcome to ProfitPath! 🎉',
    content: '<div class="welcome-content"><p>Get started with your profitability analysis in just a few minutes.</p><p>Would you like a quick guided tour of the key features?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="welcome-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Take Tour</button><button class="welcome-btn" data-action="industry" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Choose Industry</button><button class="welcome-btn" data-action="skip" style="background:transparent;color:#666;border:none;padding:10px 20px;cursor:pointer;">Skip for Now</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.welcome-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        dialog.remove(); // Close the dialog

        if (action === 'tour') {
          startGuidedTour();
        } else if (action === 'industry') {
          showIndustrySelector();
        }
        // Skip action just closes the dialog
      });
    });
  }, 100);

  document.body.appendChild(dialog);
}

function showIndustrySelector() {
  const industries = [
    { id: 'consulting', name: 'Consulting', icon: '💼', description: 'Professional services, advisory, strategy' },
    { id: 'cleaning', name: 'Cleaning Services', icon: '🧽', description: 'Residential and commercial cleaning' },
    { id: 'landscaping', name: 'Landscaping', icon: '🌿', description: 'Garden maintenance, lawn care' },
    { id: 'fitness', name: 'Fitness & Wellness', icon: '🏋️', description: 'Personal training, gym services' },
    { id: 'photography', name: 'Photography', icon: '📷', description: 'Event, portrait, commercial photography' },
    { id: 'other', name: 'Other Service Business', icon: '🏭', description: 'Custom service business setup' }
  ];

  const industryGrid = industries.map(industry => '<div class="industry-option" data-industry="' + industry.id + '">' +
    '<div class="industry-icon" style="font-size:32px;margin-bottom:8px;">' + industry.icon + '</div>' +
    '<div class="industry-name">' + industry.name + '</div>' +
    '<div class="industry-desc">' + industry.description + '</div>' +
    '</div>'
  ).join('');

  const dialog = createOnboardingDialog({
    title: 'What type of service business do you run?',
    content: '<div class="industry-grid">' + industryGrid + '</div><p style="margin-top:16px;color:var(--muted);">This helps us provide tailored guidance and templates.</p>',
    buttons: [
      { text: 'Continue', action: () => { }, primary: true },
      { text: 'Skip', action: () => { } }
    ]
  });

  // Add click handlers for industry options
  setTimeout(() => {
    document.querySelectorAll('.industry-option').forEach(option => {
      option.addEventListener('click', () => {
        const industryId = option.dataset.industry;
        selectIndustry(industryId, dialog);
      });
    });
  }, 100);

  document.body.appendChild(dialog);
}

function selectIndustry(industryId, dialog) {
  // Save selected industry
  localStorage.setItem('selectedIndustry', industryId);

  // Load industry-specific template
  loadOnboardingIndustryTemplate(industryId);

  // Close dialog and show success message
  dialog.remove();

  const successDialog = createOnboardingDialog({
    title: 'Great choice! 🎯',
    content: '<div class="success-content"><p>We\'ve loaded a template configuration for your industry.</p><p>Would you like to take a quick tour to learn how to customize it?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="success-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Show Me How</button><button class="success-btn" data-action="explore" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Explore on My Own</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.success-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        successDialog.remove(); // Close the dialog

        if (action === 'tour') {
          startGuidedTour();
        }
        // Explore action just closes the dialog
      });
    });
  }, 100);

  document.body.appendChild(successDialog);
}

function loadOnboardingIndustryTemplate(industryId) {
  const templates = {
    consulting: {
      offerings: [{
        name: 'Strategy Consulting',
        priceMonthly: 5000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 200
      }]
    },
    cleaning: {
      offerings: [{
        name: 'Standard Cleaning',
        priceMonthly: 150,
        sessionsPerYear: 4,
        hoursPerSession: 2,
        variableCostPerSession: 15
      }]
    },
    landscaping: {
      offerings: [{
        name: 'Weekly Lawn Care',
        priceMonthly: 200,
        sessionsPerYear: 52,
        hoursPerSession: 1,
        variableCostPerSession: 25
      }]
    },
    fitness: {
      offerings: [{
        name: 'Personal Training',
        priceMonthly: 300,
        sessionsPerYear: 48,
        hoursPerSession: 1,
        variableCostPerSession: 0
      }]
    },
    photography: {
      offerings: [{
        name: 'Wedding Photography',
        priceMonthly: 2500,
        sessionsPerYear: 6,
        hoursPerSession: 8,
        variableCostPerSession: 100
      }]
    }
  };

  const template = templates[industryId];
  if (template) {
    // Apply template to current scenario
    if (template.offerings) {
      state.offerings = template.offerings.map(o => ({
        ...o,
        id: uuid(),
        mixPct: 100 / template.offerings.length,
        currentClients: 0
      }));
    }

    // Refresh the UI
    render();
    persistState();
  }
}

function startGuidedTour() {
  // Lock scrolling while the guided tour is active so users can't interrupt
  // the tour by manually scrolling. Programmatic scrolling (scrollIntoView)
  // is still allowed.
  lockScrollForTour();
  const tour = createGuidedTour();
  tour.start();
}

// Global tour state
let tourSteps = [];
let tourActive = false;

function createGuidedTour() {
  const isMobile = window.innerWidth < 768;
  tourSteps = [
    {
      target: '.logo',
      title: 'Welcome to ProfitPath',
      content: 'This is your profitability dashboard. Let\'s take a quick tour of the key areas.',
      position: 'bottom'
    },
    {
      target: '.inputs-fields .field:first-child',
      title: 'Choose Your Mode',
      content: 'Select \'Forecast\' mode to plan capacity for a target client count. Use \'Current\' mode to analyze your active existing client base.',
      position: 'right'
    },
    {
      target: '.team-config-group',
      title: 'Team Configuration',
      content: 'Enter your team size and compensation details. The calculator assumes 2080 paid hours per year per employee.',
      position: 'right'
    },
    {
      target: '.offerings-section .section-h',
      title: 'Define Your Services',
      content: 'Add your service offerings with pricing, frequency, and costs. Each offering can have different terms.',
      position: 'right'
    },
    {
      target: 'aside.card .card-h',
      title: 'Key Profitability Metric',
      content: 'This shows your net income after all expenses. Green indicates profitability, red indicates losses.',
      position: 'top'
    },
    {
      target: 'aside.card .capacity',
      title: 'Capacity Utilization',
      content: 'Monitor how busy your team is. Aim for 80-90% utilization to balance profitability and client service.',
      position: 'left'
    },
    {
      target: '.break-even-section-wrapper',
      title: 'Break-even Analysis',
      content: 'See how many clients you need to break even with a detailed break-even analysis.',
      position: 'left'
    },
    {
      target: '.charts-visualizations-container',
      title: 'Charts & Visualizations',
      content: 'Explore interactive charts and graphs that help visualize your business metrics and financial analysis.',
      position: 'top'
    },
    {
      target: isMobile ? '#hamburgerBtn' : '.header-actions',
      title: 'Save, Export & Share',
      content: isMobile ? 'Access all saving, exporting, and sharing tools from the menu.' : 'Save scenarios for comparison, generate professional reports, or share your analysis with stakeholders.',
      position: 'bottom'
    }
  ];

  tourActive = true;

  return {
    start: () => showTourStep(0)
  };
}

async function showTourStep(stepIndex) {
  if (!tourActive || stepIndex >= tourSteps.length) {
    completeTour();
    return;
  }

  const step = tourSteps[stepIndex];
  let target = document.querySelector(step.target);

  // Try fallback selectors if primary target not found
  if (!target) {
    const fallbacks = {
      '.header': '.container',
      '.offering-item': '.card',
      '.metrics-section': '.card',
      '#scenariosBtn': '.btn',
      '#shareBtn': '.btn'
    };
    target = document.querySelector(fallbacks[step.target] || step.target);
  }

  if (!target) {
    console.warn('Tour step ' + stepIndex + ' target not found: ' + step.target + ', skipping...');
    showTourStep(stepIndex + 1);
    return;
  }

  // Scroll the target element into view smoothly, then wait for scrolling to stop
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

  // Wait until scrolling has settled and the target is roughly centered before creating the tooltip.
  // This avoids creating the overlay while the page is still animating which caused the overlay
  // to be slightly offset when long smooth-scrolls were required.
  await waitForTargetSettled(target, { timeoutMs: 3000, idleMs: 250 });

  // Remove any leftover tooltips/overlays to avoid duplicates or jumping.
  document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

  // Now create the tooltip (createTooltip will append it to the DOM)
  const tooltip = createTooltip(step, target, null, stepIndex, tourSteps);

  // Add keyboard support
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && tourActive) {
      document.removeEventListener('keydown', handleKeydown);
      exitTour();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // Store cleanup function
  tooltip._cleanupKeyboard = () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}

// Helper to wait until scrolling stops and the target is approximately centered
function waitForTargetSettled(target, { timeoutMs = 3000, idleMs = 250, stableMs = 250 } = {}) {
  return new Promise((resolve) => {
    let idleTimer = null;
    let timeoutTimer = null;
    let rafId = null;

    function cleanup() {
      if (idleTimer) clearTimeout(idleTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll, { passive: true });
      window.removeEventListener('resize', onScroll);
    }

    // After we observe no scroll for idleMs, ensure the element's rect is stable
    // for stableMs milliseconds before resolving. If the element is not near
    // the center, perform an immediate snap and continue waiting for stability.
    function ensureStableAndResolve() {
      const startTime = Date.now();
      let lastRect = target.getBoundingClientRect();
      let lastChange = Date.now();

      // If target is far from center, snap it into view first (instant)
      const rectNow = lastRect;
      const viewportCenterY = window.innerHeight / 2;
      const deltaCenter = Math.abs((rectNow.top + rectNow.bottom) / 2 - viewportCenterY);
      if (deltaCenter > window.innerHeight * 0.2) {
        try {
          target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
        } catch (e) {
          // ignore
        }
        // update lastRect after snapping
        lastRect = target.getBoundingClientRect();
        lastChange = Date.now();
      }

      function checkRect() {
        const rect = target.getBoundingClientRect();
        const dx = Math.abs(rect.top - lastRect.top) + Math.abs(rect.left - lastRect.left) + Math.abs(rect.width - lastRect.width) + Math.abs(rect.height - lastRect.height);
        if (dx > 2) {
          lastRect = rect;
          lastChange = Date.now();
        }

        if (Date.now() - lastChange >= stableMs) {
          cleanup();
          resolve();
          return;
        }

        if (Date.now() - startTime >= timeoutMs) {
          cleanup();
          resolve();
          return;
        }

        rafId = requestAnimationFrame(checkRect);
      }

      checkRect();
    }

    function onScroll() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        ensureStableAndResolve();
      }, idleMs);
    }

    // Start listeners and safety timeout
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    timeoutTimer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs + 200);

    // Kick off initial idle check (in case no scroll events occur)
    onScroll();
  });
}

function exitTour() {
  tourActive = false;
  // Remove all tooltips and overlays
  // Unlock scrolling when the tour exits
  unlockScrollForTour();
  document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

  // Show exit confirmation
  const exitDialog = createOnboardingDialog({
    title: 'Tour Exited',
    content: '<p>You can resume the guided tour anytime by clicking the ❓ help button in the top-right corner.</p><p>Feel free to explore the features at your own pace!</p>',
    buttons: [
      { text: 'Got it!', action: () => { } }
    ]
  });

  document.body.appendChild(exitDialog);
}

function completeTour() {
  tourActive = false;
  // Unlock scrolling when the tour completes
  unlockScrollForTour();
  localStorage.setItem('onboardingCompleted', 'true');

  const completionDialog = createOnboardingDialog({
    title: 'Tour Complete! 🎉',
    content: '<p>You now know the basics of ProfitPath!</p><p>Explore the features at your own pace. Use the ❓ help button anytime for guidance.</p>',
    buttons: [
      { text: 'Got it!', action: () => { }, primary: true }
    ]
  });

  document.body.appendChild(completionDialog);
}

function createTooltip(step, target, onNext, stepIndex, steps) {
  const isMobile = window.innerWidth < 768;

  // Get fresh bounding rect after scrolling completes
  const rect = target.getBoundingClientRect();

  // Calculate final position first
  let left, top, transform;

  if (isMobile) {
    // On mobile, always position below the element for better visibility
    left = Math.max(10, Math.min(window.innerWidth - 290, rect.left + rect.width / 2 - 140));
    top = rect.bottom + 10;
    transform = 'translate(0, 0)';
  } else {
    switch (step.position) {
      case 'top':
        left = rect.left + rect.width / 2;
        top = rect.top - 10;
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        left = rect.left + rect.width / 2;
        top = rect.bottom + 10;
        transform = 'translate(-50%, 0)';
        break;
      case 'left':
        left = rect.left - 10;
        top = rect.top + rect.height / 2;
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        left = rect.right + 10;
        top = rect.top + rect.height / 2;
        transform = 'translate(0, -50%)';
        break;
      default:
        left = rect.left + rect.width / 2;
        top = rect.bottom + 10;
        transform = 'translate(-50%, 0)';
    }
  }

  // Ensure tooltip stays within viewport bounds
  const tooltipWidth = isMobile ? 280 : 300;
  const tooltipHeight = 200; // Approximate height with navigation

  if (left < 10) {
    left = 10;
  }
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tooltipWidth - 10;
  }
  if (top - tooltipHeight < 10) {
    top = tooltipHeight + 10;
    if (!isMobile) transform = transform.replace('-100%', '0');
  }
  if (top + tooltipHeight > window.innerHeight - 10) {
    top = window.innerHeight - tooltipHeight - 10;
    if (!isMobile) transform = transform.replace('0', '-100%');
  }

  // Create tooltip with final position-no intermediate rendering
  const tooltip = document.createElement('div');
  tooltip.className = 'onboarding-tooltip';
  tooltip.style.cssText = 'position: fixed;z-index: 10000;background: white;border: 2px solid #007bff;border-radius: 8px;padding: 16px;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);max-width: ' + (isMobile ? '280px' : '300px') + ';pointer-events: auto;font-size: ' + (isMobile ? '14px' : '16px') + ';left: ' + left + 'px;top: ' + top + 'px;transform: ' + transform + ';opacity: 0;transition: opacity 0.3s ease-out;';

  // Append to DOM and fade in from final position
  document.body.appendChild(tooltip);
  requestAnimationFrame(() => {
    tooltip.style.opacity = '1';
  });

  // Create progress dots
  const progressDots = steps.map((_, index) => '<span class="tour-dot ' + (index === stepIndex ? 'active' : '') + ' ' + (index < stepIndex ? 'completed' : '') + '" data-step="' + index + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;cursor:pointer;background:' + (index === stepIndex ? '#007bff' : index < stepIndex ? '#28a745' : '#ddd') + ';transition:all 0.2s;"></span>').join('');

  tooltip.innerHTML = '<div style="position:relative;padding-right:24px;"><button class="tour-exit-btn" style="position:absolute;top:0;right:0;background:transparent;border:none;font-size:16px;cursor:pointer;color:var(--text, #666);padding:4px;line-height:1;">✕</button><div style="font-weight:bold;margin-bottom:8px;color:var(--text, #007bff);">' + step.title + '</div><div style="margin-bottom:16px;color:var(--text, #333);line-height:1.4;">' + step.content + '</div><div style="display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative;"><div class="tour-navigation" style="display:flex;align-items:center;">' + (stepIndex > 0 ? '<button class="tour-arrow tour-arrow-prev" data-direction="prev" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;font-size:18px;line-height:1;">‹</button>' : '<div style="width:32px;"></div>') + '<div class="tour-dots" style="display:flex;align-items:center;">' + progressDots + '</div>' + (stepIndex < steps.length - 1 ? '<button class="tour-arrow tour-arrow-next" data-direction="next" style="background:#007bff;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:18px;line-height:1;">›</button>' : '<button class="tour-finish-btn" style="background:#28a745;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:16px;line-height:1;">✓</button>') + '</div></div></div>';

  // Add event listeners for navigation
  setTimeout(() => {
    // Exit button
    const exitBtn = tooltip.querySelector('.tour-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitTour();
      });
    }

    // Navigation buttons
    const prevBtn = tooltip.querySelector('.tour-arrow-prev');
    const nextBtn = tooltip.querySelector('.tour-arrow-next');
    const finishBtn = tooltip.querySelector('.tour-finish-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        if (stepIndex > 0) {
          showTourStep(stepIndex - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        if (stepIndex < steps.length - 1) {
          showTourStep(stepIndex + 1);
        }
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        completeTour();
      });
    }

    // Progress dots
    const dots = tooltip.querySelectorAll('.tour-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetStep = parseInt(e.currentTarget.dataset.step);
        tooltip.remove();
        showTourStep(targetStep);
      });
    });
  }, 50);

  // Add event listener for the button
  setTimeout(() => {
    const nextBtn = tooltip.querySelector('.tooltip-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        tooltip.remove();
        if (onNext) onNext();
      });
    }
  }, 10);

  // Highlighting: place a fixed overlay around the target so we don't rely on modifying
  // the target's own styles (avoids stacking-context/overflow issues and layout shifts).
  const OVERLAY_PAD = 9; // pixels to expand the highlight beyond the element (increased by 1 to keep outer perimeter)
  const BORDER_THICKNESS = 7; // highlight border thickness (reduced by 1px for less clipping)

  const rect2 = target.getBoundingClientRect();
  const computed = window.getComputedStyle(target);
  // If the target has no rounded corners, use a mild default so highlights look rounded
  const parsedBR = parseFloat(computed.borderRadius) || 0;
  const borderRadius = (parsedBR && parsedBR > 4) ? parsedBR + 'px' : '10px';

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.cssText = 'position: fixed;left: ' + (rect2.left - OVERLAY_PAD) + 'px;top: ' + (rect2.top - OVERLAY_PAD) + 'px;width: ' + (rect2.width + OVERLAY_PAD * 2) + 'px;height: ' + (rect2.height + OVERLAY_PAD * 2) + 'px;border: ' + BORDER_THICKNESS + 'px solid #007bff;border-radius: ' + borderRadius + ';box-shadow: 0 8px 32px rgba(0, 123, 255, 0.12);pointer-events: none;z-index: 9999;animation: pulse 2s infinite;';

  // Append overlay underneath the tooltip (tooltip uses z-index:10000)
  document.body.appendChild(overlay);

  // Store overlay for cleanup
  tooltip._overlay = overlay;

  // Wrap original remove to also remove the overlay and keyboard handler
  const originalRemove = tooltip.remove;
  tooltip.remove = function () {
    try {
      if (tooltip._overlay && tooltip._overlay.parentNode) tooltip._overlay.parentNode.removeChild(tooltip._overlay);
    } catch (e) {
      // ignore
    }
    if (tooltip._cleanupKeyboard) {
      tooltip._cleanupKeyboard();
    }
    originalRemove.call(this);
  };

  return tooltip;
}

function createOnboardingDialog({ title, content, buttons }) {
  const dialog = document.createElement('div');
  dialog.className = 'onboarding-dialog-overlay';
  dialog.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 10001;';

  const dialogContent = document.createElement('div');
  dialogContent.style.cssText = 'background: white;border-radius: 12px;padding: 24px;max-width: 500px;width: 90%;box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);';

  dialogContent.innerHTML = '<h2 style="margin:0 0 16px 0;color:var(--text, #333);font-size:24px;">' + title + '</h2><div style="color:var(--text, #666);line-height:1.5;">' + content + '</div><div style="margin-top:24px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">' + buttons.map((btn, index) => '<button class="dialog-btn" data-action="' + index + '" data-primary="' + (btn.primary ? 'true' : 'false') + '" style="padding:8px 16px;border:' + (btn.primary ? 'none' : '1px solid #ddd') + ';border-radius:6px;background:' + (btn.primary ? '#007bff' : 'white') + ';color:' + (btn.primary ? 'white' : '#333') + ';cursor:pointer;font-weight:' + (btn.primary ? 'bold' : 'normal') + ';">' + btn.text + '</button>').join('') + '</div>';

  // Add event listeners for dialog buttons
  setTimeout(() => {
    const dialogBtns = dialogContent.querySelectorAll('.dialog-btn');
    dialogBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const action = buttons[index]?.action;
        dialog.remove();
        if (action && typeof action === 'function') {
          action();
        }
      });
    });
  }, 10);

  dialog.appendChild(dialogContent);
  return dialog;
}

function showHelpMenu() {
  const helpDialog = createOnboardingDialog({
    title: 'Help & Learning Center',
    content: '<div style="display:grid;gap:12px;"><button class="help-menu-btn" data-action="tour" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🎯 <strong>Take Guided Tour</strong><br><small>Step-by-step walkthrough of key features</small></button><button class="help-menu-btn" data-action="industry" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🏢 <strong>Change Industry</strong><br><small>Switch to a different business template</small></button><button class="help-menu-btn" data-action="tooltips" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">💡 <strong>Show Tooltips</strong><br><small>Enable contextual help throughout the app</small></button></div>',
    buttons: [
      { text: 'Close', action: () => { } }
    ]
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.help-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        helpDialog.remove(); // Close the dialog

        setTimeout(() => {
          if (action === 'tour') {
            startGuidedTour();
          } else if (action === 'industry') {
            showIndustrySelector();
          } else if (action === 'tooltips') {
            showContextualHelp();
          }
        }, 100);
      });
    });
  }, 100);

  document.body.appendChild(helpDialog);
}

function initializeContextualTooltips() {
  // Add tooltips to key elements
  const tooltipElements = [
    { selector: '#employees', content: 'Set the number of full-time employees in your business' },
    { selector: '#employeePay', content: 'Average annual salary per employee including benefits' },
    { selector: '.offering-card .btn.danger', content: 'Remove this service offering from your business model' },
    { selector: '#scenariosBtn', content: 'Save current configuration or load previous scenarios' },
    { selector: '#shareBtn', content: 'Generate shareable link for stakeholders' },
    { selector: '.settings-cog-btn', content: 'Customize experience level and advanced features' }
  ];

  tooltipElements.forEach(({ selector, content }) => {
    const element = document.querySelector(selector);
    if (element) {
      element.title = content; // Basic tooltip
    }
  });
}

function showContextualHelp() {
  // Enable enhanced tooltips
  const tooltipElements = document.querySelectorAll('[title]');
  tooltipElements.forEach(el => {
    if (!el.dataset.tooltipEnabled) {
      el.dataset.originalTitle = el.title;
      el.dataset.tooltipEnabled = 'true';
      el.title = ''; // Remove basic tooltip

      el.addEventListener('mouseenter', showEnhancedTooltip);
      el.addEventListener('mouseleave', hideEnhancedTooltip);
    }
  });

  // Update settings to reflect tooltips are enabled
  if (updateSetting) {
    updateSetting('showTooltips', true);
  }

  // Show confirmation
  const notification = document.createElement('div');
  notification.textContent = 'Contextual tooltips enabled! Hover over elements to see help.';
  notification.style.cssText = 'position: fixed;top: 20px;left: 50%;transform: translateX(-50%);background: var(--accent, #007bff);color: white;padding: 10px 20px;border-radius: 6px;z-index: 10002;font-size: 14px;';
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function showEnhancedTooltip(e) {
  const content = e.target.dataset.originalTitle;
  if (!content) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'enhanced-tooltip';
  tooltip.textContent = content;
  tooltip.style.cssText = 'position: fixed;background: #333;color: white;padding: 8px 12px;border-radius: 4px;font-size: 12px;z-index: 10002;pointer-events: none;max-width: 200px;word-wrap: break-word;';

  document.body.appendChild(tooltip);

  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = (rect.left + rect.width / 2) + 'px';
  tooltip.style.top = (rect.top - 8) + 'px';
  tooltip.style.transform = 'translate(-50%, -100%)';

  e.target._tooltip = tooltip;
}

function hideEnhancedTooltip(e) {
  if (e.target._tooltip) {
    e.target._tooltip.remove();
    delete e.target._tooltip;
  }
}

function initializeProgressiveDisclosure() {
  const userLevel = localStorage.getItem('userExperienceLevel') || 'beginner';

  // Hide advanced features based on user level
  const advancedElements = document.querySelectorAll('.advanced-feature:not(.export-option)');
  const expertElements = document.querySelectorAll('.expert-feature:not(.export-option)');

  if (userLevel === 'beginner') {
    advancedElements.forEach(el => el.style.display = 'none');
    expertElements.forEach(el => el.style.display = 'none');
  } else if (userLevel === 'intermediate') {
    expertElements.forEach(el => el.style.display = 'none');
  }

  // Always show all export options regardless of user level
  document.querySelectorAll('.export-option.advanced-feature, .export-option.expert-feature, .mobile-submenu-btn.expert-feature').forEach(el => {
    el.style.display = 'block';
  });

  // Special handling for debug panel-show if user has enabled it regardless of level
  const showDebugPanel = localStorage.getItem('showDebugPanel') === 'true';
  if (showDebugPanel) {
    document.querySelectorAll('.debug-wrapper.expert-feature').forEach(el => {
      el.style.display = 'block';
    });
  }
}
