// Advanced Chart Types: multi-variable sensitivity heat map, balanced-scorecard
// radar chart, and client-capacity funnel. Follows the same hand-rolled
// SVG/HTML-string pattern as visualizationService.js (no chart library dep).
import { escapeHtml } from './miscService.js';
import { calc } from '../../src/calculations/index.js';

const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

// ============================================================================
// Heat Map — income across a grid of price % and utilization % adjustments
// ============================================================================

const HEATMAP_PRICE_STEPS = [-20, -10, 0, 10, 20];
const HEATMAP_UTIL_STEPS = [-20, -10, 0, 10, 20];

/**
 * Computes a 2D grid of projected income across price and utilization deltas.
 * @param {Object} state - Application state
 * @returns {{priceSteps: number[], utilSteps: number[], cells: Array<Array<{income: number}>>}}
 */
export function computeHeatmapData(state) {
  const baseUtilization = Number(state.productiveUtilizationPct) || 75;

  const cells = HEATMAP_PRICE_STEPS.map((priceAdjust) =>
    HEATMAP_UTIL_STEPS.map((utilAdjust) => {
      const adjusted = {
        ...state,
        productiveUtilizationPct: Math.min(100, Math.max(0, baseUtilization + utilAdjust)),
        offerings: (state.offerings || []).map((o) => ({
          ...o,
          priceMonthly: o.priceMonthly * (1 + priceAdjust / 100)
        }))
      };
      const result = calc(adjusted, { enableCache: false });
      return { income: result.income };
    })
  );

  return { priceSteps: HEATMAP_PRICE_STEPS, utilSteps: HEATMAP_UTIL_STEPS, cells };
}

/**
 * Renders the heat map as a colored HTML table (diverging red→green by income).
 * @param {Object} state - Application state
 * @returns {string} HTML
 */
