// ============================================================================
// UI FUNCTIONS - Rendering and User Interface
// ============================================================================

import { state } from './main.js';
import { $, $$, clamp, fmtInt, fmtMoney0, fmtMoney2, fmtPct1, escapeHtml } from './utils.js';
import { DEBOUNCE_DELAY } from './constants.js';
import { showUserError } from './shared.js';

// Loading state management
let isCalculating = false;
let calculationTimeout = null;

export function showLoadingState() {
  const outputs = [
    '#kpiClients', '#kpiSessions', '#kpiServiceHours', '#kpiCapacity',
    '#kpiRevenue', '#kpiFixedCosts', '#kpiPayroll', '#kpiVariableCosts',
    '#kpiIncome', '#kpiBreakEvenClients', '#kpiBreakEvenRevenue', '#kpiContributionMargin'
  ];

  outputs.forEach(selector => {
    const el = $(selector);
    if (el) {
      el.classList.add('loading');
      el.textContent = '—';
    }
  });

  // Show loading indicator on capacity bar
  const capacityBar = $('#capacityBar');
  if (capacityBar) {
    capacityBar.style.width = '0%';
    capacityBar.classList.add('loading');
  }
}

export function hideLoadingState() {
  const outputs = [
    '#kpiClients', '#kpiSessions', '#kpiServiceHours', '#kpiCapacity',
    '#kpiRevenue', '#kpiFixedCosts', '#kpiPayroll', '#kpiVariableCosts',
    '#kpiIncome', '#kpiBreakEvenClients', '#kpiBreakEvenRevenue', '#kpiContributionMargin'
  ];

  outputs.forEach(selector => {
    const el = $(selector);
    if (el) {
      el.classList.remove('loading');
    }
  });

  const capacityBar = $('#capacityBar');
  if (capacityBar) {
    capacityBar.classList.remove('loading');
  }
}

// Debounced calculation with loading states
export function debouncedCalculate(callback) {
  if (calculationTimeout) {
    clearTimeout(calculationTimeout);
  }

  if (!isCalculating) {
    isCalculating = true;
    showLoadingState();
  }

  calculationTimeout = setTimeout(() => {
    try {
      callback();
    } finally {
      isCalculating = false;
      hideLoadingState();
      calculationTimeout = null;
    }
  }, DEBOUNCE_DELAY);
}

// Efficient DOM update tracking
const lastDomValues = new Map();

export function updateDomElement(selector, newValue) {
  const element = $(selector);
  if (!element) return;

  const lastValue = lastDomValues.get(selector);
  if (lastValue !== newValue) {
    element.textContent = newValue;
    lastDomValues.set(selector, newValue);
  }
}

// Error handling utilities are now in shared.js

// Lazy loading for performance optimization
let breakEvenLoaded = false;
let visualizationsLoaded = false;

export function lazyLoadBreakEven() {
  if (breakEvenLoaded) return;

  const breakEvenContainer = $('#breakEvenAnalysis');
  if (!breakEvenContainer) return;

  // Only load if container is visible
  if (breakEvenContainer.style.display !== 'none') {
    breakEvenLoaded = true;
    // The content is already generated in updateOutputs()
  }
}

export function lazyLoadVisualizations() {
  if (visualizationsLoaded) return;

  const vizContainer = $('#richVisualizations');
  if (!vizContainer) return;

  // Only load if container is visible
  if (vizContainer.style.display !== 'none') {
    visualizationsLoaded = true;
    // The content is already generated in updateOutputs()
  }
}

