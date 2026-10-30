import { buildDecision, type DecisionOption } from '../../src/insights/decisionWorkbench';
import { formatMoney0 } from '../../src/calculations/currency';
import { getRangeCase, RANGE_CASE_LABELS, RANGE_CASES, type RangeCase } from '../../src/calculations/rangeCase';
import type { Offering, Scenario } from '../../src/types';
import { displayPrice } from '../../src/calculations/offeringPrice';
import { csvCell, escapeHtml, getAllScenarios } from '../services/miscService';
import { decodeScenarioBundle, encodeScenarioBundle } from '../services/scenarioBundle';
import { showToast } from '../services/modalService';
import { createModal } from './Modal';
import '../decision-workbench.css';

const lossNote = 'Sales-loss threshold replaces the loss assumption only on matched services whose price increased. Other assumptions stay fixed. It is total loss, not additional loss. A conservative threshold keeps original group run costs and ignores gains from losing negative-contribution sales.';
const forecastNote = 'Forecast is a capacity-supported ceiling, not a demand forecast. All results depend on the entered assumptions.';
const dollars = (n: number, currency: string) => formatMoney0(n, currency);
const offeringPrice = (o: Offering, currency: string) => dollars(displayPrice({ ...o, priceMonthly: o.priceMonthly || 0, sessionsPerYear: o.sessionsPerYear || 1 }), currency) +
  (o.type === 'one-time' ? ' / sale' : o.type === 'per-session' ? ' / session' : ' / month');

function decisionContent(decision: ReturnType<typeof buildDecision>, sectionLevel: 2 | 3 = 3) {
  const { results, winner, improvement, currency, goal } = decision;
  const money = (n: number) => dollars(n, currency);
  const signed = (n: number) => (n > 0 ? '+' : '') + money(n);
  const verdict = improvement > 0
    ? `${winner.name} has the highest modeled income: ${money(improvement / 12)} more per month than ${results[0].name}.` +
      (winner.loss?.pct !== null && winner.loss?.pct !== undefined ? ` It still matches baseline income through ${winner.loss.pct.toFixed(1)}% total sales loss on raised services${winner.loss.conservative ? ' using the conservative cost bound' : ''}.` : '')
    : `${results[0].name} matches or exceeds the alternatives' modeled income.`;
  const head = '<thead><tr><th scope="col">Annual measure</th>' + results.map((r, i) => `<th scope="col">${escapeHtml(r.name)}${i ? '' : ' (baseline)'}</th>`).join('') + '</tr></thead>';
  const row = (label: string, values: string[]) => `<tr><th scope="row">${escapeHtml(label)}</th>${values.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`;
  const summary = row('Revenue', results.map(r => money(r.metrics.revenue))) +
    row('Net income before tax', results.map(r => money(r.metrics.income))) +
    row('Income change from baseline', results.map(r => signed(r.metrics.income - results[0].metrics.income))) +
    row('Utilization', results.map(r => r.metrics.capacityPct.toFixed(1) + '%')) +
    row('Clients', results.map(r => String(r.metrics.clients))) +
    (goal === null ? '' : row(`Goal: ${money(goal)} net income / year`, results.map(r => r.goalGap! >= 0 ? 'Meets goal by ' + money(r.goalGap!) : 'Below goal by ' + money(-r.goalGap!)))) +
    row('Revenue from guess-tagged services', results.map(r => r.guessRevenuePct.toFixed(1) + '%')) +
    row('Revenue from untagged services', results.map(r => r.untaggedRevenuePct.toFixed(1) + '%')) +
    row('Break-even sales loss on raised services', results.map(r => r.loss ? r.loss.pct === null ? r.loss.reason : r.loss.pct.toFixed(1) + '% total loss' + (r.loss.conservative ? ' (conservative cost bound)' : '') : 'Baseline'));
  const offerings = decision.offeringRows.map(offering => `<h${sectionLevel + 1}>${escapeHtml(offering.name)}</h${sectionLevel + 1}><div class="decision-table" tabindex="0" role="region" aria-label="${escapeHtml(offering.name)} comparison"><table class="table table-flat">${head}<tbody>` +
    row('List price', offering.inputs.map(o => o ? offeringPrice(o, currency) : 'Not offered')) +
    row('Assumed sales loss', offering.inputs.map(o => o ? (o.salesLossPct || 0).toFixed(1) + '%' : 'Not offered')) +
    row('Revenue', offering.values.map(v => v ? money(v.revenue) : 'Not offered')) +
    row('Revenue change from baseline', offering.values.map(v => v ? signed(v.revenue - (offering.values[0]?.revenue || 0)) : 'Not offered')) +
    row('Clients', offering.values.map(v => v ? String(v.clients) : 'Not offered')) +
    row('Contribution before fixed costs', offering.values.map(v => v ? money(v.margin) : 'Not offered')) +
    row('Contribution change from baseline', offering.values.map(v => v ? signed(v.margin - (offering.values[0]?.margin || 0)) : 'Not offered')) +
    '</tbody></table></div>').join('');
  const notes = results.filter(r => r.state.notes).map(r => `<p><strong>${escapeHtml(r.name)}:</strong> ${escapeHtml(r.state.notes!)}</p>`).join('');
  return { verdict, html: `<p class="decision-verdict">${escapeHtml(verdict)}</p><p>${RANGE_CASE_LABELS[decision.selectedCase]} case · ${currency} · ${decision.mode === 'current' ? 'Current' : 'Forecast'} · Annual results</p>` +
      '<p>Check assumptions and capacity before acting. Scroll tables horizontally to see every option on a narrow screen.</p>' +
    `<div class="decision-table" tabindex="0" role="region" aria-label="Decision summary"><table class="table table-flat">${head}<tbody>${summary}</tbody></table></div>` +
    `<p class="smallprint">${lossNote}</p>` + (decision.mode === 'forecast' ? `<p class="smallprint">${forecastNote}</p>` : '') +
    `<p class="smallprint">Confidence tags describe inputs, not probabilities. Untagged revenue is shown separately.</p><h${sectionLevel}>By offering</h${sectionLevel}>` + offerings + notes };
}

