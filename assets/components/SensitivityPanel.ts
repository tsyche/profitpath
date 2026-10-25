import { calc } from '../../src/calculations/index';
import { scaleOverhead } from '../../src/calculations/expenses';
import { fmtMoney0 } from '../../src/calculations/currency';

/** Sensitivity analysis panel: sliders, comparison table and tornado chart. */

let state: any;

const $ = (sel: string) => document.querySelector<any>(sel);

// Sensitivity Analysis Panel
export function initSensitivityPanel(getState: () => any): void {
  state = getState();
  const toggle = $('#sensitivityToggle');
  const body = $('#sensitivityBody');
  if (!toggle || !body) return;

  // Restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-sensitivity-expanded');
  if (stored === '1') {
    // Small delay to allow CSS transitions to animate
    setTimeout(() => {
      body.classList.remove('collapsed');
      body.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
      initSliders();
    }, 50);
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    const expandedNow = !isCollapsed;
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    localStorage.setItem('profitpath-sensitivity-expanded', expandedNow ? '1' : '0');
    if (expandedNow) initSliders();
  });

  $('#sensitivityReset')?.addEventListener('click', () => {
    resetSliders();
    updateSensitivity();
  });
}

function initSliders() {
  const sliders = {
    price: $('#priceSlider'),
    overhead: $('#overheadSlider'),
    utilization: $('#utilizationSlider'),
    employees: $('#employeesSlider')
  };

  const labels = {
    price: '#priceSliderVal',
    overhead: '#overheadSliderVal',
    utilization: '#utilizationSliderVal',
    employees: '#employeesSliderVal'
  };

  // Get current state values for baseline
  const baseUtilization = state.productiveUtilizationPct || 75;
  const baseEmployees = state.employees || 1;

  sliders.utilization.value = baseUtilization;
  sliders.employees.value = baseEmployees;
  $(labels.utilization).textContent = baseUtilization + '%';
  $(labels.employees).textContent = baseEmployees;

  // Wire up slider input events
  sliders.price.addEventListener('input', (e: any) => {
    const val = parseInt(e.target.value);
    $(labels.price).textContent = (val >= 0 ? '+' : '') + val + '%';
    updateSensitivity();
  });

  sliders.overhead.addEventListener('input', (e: any) => {
    const val = parseInt(e.target.value);
    $(labels.overhead).textContent = (val >= 0 ? '+' : '') + val + '%';
    updateSensitivity();
  });

  sliders.utilization.addEventListener('input', (e: any) => {
    const val = parseInt(e.target.value);
    $(labels.utilization).textContent = val + '%';
    updateSensitivity();
  });

  sliders.employees.addEventListener('input', (e: any) => {
    const val = parseInt(e.target.value);
    $(labels.employees).textContent = val;
    updateSensitivity();
  });

  updateSensitivity();
}

export function resetSliders() {
  $('#priceSlider').value = 0;
  $('#overheadSlider').value = 0;
  $('#utilizationSlider').value = state.productiveUtilizationPct || 75;
  $('#employeesSlider').value = state.employees || 1;

  $('#priceSliderVal').textContent = '+0%';
  $('#overheadSliderVal').textContent = '+0%';
  $('#utilizationSliderVal').textContent = (state.productiveUtilizationPct || 75) + '%';
  $('#employeesSliderVal').textContent = state.employees || 1;
}

