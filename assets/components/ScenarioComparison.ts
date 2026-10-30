import type { AppOffering, AppState, Scenario } from '../../src/types';
import * as misc from '../services/miscService';
import { escapeHtml, getAllScenarios, getShareBase, snapshotContextURL } from '../services/miscService';
import { applyRangeCase, getRangeCase, RANGE_CASE_LABELS, RANGE_CASES, setRangeCase, type RangeCase } from '../../src/calculations/rangeCase';
import { usesWorkspaces } from '../../src/ui/workspaceNavigation';
import { clearPendingInputs } from '../state/pendingInputs';
import { calc } from '../../src/calculations/index';
import { fmtMoney0 } from '../../src/calculations/currency';
import { fmtInt, fmtPct1 } from '../utils/format';
import { closeScenarioModal, createModal } from './Modal';
import { showToast } from '../services/modalService';
import { pruneMembership } from '../../src/calculations/membership';
import { downloadOrShare, openPrintTarget } from '../services/reportDelivery';

/** Scenario comparison (dropdowns, side-by-side diff view) and CSV import. */

interface ComparisonDeps {
  getState: () => AppState;
  render: () => void;
  persistState: () => void;
}

let deps: ComparisonDeps | null = null;
type ComparisonScenario = Pick<Scenario, 'id' | 'name' | 'timestamp' | 'state' | 'data'>;
let sharedScenarios: ComparisonScenario[] = [];
let sharedCase: RangeCase = 'base';

/** Shared snapshots belong to this page session, never the recipient's saved library. */
export function setSharedComparisonScenarios(scenarios: ComparisonScenario[], selectedCase: unknown = 'base') {
  sharedScenarios = scenarios;
  sharedCase = RANGE_CASES.find(value => value === selectedCase) || 'base';
}

function comparisonScenarios(): ComparisonScenario[] {
  return [...sharedScenarios, ...getAllScenarios()];
}

function comparisonCase(first: ComparisonScenario, second: ComparisonScenario): RangeCase {
  return sharedScenarios.includes(first) && sharedScenarios.includes(second) ? sharedCase : getRangeCase();
}

function comparisonSnapshotURL(first: ComparisonScenario, second: ComparisonScenario): string {
  const snapshot = (scenario: ComparisonScenario) => ({ name: scenario.name, state: scenario.data || scenario.state });
  const json = JSON.stringify({ s1: snapshot(first), s2: snapshot(second) });
  const payload = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
  if (payload.length > 20000) throw new Error('Comparison link too large');
  const url = new URL(snapshotContextURL(getShareBase() + '?compareStates=' + encodeURIComponent(payload)));
  url.searchParams.set('case', comparisonCase(first, second));
  return url.toString();
}

export function initScenarioComparison(d: ComparisonDeps): void {
  deps = d;
}

const $ = <T extends HTMLElement = HTMLInputElement>(sel: string) => document.querySelector<T>(sel);

// Helper to get selected scenario IDs from dropdowns
function getSelectedComparisonScenarios() {
  const scenario1Id = $('#compareScenario1')!.value;
  const scenario2Id = $('#compareScenario2')!.value;
  return { scenario1Id, scenario2Id };
}

// Populate scenario dropdowns
export function populateComparisonDropdowns() {
  const scenarios = getAllScenarios();
  const select1 = $('#compareScenario1');
  const select2 = $('#compareScenario2');
  if (!select1 || !select2) return;

  select1.innerHTML = '<option value="">Select first scenario...</option>';
  select2.innerHTML = '<option value="">Select second scenario...</option>';

  scenarios.forEach((s) => {
    const option1 = document.createElement('option');
    option1.value = s.id;
    option1.textContent = s.name;
    select1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = s.id;
    option2.textContent = s.name;
    select2.appendChild(option2);
  });

  // Restore previously selected values from localStorage
  const savedCompare = JSON.parse(localStorage.getItem('profitpath-compare-selection') || 'null');
  if (savedCompare) {
    if (savedCompare.id1) select1.value = savedCompare.id1;
    if (savedCompare.id2) select2.value = savedCompare.id2;
  }

  // Add change listeners that only save the selection (not trigger comparison)
  const saveSelection = () => {
    localStorage.setItem('profitpath-compare-selection', JSON.stringify({
      id1: select1.value || '',
      id2: select2.value || ''
    }));
  };

  select1.addEventListener('change', saveSelection);
  select2.addEventListener('change', saveSelection);
}