export function showDecisionWorkbench(options: DecisionOption[], selectedCase: RangeCase = getRangeCase(), goal: number | null = null) {
  let ordered = [...options];
  let activeCase = selectedCase;
  let annualGoal = goal;
  const modal = createModal({
    id: 'decisionWorkbench',
    headingLevel: 2,
    title: 'Decision workbench',
    size: 'full',
    content: `<div class="decision-controls"><label>Baseline<select id="decisionBaseline">${options.map((o, i) => `<option value="${i}">${escapeHtml(o.name)}</option>`).join('')}</select></label>` +
      `<label>Assumption case<select id="decisionCase">${RANGE_CASES.map(c => `<option value="${c}"${c === selectedCase ? ' selected' : ''}>${RANGE_CASE_LABELS[c]}</option>`).join('')}</select></label>` +
      `<label>Annual net income goal (before tax)<input id="decisionGoal" type="number" min="0" max="1000000000000" step="1" placeholder="Optional" value="${goal ?? ''}"></label></div>` +
      '<p id="decisionError" role="status"></p><div id="decisionResults" aria-live="polite"></div>' +
      '<div class="decision-controls"><button class="btn" id="decisionCSV" type="button">Export decision CSV</button><button class="btn" id="decisionPrint" type="button">Print / PDF decision</button><button class="btn" id="decisionShare" type="button">Share decision</button></div>'
  });
  const q = <T extends HTMLElement>(selector: string) => modal.querySelector<T>(selector)!;
  const current = () => buildDecision(ordered, activeCase, annualGoal);
  const update = () => {
    const input = q<HTMLInputElement>('#decisionGoal');
    const valid = input.value === '' || input.validity.valid;
    try {
      if (!valid) throw new Error('Enter a whole annual goal from 0 to 1,000,000,000,000, or leave it blank.');
      annualGoal = input.value === '' ? null : input.valueAsNumber;
      q('#decisionResults').innerHTML = decisionContent(current()).html;
      q('#decisionError').textContent = '';
    } catch (error) {
      q('#decisionResults').innerHTML = '';
      q('#decisionError').textContent = (error as Error).message;
    }
    for (const id of ['decisionCSV', 'decisionPrint', 'decisionShare']) q<HTMLButtonElement>('#' + id).disabled = Boolean(q('#decisionError').textContent);
  };
  q<HTMLSelectElement>('#decisionBaseline').addEventListener('change', event => {
    const index = Number((event.target as HTMLSelectElement).value);
    ordered = [options[index], ...options.filter((_, i) => i !== index)];
    update();
  });
  q<HTMLSelectElement>('#decisionCase').addEventListener('change', event => {
    activeCase = (event.target as HTMLSelectElement).value as RangeCase;
    update();
  });
  q('#decisionGoal').addEventListener('input', update);
  q('#decisionCSV').addEventListener('click', () => {
    const decision = current();
    const { verdict } = decisionContent(decision);
    const rows: (string | number)[][] = [
      ['Decision workbench', `${RANGE_CASE_LABELS[activeCase]} case`, decision.currency, decision.mode, 'Annual results'],
      [verdict], [lossNote], ...(decision.mode === 'forecast' ? [[forecastNote]] : []),
      ['Scenario', 'Annual revenue', 'Annual net income before tax', 'Income change from baseline', 'Annual goal', 'Goal gap', 'Guess revenue %', 'Untagged revenue %', 'Break-even sales loss %', 'Conservative cost bound']
    ];
    decision.results.forEach(r => rows.push([r.name, r.metrics.revenue, r.metrics.income, r.metrics.income - decision.results[0].metrics.income, annualGoal ?? '', r.goalGap ?? '', r.guessRevenuePct, r.untaggedRevenuePct, r.loss?.pct ?? r.loss?.reason ?? 'Baseline', r.loss?.conservative ? 'Yes' : 'No']));
    rows.push([], ['Offering', 'Scenario', 'Annual revenue', 'Revenue change from baseline', 'Clients', 'Annual contribution', 'Contribution change from baseline', 'List price and unit', 'Assumed sales loss %']);
    decision.offeringRows.forEach(offering => offering.values.forEach((v, i) => rows.push(v
      ? [offering.name, ordered[i].name, v.revenue, v.revenue - (offering.values[0]?.revenue || 0), v.clients, v.margin, v.margin - (offering.values[0]?.margin || 0), offeringPrice(offering.inputs[i]!, decision.currency), offering.inputs[i]!.salesLossPct || 0]
      : [offering.name, ordered[i].name, 'Not offered'])));
    decision.results.forEach(r => { if (r.state.notes) rows.push(['Notes', r.name, r.state.notes]); });
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'profitpath-decision.csv'; link.click(); URL.revokeObjectURL(url);
  });
  q('#decisionPrint').addEventListener('click', () => {
    const report = window.open('', '_blank');
    if (!report) { showToast('Print window unavailable. Export CSV or share the decision instead.', 'info'); return; }
    report.opener = null;
    report.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ProfitPath decision</title><style>body{font:14px Arial;margin:24px;color:#111}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #999;padding:6px;text-align:left}tr{break-inside:avoid}h2,h3{break-after:avoid}.decision-table{overflow:visible}h3{margin-bottom:0}@page{size:landscape}</style></head><body><h1>Decision workbench</h1>${decisionContent(current(), 2).html}</body></html>`);
    report.document.close(); report.focus(); report.print();
  });
  q('#decisionShare').addEventListener('click', () => {
    const scenarios: Scenario[] = ordered.map((o, i) => ({ ...o, id: 'decision-' + i, timestamp: '', createdAt: '' }));
    const encoded = encodeScenarioBundle(scenarios);
    if (!encoded) { showToast('These options are too large for one link. Export a CSV instead.', 'error'); return; }
    const url = new URL(encoded);
    url.searchParams.set('decision', '1');
    url.searchParams.set('case', activeCase);
    if (annualGoal !== null) url.searchParams.set('goal', String(annualGoal));
    createModal({ title: 'Share decision', content: '<p>This snapshot includes every option, baseline, case and goal. Recipients can review it without changing their draft or saved scenarios.</p>' +
      `<input id="decisionShareURL" class="copy-on-click share-url-input" readonly aria-label="Decision link" value="${escapeHtml(url.toString())}">` });
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
