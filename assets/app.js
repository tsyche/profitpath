const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Constants for business model assumptions
const HOURS_PER_YEAR = 2080; // Standard paid hours per employee per year
const DEFAULT_CURRENCY = 'USD';
// Chart tooltip options: toggle what extra info to display
const CHART_TOOLTIP_OPTIONS = {
  showPercent: true,
  showHoursPerCustomer: true,
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

function defaultOfferings() {
  return [
    // Provide non-zero currentCustomers so switching modes immediately shows calculations.
    { id: uuid(), name: 'Weekly', priceMonthly: 200, visitsPerYear: 52, hoursPerVisit: 1.0, variableCostPerVisit: 0, mixPct: 33.0, currentCustomers: 6 },
    { id: uuid(), name: 'Biweekly', priceMonthly: 140, visitsPerYear: 26, hoursPerVisit: 1.0, variableCostPerVisit: 0, mixPct: 33.0, currentCustomers: 8 },
    { id: uuid(), name: 'Monthly', priceMonthly: 100, visitsPerYear: 12, hoursPerVisit: 1.0, variableCostPerVisit: 0, mixPct: 34.0, currentCustomers: 10 },
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
      visitsPerYear: Math.max(0, Number(o.visitsPerYear) || 0),
      hoursPerVisit: Math.max(0, Number(o.hoursPerVisit) || 0),
      variableCostPerVisit: Math.max(0, Number(o.variableCostPerVisit) || 0),
      mixPct: Math.max(0, Number(o.mixPct) || 0),
      currentCustomers: Math.max(0, Math.floor(Number(o.currentCustomers) || 0)),
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
      customers: 0,
      totalVisits: 0,
      hoursUsed: 0,
      capacityPct: 0,
      revenue: 0,
      variableCosts: 0,
      income: -annualFixedCosts - annualPayroll,
      mixSum: 0,
      mixNormalized: false,
    };
  }

  let customers = 0;
  let totalVisits = 0;
  let hoursUsed = 0;
  let capacityPct = 0;
  let revenue = 0;
  let variableCosts = 0;

  if (mode === 'forecast') {
    const { sum: mixSum, needsNormalization: mixNormalized, shares } = normalizeMix(offerings);

    const targetUtilizationPct = clamp(Number(s.targetUtilizationPct) || 0, 0, 150);
    hoursUsed = annualServiceHours * (targetUtilizationPct / 100);

    // Per-customer expectations (weighted by mix shares).
    // shares[] always sums to 1, even if the user-entered mix doesn't sum to 100.
    const hoursPerCustomer = offerings.reduce((acc, o, idx) => {
      const share = shares[idx] || 0;
      return acc + share * o.visitsPerYear * o.hoursPerVisit;
    }, 0);

    const visitsPerCustomer = offerings.reduce((acc, o, idx) => acc + (shares[idx] || 0) * o.visitsPerYear, 0);

    const revenuePerCustomer = offerings.reduce((acc, o, idx) => acc + (shares[idx] || 0) * (o.priceMonthly * 12), 0);

    const variableCostPerCustomer = offerings.reduce((acc, o, idx) => acc + (shares[idx] || 0) * (o.visitsPerYear * o.variableCostPerVisit), 0);

    customers = hoursPerCustomer > 0 ? Math.floor(hoursUsed / hoursPerCustomer) : 0;
    totalVisits = customers * visitsPerCustomer;
    revenue = customers * revenuePerCustomer;
    variableCosts = customers * variableCostPerCustomer;

    capacityPct = annualServiceHours > 0 ? (hoursUsed / annualServiceHours) * 100 : 0;

    // Per-offering metrics for forecast mode
    const offeringMetrics = offerings.map((o, idx) => {
      const share = shares[idx] || 0;
      const offeringCustomers = Math.floor(customers * share);
      const offeringVisits = offeringCustomers * o.visitsPerYear;
      const offeringRevenue = offeringCustomers * (o.priceMonthly * 12);
      const offeringVariableCosts = offeringVisits * o.variableCostPerVisit;
      const offeringMargin = offeringRevenue - offeringVariableCosts;
      const offeringMarginPct = offeringRevenue > 0 ? (offeringMargin / offeringRevenue) * 100 : 0;
      const hoursPerCustomerOffering = o.visitsPerYear * o.hoursPerVisit;

      return {
        revenue: offeringRevenue,
        variableCosts: offeringVariableCosts,
        margin: offeringMargin,
        marginPct: offeringMarginPct,
        hoursPerCustomer: hoursPerCustomerOffering,
      };
    });

    return {
      mode,
      offerings,
      annualPaidHours,
      annualServiceHours,
      annualFixedCosts,
      annualPayroll,
      customers,
      totalVisits,
      hoursUsed,
      capacityPct,
      revenue,
      variableCosts,
      income: revenue - annualFixedCosts - annualPayroll - variableCosts,
      mixSum,
      mixNormalized,
      targetUtilizationPct,
      productiveUtilizationPct,
      offeringMetrics,
    };
  }

  // current mode
  customers = offerings.reduce((a, o) => a + o.currentCustomers, 0);
  totalVisits = offerings.reduce((a, o) => a + o.currentCustomers * o.visitsPerYear, 0);
  hoursUsed = offerings.reduce((a, o) => a + o.currentCustomers * o.visitsPerYear * o.hoursPerVisit, 0);
  revenue = offerings.reduce((a, o) => a + o.currentCustomers * o.priceMonthly * 12, 0);
  variableCosts = offerings.reduce((a, o) => a + o.currentCustomers * o.visitsPerYear * o.variableCostPerVisit, 0);

  capacityPct = annualServiceHours > 0 ? (hoursUsed / annualServiceHours) * 100 : 0;

  // Per-offering metrics for current mode
  const offeringMetrics = offerings.map((o) => {
    const offeringRevenue = o.currentCustomers * (o.priceMonthly * 12);
    const offeringVisits = o.currentCustomers * o.visitsPerYear;
    const offeringVariableCosts = offeringVisits * o.variableCostPerVisit;
    const offeringMargin = offeringRevenue - offeringVariableCosts;
    const offeringMarginPct = offeringRevenue > 0 ? (offeringMargin / offeringRevenue) * 100 : 0;
    const hoursPerCustomerOffering = o.visitsPerYear * o.hoursPerVisit;

    return {
      revenue: offeringRevenue,
      variableCosts: offeringVariableCosts,
      margin: offeringMargin,
      marginPct: offeringMarginPct,
      hoursPerCustomer: hoursPerCustomerOffering,
    };
  });

  return {
    mode,
    offerings,
    annualPaidHours,
    annualServiceHours,
    annualFixedCosts,
    annualPayroll,
    customers,
    totalVisits,
    hoursUsed,
    capacityPct,
    revenue,
    variableCosts,
    income: revenue - annualFixedCosts - annualPayroll - variableCosts,
    mixSum: offerings.reduce((a, o) => a + (o.mixPct || 0), 0),
    mixNormalized: false,
    productiveUtilizationPct,
    offeringMetrics,
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
    const hoursPerCustomer = Number(o.visitsPerYear || 0) * Number(o.hoursPerVisit || 0);
    const pct = totalRevenue > 0 ? (rev / totalRevenue) : 0;
    return { name: o.name || `Offering ${idx + 1}`, rev, variable, contrib, hoursPerCustomer, pct };
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
      rects.push({ x: x, w: varPct, color: 'rgba(251,113,133,0.6)', offering: d.name, type: 'variable', varVal: d.variable, contribVal: d.contrib, pct: d.pct, hours: d.hoursPerCustomer });
    }

    // contribution rect (may be zero)
    if (contribPct > 0) {
      rects.push({ x: x + varPct, w: contribPct, color: 'rgba(52,211,153,0.6)', offering: d.name, type: 'contrib', varVal: d.variable, contribVal: d.contrib, pct: d.pct, hours: d.hoursPerCustomer });
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

  // Wire up custom hover & pin tooltip for rects (uses data-* attributes). Adds clamping, flip, fade, and pin-on-click.
  const tooltip = el.querySelector('.chart-tooltip');
  let hideTimeout = null;
  let pinned = false;
  let pinnedRect = null;
  // Smooth follow variables
  let rafId = null;
  const tooltipCurrent = { x: 0, y: 0 };
  const tooltipTarget = { x: 0, y: 0 };
  const SMOOTH_FACTOR = 0.22; // 0..1, lower is smoother/slower
  const HOVER_OFFSET = 6; // px gap between bar and tooltip when hovering
  let tooltipIsShown = false;

  function startFollow() {
    if (rafId) return;
    function step() {
      const dx = tooltipTarget.x - tooltipCurrent.x;
      const dy = tooltipTarget.y - tooltipCurrent.y;
      tooltipCurrent.x += dx * SMOOTH_FACTOR;
      tooltipCurrent.y += dy * SMOOTH_FACTOR;
      tooltip.style.left = `${tooltipCurrent.x}px`;
      tooltip.style.top = `${tooltipCurrent.y}px`;
      // stop when very close
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  function stopFollow() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
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
    if (CHART_TOOLTIP_OPTIONS.showHoursPerCustomer) {
      html += `<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:4px">Hours/customer: ${hours}</div>`;
    }

    tooltip.innerHTML = html;
    tooltip.classList.add('visible');
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'visible';
    // wire close and pin buttons
    const closeBtn = tooltip.querySelector('.tooltip-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        pinned = false;
        pinnedRect = null;
        tooltip.classList.remove('pinned');
        tooltip.classList.remove('visible');
        updatePinnedIndicator(null);
        setTimeout(() => (tooltip.style.display = 'none'), 180);
      });
    }
    const pinBtn = tooltip.querySelector('.tooltip-pin');
    if (pinBtn) {
      pinBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // toggle pinned state
        pinned = !pinned;
        if (pinned) {
          pinnedRect = rectEl;
          tooltip.classList.add('pinned');
          pinBtn.textContent = '📍';
          updatePinnedIndicator(rectEl);
        } else {
          pinnedRect = null;
          tooltip.classList.remove('pinned');
          pinBtn.textContent = '📌';
          updatePinnedIndicator(null);
        }
      });
    }

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
      // hovering behavior: always above at fixed offset (smooth follow)
      const offset = HOVER_OFFSET; // px gap between bar and tooltip
      const topPos = Math.max(8, rectBox.top - containerBox.top - tipRect.height - offset);
      tooltip.classList.remove('below');
      // set target and start smooth follow; if first show, snap immediately
      tooltipTarget.x = leftClamped;
      tooltipTarget.y = topPos;
      if (!tooltipIsShown) {
        // initial placement: snap without animation to avoid large jump
        tooltipCurrent.x = tooltipTarget.x;
        tooltipCurrent.y = tooltipTarget.y;
        tooltip.style.left = `${tooltipCurrent.x}px`;
        tooltip.style.top = `${tooltipCurrent.y}px`;
        tooltipIsShown = true;
      } else {
        startFollow();
      }
    } else {
      // pinned behavior: behave as before, allow below if needed
      const y = clientY !== null ? clientY - containerBox.top : centerY;
      const leftFromMouse = clientX !== null ? clientX - containerBox.left : xAnchor;
      const leftClamped2 = Math.min(Math.max(leftFromMouse, leftMin), leftMax);

      const tipRect2 = tooltip.getBoundingClientRect();
      const spaceAbove = centerY;
      const spaceBelow = containerBox.height - centerY;
      const placeBelow = spaceBelow > tipRect2.height + 16 && spaceBelow > spaceAbove;

      if (placeBelow) tooltip.classList.add('below'); else tooltip.classList.remove('below');

      const topPos = placeBelow ? Math.min(containerBox.height - 8, y + 12) : Math.max(8, y - 12);
      tooltip.style.left = `${leftClamped2}px`;
      tooltip.style.top = `${topPos}px`;
    }

    if (pinnedNow) {
      pinned = true;
      pinnedRect = rectEl;
      tooltip.classList.add('pinned');
      updatePinnedIndicator(rectEl);
      stopFollow();
    }
  }

  function hideTooltip() {
    if (pinned) return; // don't hide when pinned
    tooltip.classList.remove('visible');
    tooltip.classList.remove('below');
    hideTimeout = setTimeout(() => {
      tooltip.style.display = 'none';
      tooltip.innerHTML = '';
      tooltipIsShown = false;
      stopFollow();
    }, 180);
  }

  function unpinTooltip() {
    pinned = false;
    pinnedRect = null;
    tooltip.classList.remove('pinned');
    tooltip.classList.remove('visible');
    updatePinnedIndicator(null);
    setTimeout(() => {
      tooltip.style.display = 'none';
      tooltipIsShown = false;
      stopFollow();
    }, 180);
  }

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
  document.addEventListener('click', (ev) => {
    if (!pinned) return;
    if (!el.contains(ev.target)) unpinTooltip();
  });

  // escape key to close
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && pinned) {
      unpinTooltip();
    }
  });
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

    const customersCell = isForecast
      ? `<span class="muted">—</span>`
      : `<input aria-label="Customers for ${escapeHtml(o.name)}" class="mode-edit" type="number" min="0" step="1" value="${o.currentCustomers ?? 0}" data-k="currentCustomers" data-i="${idx}" />`;

    const estCustomers = isForecast
      ? Math.floor(metrics.customers * ((o.mixPct || 0) / 100))
      : o.currentCustomers;

    const estVisits = isForecast
      ? Math.round(estCustomers * o.visitsPerYear)
      : Math.round((o.currentCustomers || 0) * o.visitsPerYear);

    tr.innerHTML = `
      <td class="cell-edit group-start group-inputs" data-label="Offering"><input aria-label="Offering name" type="text" value="${escapeHtml(o.name)}" data-k="name" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs" data-label="Price / mo"><input aria-label="Price per month for ${escapeHtml(o.name)}" type="number" min="0" step="10" value="${o.priceMonthly}" data-k="priceMonthly" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs" data-label="Visits / yr"><input aria-label="Visits per year for ${escapeHtml(o.name)}" type="number" min="0" step="1" value="${o.visitsPerYear}" data-k="visitsPerYear" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs" data-label="Hours / visit"><input aria-label="Hours per visit for ${escapeHtml(o.name)}" type="number" min="0" step="0.1" value="${o.hoursPerVisit}" data-k="hoursPerVisit" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs group-end" data-label="Var $ / visit"><input aria-label="Variable cost per visit for ${escapeHtml(o.name)}" type="number" min="0" step="1" value="${o.variableCostPerVisit}" data-k="variableCostPerVisit" data-i="${idx}" /></td>
      <td class="cell-edit group-start group-mode" data-label="Mix % (forecast)">${mixCell}</td>
      <td class="cell-edit group-mode group-end" data-label="Customers (current)">${customersCell}</td>
      <td class="cell-readonly group-start group-est" data-label="Est. customers"><span class="mono">${fmtInt(estCustomers)}</span></td>
      <td class="cell-readonly group-est" data-label="Est. Service Count"><span class="mono">${fmtInt(estVisits)}</span></td>
      <td class="cell-readonly group-metrics" data-label="Annual Revenue"><span class="mono">${fmtMoney0(metrics.offeringMetrics[idx]?.revenue || 0)}</span></td>
      <td class="cell-readonly group-metrics" data-label="Margin %"><span class="mono" style="color: ${(metrics.offeringMetrics[idx]?.marginPct || 0) >= 50 ? 'var(--good)' : (metrics.offeringMetrics[idx]?.marginPct || 0) >= 30 ? 'var(--warn)' : 'var(--bad)'}">${fmtPct1(metrics.offeringMetrics[idx]?.marginPct || 0)}</span></td>
      <td class="cell-readonly group-metrics group-end" data-label="Hours / Customer"><span class="mono">${(metrics.offeringMetrics[idx]?.hoursPerCustomer || 0).toFixed(1)}</span></td>
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
    const total = metrics.offerings.reduce((a, o) => a + (Number(o.currentCustomers) || 0), 0);
    mixNote.classList.add('note-current');
    mixNote.textContent = total > 0
      ? 'Current mode: editing Customers (utilization computed from workload)'
      : 'Current mode: start by entering Customers';
  }

  // KPIs
  $('#kpiCustomers').textContent = fmtInt(metrics.customers);
  $('#kpiVisits').textContent = fmtInt(metrics.totalVisits);
  $('#kpiHours').textContent = fmtInt(metrics.hoursUsed);
  $('#kpiCapacity').textContent = fmtPct1(metrics.capacityPct);

  $('#kpiRevenue').textContent = fmtMoney0(metrics.revenue);
  $('#kpiFixedCosts').textContent = fmtMoney0(metrics.annualFixedCosts);
  $('#kpiPayroll').textContent = fmtMoney0(metrics.annualPayroll);
  $('#kpiVariableCosts').textContent = fmtMoney0(metrics.variableCosts);

  const incomeEl = $('#kpiIncome');
  incomeEl.textContent = fmtMoney0(metrics.income);
  incomeEl.style.color = metrics.income >= 60000 ? 'var(--good)' : metrics.income >= 0 ? 'var(--warn)' : 'var(--bad)';

  // Capacity meter
  const cap = clamp(metrics.capacityPct, 0, 150);
  $('#capacityBar').style.width = `${(cap / 150) * 100}%`;
  $('#capacityLabel').textContent = metrics.capacityPct > 100
    ? `Over capacity: ${fmtPct1(metrics.capacityPct)} (overtime likely)`
    : `Utilization: ${fmtPct1(metrics.capacityPct)}`;

  // Render simple revenue composition chart
  try {
    renderSimpleChart(metrics);
  } catch (e) {
    // Non-fatal: don't break main render if chart errors
    console.warn('Chart render failed:', e);
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
  if (k === 'priceMonthly' || k === 'variableCostPerVisit') {
    value = Math.max(0, safeParseNumber(value, 0));
  } else if (k === 'visitsPerYear' || k === 'currentCustomers') {
    value = Math.max(0, Math.floor(safeParseNumber(value, 0)));
  } else if (k === 'hoursPerVisit') {
    value = Math.max(0, safeParseNumber(value, 0));
  } else if (k === 'mixPct') {
    value = safeParseNumber(value, 0, 0, 100);
  }

  if (k === 'name') {
    o.name = el.value;
  } else if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    rebalanceMix(i, value);
  } else {
    o[k] = value;
  }

  render();
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
    visitsPerYear: 12,
    hoursPerVisit: 1.0,
    variableCostPerVisit: 0,
    mixPct: 0,
    currentCustomers: 0,
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
    `Total Revenue,${fmtMoney0(results.totalRevenue)}`,
    `Total Variable Costs,${fmtMoney0(results.totalVariableCosts)}`,
    `Contribution Margin,${fmtMoney0(results.contributionMargin)}`,
    `Fixed Overhead,${fmtMoney0(results.fixedOverhead)}`,
    `Net Profit,${fmtMoney0(results.netProfit)}`,
    `Profit Margin,${fmtPct1(results.profitMarginPct)}`,
    `Billable Hours,${fmtInt(results.billableHours)}`,
    `Utilization,${fmtPct1(results.utilization)}`,
    '',
    'OFFERINGS',
    'Name,Price/Month,Visits/Year,Hours/Visit,Variable Cost/Visit,Mix %,Current Customers,Annual Revenue,Customers Needed',
  ];

  state.offerings.forEach((o) => {
    const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentCustomers);
    const customersNeeded = state.mode === 'forecast' ? Math.ceil((o.visitsPerYear * state.employees * state.productiveUtilizationPct / 100) / o.visitsPerYear) : o.currentCustomers;
    lines.push(
      `"${o.name}",${o.priceMonthly},${o.visitsPerYear},${o.hoursPerVisit},${o.variableCostPerVisit},${o.mixPct},${o.currentCustomers},${fmtMoney0(annualRevenue)},${customersNeeded}`
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
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }

  function saveState() {
    try {
      localStorage.setItem('profitpath-state', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }
  $('#modeSelect').addEventListener('change', () => {
    setStateFromInputs();
    saveState();
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

    saveState();
    render();
  });

  $$('#controls input').forEach((el) => {
    el.addEventListener('input', () => {
      setStateFromInputs();
      saveState();
      render();
    });
  });

  $('#addOfferingBtn').addEventListener('click', addOffering);
  $('#resetBtn').addEventListener('click', resetDefaults);
  $('#exportBtn').addEventListener('click', exportAsCSV);

  $('#offeringsBody').addEventListener('input', onTableInput);
  $('#offeringsBody').addEventListener('click', onTableClick);

  // Save state when table content changes
  $('#offeringsBody').addEventListener('input', saveState);
  $('#offeringsBody').addEventListener('click', () => setTimeout(saveState, 0));

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
render();
