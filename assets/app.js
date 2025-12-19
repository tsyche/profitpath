const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

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
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtMoney2 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtPct1 = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

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
  productiveUtilizationPct: 80, // percent of 2080h available for service delivery
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
      normalized: true,
      shares: offerings.map(() => evenShare),
    };
  }

  return {
    sum,
    normalized: Math.abs(sum - 100) > 0.01,
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

function calc() {
  const employees = Math.max(1, Number(state.employees) || 1);
  const employeePay = Math.max(0, Number(state.employeePay) || 0);
  const monthlyCosts = Math.max(0, Number(state.monthlyCosts) || 0);
  const productiveUtilizationPct = clamp(Number(state.productiveUtilizationPct) || 0, 0, 100);

  const annualFixedCosts = monthlyCosts * 12;
  const annualPayroll = Math.max(0, employees - 1) * employeePay;

  const annualPaidHours = employees * 2080;
  const annualServiceHours = annualPaidHours * (productiveUtilizationPct / 100);

  // sanitize offerings
  const offerings = state.offerings
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

  const mode = state.mode;

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
    const { sum: mixSum, normalized: mixNormalized, shares } = normalizeMix(offerings);

    const targetUtilizationPct = clamp(Number(state.targetUtilizationPct) || 0, 0, 150);
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
    };
  }

  // current mode
  customers = offerings.reduce((a, o) => a + o.currentCustomers, 0);
  totalVisits = offerings.reduce((a, o) => a + o.currentCustomers * o.visitsPerYear, 0);
  hoursUsed = offerings.reduce((a, o) => a + o.currentCustomers * o.visitsPerYear * o.hoursPerVisit, 0);
  revenue = offerings.reduce((a, o) => a + o.currentCustomers * o.priceMonthly * 12, 0);
  variableCosts = offerings.reduce((a, o) => a + o.currentCustomers * o.visitsPerYear * o.variableCostPerVisit, 0);

  capacityPct = annualServiceHours > 0 ? (hoursUsed / annualServiceHours) * 100 : 0;

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

  el.focus();
  if (typeof focus.selectionStart === 'number' && typeof focus.selectionEnd === 'number') {
    try {
      el.setSelectionRange(focus.selectionStart, focus.selectionEnd);
    } catch {
      // ignore
    }
  }
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
      ? `<input class="mode-edit" type="number" min="0" max="100" step="1" value="${(o.mixPct ?? 0).toFixed(1)}" data-k="mixPct" data-i="${idx}" />`
      : `<span class="muted">—</span>`;

    const customersCell = isForecast
      ? `<span class="muted">—</span>`
      : `<input class="mode-edit" type="number" min="0" step="1" value="${o.currentCustomers ?? 0}" data-k="currentCustomers" data-i="${idx}" />`;

    const estCustomers = isForecast
      ? Math.floor(metrics.customers * ((o.mixPct || 0) / 100))
      : o.currentCustomers;

    const estVisits = isForecast
      ? Math.round(estCustomers * o.visitsPerYear)
      : Math.round((o.currentCustomers || 0) * o.visitsPerYear);

    tr.innerHTML = `
      <td class="cell-edit group-start group-inputs" data-label="Offering"><input type="text" value="${escapeHtml(o.name)}" data-k="name" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs" data-label="Price / mo"><input type="number" min="0" step="10" value="${o.priceMonthly}" data-k="priceMonthly" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs" data-label="Visits / yr"><input type="number" min="0" step="1" value="${o.visitsPerYear}" data-k="visitsPerYear" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs" data-label="Hours / visit"><input type="number" min="0" step="0.1" value="${o.hoursPerVisit}" data-k="hoursPerVisit" data-i="${idx}" /></td>
      <td class="cell-edit group-inputs group-end" data-label="Var $ / visit"><input type="number" min="0" step="1" value="${o.variableCostPerVisit}" data-k="variableCostPerVisit" data-i="${idx}" /></td>
      <td class="cell-edit group-start group-mode" data-label="Mix % (forecast)">${mixCell}</td>
      <td class="cell-edit group-mode group-end" data-label="Customers (current)">${customersCell}</td>
      <td class="cell-readonly group-start group-est" data-label="Est. customers"><span class="mono">${fmtInt(estCustomers)}</span></td>
      <td class="cell-readonly group-est group-end" data-label="Est Service Count"><span class="mono">${fmtInt(estVisits)}</span></td>
      <td class="cell-edit group-actions" data-label="Actions">
        <button class="btn small danger" data-action="removeOffering" data-i="${idx}">Remove</button>
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

  if (k === 'name') {
    o.name = el.value;
  } else if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    rebalanceMix(i, el.value);
  } else {
    o[k] = el.value;
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
  render();
}

function wire() {
  $('#modeSelect').addEventListener('change', () => {
    setStateFromInputs();
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

    render();
  });

  $$('#controls input').forEach((el) => {
    el.addEventListener('input', () => {
      setStateFromInputs();
      render();
    });
  });

  $('#addOfferingBtn').addEventListener('click', addOffering);
  $('#resetBtn').addEventListener('click', resetDefaults);

  $('#offeringsBody').addEventListener('input', onTableInput);
  $('#offeringsBody').addEventListener('click', onTableClick);
}

wire();
render();