// Update only outputs (KPIs, capacity meter, chart, debug) without re-rendering the offerings table.
export function updateOutputs(metrics) {
  try {
    // Performance optimization: Use efficient DOM updates
    updateDomElement('#kpiClients', fmtInt(metrics.clients));
    updateDomElement('#kpiSessions', fmtInt(metrics.totalSessions));
    updateDomElement('#kpiServiceHours', fmtInt(metrics.serviceHours));
    updateDomElement('#kpiCapacity', fmtPct1(metrics.capacityPct));

    updateDomElement('#kpiRevenue', fmtMoney0(metrics.revenue));
    updateDomElement('#kpiFixedCosts', fmtMoney0(metrics.annualFixedCosts));
    updateDomElement('#kpiPayroll', fmtMoney0(metrics.annualPayroll));
    updateDomElement('#kpiVariableCosts', fmtMoney0(metrics.variableCosts));

    // Break-even analysis
    const breakEvenClientsEl = $('#kpiBreakEvenClients');
    const breakEvenRevenueEl = $('#kpiBreakEvenRevenue');
    const contributionMarginEl = $('#kpiContributionMargin');

    if (breakEvenClientsEl) {
      breakEvenClientsEl.textContent = Number.isFinite(metrics.breakEvenClients) ? fmtInt(metrics.breakEvenClients) : '∞';
      breakEvenClientsEl.style.color = metrics.clients >= metrics.breakEvenClients ? 'var(--good)' : 'var(--bad)';
    }

    if (breakEvenRevenueEl) {
      breakEvenRevenueEl.textContent = fmtMoney0(metrics.breakEvenClients * (metrics.contributionMarginPerClient || 0));
      breakEvenRevenueEl.style.color = metrics.revenue >= (metrics.breakEvenClients * (metrics.contributionMarginPerClient || 0)) ? 'var(--good)' : 'var(--bad)';
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
      // Chart render failed - SVG will show fallback or empty state
    }

    // Update break-even analysis
    updateBreakEvenAnalysis(metrics);

    // Update rich visualizations
    updateRichVisualizations(metrics);

    // Performance optimization: Lazy load non-critical features
    lazyLoadBreakEven();
    lazyLoadVisualizations();

    // Update debug panel if present
    const dbg = $('#debugPanel');
    if (dbg && $('#debugBody') && !$('#debugBody').classList.contains('collapsed')) {
      dbg.textContent = JSON.stringify(metrics, null, 2);
    }
  } catch (e) {
    // updateOutputs error - UI may not update but app continues to function
  }
}