// CSV Import handler
export function handleCSVImport(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = misc.importFromCSV(e.target!.result as string);
    if (!result.success) {
      createModal({
        title: 'Import Error',
        content: `<div style="color: #dc3545;">${result.errors.map(err => `<p>${err}</p>`).join('')}</div>`,
        size: 'small',
        buttons: [{ text: 'Close', primary: true }]
      });
      return;
    }

    const { settings, offerings, expenses, resources, membershipPlans, memberProfiles } = result.data!;
    clearPendingInputs();
    if (usesWorkspaces()) {
      const reportCase = /^Range case:\s*(Conservative|Optimistic) case\s*$/m.exec(String(e.target!.result));
      setRangeCase(reportCase ? reportCase[1].toLowerCase() : 'base');
    }

    const state = deps!.getState();
    // Apply imported settings to state
    if (settings.employees !== undefined) state.fullTimeEmployees = settings.employees;
    if (settings.partTimeEmployees !== undefined) state.partTimeEmployees = settings.partTimeEmployees;
    if (settings.employeePay !== undefined) state.fullTimeEmployeePay = settings.employeePay;
    if (settings.partTimeEmployeePay !== undefined) state.partTimeEmployeePay = settings.partTimeEmployeePay;
    if (settings.monthlyCosts !== undefined) state.monthlyCosts = settings.monthlyCosts;
    if (settings.processingFeePct !== undefined) state.processingFeePct = settings.processingFeePct;
    if (settings.processingFeePerTransaction !== undefined) state.processingFeePerTransaction = settings.processingFeePerTransaction;
    if (settings.transactionsPerMonth !== undefined) state.transactionsPerMonth = settings.transactionsPerMonth;
    if (settings.productiveUtilizationPct !== undefined) state.productiveUtilizationPct = settings.productiveUtilizationPct;
    if (settings.targetUtilizationPct !== undefined) state.targetUtilizationPct = settings.targetUtilizationPct;

    // Apply imported offerings; expenses and resources only when the CSV had that section
    if (offerings.length > 0) state.offerings = offerings as AppOffering[];
    if (expenses !== undefined) state.expenses = expenses;
    if (resources !== undefined) state.resources = resources;
    // Plans and profiles name offerings by id; the import replaced those ids, so references the CSV did not re-link are dropped
    if (membershipPlans !== undefined) state.membershipPlans = membershipPlans;
    if (memberProfiles !== undefined) state.memberProfiles = memberProfiles;
    const pruned = pruneMembership(state.membershipPlans || [], state.memberProfiles || [], new Set(state.offerings.map((o) => o.id)));
    state.membershipPlans = pruned.plans;
    state.memberProfiles = pruned.profiles;

    deps!.persistState();
    deps!.render();
    showToast(`Imported ${offerings.length} offering${offerings.length !== 1 ? 's' : ''} successfully`, 'success', 2000);
  };

  reader.onerror = () => {
    showToast('Failed to read CSV file', 'error');
  };

  reader.readAsText(file);
}

// Handle comparison logic
export function handleComparison() {
  const comparisonErrorEl = $('#comparisonError');
  if (comparisonErrorEl) comparisonErrorEl.style.display = 'none'; // Hide previous error

  const { scenario1Id, scenario2Id } = getSelectedComparisonScenarios();

  if (!scenario1Id || !scenario2Id) {
    const compRes = $('#comparisonResults');
    if (compRes) compRes.style.display = 'none';
    return;
  }

  // Close the scenario modal and open the diff view
  closeScenarioModal();
  showScenarioComparisonDiff(scenario1Id, scenario2Id);
}

