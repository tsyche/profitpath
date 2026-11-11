import { buildDecision, scanDriverCrossovers, type DecisionOption } from '../../src/insights/decisionWorkbench';
import {
  appliedDriverValue, driverStatusText, formatDriverDelta, formatDriverValue,
  type DriverCrossover, type DriverDef, type DriverSpec
} from '../../src/insights/decisionDriver';
import { formatMoney0 } from '../../src/calculations/currency';
import { getRangeCase, RANGE_CASE_LABELS, RANGE_CASES, type RangeCase } from '../../src/calculations/rangeCase';
import type { Offering } from '../../src/types';
import { displayPrice } from '../../src/calculations/offeringPrice';
import { csvCell, escapeHtml, getAllScenarios, getShareBase } from '../services/miscService';
import { clamp } from '../utils/helpers';
import { decodeScenarioBundle, encodeDecisionLink } from '../../src/sharing/decisionLink';
import { showToast } from '../services/modalService';
import { downloadOrShare, openPrintTarget } from '../services/reportDelivery';
import { createModal } from './Modal';
import '../decision-workbench.css';

const lossNote = 'Sales-loss threshold replaces the loss assumption only on matched services whose price increased. Other assumptions stay fixed. It is total loss, not additional loss. A conservative threshold keeps original group run costs and ignores gains from losing negative-contribution sales.';
const forecastNote = 'Forecast is a capacity-supported ceiling, not a demand forecast. All results depend on the entered assumptions.';
const dollars = (n: number, currency: string) => formatMoney0(n, currency);
const offeringPrice = (o: Offering, currency: string) => dollars(displayPrice({ ...o, priceMonthly: o.priceMonthly || 0, sessionsPerYear: o.sessionsPerYear || 1 }), currency) +
  (o.type === 'one-time' ? ' / sale' : o.type === 'per-session' ? ' / session' : ' / month');

