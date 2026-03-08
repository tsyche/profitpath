import { lazyLoadChart } from "../utils/chartUtils";
// Visualization Services

export function updateBreakEvenAnalysis(metrics) {
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

export function updateRichVisualizations(metrics) {
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

export function createUtilizationGauge(metrics) {
    const utilization = Math.min(150, Math.max(0, metrics.capacityPct || 0));
    const angle = (utilization / 150) * 180; // Semi-circle gauge

    return '<div class="utilization-gauge"><svg viewBox="0 0 120 80" class="gauge-svg"><!--Background arc--><path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/><!--Utilization arc--><path d="M 10 70 A 50 50 0 0 1 ' + (10 + Math.cos((angle - 90) * Math.PI / 180) * 50 + 50) + ' ' + (70 - Math.sin((angle - 90) * Math.PI / 180) * 50) + '" fill="none" stroke="' + (utilization > 100 ? 'var(--bad)' : utilization > 75 ? 'var(--warn)' : 'var(--good)') + '" stroke-width="8"/><!--Needle--><line x1="60" y1="70" x2="' + (60 + Math.cos((angle - 90) * Math.PI / 180) * 40) + '" y2="' + (70 - Math.sin((angle - 90) * Math.PI / 180) * 40) + '" stroke="var(--accent)" stroke-width="3"/><!--Center dot--><circle cx="60" cy="70" r="4" fill="var(--accent)"/></svg><div class="gauge-labels"><div class="gauge-value">' + (fmtPct1(utilization)) + '</div><div class="gauge-text">Utilization</div></div></div>';
  }

export function createProfitWaterfall(metrics) {
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

export function renderSimpleChart(metrics) {
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

export function hideTooltip() {
    if (pinned) return; // don't hide when pinned
    const tooltip = el.querySelector('.chart-tooltip');
    if (!tooltip) return;

    tooltip.classList.remove('visible');
    hideTimeout = setTimeout(() => {
      tooltip.style.display = 'none';
      tooltip.innerHTML = '';
    }, 150); // Short delay for normal hide
  }

export function unpinTooltip() {
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

export function setupTooltipButtons() {
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