// Show full-width side-by-side scenario comparison diff
export function showScenarioComparisonDiff(id1: string, id2: string, onClose: (() => void) | null = null) {
  const allScenarios = comparisonScenarios();
  const scenario1 = allScenarios.find((s) => s.id === id1);
  const scenario2 = allScenarios.find((s) => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for comparison');
    return;
  }

  // Compute metrics for both scenarios
  const selectedCase = comparisonCase(scenario1, scenario2);
  const metrics1 = calc(applyRangeCase(scenario1.data || scenario1.state, selectedCase), { ignoreCase: true });
  const metrics2 = calc(applyRangeCase(scenario2.data || scenario2.state, selectedCase), { ignoreCase: true });

  // Define metrics to compare with hints about what's "better"
  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt, betterIsHigher: true },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0, betterIsHigher: true },
    { label: 'Net Income', key: 'income', format: fmtMoney0, betterIsHigher: true },
    { label: 'Utilization', key: 'capacityPct', format: fmtPct1, betterIsHigher: true },
    { label: 'Fixed Costs', key: 'totalFixedCosts', format: fmtMoney0, betterIsHigher: false },
    { label: 'Variable Costs', key: 'variableCosts', format: fmtMoney0, betterIsHigher: false },
    { label: 'Break-even Clients', key: 'breakEvenClients', format: fmtInt, betterIsHigher: false },
    { label: 'Contribution Margin/Client', key: 'contributionMarginPerClient', format: fmtMoney0, betterIsHigher: true }
  ];

  // Build header row
  let contentHtml = '<div class="scenario-diff-wrap">';
  contentHtml += `<p class="smallprint">${RANGE_CASE_LABELS[selectedCase]} case · Annual results</p>`;
  contentHtml += '<div class="scenario-diff-header">';
  contentHtml += '<div class="diff-col-label"></div>';
  contentHtml += '<div class="diff-col-s1"><strong>' + escapeHtml(scenario1.name) + '</strong><span class="diff-date">' + escapeHtml(scenario1.timestamp) + '</span></div>';
  contentHtml += '<div class="diff-col-s2"><strong>' + escapeHtml(scenario2.name) + '</strong><span class="diff-date">' + escapeHtml(scenario2.timestamp) + '</span></div>';
  contentHtml += '<div class="diff-col-delta">Change</div>';
  contentHtml += '</div>';

  // Build summary metrics section
  contentHtml += '<div class="scenario-diff-section-title">Summary</div>';
  contentHtml += '<div class="scenario-diff-table">';

  metricsToCompare.forEach(m => {
    const val1 = (metrics1 as unknown as Record<string, number>)[m.key];
    const val2 = (metrics2 as unknown as Record<string, number>)[m.key];
    const delta = val2 - val1;
    const deltaStr = m.format(delta);

    // Determine diff class (better/worse/neutral)
    let diffClass = 'diff-neutral';
    if (delta !== 0) {
      const isImprovement = m.betterIsHigher ? (delta > 0) : (delta < 0);
      diffClass = isImprovement ? 'diff-better' : 'diff-worse';
    }

    const sign = delta > 0 ? '+' : '';
    contentHtml += '<div class="scenario-diff-row">';
    contentHtml += '<div class="diff-col-label">' + m.label + '</div>';
    contentHtml += '<div class="diff-col-s1">' + m.format(val1) + '</div>';
    contentHtml += '<div class="diff-col-s2">' + m.format(val2) + '</div>';
    contentHtml += '<div class="diff-col-delta ' + diffClass + '">' + sign + deltaStr + '</div>';
    contentHtml += '</div>';
  });

  contentHtml += '</div>';

  // Add export and sharing options
  contentHtml += '<div class="scenario-diff-section-title">Export & Share</div>';
  contentHtml += '<div class="scenario-diff-export-options" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">';
  contentHtml += '<button class="btn primary" onclick="window.exportComparisonAsCSV(\'' + id1 + '\', \'' + id2 + '\')">📊 Export CSV</button>';
  contentHtml += '<button class="btn secondary" onclick="window.shareComparison(\'' + id1 + '\', \'' + id2 + '\')">🔗 Share Comparison</button>';
  contentHtml += '<button class="btn secondary" onclick="window.exportComparisonAsPDF(\'' + id1 + '\', \'' + id2 + '\')">📄 Export PDF</button>';
  contentHtml += '<button class="btn secondary" onclick="window.getComparisonEmbedCode(\'' + id1 + '\', \'' + id2 + '\')">📋 Get Embed Code</button>';
  contentHtml += '</div>';

  // Per-offering breakdown (if offerings match by name)
  if (metrics1.offeringMetrics && metrics2.offeringMetrics) {
    const names1 = metrics1.offeringMetrics.map(o => o.name);
    const names2 = metrics2.offeringMetrics.map(o => o.name);
    const namesMatch = names1.length === names2.length && names1.every((n, i) => n === names2[i]);

    if (namesMatch && metrics1.offeringMetrics.length > 0) {
      contentHtml += '<div class="scenario-diff-section-title">By Offering</div>';

      metrics1.offeringMetrics.forEach((off1, idx) => {
        const off2 = metrics2.offeringMetrics[idx];
        contentHtml += '<div class="scenario-diff-offering">';
        contentHtml += '<div class="scenario-diff-offering-name">' + escapeHtml(off1.name) + '</div>';
        contentHtml += '<div class="scenario-diff-table">';

        // Revenue
        const revDelta = off2.revenue - off1.revenue;
        const revIsImp = revDelta > 0;
        contentHtml += '<div class="scenario-diff-row scenario-diff-offering-row">';
        contentHtml += '<div class="diff-col-label">Revenue</div>';
        contentHtml += '<div class="diff-col-s1">' + fmtMoney0(off1.revenue) + '</div>';
        contentHtml += '<div class="diff-col-s2">' + fmtMoney0(off2.revenue) + '</div>';
        contentHtml += '<div class="diff-col-delta ' + (revDelta === 0 ? 'diff-neutral' : revIsImp ? 'diff-better' : 'diff-worse') + '">' + (revDelta > 0 ? '+' : '') + fmtMoney0(revDelta) + '</div>';
        contentHtml += '</div>';

        // Clients
        const clientDelta = off2.clients - off1.clients;
        const clientIsImp = clientDelta > 0;
        contentHtml += '<div class="scenario-diff-row scenario-diff-offering-row">';
        contentHtml += '<div class="diff-col-label">Clients</div>';
        contentHtml += '<div class="diff-col-s1">' + fmtInt(off1.clients) + '</div>';
        contentHtml += '<div class="diff-col-s2">' + fmtInt(off2.clients) + '</div>';
        contentHtml += '<div class="diff-col-delta ' + (clientDelta === 0 ? 'diff-neutral' : clientIsImp ? 'diff-better' : 'diff-worse') + '">' + (clientDelta > 0 ? '+' : '') + fmtInt(clientDelta) + '</div>';
        contentHtml += '</div>';

        // Margin %
        const marginPct1 = off1.marginPct || 0;
        const marginPct2 = off2.marginPct || 0;
        const marginDelta = marginPct2 - marginPct1;
        const marginIsImp = marginDelta > 0;
        contentHtml += '<div class="scenario-diff-row scenario-diff-offering-row">';
        contentHtml += '<div class="diff-col-label">Margin %</div>';
        contentHtml += '<div class="diff-col-s1">' + fmtPct1(marginPct1) + '</div>';
        contentHtml += '<div class="diff-col-s2">' + fmtPct1(marginPct2) + '</div>';
        contentHtml += '<div class="diff-col-delta ' + (marginDelta === 0 ? 'diff-neutral' : marginIsImp ? 'diff-better' : 'diff-worse') + '">' + (marginDelta > 0 ? '+' : '') + fmtPct1(marginDelta) + '</div>';
        contentHtml += '</div>';

        contentHtml += '</div>';
        contentHtml += '</div>';
      });
    }
  }

  contentHtml += '</div>';

  // Create and show modal with onClose callback to return to scenarios
  createModal({
    title: 'Scenario Comparison: ' + escapeHtml(scenario1.name) + ' vs ' + escapeHtml(scenario2.name),
    content: contentHtml,
    size: 'full',
    onClose: onClose || (() => openScenarioModal())
  });
}