// Display validation messages in the UI
export function updateValidationDisplay() {
  const validationContainer = $('#validationContainer');
  if (!validationContainer) return;

  const { validateBusinessLogic } = await import('./validation.js');
  const { issues, warnings } = validateBusinessLogic(state);

  // Clear existing messages
  validationContainer.innerHTML = '';

  // Create error messages
  if (issues.length > 0) {
    const errorsEl = document.createElement('div');
    errorsEl.className = 'validation-section errors';
    errorsEl.innerHTML = '<h4>Errors (fix these first)</h4>';

    issues.forEach(issue => {
      const issueEl = document.createElement('div');
      issueEl.className = `validation-message ${issue.severity}`;
      issueEl.innerHTML = `
        <strong>${issue.message}</strong>
        ${issue.suggestion ? `<br><small>${issue.suggestion}</small>` : ''}
      `;
      errorsEl.appendChild(issueEl);
    });

    validationContainer.appendChild(errorsEl);
    validationContainer.style.display = 'block';
  }

  // Create warning messages
  if (warnings.length > 0) {
    const warningsEl = document.createElement('div');
    warningsEl.className = 'validation-section warnings';
    warningsEl.innerHTML = '<h4>Warnings & Tips</h4>';

    warnings.forEach(warning => {
      const warningEl = document.createElement('div');
      warningEl.className = `validation-message ${warning.severity}`;
      warningEl.innerHTML = `
        <strong>${warning.message}</strong>
        ${warning.suggestion ? `<br><small>${warning.suggestion}</small>` : ''}
      `;
      warningsEl.appendChild(warningEl);
    });

    validationContainer.appendChild(warningsEl);
    validationContainer.style.display = 'block';
  }

  if (issues.length === 0 && warnings.length === 0) {
    validationContainer.style.display = 'none';
  }
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

function captureTableFocus() {
  const activeElement = document.activeElement;
  if (activeElement && activeElement.closest('#offeringsBody')) {
    return {
      element: activeElement,
      selectionStart: activeElement.selectionStart,
      selectionEnd: activeElement.selectionEnd
    };
  }
  return null;
}

function restoreTableFocus(focus) {
  if (!focus) return;

  try {
    focus.element.focus();
    if (focus.element.setSelectionRange) {
      focus.element.setSelectionRange(focus.selectionStart, focus.selectionEnd);
    }
  } catch (e) {
    // Focus restoration failed - non-critical
  }
}

// Main render function
export function render() {
  try {
    // Input validation
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid application state');
    }

    const focus = captureTableFocus();
    const { calc } = await import('./calculations.js');
    const metrics = calc();

    // Top-level inputs
    const modeSelect = $('#modeSelect');
    if (modeSelect) modeSelect.value = state.mode;

    const employeesInput = $('#employees');
    if (employeesInput) employeesInput.value = state.employees;

    const employeePayInput = $('#employeePay');
    if (employeePayInput) employeePayInput.value = state.employeePay;

    const monthlyCostsInput = $('#monthlyCosts');
    if (monthlyCostsInput) monthlyCostsInput.value = state.monthlyCosts;

    const productiveUtilizationInput = $('#productiveUtilizationPct');
    if (productiveUtilizationInput) productiveUtilizationInput.value = state.productiveUtilizationPct;

    const isForecast = state.mode === 'forecast';
    const targetUtilizationField = $('#targetUtilizationPct').closest('.field');
    if (targetUtilizationField) targetUtilizationField.classList.toggle('hidden', !isForecast);

    const targetUtilizationInput = $('#targetUtilizationPct');
    if (targetUtilizationInput) targetUtilizationInput.value = state.targetUtilizationPct;

    const lockMixField = $('#lockMixField');
    if (lockMixField) lockMixField.classList.toggle('hidden', !isForecast);

    const lockMixInput = $('#lockMix');
    if (lockMixInput) lockMixInput.checked = Boolean(state.lockMix);

    // Style hint: highlight which table column is editable in the current mode.
    const offeringsTable = $('#offeringsTable');
    if (offeringsTable) {
      offeringsTable.classList.toggle('mode-forecast', isForecast);
      offeringsTable.classList.toggle('mode-current', !isForecast);
    }

    // Offerings table
    const tbody = $('#offeringsBody');
    if (tbody) {
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
          : estClients * o.sessionsPerYear;

        tr.innerHTML = `
          <td><input aria-label="Name for offering ${idx + 1}" type="text" value="${escapeHtml(o.name)}" data-k="name" data-i="${idx}" /></td>
          <td><input aria-label="Monthly price for ${escapeHtml(o.name)}" type="number" min="0" step="1" value="${o.priceMonthly}" data-k="priceMonthly" data-i="${idx}" /></td>
          <td><input aria-label="Sessions per year for ${escapeHtml(o.name)}" type="number" min="1" step="1" value="${o.sessionsPerYear}" data-k="sessionsPerYear" data-i="${idx}" /></td>
          <td><input aria-label="Hours per session for ${escapeHtml(o.name)}" type="number" min="0.1" step="0.1" value="${o.hoursPerSession}" data-k="hoursPerSession" data-i="${idx}" /></td>
          <td><input aria-label="Variable cost per session for ${escapeHtml(o.name)}" type="number" min="0" step="1" value="${o.variableCostPerSession}" data-k="variableCostPerSession" data-i="${idx}" /></td>
          <td class="mode-forecast">${mixCell}</td>
          <td class="mode-current">${clientsCell}</td>
          <td class="muted">${fmtInt(estClients)}</td>
          <td class="muted">${fmtInt(estSessions)}</td>
          <td class="muted">${fmtMoney0(estClients * o.priceMonthly * o.sessionsPerYear)}</td>
          <td><button class="btn small danger" data-action="removeOffering" data-i="${idx}" aria-label="Remove ${escapeHtml(o.name)}">Remove</button></td>
        `;

        tbody.appendChild(tr);
      });
    }

    // KPIs and other updates
    updateOutputs(metrics);

    // Update validation messages
    updateValidationDisplay();

    restoreTableFocus(focus);

    // Mix/mode note
    const mixNote = $('#mixNote');
    if (mixNote) {
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
    }

  } catch (error) {
    console.error('Render failed:', error);
    showUserError('Failed to update the interface. Please refresh the page.');
  }
}

