import { lazyLoadChart } from "../utils/chartUtils";

// Import formatting utilities
const DEFAULT_CURRENCY = 'USD';
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtPct1 = (n) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';
const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

// DOM utility (make sure $ is available)
const $ = (selector) => {
  if (typeof document === 'undefined') return null;
  return document.querySelector(selector);
};

// HTML escape helper
const escapeHtml = (str) => {
  return String(str == null ? '' : str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

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
    if (!vizEl || !metrics) return;

    // Create utilization gauge
    const utilizationGauge = createUtilizationGauge(metrics);

    // Create profit/loss waterfall
    const profitWaterfall = createProfitWaterfall(metrics);

    vizEl.innerHTML = '<div class="viz-header"><h4 style="margin:0 0 16px 0;font-size:14px;color:var(--text);font-weight:600;">Simple Visualizations</h4></div><div class="viz-content"><div class="viz-item"><h5 style="margin:0 0 8px 0;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.3px;font-weight:600;">Utilization Gauge</h5>' + (utilizationGauge) + '</div><div class="viz-item"><h5 style="margin:0 0 8px 0;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.3px;font-weight:600;">Profit Waterfall</h5>' + (profitWaterfall) + '</div></div>';

    vizEl.style.display = 'block';
  }

export function createUtilizationGauge(metrics) {
    const utilization = Math.min(150, Math.max(0, metrics.capacityPct || 0));

    // Create a proper speedometer-style gauge
    // Range: 0-150%, with visual zones: green (0-75%), amber (75-100%), red (100-150%)
    const angle = -135 + (utilization / 150) * 270; // -135° to 135° (270° total sweep)
    const angleRad = (angle * Math.PI) / 180;

    // Needle positioning (from center, pointing at angle)
    const needleX = 60 + Math.cos(angleRad) * 35;
    const needleY = 60 + Math.sin(angleRad) * 35;

    // Determine color based on utilization
    const gaugeColor = utilization > 100 ? '#fb7185' : utilization > 75 ? '#fbbf24' : '#34d399';

    // Create gauge background with zones
    let svg = '<svg viewBox="0 0 120 100" class="gauge-svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));">';

    // Gauge background (light gray arc)
    svg += '<path d="M 25 60 A 35 35 0 1 1 95 60" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="6" stroke-linecap="round"/>';

    // Green zone (0-75%)
    svg += '<path d="M 25 60 A 35 35 0 0 1 55.96 26.27" fill="none" stroke="rgba(52,211,153,0.4)" stroke-width="6" stroke-linecap="round"/>';

    // Amber zone (75-100%)
    svg += '<path d="M 55.96 26.27 A 35 35 0 0 1 95 60" fill="none" stroke="rgba(251,191,36,0.4)" stroke-width="6" stroke-linecap="round"/>';

    // Red zone (100-150%) - would overflow but keeps visual consistency
    svg += '<path d="M 95 60 A 35 35 0 0 1 87.5 88.7" fill="none" stroke="rgba(251,113,133,0.4)" stroke-width="6" stroke-linecap="round"/>';

    // Fill arc (shows actual utilization)
    const fillAngle = -135 + Math.min(utilization, 150) / 150 * 270;
    const fillAngleRad = (fillAngle * Math.PI) / 180;
    const fillX = 60 + Math.cos(fillAngleRad) * 35;
    const fillY = 60 + Math.sin(fillAngleRad) * 35;
    const largeArc = Math.min(utilization, 150) > 75 ? 1 : 0;

    svg += '<path d="M 25 60 A 35 35 0 ' + largeArc + ' 1 ' + fillX + ' ' + fillY + '" fill="none" stroke="' + gaugeColor + '" stroke-width="6" stroke-linecap="round" opacity="0.9"/>';

    // Tick marks and labels
    const ticks = [0, 25, 50, 75, 100, 125, 150];
    ticks.forEach((tick) => {
      const tickAngle = (-135 + (tick / 150) * 270) * Math.PI / 180;
      const innerX = 60 + Math.cos(tickAngle) * 28;
      const innerY = 60 + Math.sin(tickAngle) * 28;
      const outerX = 60 + Math.cos(tickAngle) * 33;
      const outerY = 60 + Math.sin(tickAngle) * 33;

      svg += '<line x1="' + innerX + '" y1="' + innerY + '" x2="' + outerX + '" y2="' + outerY + '" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>';

      // Add labels for key points
      if (tick === 0 || tick === 75 || tick === 150) {
        const labelAngle = (-135 + (tick / 150) * 270) * Math.PI / 180;
        const labelX = 60 + Math.cos(labelAngle) * 18;
        const labelY = 60 + Math.sin(labelAngle) * 18;
        svg += '<text x="' + labelX + '" y="' + labelY + '" text-anchor="middle" dy=".3em" font-size="8" fill="var(--muted)" font-weight="500">' + tick + '%</text>';
      }
    });

    // Needle (pointer) - looks like a speedometer needle
    svg += '<line x1="60" y1="60" x2="' + needleX + '" y2="' + needleY + '" stroke="var(--text)" stroke-width="2.5" stroke-linecap="round"/>';
    svg += '<circle cx="60" cy="60" r="3.5" fill="var(--text)"/>';

    svg += '</svg>';

    return '<div class="utilization-gauge">' + svg + '<div class="gauge-labels"><div class="gauge-value">' + fmtPct1(utilization) + '</div><div class="gauge-text">Utilization</div></div></div>';
  }

export function createProfitWaterfall(metrics) {
    const items = [
      { label: 'Revenue', value: metrics.revenue, color: 'var(--good)' },
      { label: 'Variable Costs', value: -metrics.variableCosts, color: 'var(--bad)' },
      { label: 'Fixed & Payroll', value: -(metrics.annualFixedCosts + metrics.annualPayroll), color: 'var(--bad)' },
      { label: 'Net Profit', value: metrics.income, color: metrics.income >= 0 ? 'var(--good)' : 'var(--bad)' }
    ];

    // Normalize values for SVG scaling: find max absolute value to scale bars proportionally
    const maxAbsValue = Math.max(Math.abs(metrics.revenue), Math.abs(metrics.income), 1);
    const chartHeight = 40; // SVG units available for bars above/below zero line
    const scale = (val) => (Math.abs(val) / maxAbsValue) * chartHeight;
    const zeroLineY = 55; // SVG y-coordinate of zero line

    let runningTotal = 0;
    let barHTML = '';

    items.forEach((item, index) => {
      const startTotal = runningTotal;
      const endTotal = runningTotal + item.value;
      runningTotal = endTotal;

      const barHeight = scale(item.value);
      const isNegative = item.value < 0;
      const barY = isNegative
        ? zeroLineY  // negative bars start at zero and go down
        : zeroLineY - barHeight;  // positive bars start at zero and go up

      const x = 15 + index * 25;
      const barWidth = 18;

      // Bar
      barHTML += '<rect x="' + (x) + '" y="' + (barY) + '" width="' + (barWidth) + '" height="' + (barHeight) + '" fill="' + (item.color) + '" opacity="0.75" rx="2"/>';

      // Label below bar - smaller text, abbreviated
      const labelText = item.label.length > 6 ? item.label.substring(0, 3) : item.label.split(' ')[0];
      barHTML += '<text x="' + (x + barWidth / 2) + '" y="' + (zeroLineY + 10) + '" text-anchor="middle" font-size="7" fill="var(--muted)" font-weight="500">' + (labelText) + '</text>';

      // Value label above/below bar - smaller font, abbreviated currency
      const valueLabelY = isNegative ? zeroLineY + barHeight + 6 : barY - 2;
      const shortValue = item.value > 0 ? '$' + Math.round(item.value / 1000) + 'k' : '$' + Math.round(item.value / 1000) + 'k';
      barHTML += '<text x="' + (x + barWidth / 2) + '" y="' + (valueLabelY) + '" text-anchor="middle" font-size="6.5" fill="var(--text)" font-weight="600">' + (shortValue) + '</text>';

      // Connector line to next bar (except after last bar)
      if (index < items.length - 1) {
        const nextX = 15 + (index + 1) * 25;
        const nextStartY = isNegative ? zeroLineY : zeroLineY - scale(item.value);
        const connY = zeroLineY - scale(endTotal);
        barHTML += '<line x1="' + (x + barWidth) + '" y1="' + (nextStartY) + '" x2="' + (nextX) + '" y2="' + (connY) + '" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>';
      }
    });

    return '<div class="profit-waterfall"><svg viewBox="0 0 120 85" class="waterfall-svg"><!--Zero line--><line x1="5" y1="' + (zeroLineY) + '" x2="115" y2="' + (zeroLineY) + '" stroke="var(--border)" stroke-width="1.5" opacity="0.6"/>' + (barHTML) + '</svg><div class="waterfall-summary"><div class="summary-item"><span class="summary-label">Net:</span><span class="summary-value" style="color:' + (metrics.income >= 0 ? 'var(--good)' : 'var(--bad)') + ';">' + (fmtMoney0(metrics.income)) + '</span></div></div></div>';
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

// Helper function to set up basic chart interactivity with pinning support
function setupChartEventListeners(chartEl) {
  if (!chartEl) return;

  const tooltip = chartEl.querySelector('.chart-tooltip');
  if (!tooltip) return;

  let pinnedRect = null;

  // Get all chart rects
  const rects = chartEl.querySelectorAll('svg rect[data-offering]');

  const showTooltip = (rect, e) => {
    if (!rect) return;
    const offering = escapeHtml(rect.getAttribute('data-offering') || '');
    const type = escapeHtml(rect.getAttribute('data-type') || '');
    const variable = escapeHtml(rect.getAttribute('data-var') || '$0');
    const contrib = escapeHtml(rect.getAttribute('data-contrib') || '$0');
    const pct = escapeHtml(rect.getAttribute('data-pct') || '0%');

    let tooltipHTML = `<div class="tooltip-content"><strong>${offering}</strong>`;
    tooltipHTML += `<div style="font-size:11px;margin-top:4px;color:var(--muted);">${type === 'variable' ? 'Variable Cost' : 'Contribution'}: ${type === 'variable' ? variable : contrib}</div>`;
    tooltipHTML += `<div style="font-size:10px;color:var(--muted);margin-top:2px;">% of Revenue: ${pct}</div>`;

    // Add pin button if not already pinned
    if (pinnedRect !== rect) {
      tooltipHTML += `<button class="tooltip-pin-btn" style="background:none;border:none;color:var(--accent);font-size:11px;margin-top:6px;cursor:pointer;padding:2px 6px;border-radius:3px;border:1px solid var(--accent);opacity:0.7;">📌 Lock</button>`;
    } else {
      tooltipHTML += `<button class="tooltip-pin-btn" style="background:none;border:none;color:var(--accent);font-size:11px;margin-top:6px;cursor:pointer;padding:2px 6px;border-radius:3px;border:1px solid var(--accent);opacity:0.7;">🔒 Locked</button>`;
    }

    tooltipHTML += '</div>';
    tooltip.innerHTML = tooltipHTML;
    tooltip.classList.add('visible');
    tooltip.style.display = 'block';

    // Add click handler for pin button
    const pinBtn = tooltip.querySelector('.tooltip-pin-btn');
    if (pinBtn) {
      pinBtn.onclick = (ev) => {
        ev.stopPropagation();
        if (pinnedRect === rect) {
          pinnedRect = null;
          pinBtn.textContent = '📌 Lock';
        } else {
          pinnedRect = rect;
          pinBtn.textContent = '🔒 Locked';
        }
      };
    }
  };

  rects.forEach((rect) => {
    rect.addEventListener('mouseenter', (e) => {
      // Only show tooltip if not pinned, or if hovering over the pinned rect
      if (!pinnedRect || pinnedRect === rect) {
        showTooltip(rect, e);
      }
    });

    rect.addEventListener('mouseleave', () => {
      // Only hide if not pinned
      if (pinnedRect !== rect) {
        tooltip.classList.remove('visible');
        setTimeout(() => {
          tooltip.style.display = 'none';
          tooltip.innerHTML = '';
        }, 150);
      }
    });

    rect.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pinnedRect === rect) {
        pinnedRect = null;
        tooltip.classList.remove('visible');
        setTimeout(() => {
          tooltip.style.display = 'none';
          tooltip.innerHTML = '';
        }, 150);
      } else {
        pinnedRect = rect;
        showTooltip(rect, e);
      }
    });
  });

  // Click outside to unpin
  document.addEventListener('click', (e) => {
    if (pinnedRect && !chartEl.contains(e.target)) {
      pinnedRect = null;
      tooltip.classList.remove('visible');
      setTimeout(() => {
        tooltip.style.display = 'none';
        tooltip.innerHTML = '';
      }, 150);
    }
  });
}