function decisionContent(decision: ReturnType<typeof buildDecision>, sectionLevel: 2 | 3 = 3, driverNote = '') {
  const { results, winner, improvement, currency, goal } = decision;
  const money = (n: number) => dollars(n, currency);
  const signed = (n: number) => (n > 0 ? '+' : '') + money(n);
  const verdict = improvement > 0
    ? `${winner.name} has the highest modeled income: ${money(improvement / 12)} more per month than ${results[0].name}.` +
      (winner.loss?.pct !== null && winner.loss?.pct !== undefined ? ` It still matches baseline income through ${winner.loss.pct.toFixed(1)}% total sales loss on raised services${winner.loss.conservative ? ' using the conservative cost bound' : ''}.` : '')
    : `${results[0].name} matches or exceeds the alternatives' modeled income.`;
  const optionName = (i: number) => results[i].name + (i ? '' : ' (baseline)');
  const head = '<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Annual measure</th>' +
    results.map((_, i) => `<th scope="col" role="columnheader" class="decision-option-${i}">${escapeHtml(optionName(i))}</th>`).join('') + '</tr></thead>';
  const row = (label: string, values: string[], emphasized = false) =>
    `<tr role="row"${emphasized ? ' class="decision-key-row"' : ''}><th scope="row" role="rowheader">${escapeHtml(label)}</th>` +
    values.map((v, i) => `<td role="cell" class="decision-option-${i}"><span class="decision-option-label" aria-hidden="true">${escapeHtml(optionName(i))}</span><span class="decision-value">${escapeHtml(v)}</span></td>`).join('') + '</tr>';
  const summary = row('Revenue', results.map(r => money(r.metrics.revenue))) +
    row('Net income before tax', results.map(r => money(r.metrics.income)), true) +
    row('Income change from baseline', results.map(r => signed(r.metrics.income - results[0].metrics.income)), true) +
    row('Utilization', results.map(r => r.metrics.capacityPct.toFixed(1) + '%')) +
    row('Clients', results.map(r => String(r.metrics.clients))) +
    (goal === null ? '' : row(`Goal: ${money(goal)} net income / year`, results.map(r => r.goalGap! >= 0 ? 'Meets goal by ' + money(r.goalGap!) : 'Below goal by ' + money(-r.goalGap!)))) +
    row('Revenue from guess-tagged services', results.map(r => r.guessRevenuePct.toFixed(1) + '%')) +
    row('Revenue from untagged services', results.map(r => r.untaggedRevenuePct.toFixed(1) + '%')) +
    row('Break-even sales loss on raised services', results.map(r => r.loss ? r.loss.pct === null ? r.loss.reason : r.loss.pct.toFixed(1) + '% total loss' + (r.loss.conservative ? ' (conservative cost bound)' : '') : 'Baseline'));
  const offerings = decision.offeringRows.map(offering => `<details class="decision-offering" data-offering="${escapeHtml(offering.inputs.find(o => o?.id)?.id || offering.name)}"${sectionLevel === 2 ? ' open' : ''}><summary>${escapeHtml(offering.name)}</summary><div class="decision-table" tabindex="0" role="region" aria-label="${escapeHtml(offering.name)} comparison"><table class="table table-flat" role="table">${head}<tbody role="rowgroup">` +
    row('List price', offering.inputs.map(o => o ? offeringPrice(o, currency) : 'Not offered')) +
    row('Assumed sales loss', offering.inputs.map(o => o ? (o.salesLossPct || 0).toFixed(1) + '%' : 'Not offered')) +
    row('Revenue', offering.values.map(v => v ? money(v.revenue) : 'Not offered')) +
    row('Revenue change from baseline', offering.values.map(v => v ? signed(v.revenue - (offering.values[0]?.revenue || 0)) : 'Not offered')) +
    row('Clients', offering.values.map(v => v ? String(v.clients) : 'Not offered')) +
    row('Contribution before fixed costs', offering.values.map(v => v ? money(v.margin) : 'Not offered')) +
    row('Contribution change from baseline', offering.values.map(v => v ? signed(v.margin - (offering.values[0]?.margin || 0)) : 'Not offered')) +
    '</tbody></table></div></details>').join('');
  const notes = results.filter(r => r.state.notes).map(r => `<p><strong>${escapeHtml(r.name)}:</strong> ${escapeHtml(r.state.notes!)}</p>`).join('');
  return { verdict, html: `<p class="decision-verdict">${escapeHtml(verdict)}</p><p>${RANGE_CASE_LABELS[decision.selectedCase]} case · ${currency} · ${decision.mode === 'current' ? 'Current' : 'Forecast'} · Annual results</p>` +
      '<p>Compare the same options under each measure. Check assumptions and capacity before acting.</p>' +
      (driverNote ? `<p class="smallprint">${escapeHtml(driverNote)}</p>` : '') +
    `<div class="decision-table" tabindex="0" role="region" aria-label="Decision summary"><table class="table table-flat" role="table">${head}<tbody role="rowgroup">${summary}</tbody></table></div>` +
    `<p class="smallprint">${lossNote}</p>` + (decision.mode === 'forecast' ? `<p class="smallprint">${forecastNote}</p>` : '') +
    `<p class="smallprint">Confidence tags describe inputs, not probabilities. Untagged revenue is shown separately.</p><h${sectionLevel}>By offering</h${sectionLevel}>` +
    (sectionLevel === 3 ? '<p class="smallprint">Expand a service to compare its pricing, revenue and contribution.</p>' : '') + offerings + notes };
}