function renderSimpleChart(metrics) {
  const el = $('#revenueCompositionChart');
  if (!el) return;

  const totalRevenue = metrics.revenue;
  if (totalRevenue <= 0) {
    el.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#666">No revenue data</text>';
    return;
  }

  let cumulativePct = 0;
  const slices = metrics.offerings.map((o, i) => {
    const revenue = o.calculatedRevenue || 0;
    const pct = (revenue / totalRevenue) * 100;
    const startAngle = (cumulativePct / 100) * 2 * Math.PI - Math.PI / 2;
    cumulativePct += pct;
    const endAngle = (cumulativePct / 100) * 2 * Math.PI - Math.PI / 2;

    return {
      startAngle, endAngle, pct, revenue,
      color: `hsl(${i * 360 / metrics.offerings.length}, 70%, 50%)`,
      name: o.name
    };
  });

  const radius = 80;
  let svg = `<svg width="200" height="200" viewBox="0 0 200 200">`;

  slices.forEach(slice => {
    if (slice.pct < 1) return; // Skip very small slices

    const x1 = 100 + radius * Math.cos(slice.startAngle);
    const y1 = 100 + radius * Math.sin(slice.startAngle);
    const x2 = 100 + radius * Math.cos(slice.endAngle);
    const y2 = 100 + radius * Math.sin(slice.endAngle);

    const largeArc = slice.endAngle - slice.startAngle > Math.PI ? 1 : 0;

    svg += `<path d="M100,100 L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z" fill="${slice.color}" />`;
  });

  svg += `<text x="100" y="95" text-anchor="middle" font-size="12" fill="#333">${fmtPct1(100)}</text>`;
  svg += `<text x="100" y="110" text-anchor="middle" font-size="10" fill="#666">Revenue</text>`;
  svg += '</svg>';

  el.innerHTML = svg;
}

function updateBreakEvenAnalysis(metrics) {
  const container = $('#breakEvenAnalysis');
  if (!container) return;

  const breakEvenClients = metrics.breakEvenClients;
  const contributionMargin = metrics.contributionMarginPerClient;
  const contributionRatio = metrics.contributionMarginRatio;

  container.innerHTML = `
    <h4>Break-Even Analysis</h4>
    <div class="break-even-grid">
      <div class="break-even-item">
        <div class="break-even-label">Break-even Clients</div>
        <div class="break-even-value">${Number.isFinite(breakEvenClients) ? fmtInt(breakEvenClients) : '∞'}</div>
        <div class="break-even-desc">Minimum clients needed to break even</div>
      </div>
      <div class="break-even-item">
        <div class="break-even-label">Break-even Revenue</div>
        <div class="break-even-value">${fmtMoney0(breakEvenClients * contributionMargin)}</div>
        <div class="break-even-desc">Revenue needed to cover fixed costs</div>
      </div>
      <div class="break-even-item">
        <div class="break-even-label">Contribution Margin</div>
        <div class="break-even-value">${fmtPct1(contributionRatio)}</div>
        <div class="break-even-desc">Portion of revenue that contributes to profit</div>
      </div>
    </div>
    <div class="break-even-status">
      ${metrics.clients >= breakEvenClients ?
        '<span style="color: var(--good)">✓ Above break-even point</span>' :
        '<span style="color: var(--bad)">⚠ Below break-even point</span>'}
    </div>
  `;
}