// Export comparison as CSV
window.exportComparisonAsCSV = function (id1: string, id2: string) {
  const scenarios = comparisonScenarios();
  const scenario1 = scenarios.find((s) => s.id === id1);
  const scenario2 = scenarios.find((s) => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for export');
    return;
  }

  const selectedCase = comparisonCase(scenario1, scenario2);
  const metrics1 = calc(applyRangeCase(scenario1.data || scenario1.state, selectedCase), { ignoreCase: true });
  const metrics2 = calc(applyRangeCase(scenario2.data || scenario2.state, selectedCase), { ignoreCase: true });

  // Create CSV content. Every cell goes through csvCell so untrusted names and
  // negative numbers (which start with '-') can't be executed as spreadsheet formulas.
  const cell = misc.csvCell;
  let csvContent = cell(`Range case: ${RANGE_CASE_LABELS[selectedCase]} case`) + '\n' + cell('Annual results') + '\n\n';
  csvContent += ['Metric', cell(scenario1.name), cell(scenario2.name), 'Change'].join(',') + '\n';

  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
    { label: 'Net Income', key: 'income', format: fmtMoney0 },
    { label: 'Utilization', key: 'capacityPct', format: fmtPct1 },
    { label: 'Fixed Costs', key: 'totalFixedCosts', format: fmtMoney0 },
    { label: 'Variable Costs', key: 'variableCosts', format: fmtMoney0 },
    { label: 'Break-even Clients', key: 'breakEvenClients', format: fmtInt },
    { label: 'Contribution Margin/Client', key: 'contributionMarginPerClient', format: fmtMoney0 }
  ];

  metricsToCompare.forEach(m => {
    const val1 = (metrics1 as unknown as Record<string, number>)[m.key];
    const val2 = (metrics2 as unknown as Record<string, number>)[m.key];
    const delta = val2 - val1;
    const sign = delta > 0 ? '+' : '';

    csvContent += [cell(m.label), cell(m.format(val1)), cell(m.format(val2)), cell(sign + m.format(delta))].join(',') + '\n';
  });

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv' });
  // Strip characters that don't belong in a filename (names can be untrusted).
  const safeFileName = (n: unknown) => String(n || 'scenario').replace(/[^a-z0-9 _-]+/gi, '').trim().slice(0, 60) || 'scenario';
  void downloadOrShare(blob, `scenario-comparison-${safeFileName(scenario1.name)}-vs-${safeFileName(scenario2.name)}.csv`);
};