export function showDecisionWorkbench(options: DecisionOption[], selectedCase: RangeCase = getRangeCase(), goal: number | null = null) {
  let ordered = [...options];
  let activeCase = selectedCase;
  let annualGoal = goal;
  // Display-only lens: the driver lives here, never in scenarios, bundles or share links.
  let driver: DriverSpec | null = null;
  let driverDefId = '';
  let lastDefs: DriverDef[] = [];
  let crossovers: DriverCrossover[] = [];
  let driverNote = '';
  let lastDefIds = '';
  let lastMarksKey = '';
  let lastCrossoverKey = '';
  let pendingDelta = 0;
  let driverRaf = 0;
  const cancelPendingDriver = () => {
    if (driverRaf) cancelAnimationFrame(driverRaf);
    driverRaf = 0;
  };
  const modal = createModal({
    id: 'decisionWorkbench',
    headingLevel: 2,
    title: 'Decision workbench',
    size: 'full',
    onClose: cancelPendingDriver,
    content: `<div class="decision-controls"><label>Baseline<select id="decisionBaseline">${options.map((o, i) => `<option value="${i}">${escapeHtml(o.name)}</option>`).join('')}</select></label>` +
      `<label>Assumption case<select id="decisionCase">${RANGE_CASES.map(c => `<option value="${c}"${c === selectedCase ? ' selected' : ''}>${RANGE_CASE_LABELS[c]}</option>`).join('')}</select></label>` +
      `<label>Annual net income goal (before tax)<input id="decisionGoal" type="number" min="0" max="1000000000000" step="1" placeholder="Optional" value="${goal ?? ''}"></label>` +
      '<label>Compare driver<select id="decisionDriver"><option value="">None</option></select></label></div>' +
      '<div class="decision-driver" id="decisionDriverPanel" hidden><div class="decision-driver-row">' +
      '<label id="decisionDriverRangeLabel" for="decisionDriverRange">Driver</label>' +
      '<div class="decision-driver-track"><input type="range" id="decisionDriverRange" aria-labelledby="decisionDriverRangeLabel">' +
      '<div class="decision-driver-marks" id="decisionDriverMarks" aria-hidden="true"></div></div>' +
      '<input type="number" id="decisionDriverNumber" aria-label="Driver change">' +
      '<button class="btn" id="decisionDriverReset" type="button">Reset driver</button></div>' +
      '<p class="decision-driver-status" id="decisionDriverStatus" role="status" aria-live="polite"></p></div>' +
      '<p id="decisionError" role="status"></p><div id="decisionResults" aria-live="polite"></div>' +
      '<div class="decision-controls"><button class="btn" id="decisionCSV" type="button">Export decision CSV</button><button class="btn" id="decisionPrint" type="button">Print / PDF decision</button><button class="btn" id="decisionShare" type="button">Share decision</button></div>'
  });
  const q = <T extends HTMLElement>(selector: string) => modal.querySelector<T>(selector)!;
  const current = () => buildDecision(ordered, activeCase, annualGoal, driver);
  const update = () => {
    const input = q<HTMLInputElement>('#decisionGoal');
    const valid = input.value === '' || input.validity.valid;
    try {
      if (!valid) throw new Error('Enter a whole annual goal from 0 to 1,000,000,000,000, or leave it blank.');
      annualGoal = input.value === '' ? null : input.valueAsNumber;
      let decision = current();
      // A reordered baseline or a new case can renumber rows; drop a driver whose row is gone.
      if (driver && !decision.driverDefs.some(d => d.id === driverDefId)) {
        driver = null; driverDefId = ''; crossovers = [];
        decision = buildDecision(ordered, activeCase, annualGoal, null);
      }
      lastDefs = decision.driverDefs;
      const ids = decision.driverDefs.map(d => d.id).join('|');
      if (ids !== lastDefIds) {
        lastDefIds = ids;
        const select = q<HTMLSelectElement>('#decisionDriver');
        select.innerHTML = '<option value="">None</option>' + decision.driverDefs.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.label)}</option>`).join('');
        select.value = driverDefId;
      }
      const def = driver ? decision.driverDefs.find(d => d.id === driverDefId) || null : null;
      const panel = q<HTMLElement>('#decisionDriverPanel');
      if (driver && def) {
        // Rescan only when the bounds, case or option order change, not on every drag tick.
        const crossoverKey = `${driverDefId}:${def.min}:${def.max}:${activeCase}:${ordered.map(o => o.name).join(',')}`;
        if (crossoverKey !== lastCrossoverKey) {
          lastCrossoverKey = crossoverKey;
          crossovers = scanDriverCrossovers(ordered, activeCase, def);
        }
        const delta = clamp(Math.round(driver.delta / def.step) * def.step, def.min, def.max);
        if (delta !== driver.delta) {
          driver = { ...driver, delta };
          decision = current();
        }
        panel.hidden = false;
        const range = q<HTMLInputElement>('#decisionDriverRange');
        const number = q<HTMLInputElement>('#decisionDriverNumber');
        for (const el of [range, number]) { el.min = String(def.min); el.max = String(def.max); el.step = String(def.step); }
        range.value = String(delta);
        number.value = String(delta);
        range.setAttribute('aria-valuetext', formatDriverValue(def, appliedDriverValue(def, delta), decision.currency));
        q('#decisionDriverRangeLabel').textContent = def.label;
        driverNote = driverStatusText({ def, delta, currency: decision.currency, crossovers, optionNames: ordered.map(o => o.name) });
        q('#decisionDriverStatus').textContent = driverNote;
        const marksKey = `${driverDefId}:${crossovers.map(c => c.delta).join(',')}`;
        if (marksKey !== lastMarksKey) {
          lastMarksKey = marksKey;
          const span = def.max - def.min || 1;
          q('#decisionDriverMarks').innerHTML = crossovers.map(c =>
            `<span class="decision-driver-mark" style="left:${((c.delta - def.min) / span * 100).toFixed(2)}%"></span>`).join('');
        }
      } else {
        panel.hidden = true;
        driverNote = '';
        lastMarksKey = '';
        lastCrossoverKey = '';
        q('#decisionDriverStatus').textContent = '';
        q('#decisionDriverMarks').innerHTML = '';
      }
      const opened = new Set([...q('#decisionResults').querySelectorAll<HTMLDetailsElement>('.decision-offering[open]')].map(el => el.dataset.offering));
      q('#decisionResults').innerHTML = decisionContent(decision, 3, driverNote).html;
      q('#decisionResults').querySelectorAll<HTMLDetailsElement>('.decision-offering').forEach(el => {
        el.open = opened.has(el.dataset.offering);
      });
      q('#decisionError').textContent = '';
    } catch (error) {
      q('#decisionResults').innerHTML = '';
      q('#decisionError').textContent = (error as Error).message;
      driverNote = '';
    }
    for (const id of ['decisionCSV', 'decisionPrint', 'decisionShare']) q<HTMLButtonElement>('#' + id).disabled = Boolean(q('#decisionError').textContent);
  };
  q<HTMLSelectElement>('#decisionBaseline').addEventListener('change', event => {
    cancelPendingDriver();
    driver = null;
    driverDefId = '';
    lastDefIds = '';
    const index = Number((event.target as HTMLSelectElement).value);
    ordered = [options[index], ...options.filter((_, i) => i !== index)];
    update();
  });
  q<HTMLSelectElement>('#decisionCase').addEventListener('change', event => {
    cancelPendingDriver();
    activeCase = (event.target as HTMLSelectElement).value as RangeCase;
    update();
  });
  q('#decisionGoal').addEventListener('input', update);
  q<HTMLSelectElement>('#decisionDriver').addEventListener('change', event => {
    cancelPendingDriver();
    driverDefId = (event.target as HTMLSelectElement).value;
    if (!driverDefId) { driver = null; crossovers = []; update(); return; }
    const def = lastDefs.find(d => d.id === driverDefId);
    if (!def) { driver = null; driverDefId = ''; update(); return; }
    driver = { kind: def.kind, rowIndex: def.rowIndex, delta: 0 };
    update();
  });
  const applyDriverDelta = (raw: number) => {
    if (!driver) return;
    const def = lastDefs.find(d => d.id === driverDefId);
    if (!def) return;
    const snapped = def.step > 0 ? Math.round(raw / def.step) * def.step : raw;
    const delta = clamp(snapped, def.min, def.max);
    if (delta !== driver.delta) driver = { ...driver, delta };
    update();
  };
  // rAF-coalesced: a drag fires faster than a full rebuild with the loss solver.
  const scheduleDriverDelta = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    pendingDelta = raw;
    if (driverRaf) return;
    driverRaf = requestAnimationFrame(() => { driverRaf = 0; applyDriverDelta(pendingDelta); });
  };
  q<HTMLInputElement>('#decisionDriverRange').addEventListener('input', event => {
    scheduleDriverDelta((event.target as HTMLInputElement).valueAsNumber);
  });
  q<HTMLInputElement>('#decisionDriverNumber').addEventListener('input', event => {
    const el = event.target as HTMLInputElement;
    if (el.value !== '') scheduleDriverDelta(el.valueAsNumber);
  });
  q<HTMLInputElement>('#decisionDriverNumber').addEventListener('change', event => {
    const el = event.target as HTMLInputElement;
    if (el.value !== '') scheduleDriverDelta(el.valueAsNumber);
  });
  q('#decisionDriverReset').addEventListener('click', () => {
    cancelPendingDriver();
    if (!driver) return;
    if (driver.delta !== 0) driver = { ...driver, delta: 0 };
    update();
  });
  q('#decisionCSV').addEventListener('click', () => {
    const decision = current();
    const { verdict } = decisionContent(decision);
    const driverDef = driver ? lastDefs.find(d => d.id === driverDefId) : undefined;
    const driverRow = driver && driverDef ? [['Driver', driverDef.label, formatDriverDelta(driverDef, driver.delta, decision.currency),
      `${formatDriverValue(driverDef, driverDef.baseValue, decision.currency)} → ${formatDriverValue(driverDef, appliedDriverValue(driverDef, driver.delta), decision.currency)}`]] : [];
    const rows: (string | number)[][] = [
      ['Decision workbench', `${RANGE_CASE_LABELS[activeCase]} case`, decision.currency, decision.mode, 'Annual results'],
      [verdict], [lossNote], ...(decision.mode === 'forecast' ? [[forecastNote]] : []), ...driverRow,
      ['Scenario', 'Annual revenue', 'Annual net income before tax', 'Income change from baseline', 'Annual goal', 'Goal gap', 'Guess revenue %', 'Untagged revenue %', 'Break-even sales loss %', 'Conservative cost bound']
    ];
    decision.results.forEach(r => rows.push([r.name, r.metrics.revenue, r.metrics.income, r.metrics.income - decision.results[0].metrics.income, annualGoal ?? '', r.goalGap ?? '', r.guessRevenuePct, r.untaggedRevenuePct, r.loss?.pct ?? r.loss?.reason ?? 'Baseline', r.loss?.conservative ? 'Yes' : 'No']));
    rows.push([], ['Offering', 'Scenario', 'Annual revenue', 'Revenue change from baseline', 'Clients', 'Annual contribution', 'Contribution change from baseline', 'List price and unit', 'Assumed sales loss %']);
    decision.offeringRows.forEach(offering => offering.values.forEach((v, i) => rows.push(v
      ? [offering.name, ordered[i].name, v.revenue, v.revenue - (offering.values[0]?.revenue || 0), v.clients, v.margin, v.margin - (offering.values[0]?.margin || 0), offeringPrice(offering.inputs[i]!, decision.currency), offering.inputs[i]!.salesLossPct || 0]
      : [offering.name, ordered[i].name, 'Not offered'])));
    decision.results.forEach(r => { if (r.state.notes) rows.push(['Notes', r.name, r.state.notes]); });
    void downloadOrShare(new Blob([rows.map(row => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), 'profitpath-decision.csv');
  });
  q('#decisionPrint').addEventListener('click', () => {
    const report = openPrintTarget('ProfitPath decision');
    if (!report) { showToast('Print window unavailable. Export CSV or share the decision instead.', 'info'); return; }
    report.opener = null;
    report.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ProfitPath decision</title><style>body{font:14px Arial;margin:24px;color:#111}table{border-collapse:collapse;table-layout:fixed;width:100%;margin:12px 0}th,td{border:1px solid #999;padding:6px;overflow-wrap:anywhere}th{text-align:left}td,thead th:not(:first-child){text-align:center}.decision-option-label{display:none}tr{break-inside:avoid}h2,h3{break-after:avoid}.decision-table{overflow:visible}h3{margin-bottom:0}@page{size:landscape}</style></head><body><h1>Decision workbench</h1>${decisionContent(current(), 2, driverNote).html}</body></html>`);
    report.document.close(); report.focus(); report.print();
  });
  q('#decisionShare').addEventListener('click', () => {
    const encoded = encodeDecisionLink(ordered, { baseUrl: getShareBase(), selectedCase: activeCase, annualGoal });
    if (!encoded) { showToast('These options are too large for one link. Export a CSV instead.', 'error'); return; }
    createModal({ title: 'Share decision', content: '<p>This snapshot includes every option, baseline, case and goal. Recipients can review it without changing their draft or saved scenarios.</p>' +
      (driver && driver.delta !== 0 ? '<p>The current driver change is not included. Recipients will see the original loaded options. Export CSV or Print / PDF to share the changed results.</p>' : '') +
      `<input id="decisionShareURL" class="copy-on-click share-url-input" readonly aria-label="Decision link" value="${escapeHtml(encoded)}">` });
  });
  update();
}