export function updateSensitivity() {
  // Get slider values
  const priceAdjust = (parseInt($('#priceSlider').value) || 0) / 100;
  const overheadAdjust = (parseInt($('#overheadSlider').value) || 0) / 100;
  const utilizationVal = parseInt($('#utilizationSlider').value) || 75;
  const employeesVal = parseInt($('#employeesSlider').value) || 1;

  // Build adjusted state copy
  const adjusted = JSON.parse(JSON.stringify(state));
  adjusted.productiveUtilizationPct = utilizationVal;
  adjusted.employees = employeesVal;

  // Apply price multiplier to all offerings
  if (priceAdjust !== 0) {
    adjusted.offerings = adjusted.offerings.map((o: any) => ({
      ...o,
      priceMonthly: o.priceMonthly * (1 + priceAdjust)
    }));
  }

  // Apply overhead multiplier
  if (overheadAdjust !== 0) {
    Object.assign(adjusted, scaleOverhead(adjusted, 1 + overheadAdjust));
  }

  // Calculate baseline and adjusted
  const baseline = calc(state);
  const adjustedMetrics = calc(adjusted);

  // Build comparison table
  const rows = [
    { label: 'Employees', baseline: state.employees || 1, adjusted: employeesVal, isCurrency: false },
    { label: 'Revenue', baseline: baseline.revenue, adjusted: adjustedMetrics.revenue, isCurrency: true },
    { label: 'Net Income', baseline: baseline.income, adjusted: adjustedMetrics.income, isCurrency: true },
    { label: 'Utilization', baseline: baseline.capacityPct, adjusted: adjustedMetrics.capacityPct, isCurrency: false, isPercent: true },
    { label: 'Break-even Clients', baseline: baseline.breakEvenClients, adjusted: adjustedMetrics.breakEvenClients, isCurrency: false },
    { label: 'Take-Home', baseline: baseline.takeHome, adjusted: adjustedMetrics.takeHome, isCurrency: true }
  ];

  let tableHtml = '<table class="sensitivity-comparison"><thead><tr><th title="The metric being compared">Metric</th><th title="Current value from your saved state">Baseline</th><th title="Value after applying slider adjustments">Adjusted</th><th title="Difference between adjusted and baseline (green = positive, red = negative)">Change</th></tr></thead><tbody>';
  rows.forEach(row => {
    const baseVal = row.isCurrency ? fmtMoney0(row.baseline) : (row.isPercent ? Math.round(row.baseline) + '%' : Math.round(row.baseline));
    const adjVal = row.isCurrency ? fmtMoney0(row.adjusted) : (row.isPercent ? Math.round(row.adjusted) + '%' : Math.round(row.adjusted));
    const delta = row.adjusted - row.baseline;
    const deltaFormatted = row.isCurrency ? fmtMoney0(delta) : (row.isPercent ? Math.round(delta) + '%' : Math.round(delta));
    const deltaClass = delta > 0 ? 'sens-better' : (delta < 0 ? 'sens-worse' : 'sens-neutral');
    const sign = delta >= 0 ? '+' : '';
    tableHtml += `<tr><td>${row.label}</td><td>${baseVal}</td><td>${adjVal}</td><td class="${deltaClass}">${sign}${deltaFormatted}</td></tr>`;
  });
  tableHtml += '</tbody></table>';

  // Build tornado chart (horizontal bars showing impact of current slider adjustments)
  const impacts = [];

  // Price impact (current slider adjustment or default ±20%)
  if (priceAdjust !== 0) {
    const priceOnly = JSON.parse(JSON.stringify(state));
    priceOnly.offerings = priceOnly.offerings.map((o: any) => ({ ...o, priceMonthly: o.priceMonthly * (1 + priceAdjust) }));
    const priceOnlyMetrics = calc(priceOnly);
    impacts.push({ label: 'Price', impact: Math.abs(priceOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const priceUp = JSON.parse(JSON.stringify(state));
    priceUp.offerings = priceUp.offerings.map((o: any) => ({ ...o, priceMonthly: o.priceMonthly * 1.2 }));
    const priceDownMetrics = calc(priceUp);
    impacts.push({ label: 'Price', impact: Math.abs(priceDownMetrics.income - baseline.income) });
  }

  // Overhead impact (current slider adjustment or default ±20%)
  if (overheadAdjust !== 0) {
    const overheadOnly = JSON.parse(JSON.stringify(state));
    const overheadOnlyMetrics = calc(scaleOverhead(overheadOnly, 1 + overheadAdjust));
    impacts.push({ label: 'Overhead', impact: Math.abs(overheadOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const overheadUp = JSON.parse(JSON.stringify(state));
    const overheadDownMetrics = calc(scaleOverhead(overheadUp, 1.2));
    impacts.push({ label: 'Overhead', impact: Math.abs(baseline.income - overheadDownMetrics.income) });
  }

  // Utilization impact (current slider adjustment or default ±20%)
  const utilDelta = utilizationVal - (state.productiveUtilizationPct || 75);
  if (utilDelta !== 0) {
    const utilOnly = JSON.parse(JSON.stringify(state));
    utilOnly.productiveUtilizationPct = utilizationVal;
    const utilOnlyMetrics = calc(utilOnly);
    impacts.push({ label: 'Utilization', impact: Math.abs(utilOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const utilUp = JSON.parse(JSON.stringify(state));
    utilUp.productiveUtilizationPct = Math.min(150, (utilUp.productiveUtilizationPct || 75) * 1.2);
    const utilDownMetrics = calc(utilUp);
    impacts.push({ label: 'Utilization', impact: Math.abs(utilDownMetrics.income - baseline.income) });
  }

  // Employees impact (current slider adjustment or default ±20%)
  const empDelta = employeesVal - (state.employees || 1);
  if (empDelta !== 0) {
    const empOnly = JSON.parse(JSON.stringify(state));
    empOnly.employees = employeesVal;
    if (empOnly.fullTimeEmployees) empOnly.fullTimeEmployees = employeesVal;
    const empOnlyMetrics = calc(empOnly);
    impacts.push({ label: 'Employees', impact: Math.abs(empOnlyMetrics.income - baseline.income) });
  } else {
    // Show default +20% impact if not adjusted
    const empUp = JSON.parse(JSON.stringify(state));
    empUp.employees = Math.min(20, (empUp.employees || 1) * 1.2);
    const empDownMetrics = calc(empUp);
    impacts.push({ label: 'Employees', impact: Math.abs(empDownMetrics.income - baseline.income) });
  }

  // Sort by label to maintain consistent order (not by impact value)
  const labelOrder = ['Price', 'Overhead', 'Utilization', 'Employees'];
  impacts.sort((a, b) => {
    const idxA = labelOrder.indexOf(a.label);
    const idxB = labelOrder.indexOf(b.label);
    return idxA - idxB;
  });
  const maxImpact = Math.max(...impacts.map(i => i.impact), 1);

  // Build tornado SVG
  const barHeight = 20;
  const gap = 5;
  const labelWidth = 100;
  const chartWidth = 250;
  const valueWidth = 100; // space for the value text (increased for larger numbers like 15,790)
  let tornadoSvg = `<svg width="${labelWidth + chartWidth + valueWidth}" height="${impacts.length * (barHeight + gap) + 40}" style="margin-top: 8px;">`;
  tornadoSvg += '<text x="0" y="15" font-size="12" fill="var(--muted)" font-weight="600">Impact on Net Income</text>';

  impacts.forEach((item, idx) => {
    const y = 30 + idx * (barHeight + gap);
    const barWidth = (item.impact / maxImpact) * chartWidth;
    const tooltipText = getTornadoTooltip(item.label);
    tornadoSvg += `<text x="0" y="${y + barHeight - 3}" font-size="11" fill="var(--muted)">${item.label}</text>`;
    tornadoSvg += `<rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight - 2}" fill="var(--accent)" opacity="0.6" rx="2"><title>${tooltipText}</title></rect>`;
    tornadoSvg += `<text x="${labelWidth + barWidth + 4}" y="${y + barHeight - 3}" font-size="10" fill="var(--muted)" font-family="var(--mono)">${fmtMoney0(item.impact)}</text>`;
  });

  tornadoSvg += '</svg>';

  // Render into results div
  const resultsDiv = $('#sensitivityResults');
  if (resultsDiv) {
    resultsDiv.innerHTML = tableHtml + tornadoSvg;
  }
}

// Helper function to get tooltip text for tornado chart bars
function getTornadoTooltip(label: string) {
  const tooltips: Record<string, string> = {
    'Price': 'Impact of pricing changes on net income (revenue effect)',
    'Overhead': 'Impact of overhead cost changes on net income (cost effect)',
    'Utilization': 'Impact of utilization changes on net income (capacity effect)',
    'Employees': 'Impact of team size changes on net income (capacity + cost effect)'
  };
  return tooltips[label] || 'Impact on net income';
}