function updateRichVisualizations(metrics) {
  const container = $('#richVisualizations');
  if (!container) return;

  // Utilization Gauge
  const gauge = createUtilizationGauge(metrics);
  // Profit Waterfall
  const waterfall = createProfitWaterfall(metrics);

  container.innerHTML = `
    <div class="visualization-grid">
      <div class="visualization-item">
        <h4>Capacity Utilization</h4>
        ${gauge}
      </div>
      <div class="visualization-item">
        <h4>Profit Waterfall</h4>
        ${waterfall}
      </div>
    </div>
  `;
}

function createUtilizationGauge(metrics) {
  const pct = metrics.capacityPct;
  const clampedPct = Math.min(150, Math.max(0, pct)); // Allow up to 150% for over-capacity

  // Map percentage to angle: 0% = -90°, 100% = 90°, 150% = 135°
  let angle;
  if (clampedPct <= 100) {
    angle = (clampedPct / 100) * 180 - 90; // -90° to +90°
  } else {
    // For over 100%, continue to 135° (but cap at reasonable angle)
    angle = 90 + Math.min(45, (clampedPct - 100) / 100 * 45);
  }
  angle = Math.max(-90, Math.min(135, angle)); // Ensure reasonable bounds

  const x = 100 + 70 * Math.cos(angle * Math.PI / 180);
  const y = 100 + 70 * Math.sin(angle * Math.PI / 180);

  // Color coding based on utilization and profit
  let needleColor = 'var(--accent)';
  let bgArcColor = '#ddd';

  // Determine colors based on multiple factors
  if (pct > 120) {
    needleColor = 'var(--bad)';
    bgArcColor = 'var(--bad)';
  } else if (pct > 100) {
    needleColor = 'var(--warn)';
    bgArcColor = metrics.income < 0 ? 'var(--bad)' : 'var(--warn)';
  } else if (metrics.income < 0) {
    // Negative profit gets warning colors even at normal utilization
    needleColor = 'var(--warn)';
    bgArcColor = 'var(--warn)';
  } else if (pct < 50 && metrics.clients > 0) {
    needleColor = 'var(--warn)';
    bgArcColor = '#ddd'; // Low utilization but profitable
  }

  return `
    <svg width="200" height="130" viewBox="0 0 200 130">
      <!-- Background arc -->
      <path d="M30,100 A70,70 0 0,1 170,100" fill="none" stroke="${bgArcColor}" stroke-width="8" opacity="0.3"/>

      <!-- Foreground arc -->
      <path d="M30,100 A70,70 0 0,1 170,100" fill="none" stroke="#ddd" stroke-width="10"/>

      <!-- Needle -->
      <path d="M100,100 L${x},${y}" stroke="${needleColor}" stroke-width="3"/>
      <circle cx="${x}" cy="${y}" r="6" fill="${needleColor}"/>

      <!-- Center dot -->
      <circle cx="100" cy="100" r="3" fill="#666"/>

      <!-- Percentage text -->
      <text x="100" y="85" text-anchor="middle" font-size="20" font-weight="bold" fill="var(--text)">${fmtPct1(pct)}</text>
      <text x="100" y="105" text-anchor="middle" font-size="12" fill="var(--text-secondary)">Utilization</text>

      <!-- Warning indicator for over capacity -->
      ${pct > 100 ? `<text x="100" y="120" text-anchor="middle" font-size="10" fill="var(--warn)">${pct > 120 ? 'Critical' : 'High'}</text>` : ''}
    </svg>
  `;
}