/** Both layouts use the same selection and comparison surface. */
export function showDecisionPicker(initialIds: string[] = []) {
  const saved = getAllScenarios();
  const modal = createModal({
    title: 'Choose decision options',
    headingLevel: 2,
    content: '<p>Choose two to four saved options, then set the baseline in the workbench.</p>' +
      saved.map(o => `<label class="decision-choice"><input type="checkbox" value="${escapeHtml(o.id)}"${initialIds.includes(o.id) ? ' checked' : ''}> ${escapeHtml(o.name)}</label>`).join('') +
      '<p id="decisionSelectionError" role="status"></p><button class="btn primary" id="openDecision" type="button">Open workbench</button>'
  });
  modal.querySelector('#openDecision')!.addEventListener('click', () => {
    const selected = [...modal.querySelectorAll<HTMLInputElement>('input:checked')].map(input => input.value);
    if (selected.length < 2 || selected.length > 4) {
      modal.querySelector('#decisionSelectionError')!.textContent = 'Choose two to four saved scenarios.';
      return;
    }
    const ordered = [...initialIds, ...selected].filter((id, i, all) => selected.includes(id) && all.indexOf(id) === i);
    modal.querySelector<HTMLButtonElement>('.modal-close')!.click();
    showDecisionWorkbench(ordered.map(id => saved.find(o => o.id === id)!).map(o => ({ name: o.name, state: o.state || o.data! })));
  });
}

/** A decision bundle is read in memory; reviewing it never writes the recipient's library. */
export function openSharedDecision(): void {
  const url = new URL(location.href);
  if (url.searchParams.get('decision') !== '1') return;
  const options = decodeScenarioBundle(url.searchParams.get('bundle') || '');
  if (!options || options.length < 2) { showToast('This decision link is invalid or too large.', 'error'); return; }
  const selectedCase = RANGE_CASES.find(c => c === url.searchParams.get('case')) || 'base';
  const rawGoal = url.searchParams.get('goal');
  const goal = rawGoal !== null && rawGoal.trim() !== '' ? Number(rawGoal) : null;
  showDecisionWorkbench(options, selectedCase, goal !== null && Number.isInteger(goal) && goal >= 0 && goal <= 1e12 ? goal : null);
}