export function renderSensitivityHeatmap(state) {
  const { priceSteps, utilSteps, cells } = computeHeatmapData(state);

  const allIncomes = cells.flat().map((c) => c.income);
  const maxAbs = Math.max(...allIncomes.map((v) => Math.abs(v)), 1);

  const colorFor = (income) => {
    // Diverging scale: red at -maxAbs, amber near 0, green at +maxAbs
    const ratio = Math.max(-1, Math.min(1, income / maxAbs));
    if (ratio >= 0) {
      return `rgba(52, 211, 153, ${(0.15 + ratio * 0.55).toFixed(2)})`;
    }
    return `rgba(251, 113, 133, ${(0.15 + Math.abs(ratio) * 0.55).toFixed(2)})`;
  };

  let html = '<table class="heatmap-table"><thead><tr><th title="Price change (rows) vs. utilization change (columns)">Price \\ Util</th>';
  utilSteps.forEach((u) => {
    html += `<th>${u >= 0 ? '+' : ''}${u}%</th>`;
  });
  html += '</tr></thead><tbody>';

  priceSteps.forEach((p, rowIdx) => {
    html += `<tr><th>${p >= 0 ? '+' : ''}${p}%</th>`;
    utilSteps.forEach((_u, colIdx) => {
      const income = cells[rowIdx][colIdx].income;
      const bg = colorFor(income);
      html += `<td style="background:${bg};" title="Price ${p >= 0 ? '+' : ''}${p}%, Utilization ${_u >= 0 ? '+' : ''}${_u}%: ${escapeHtml(fmtMoney0(income))} net income">${escapeHtml(fmtMoney0(income))}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

// ============================================================================
// Radar Chart — balanced scorecard across 5 dimensions, each normalized 0-100
// ============================================================================

/**
 * Computes normalized (0-100) scores for a balanced-scorecard view.
 * @param {Object} metrics - calc() result
 * @returns {Object} Scores keyed by dimension
 */
export function computeScorecardData(metrics) {
  const revenue = Number(metrics.revenue) || 0;
  const income = Number(metrics.income) || 0;
  const capacityPct = Number(metrics.capacityPct) || 0;
  const contributionMarginRatio = Number(metrics.contributionMarginRatio) || 0;
  const offeringMetrics = Array.isArray(metrics.offeringMetrics) ? metrics.offeringMetrics : [];

  // Profitability: net margin (income / revenue), clamped to 0-100
  const profitability = revenue > 0 ? Math.max(0, Math.min(100, (income / revenue) * 100)) : 0;

  // Utilization: capacity used relative to a sensible 100% ceiling
  const utilization = Math.max(0, Math.min(100, capacityPct));

  // Growth headroom: how much room remains before hitting 100% capacity
  const growthHeadroom = Math.max(0, Math.min(100, 100 - capacityPct));

  // Cost efficiency: contribution margin ratio as a direct percentage
  const costEfficiency = Math.max(0, Math.min(100, contributionMarginRatio * 100));

  // Diversification: 1 - largest revenue share across offerings (evenly split = high score)
  const totalRevenue = offeringMetrics.reduce((sum, m) => sum + (Number(m.revenue) || 0), 0);
  const maxShare = totalRevenue > 0
    ? Math.max(...offeringMetrics.map((m) => (Number(m.revenue) || 0) / totalRevenue), 0)
    : 1;
  const diversification = offeringMetrics.length > 1 ? Math.max(0, Math.min(100, (1 - maxShare) * 100 * (offeringMetrics.length / (offeringMetrics.length - 1 || 1)))) : 0;

  return {
    profitability: Math.round(profitability),
    utilization: Math.round(utilization),
    growthHeadroom: Math.round(growthHeadroom),
    costEfficiency: Math.round(costEfficiency),
    diversification: Math.round(Math.min(100, diversification))
  };
}

const RADAR_LABELS = {
  profitability: 'Profitability',
  utilization: 'Utilization',
  growthHeadroom: 'Growth Headroom',
  costEfficiency: 'Cost Efficiency',
  diversification: 'Diversification'
};

/**
 * Renders a 5-axis radar/spider SVG chart from scorecard data.
 * @param {Object} metrics - calc() result
 * @returns {string} HTML
 */
export function renderScorecardRadar(metrics) {
  const scores = computeScorecardData(metrics);
  const axes = Object.keys(RADAR_LABELS);
  const n = axes.length;
  const cx = 60, cy = 55, maxR = 42;

  const pointFor = (idx, value) => {
    const angle = -Math.PI / 2 + (idx / n) * Math.PI * 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxR;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  let svg = '<svg viewBox="0 0 120 110" class="radar-svg">';

  // Grid rings
  gridLevels.forEach((level) => {
    const ringPoints = axes.map((_, idx) => {
      const angle = -Math.PI / 2 + (idx / n) * Math.PI * 2;
      const r = level * maxR;
      return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
    }).join(' ');
    svg += `<polygon points="${ringPoints}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>`;
  });

  // Axis lines + labels
  axes.forEach((axis, idx) => {
    const angle = -Math.PI / 2 + (idx / n) * Math.PI * 2;
    const outerX = cx + Math.cos(angle) * maxR;
    const outerY = cy + Math.sin(angle) * maxR;
    svg += `<line x1="${cx}" y1="${cy}" x2="${outerX.toFixed(1)}" y2="${outerY.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>`;

    const labelX = cx + Math.cos(angle) * (maxR + 10);
    const labelY = cy + Math.sin(angle) * (maxR + 10);
    svg += `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dy=".3em" font-size="6" fill="var(--muted)">${escapeHtml(RADAR_LABELS[axis])}</text>`;
  });

  // Data polygon
  const dataPoints = axes.map((axis, idx) => {
    const p = pointFor(idx, scores[axis]);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
  svg += `<polygon points="${dataPoints}" fill="rgba(94,234,212,0.28)" stroke="var(--accent, #5eead4)" stroke-width="1.5"/>`;

  // Data points
  axes.forEach((axis, idx) => {
    const p = pointFor(idx, scores[axis]);
    svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" fill="var(--accent, #5eead4)"><title>${escapeHtml(RADAR_LABELS[axis])}: ${scores[axis]}</title></circle>`;
  });

  svg += '</svg>';

  const legend = axes.map((axis) =>
    `<div class="radar-legend-item"><span class="radar-legend-label">${escapeHtml(RADAR_LABELS[axis])}</span><span class="radar-legend-value">${scores[axis]}</span></div>`
  ).join('');

  return `<div class="scorecard-radar">${svg}<div class="radar-legend">${legend}</div></div>`;
}

// ============================================================================
// Funnel Chart — capacity → target → actual clients → break-even
// ============================================================================

/**
 * Computes funnel stage values (all expressed as client counts).
 * @param {Object} metrics - calc() result
 * @returns {Array<{label: string, value: number}>}
 */
export function computeFunnelData(metrics) {
  const serviceHoursPerClient = Number(metrics.serviceHoursPerClient) || 0;
  const annualServiceHours = Number(metrics.annualServiceHours) || 0;
  const capacityClients = serviceHoursPerClient > 0 ? Math.floor(annualServiceHours / serviceHoursPerClient) : 0;
  const targetClients = Number(metrics.clients) || 0;
  const breakEvenClients = Number.isFinite(metrics.breakEvenClients) ? Math.round(metrics.breakEvenClients) : 0;

  return [
    { label: 'Max Capacity', value: Math.max(capacityClients, targetClients, breakEvenClients) },
    { label: 'Target Clients', value: targetClients },
    { label: 'Break-even Clients', value: breakEvenClients }
  ].filter((stage) => stage.value >= 0);
}

/**
 * Renders the client-capacity funnel as a series of proportionally-scaled bars.
 * @param {Object} metrics - calc() result
 * @returns {string} HTML
 */
export function renderClientFunnel(metrics) {
  const stages = computeFunnelData(metrics);
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  const rows = stages.map((stage) => {
    const widthPct = maxValue > 0 ? Math.max(2, (stage.value / maxValue) * 100) : 0;
    return `<div class="funnel-row">
      <div class="funnel-label">${escapeHtml(stage.label)}</div>
      <div class="funnel-bar-track"><div class="funnel-bar-fill" style="width:${widthPct.toFixed(1)}%;"></div></div>
      <div class="funnel-value">${escapeHtml(fmtInt(stage.value))}</div>
    </div>`;
  }).join('');

  return `<div class="client-funnel">${rows}</div>`;
}