function createProfitWaterfall(metrics) {
  // Create a proper waterfall chart that shows the flow from revenue to profit
  const steps = [
    { label: 'Revenue', value: metrics.revenue },
    { label: '− Fixed', value: -metrics.fixedCosts },
    { label: '− Variable', value: -metrics.variableCosts },
    { label: 'Profit', value: metrics.income }
  ];

  // Calculate running totals for waterfall effect
  const runningTotals = [];
  let currentTotal = 0;

  for (const step of steps) {
    runningTotals.push(currentTotal);
    currentTotal += step.value;
  }

  // Chart dimensions
  const chartWidth = 280;
  const chartHeight = 140;
  const barWidth = 45;
  const barSpacing = 15;
  const totalBarWidth = barWidth + barSpacing;
  const marginBottom = 35; // Space for labels
  const marginTop = 20; // Space for title

  // Find value range for scaling
  const allValues = [...steps.map(s => s.value), ...runningTotals, 0];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue || 1;

  // Scale to fit chart height
  const availableHeight = chartHeight - marginTop - marginBottom;
  const scale = availableHeight / valueRange;
  const zeroY = marginTop + (maxValue * scale);

  // Create bars and connectors
  let bars = '';
  let connectors = '';

  steps.forEach((step, i) => {
    const x = i * totalBarWidth + barSpacing;
    const barStart = runningTotals[i];
    const barEnd = runningTotals[i] + step.value;

    // Determine bar color
    let color = 'var(--good)';
    if (step.value < 0) color = 'var(--bad)';
    if (i === steps.length - 1 && step.value < 0) color = 'var(--bad)'; // Profit bar

    // Calculate bar position and height
    const barTop = zeroY - Math.max(barStart, barEnd) * scale;
    const barBottom = zeroY - Math.min(barStart, barEnd) * scale;
    const barHeight = Math.abs(barBottom - barTop);

    // Ensure minimum bar height for visibility
    const minHeight = 2;
    const actualHeight = Math.max(barHeight, minHeight);
    const y = barEnd > barStart ? barTop : barBottom - actualHeight;

    // Create bar (ensure it stays within chart bounds)
    const safeY = Math.max(marginTop, y);
    const safeHeight = Math.min(chartHeight - marginBottom, actualHeight - (y - safeY));
    bars += `<rect x="${x}" y="${safeY}" width="${barWidth}" height="${Math.max(safeHeight, minHeight)}" fill="${color}" rx="2" opacity="0.9"/>`;

    // Add angled label above bar
    const labelX = x + barWidth/2;
    const labelY = Math.max(marginTop + 12, safeY - 8);
    const labelColor = barEnd >= 0 ? 'var(--text)' : 'var(--text-secondary)';
    bars += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="8" fill="${labelColor}" font-weight="bold" transform="rotate(-45 ${labelX} ${labelY})">${step.label}</text>`;

    // Add angled value below chart
    const valueX = x + barWidth/2;
    const valueY = chartHeight - 8;
    bars += `<text x="${valueX}" y="${valueY}" text-anchor="middle" font-size="7" fill="var(--text-secondary)" transform="rotate(-30 ${valueX} ${valueY})">${fmtMoney0(step.value)}</text>`;

    // Add connector to next bar (except last)
    if (i < steps.length - 1) {
      const nextX = (i + 1) * totalBarWidth + barSpacing;
      const connectorY = zeroY - barEnd * scale;
      connectors += `<line x1="${x + barWidth}" y1="${connectorY}" x2="${nextX}" y2="${connectorY}" stroke="var(--text-secondary)" stroke-width="2" opacity="0.6"/>`;
    }
  });

  // Zero line (only if zero is within range)
  const zeroLine = (minValue < 0 && maxValue > 0) ?
    `<line x1="0" y1="${zeroY}" x2="${chartWidth}" y2="${zeroY}" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>` : '';

  return `
    <svg width="320" height="160" viewBox="0 0 320 160">
      <!-- Zero line -->
      ${zeroLine}

      <!-- Connectors -->
      ${connectors}

      <!-- Bars -->
      ${bars}

      <!-- Chart title -->
      <text x="160" y="15" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--text)">Profit Waterfall</text>

      <!-- Final total label -->
      <text x="160" y="${chartHeight - 18}" text-anchor="middle" font-size="10" font-weight="bold" fill="${currentTotal >= 0 ? 'var(--good)' : 'var(--bad)'}">
        Total: ${fmtMoney0(currentTotal)}
      </text>
    </svg>
  `;
}