// Share comparison link with full scenario state encoded in URL
window.shareComparison = function (id1: string, id2: string) {
  const scenarios = comparisonScenarios();
  const scenario1 = scenarios.find((s) => s.id === id1);
  const scenario2 = scenarios.find((s) => s.id === id2);

  if (!scenario1 || !scenario2) {
    showToast('Unable to load scenarios for sharing', 'error');
    return;
  }

  let shareUrl;
  try {
    shareUrl = comparisonSnapshotURL(scenario1, scenario2);
  } catch {
    showToast('Unable to generate share link', 'error');
    return;
  }

  const showFallbackModal = () => {
    createModal({
      title: '🔗 Share Comparison',
      content: `<p style="color:var(--text);margin-bottom:8px;">Shareable link for this comparison:</p><textarea readonly class="copy-on-click" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--surface-2);color:var(--text);font-family:var(--mono);font-size:12px;min-height:80px;word-break:break-all;box-sizing:border-box;">${shareUrl}</textarea><p class="copy-field-hint">Click the field to copy</p>`,
      size: 'medium'
    });
  };

  if (!navigator.clipboard) {
    showFallbackModal();
    return;
  }

  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast('Comparison link copied to clipboard!');
  }).catch(showFallbackModal);
};

// Export comparison as PDF
window.exportComparisonAsPDF = function (id1: string, id2: string) {
  const scenarios = comparisonScenarios();
  const scenario1 = scenarios.find((s) => s.id === id1);
  const scenario2 = scenarios.find((s) => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for export');
    return;
  }

  // Create a printable version of the comparison
  const printWindow = openPrintTarget('ProfitPath comparison');
  if (!printWindow) return;
  const selectedCase = comparisonCase(scenario1, scenario2);
  const metrics1 = calc(applyRangeCase(scenario1.data || scenario1.state, selectedCase), { ignoreCase: true });
  const metrics2 = calc(applyRangeCase(scenario2.data || scenario2.state, selectedCase), { ignoreCase: true });

  const n1 = escapeHtml(scenario1.name);
  const n2 = escapeHtml(scenario2.name);
  const caseLabel = `${RANGE_CASE_LABELS[selectedCase]} case`;
  let printContent = `
    <html>
      <head>
        <title>Scenario Comparison: ${n1} vs ${n2} (${caseLabel})</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .positive { color: green; }
          .negative { color: red; }
        </style>
      </head>
      <body>
        <h1>Scenario Comparison</h1>
        <h2>${n1} vs ${n2}</h2>
        <p>${caseLabel} · Annual results</p>
        <table>
          <tr><th>Metric</th><th>${n1}</th><th>${n2}</th><th>Change</th></tr>
  `;

  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
    { label: 'Net Income', key: 'income', format: fmtMoney0 },
    { label: 'Utilization', key: 'capacityPct', format: fmtPct1 },
    { label: 'Fixed Costs', key: 'totalFixedCosts', format: fmtMoney0 },
    { label: 'Variable Costs', key: 'variableCosts', format: fmtMoney0 },
    { label: 'Break-even Clients', key: 'breakEvenClients', format: fmtInt },
    { label: 'Contribution Margin/Client', key: 'contributionMarginPerClient', format: fmtMoney0 }
  ];

  metricsToCompare.forEach(m => {
    const val1 = (metrics1 as unknown as Record<string, number>)[m.key];
    const val2 = (metrics2 as unknown as Record<string, number>)[m.key];
    const delta = val2 - val1;
    const sign = delta > 0 ? '+' : '';
    const changeClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';

    printContent += `<tr><td>${m.label}</td><td>${m.format(val1)}</td><td>${m.format(val2)}</td><td class="${changeClass}">${sign}${m.format(delta)}</td></tr>`;
  });

  printContent += `
        </table>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

// Get embed code for comparison
window.getComparisonEmbedCode = function (id1: string, id2: string) {
  const scenarios = comparisonScenarios();
  const scenario1 = scenarios.find((s) => s.id === id1);
  const scenario2 = scenarios.find((s) => s.id === id2);

  if (!scenario1 || !scenario2) {
    alert('Unable to load scenarios for embed code');
    return;
  }

  let embedUrl: string;
  try {
    const url = new URL(comparisonSnapshotURL(scenario1, scenario2));
    url.searchParams.set('embed', 'true');
    embedUrl = url.toString();
  } catch {
    showToast('Unable to generate embed code', 'error');
    return;
  }
  const embedCode = `<iframe title="ProfitPath scenario comparison" src="${escapeHtml(embedUrl)}" width="800" height="600" frameborder="0"></iframe>`;

  // createModal already appends to body and wires close-on-scrim + ESC
  createModal({
    title: '📋 Embed Comparison',
    content: `
      <p style="color:var(--text);margin-bottom:8px;">Embed code for this comparison:</p>
      <textarea readonly class="copy-on-click" style="width:100%;height:100px;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--surface-2);color:var(--text);font-family:var(--mono);font-size:12px;box-sizing:border-box;">${escapeHtml(embedCode)}</textarea>
      <p class="copy-field-hint">Click the field to copy</p>
      <p style="margin-top:6px;font-size:12px;color:var(--muted);">Preview: <a href="${embedUrl}" target="_blank" style="color:var(--accent);">Open in new tab</a></p>
    `,
    size: 'medium'
  });
};

/** Wires the Import CSV button and its drop zone; safe to call more than once. */
export function bindCsvImport(): void {
  const importBtn = document.querySelector<HTMLElement & { _importWired?: boolean }>('#importCSVBtn');
  const csvFileInput = document.querySelector<HTMLInputElement & { _pickerOpen?: boolean }>('#csvFileInput');
  if (!importBtn || !csvFileInput || importBtn._importWired) return;
  importBtn._importWired = true;

  importBtn.addEventListener('click', () => {
    createModal({
      title: 'Import from CSV',
      content: `
        <p>Upload a CSV file to import your business settings and offerings.</p>
        <div id="csvDropZone" style="border: 2px dashed #5eead4; border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; background: rgba(94, 234, 212, 0.05);">
          <div style="color: #5eead4; font-weight: 600; margin-bottom: 8px;">Click to select or drag and drop CSV</div>
          <div style="font-size: 12px; color: var(--muted);">Supported: .csv files with business settings and offerings</div>
        </div>
      `,
      size: 'medium'
    });

    // Wire the drop zone after modal renders
    setTimeout(() => {
      const zone = document.getElementById('csvDropZone');
      if (!zone) return;

      zone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = document.getElementById('csvFileInput') as (HTMLInputElement & { _pickerOpen?: boolean }) | null;
        if (input && !input._pickerOpen) {
          input._pickerOpen = true;
          input.click();
        }
      });

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = '#60a5fa';
        zone.style.background = 'rgba(96, 165, 250, 0.1)';
      });

      zone.addEventListener('dragleave', () => {
        zone.style.borderColor = '#5eead4';
        zone.style.background = 'rgba(94, 234, 212, 0.05)';
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = '#5eead4';
        zone.style.background = 'rgba(94, 234, 212, 0.05)';
        const file = e.dataTransfer?.files[0];
        if (file) handleCSVImport(file);
      });
    }, 50);
  });

  csvFileInput.addEventListener('change', (e: Event) => {
    csvFileInput._pickerOpen = false;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      handleCSVImport(file);
    } else {
      window.closeModal();
    }
    csvFileInput.value = '';
  });

  // Also clear the guard on cancel (browsers that fire 'cancel' instead of 'change')
  csvFileInput.addEventListener('cancel', () => {
    csvFileInput._pickerOpen = false;
  });
}
