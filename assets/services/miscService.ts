// Miscellaneous Helpers and UI Logic
/* global render calc Chart */

// Capacitor WebView serves assets from http://localhost — use the real URL instead
const PRODUCTION_URL = 'https://tsyche.github.io/profitpath';
export function getShareBase() {
  const o = window.location.origin;
  if (o === 'http://localhost' || o === 'capacitor://localhost') return PRODUCTION_URL + '/';
  return o + window.location.pathname;
}
import type { AppOffering, AppState, CalcResult, ExperienceLevel, Offering, Scenario } from '../../src/types';
import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import { clamp, errMsg } from '../utils/helpers';
import { buildXLSX } from '../utils/xlsx';
import { buildReportSections, buildWorkbookSheets, reportPreamble, type ReportCell } from './reportSections';
import { calc as calculate, normalizeOfferingType } from '../../src/calculations/index';
import { getRangeCase, RANGE_CASE_LABELS, rangeCaseTag } from '../../src/calculations/rangeCase';
import { displayPrice, isOneTime, isPerSession } from '../../src/calculations/offeringPrice';
import { usesWorkspaces } from '../../src/ui/workspaceNavigation';
import { sanitizeOfferingRange } from '../../src/calculations/ranges';
import { sanitizeOfferingMarket } from '../../src/calculations/marketPosition';
import { sanitizeSalesLossBounds, sanitizeSalesLossPct } from '../../src/calculations/salesLoss';
import { sanitizeOfferingMeta } from '../../src/calculations/offeringMeta';
import { sanitizeExpenses, totalMonthlyOverhead } from '../../src/calculations/expenses';
import { sanitizeCostPerRun } from '../../src/calculations/groupRuns';
import { sanitizeResources } from '../../src/calculations/resources';
import { sanitizePlans, sanitizeProfiles, pruneMembership } from '../../src/calculations/membership';
import { fmtMoney0, normalizeCurrency, taxBasisNote } from '../../src/calculations/currency';
import { showToast } from './modalService';
import { createModal } from '../components/Modal';
import { ensureValidInputs } from '../state/pendingInputs';
import { renderSimpleChart, updateRichVisualizations as vizUpdateRichVisualizations, updateBreakEvenAnalysis } from './visualizationService';

// Utility functions for export functionality

// Capacitor WebView blocks <a download> — use Web Share API for files when available
async function downloadOrShare(blob: Blob, filename: string) {
  if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] })) {
    try {
      await navigator.share({ files: [new File([blob], filename, { type: blob.type })], title: filename });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return; // user cancelled share sheet
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Utility function to clamp values between min and max
// Coerce a value to a finite number within [min, max], or return fallback
function toFiniteNumber(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

const MAX_OFFERINGS = 50;
const MAX_NAME_LENGTH = 120;

// Sanitize untrusted scenario data (from URLs, localStorage, or imports) into a
// safe state object containing only allowlisted fields with clamped values.
// Returns null if the data is not a usable scenario. Handles the legacy
// employees/employeePay format by mapping it onto fullTime fields.
/**
 * @param data - Untrusted input (URL, storage, import)
 */
export function sanitizeScenarioState(data: Record<string, unknown>): import('../../src/types').SanitizedScenarioState | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const resources = sanitizeResources(data.resources, uuid);
  const resourceIds = new Set(resources.map((r) => r.id));
  const rawOfferings = Array.isArray(data.offerings) ? data.offerings.slice(0, MAX_OFFERINGS) : [];
  const offerings = rawOfferings
    .filter((o) => o && typeof o === 'object')
    .map((o, idx) => ({
      id: typeof o.id === 'string' && o.id ? o.id.slice(0, 64) : uuid(),
      name: (typeof o.name === 'string' ? o.name : '').trim().slice(0, MAX_NAME_LENGTH) || `Offering ${idx + 1}`,
      priceMonthly: toFiniteNumber(o.priceMonthly, 100, 0, 1e9),
      sessionsPerYear: toFiniteNumber(o.sessionsPerYear, 12, 0, 100000),
      hoursPerSession: toFiniteNumber(o.hoursPerSession, 1, 0, 10000),
      variableCostPerSession: toFiniteNumber(o.variableCostPerSession, 0, 0, 1e9),
      laborPctOfPrice: toFiniteNumber(o.laborPctOfPrice, 0, 0, 100),
      discountPct: toFiniteNumber(o.discountPct, 0, 0, 100),
      salesLossPct: toFiniteNumber(o.salesLossPct, 0, 0, 100),
      ...sanitizeSalesLossBounds(o),
      type: normalizeOfferingType(o.type),
      seats: Math.floor(toFiniteNumber(o.seats, 1, 1, 100000)),
      fillPct: toFiniteNumber(o.fillPct, 100, 1, 100),
      costPerRun: sanitizeCostPerRun(o.costPerRun),
      mixPct: toFiniteNumber(o.mixPct, 0, 0, 100),
      currentClients: Math.floor(toFiniteNumber(o.currentClients, 0, 0, 1e7)),
      ...sanitizeOfferingRange(o),
      ...sanitizeOfferingMeta(o),
      ...sanitizeOfferingMarket(o),
      // A tag pointing at a resource that no longer exists is dropped
      ...(typeof o.resource === 'string' && resourceIds.has(o.resource) ? { resource: o.resource } : {})
    }));

  if (offerings.length === 0) return null;

  // Plans and profiles reference offerings by id; references to missing offerings are dropped
  const membership = pruneMembership(sanitizePlans(data.membershipPlans, uuid), sanitizeProfiles(data.memberProfiles, uuid), new Set(offerings.map((o) => o.id)));

  return {
    mode: data.mode === 'current' ? 'current' : 'forecast',
    offerings,
    fullTimeEmployees: Math.floor(toFiniteNumber(data.fullTimeEmployees ?? data.employees, 1, 0, 100000)),
    partTimeEmployees: Math.floor(toFiniteNumber(data.partTimeEmployees, 0, 0, 100000)),
    fullTimeEmployeePay: toFiniteNumber(data.fullTimeEmployeePay ?? data.employeePay, 60000, 0, 1e9),
    partTimeEmployeePay: toFiniteNumber(data.partTimeEmployeePay, 30000, 0, 1e9),
    monthlyCosts: toFiniteNumber(data.monthlyCosts, 250, 0, 1e9),
    processingFeePct: toFiniteNumber(data.processingFeePct, 0, 0, 20),
    processingFeePerTransaction: toFiniteNumber(data.processingFeePerTransaction, 0, 0, 100),
    transactionsPerMonth: toFiniteNumber(data.transactionsPerMonth, 0, 0, 1e7),
    productiveUtilizationPct: toFiniteNumber(data.productiveUtilizationPct, 80, 1, 100),
    targetUtilizationPct: toFiniteNumber(data.targetUtilizationPct, 75, 1, 150),
    lockMix: data.lockMix === true,
    loadedTemplate: typeof data.loadedTemplate === 'string' ? data.loadedTemplate.slice(0, 100) : null,
    notes: typeof data.notes === 'string' ? data.notes.slice(0, 2000) : '',
    currency: normalizeCurrency(data.currency),
    expenses: sanitizeExpenses(data.expenses, uuid),
    resources,
    membershipPlans: membership.plans,
    memberProfiles: membership.profiles
  };
}

export function escapeHtml(str: unknown) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Clipboard fallback for non-secure contexts
function copyToClipboardFallback(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  return new Promise<void>((resolve, reject) => {
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) resolve();
      else reject(new Error('Copy command failed'));
    } catch (err) {
      document.body.removeChild(textArea);
      reject(err);
    }
  });
}

export function shareScenario() {
  if (!ensureValidInputs()) return;
  const editUrl = encodeScenarioToURL(window.state);
  const viewUrl = encodeScenarioToURL(window.state, { readonly: true });
  if (!editUrl || !viewUrl) {
    showToast('Failed to generate share link', 'error');
    return;
  }
  updateSocialMetaTags(window.state);

  const copyLink = (url: string, label: string) => {
    const success = () => showToast(label + ' link copied!', 'success');
    const fallback = () => showToast('Link: ' + url, 'info');
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(url).then(success).catch(() => copyToClipboardFallback(url).then(success).catch(fallback));
    } else {
      copyToClipboardFallback(url).then(success).catch(fallback);
    }
  };

  const esc = escapeHtml;
  const linkRow = (label: string, desc: string, url: string, btnId: string) => `
    <div class="share-option-row">
      <div class="share-option-info">
        <strong>${esc(label)}</strong>
        <span class="share-option-desc">${esc(desc)}</span>
      </div>
      <div class="share-option-url">
        <input type="text" readonly value="${esc(url)}" class="copy-on-click share-url-input" aria-label="${esc(label)} link">
        <button class="btn small share-copy-btn" id="${btnId}" type="button">Copy</button>
      </div>
    </div>`;

  const overlay = createModal({
    title: '🔗 Share Scenario',
    content: `
      <p style="margin-top:0;color:var(--muted);font-size:13px">Choose how to share this scenario:</p>
      ${linkRow('View Only', 'Inputs locked — ideal for client presentations', viewUrl, 'shareViewOnlyBtn')}
      ${linkRow('Editable', 'Recipient can adjust all inputs freely', editUrl, 'shareEditableBtn')}
      <p class="share-snapshot-note" style="margin-bottom:0;color:var(--muted);font-size:12px">Links are snapshots of the scenario as it is now. Later edits won't change links you already sent, so share again after changing it.</p>
    `,
    size: 'medium'
  });

  overlay.querySelector('#shareViewOnlyBtn')?.addEventListener('click', () => copyLink(viewUrl, 'View-only'));
  overlay.querySelector('#shareEditableBtn')?.addEventListener('click', () => copyLink(editUrl, 'Editable'));

  // Click-to-copy on the URL inputs
  overlay.querySelectorAll('.share-url-input').forEach(input => {
    input.addEventListener('click', () => {
      if (!(input instanceof HTMLInputElement)) return;
      input.select();
      copyLink(input.value, 'Link');
    });
  });
}

// Quote a CSV cell: double embedded quotes, and prefix a ' on values starting
// with = + - @ so spreadsheet apps don't execute them as formulas
/** ' (Conservative case)' off the base case, '' on it; appended to export titles so a lens is never mistaken for the inputs. */
function caseSuffix() {
  const t = rangeCaseTag();
  return t ? ' (' + t + ')' : '';
}

function reportPrice(offering: AppOffering): string {
  const unit = isOneTime(offering) ? 'sale' : isPerSession(offering) ? 'session' : 'month';
  return `${fmtMoney0(displayPrice(offering))}/${unit}`;
}

function reportResultRows(metrics: CalcResult): [string, string][] {
  return [
    ['Annual revenue', fmtMoney0(metrics.revenue)],
    ['Net income before tax', fmtMoney0(metrics.income)],
    ['Utilization', metrics.capacityPct.toFixed(1) + '%'],
    ['Estimated take-home after tax', fmtMoney0(metrics.takeHome)],
    ['Year 1 cash flow before tax', fmtMoney0(metrics.yearOneCashFlow)]
  ];
}

function reportScenarioName(): string {
  return document.querySelector<HTMLInputElement>('#workspaceName')?.value.trim() || 'Working model';
}

function reportContextHTML(state: AppState): string {
  const name = reportScenarioName();
  const basis = taxBasisNote(state.currency);
  const mode = state.mode === 'forecast' ? 'Forecast · capacity-supported customers' : 'Current · entered customers';
  const caveat = state.mode === 'forecast'
    ? 'Forecast models capacity-supported customers. It does not predict demand or promise sales.'
    : 'Current results use the entered customer counts and service assumptions.';
  return `<p><strong>Scenario:</strong> ${escapeHtml(name)}</p>
    <p>${RANGE_CASE_LABELS[getRangeCase()]} case · ${mode} · ${escapeHtml(normalizeCurrency(state.currency))}</p>
    <p>${caveat} Take-home uses estimated tax; Year 1 cash flow includes purchases and loan principal.</p>
    ${basis ? `<p>${escapeHtml(basis)}.</p>` : ''}
    ${state.loadedTemplate ? '<p>Example assumptions: replace them with your business inputs before making a decision.</p>' : ''}
    ${state.notes?.trim() ? `<p><strong>Scenario notes:</strong> ${escapeHtml(state.notes).replace(/\r?\n/g, '<br>')}</p>` : ''}`;
}

function reportConclusionHTML(state: AppState, metrics: CalcResult): string {
  return `<section class="section">
    <h2>Annual results</h2>
    ${reportContextHTML(state)}
    <table><thead><tr><th scope="col">Metric</th><th scope="col">Value</th></tr></thead><tbody>
      ${reportResultRows(metrics).map(([label, value]) => `<tr><th scope="row">${label}</th><td>${escapeHtml(value)}</td></tr>`).join('')}
    </tbody></table>
  </section>`;
}

export function csvCell(value: unknown) {
  let s = String(value == null ? '' : value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

// A CSV cell: strings are quoted (and formula-guarded), numbers stay bare so
// import's parseFloat sees them and spreadsheets treat them as numeric.
function csvValue(v: ReportCell) {
  if (typeof v === 'number') return String(v);
  if (v === '') return '';
  return csvCell(v);
}

// Builds the CSV report from the shared report sections; importFromCSV reads the
// parameters, offerings and expenses sections back. The Excel workbook renders
// the same sections, so the two formats cannot drift apart.
export function buildCSV(st: AppState, results: CalcResult) {
  const parts = [...reportPreamble(st)];
  for (const s of buildReportSections(st, results)) {
    if (s.csv === false) continue;
    parts.push([s.title, s.header.join(','), ...s.rows.map((row) => row.map(csvValue).join(','))].join('\n'));
  }
  return parts.join('\n\n');
}

export function exportAsCSV() {
  if (!ensureValidInputs()) return;
  let results: CalcResult;
  try {
    if (typeof calc === 'function') {
      results = calc(state);
    } else {
      results = { state: state, metrics: {} } as unknown as CalcResult;
    }
  } catch (e) {
    console.error('Calculation failed in exportAsCSV:', e);
    alert('Error: Could not generate CSV export due to calculation error.');
    return;
  }

  const csv = buildCSV(state, results);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadOrShare(blob, 'profitpath-' + new Date().toISOString().split('T')[0] + '.csv');
  trackEvent('export', { format: 'csv' });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Link copied to clipboard!', 'success');
  }).catch((err) => {
    console.error('Failed to copy text: ', err);
    showNotification('Failed to copy link', 'error');
  });
}

// Expose to window for onclick handlers
window.copyToClipboard = copyToClipboard;
window.showNotification = showNotification;

function updateSocialMetaTags(state: { offerings: { name: string }[] }) {
  const title = 'ProfitPath Scenario: ' + state.offerings.map((o) => o.name).join(', ');
  const description = 'Check out my business profitability analysis with ' + state.offerings.length + ' service offerings';
  const image = 'https://example.com/profitpath-logo.png'; // Placeholder URL

  // Update meta tags
  const metaTitle = document.querySelector('meta[property="og:title"]') || document.createElement('meta');
  metaTitle.setAttribute('property', 'og:title');
  metaTitle.setAttribute('content', title);

  const metaDescription = document.querySelector('meta[property="og:description"]') || document.createElement('meta');
  metaDescription.setAttribute('property', 'og:description');
  metaDescription.setAttribute('content', description);

  const metaImage = document.querySelector('meta[property="og:image"]') || document.createElement('meta');
  metaImage.setAttribute('property', 'og:image');
  metaImage.setAttribute('content', image);

  const metaUrl = document.querySelector('meta[property="og:url"]') || document.createElement('meta');
  metaUrl.setAttribute('property', 'og:url');
  metaUrl.setAttribute('content', encodeScenarioToURL(state) || getShareBase());

  document.head.appendChild(metaTitle);
  document.head.appendChild(metaDescription);
  document.head.appendChild(metaImage);
  document.head.appendChild(metaUrl);
}

// v2 links: UTF-8 JSON, deflated, as unpadded base64url (roughly 4-5x shorter than
// the legacy percent-encode + base64 + percent-encode chain). Legacy links still decode.
const SCENARIO_V2_PREFIX = 'v2.';
// Untrusted input: refuse payloads no real scenario needs before inflating them
const MAX_V2_PAYLOAD_CHARS = 20000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeScenarioToURL(state: import('../../src/types').CalcState, { readonly = false } = {}): string | null {
  if (state === window.state && !ensureValidInputs()) return null;
  try {
    const serialized = JSON.stringify(state);
    let url = getShareBase() + '?scenario=' + SCENARIO_V2_PREFIX + bytesToBase64Url(deflateSync(strToU8(serialized), { level: 9 }));
    if (readonly) url += '&readonly=1';
    url += '&case=' + getRangeCase();
    if (usesWorkspaces()) {
      const snapshot = new URL(snapshotContextURL(url));
      const name = document.querySelector<HTMLInputElement>('#workspaceName')?.value;
      if (name) snapshot.searchParams.set('name', name.slice(0, 120));
      return snapshot.toString();
    }
    return url;
  } catch (e) {
    console.error('Failed to encode scenario:', e);
    return null;
  }
}

/** Navigation/case metadata is independent of the backward-compatible scenario payload. */
export function snapshotContextURL(url: string): string {
  if (!usesWorkspaces()) return url;
  const snapshot = new URL(url);
  snapshot.searchParams.set('layout', 'workspaces');
  snapshot.searchParams.set('case', getRangeCase());
  return snapshot.toString();
}

export function isReadOnlyURL() {
  return new URLSearchParams(window.location.search).get('readonly') === '1';
}

/** @returns {unknown} Untrusted payload: run it through sanitizeScenarioState(). */
export function decodeScenarioFromURL() {
  const params = new URLSearchParams(window.location.search);
  const scenarioParam = params.get('scenario');
  if (!scenarioParam) return null;

  try {
    if (scenarioParam.startsWith(SCENARIO_V2_PREFIX)) {
      if (scenarioParam.length > MAX_V2_PAYLOAD_CHARS) return null;
      return JSON.parse(strFromU8(inflateSync(base64UrlToBytes(scenarioParam.slice(SCENARIO_V2_PREFIX.length)))));
    }
    const decoded = atob(decodeURIComponent(scenarioParam));
    try {
      return JSON.parse(decodeURIComponent(decoded));
    } catch {
      // Legacy links encoded raw JSON without the URI-encoding step
      return JSON.parse(decoded);
    }
  } catch (e) {
    console.error('Failed to decode scenario:', e);
    return null;
  }
}

// Export functions for modal service
export function showModal(content: string, options: { title?: string; buttons?: string } = {}) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${options.title || 'Modal'}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        ${options.buttons || ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add event listeners for close buttons
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  });

  return modal;
}

export function showLoadingModal() {
  return showModal('<div class="spinner"></div><p>Loading...</p>', { title: 'Loading' });
}

export function showSuccessModal(message: string) {
  return showModal('<p>' + message + '</p>', { title: 'Success', buttons: '<button onclick="this.closest(\'.modal\').remove()">OK</button>' });
}

export function showErrorModal(error: Error | string) {
  return showModal('<p>' + (errMsg(error)) + '</p>', { title: 'Error', buttons: '<button onclick="this.closest(\'.modal\').remove()">OK</button>' });
}

export function loadState() {
  try {
    const saved = localStorage.getItem('profitpath-state');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
  return null;
}

// Export functions for business logic
// Removed redundant functions

// Export functions for chart and visualization
export function renderChart(containerId: string, data: unknown, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Lazy load chart library if not already loaded
  if (typeof Chart === 'undefined') {
    loadScript('https://cdn.jsdelivr.net/npm/chart.js').then(() => {
      createChart(container, data, options);
    });
  } else {
    createChart(container, data, options);
  }
}

function createChart(container: HTMLElement, data: unknown, options: Record<string, unknown>) {
  const ctx = (container as HTMLCanvasElement).getContext('2d');
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    ...options,
  };

  new Chart(ctx, {
    type: 'bar',
    data: data,
    options: chartOptions,
  });
}

// Export functions for scenario management
export function saveScenario(name: string, description = '') {
  const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
  const scenario = {
    id: uuid(),
    name: name,
    description: description,
    state: JSON.parse(JSON.stringify(state)),
    createdAt: new Date().toISOString(),
  };

  scenarios.push(scenario);
  localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));
  return scenario;
}

export function loadScenario(scenarioId: string) {
  const scenarios: Scenario[] = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (scenario) {
    state = scenario.state as AppState;
    if (typeof render === 'function') render();
    return true;
  }
  return false;
}

export function deleteScenario(scenarioId: string) {
  const scenarios: Scenario[] = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
  const filtered = scenarios.filter((s) => s.id !== scenarioId);
  localStorage.setItem('profitpath-scenarios', JSON.stringify(filtered));
}

/** @returns {import('../../src/types').Scenario[]} */
export function listScenarios() {
  return JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
}

// Additional functions needed by scenarioService.js
/** @returns {import('../../src/types').Scenario[]} */
export function getAllScenarios(): Scenario[] {
  return JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
}

export function clearTestScenarios() {
  localStorage.removeItem('profitpath-scenarios');
}

export function showNotification(message: string, _type = 'info') {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #007bff; color: white; padding: 10px 20px; border-radius: 4px; z-index: 15000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

export function populateComparisonDropdowns(modalContext: ParentNode | null = null) {
  // Sort scenarios with natural sort (so "2" comes before "10")
  const scenarios = getAllScenarios().sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

  // Find dropdowns - if modalContext provided, search within it first
  let dropdown1: HTMLSelectElement | null = null;
  let dropdown2: HTMLSelectElement | null = null;

  if (modalContext) {
    dropdown1 = modalContext.querySelector<HTMLSelectElement>('#compareScenario1');
    dropdown2 = modalContext.querySelector<HTMLSelectElement>('#compareScenario2');
  }

  // Fall back to document search if not found in modal
  if (!dropdown1) {
    dropdown1 = document.getElementById('compareScenario1') as HTMLSelectElement | null;
  }
  if (!dropdown2) {
    dropdown2 = document.getElementById('compareScenario2') as HTMLSelectElement | null;
  }

  // Try alternative selectors if not found
  if (!dropdown1) {
    dropdown1 = document.querySelector<HTMLSelectElement>('#compareScenario1');
  }
  if (!dropdown2) {
    dropdown2 = document.querySelector<HTMLSelectElement>('#compareScenario2');
  }

  // Try finding within modal overlays
  if (!dropdown1 || !dropdown2) {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
      // Ensure modal is a proper DOM element before calling querySelector
      if (modal && modal.querySelector && typeof modal.querySelector === 'function') {
        if (!dropdown1) {
          dropdown1 = modal.querySelector<HTMLSelectElement>('#compareScenario1');
        }
        if (!dropdown2) {
          dropdown2 = modal.querySelector<HTMLSelectElement>('#compareScenario2');
        }
      }
    });
  }

  if (!dropdown1 || !dropdown2) {
    return;
  }
  const sel1 = dropdown1;
  const sel2 = dropdown2;

  // Clear and populate
  sel1.innerHTML = '<option value="">Select first scenario...</option>';
  sel2.innerHTML = '<option value="">Select second scenario...</option>';

  // Add scenarios
  scenarios.forEach((scenario) => {
    const option1 = document.createElement('option');
    option1.value = scenario.id;
    option1.textContent = scenario.name;
    sel1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = scenario.id;
    option2.textContent = scenario.name;
    sel2.appendChild(option2);
  });

  // Restore previously selected values from localStorage
  const savedCompare = JSON.parse(localStorage.getItem('profitpath-compare-selection') || 'null');
  if (savedCompare) {
    if (savedCompare.id1) sel1.value = savedCompare.id1;
    if (savedCompare.id2) sel2.value = savedCompare.id2;
  }

  // Add change listeners that only save the selection (not trigger comparison)
  const saveSelection = () => {
    localStorage.setItem('profitpath-compare-selection', JSON.stringify({
      id1: sel1.value || '',
      id2: sel2.value || ''
    }));
  };

  sel1.addEventListener('change', saveSelection);
  sel2.addEventListener('change', saveSelection);
}

// Additional functions needed by app.ts
export function closeMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  if (overlay) overlay.classList.remove('active');
  if (hamburger) hamburger.classList.remove('active');

  // Collapse all expanded menu sections
  const mobileTemplatesOptions = document.getElementById('mobileTemplatesOptions');
  const mobileExportOptions = document.getElementById('mobileExportOptions');
  const mobileSettingsSection = document.querySelector<HTMLElement>('.mobile-settings-section');

  if (mobileTemplatesOptions) mobileTemplatesOptions.style.display = 'none';
  if (mobileExportOptions) mobileExportOptions.style.display = 'none';
  if (mobileSettingsSection) mobileSettingsSection.style.display = 'none';
}

export function restoreScheduling() {
  // Restore any scheduled report generation
}

export function loadScenarioFromURL() {
  try {
    const scenarioData = decodeScenarioFromURL();
    if (!scenarioData) return false;

    // URL data is untrusted: allowlist + clamp every field before applying
    const sanitized = sanitizeScenarioState(scenarioData);
    if (!sanitized) return false;

    // Mutate the existing state object in place — replacing window.state would
    // orphan the reference app.ts holds and the app would keep rendering the
    // old state
    Object.assign(window.state, sanitized);
    if (typeof window.render === 'function') window.render();
    // Retain the imported model before dropping its only copy from the URL.
    // A quota failure must keep the snapshot URL recoverable on reload.
    if (typeof window.persistState === 'function' && window.persistState() === false) return true;
    // Roadmap 35: drop the scenario payload from the address bar so a reload
    // re-reads persisted state instead of re-applying the (possibly stale) link.
    // Keep readonly=1 so a shared read-only view stays locked.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('scenario')) {
        url.searchParams.delete('scenario');
        window.history.replaceState(window.history.state, document.title, url.pathname + url.search + url.hash);
      }
    } catch { /* ignore */ }
    return true;
  } catch (e) {
    console.error('Failed to load scenario from URL:', e);
  }
  return false;
}

export function loadSettings() {
  const DEFAULT_SETTINGS = {
    experienceLevel: 'beginner',
    showAdvancedCalculations: false,
    showDetailedBreakdown: false,
    showComparisonTools: false,
    showExportOptions: false,
    showDebugPanel: false,
    showTooltips: true,
    enableCaching: true,
    enableDebugMode: false,
    showPerformanceMetrics: false,
    showSensitivityAnalysis: false,
    theme: 'auto',
    compactMode: false
  };

  try {
    const stored = localStorage.getItem('profitpath-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

export function setExperienceLevel(level: string) {
  const FEATURE_GATES = {
    beginner: { showAdvancedCalculations: false, showDetailedBreakdown: false, showComparisonTools: false, showExportOptions: false, showDebugPanel: false, showPerformanceMetrics: false, showSensitivityAnalysis: false, showTooltips: true },
    intermediate: { showAdvancedCalculations: true, showDetailedBreakdown: true, showComparisonTools: true, showExportOptions: false, showDebugPanel: false, showPerformanceMetrics: false, showSensitivityAnalysis: true, showTooltips: true },
    advanced: { showAdvancedCalculations: true, showDetailedBreakdown: true, showComparisonTools: true, showExportOptions: true, showDebugPanel: true, showPerformanceMetrics: true, showSensitivityAnalysis: true, showTooltips: false }
  };

  const currentSettings = loadSettings();
  const newSettings = { ...currentSettings, experienceLevel: level };

  if (level in FEATURE_GATES) {
    Object.assign(newSettings, FEATURE_GATES[level as ExperienceLevel]);
  }

  localStorage.setItem('profitpath-settings', JSON.stringify(newSettings));
}

export function updateSetting(key: string, value: unknown) {
  const settings = loadSettings();
  settings[key] = value;
  localStorage.setItem('profitpath-settings', JSON.stringify(settings));
}

export function loadIndustryTemplate(templateId: string) {
  // Use global INDUSTRY_TEMPLATES as single source of truth
  const template = window.INDUSTRY_TEMPLATES && window.INDUSTRY_TEMPLATES[templateId];
  if (template) {
    const config = template.config;

    // Apply template to current state
    window.state.offerings = config.offerings.map((o: Offering) => ({
      ...o,
      id: uuid(),
      mixPct: o.mixPct || 0,
      currentClients: o.currentClients || 0
    }));
    window.state.fullTimeEmployees = config.fullTimeEmployees || 1;
    window.state.partTimeEmployees = config.partTimeEmployees || 0;
    window.state.fullTimeEmployeePay = config.fullTimeEmployeePay || 60000;
    window.state.partTimeEmployeePay = config.partTimeEmployeePay || 30000;
    window.state.monthlyCosts = config.monthlyCosts;
    window.state.expenses = [];
    window.state.resources = [];
    window.state.membershipPlans = [];
    window.state.memberProfiles = [];
    window.state.productiveUtilizationPct = config.productiveUtilizationPct;
    window.state.targetUtilizationPct = config.targetUtilizationPct;

    // Track that this data came from a template
    window.state.loadedTemplate = templateId;

    // Refresh the UI
    if (typeof window.render === 'function') window.render();
    if (typeof window.persistState === 'function') window.persistState();

    // Show success notification
    showToast(template.name + ' template loaded successfully.', 'success', 3000);

    // Track template usage
    trackEvent('template_loaded', { template: templateId });

    return true;
  }
  return false;
}

export function exportAsExcel() {
  if (!ensureValidInputs()) return;
  const st: AppState = state;
  let results: CalcResult;
  try {
    results = typeof calc === 'function' ? calc(st) : ({ state: st, metrics: {} } as unknown as CalcResult);
  } catch (e) {
    console.error('Calculation failed in exportAsExcel:', e);
    showNotification('Could not build the Excel workbook: calculation error', 'error');
    return;
  }

  const bytes = buildXLSX(buildWorkbookSheets(st, results));
  // fresh Uint8Array: fflate's bytes are ArrayBufferLike, Blob wants ArrayBuffer-backed
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadOrShare(blob, 'profitpath-export-' + new Date().toISOString().split('T')[0] + '.xlsx');
  showNotification('Excel workbook downloaded!', 'success');

  // Track Excel export
  trackEvent('export', { format: 'excel' });
}

export function exportAsPDF() {
  if (!ensureValidInputs()) return;
  // Create a printable HTML version and open print dialog
  const state = window.state;
  const metrics = calculate(state);
  const fmtPct = (n: number) => n.toFixed(1) + '%';

  // Capacitor WebView blocks window.open — fall through to HTML export instead
  const isCapacitor = window.location.origin === 'http://localhost' || window.location.origin === 'capacitor://localhost';
  if (isCapacitor) {
    showNotification('PDF printing unavailable in the app — use HTML export instead', 'info');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showNotification('Please allow popups to print PDF', 'error');
    return;
  }

  const offeringsHtml = state.offerings.map(o => `
    <tr>
      <td>${escapeHtml(o.name)}</td>
      <td>${reportPrice(o)}</td>
      <td>${o.sessionsPerYear}</td>
      <td>${o.hoursPerSession}</td>
      <td>${fmtMoney0(o.variableCostPerSession)}</td>
      <td>${fmtPct(o.mixPct)}</td>
      <td>${o.currentClients}</td>
      <td>${fmtPct(o.laborPctOfPrice || 0)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>ProfitPath Analysis Report${caseSuffix()}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .section { margin: 20px 0; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>ProfitPath Analysis Report${caseSuffix()}</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      ${reportConclusionHTML(state, metrics)}
      
      <div class="section">
        <h2>Business Overview</h2>
        <p><span class="label">Employees:</span> ${state.fullTimeEmployees + state.partTimeEmployees}</p>
        <p><span class="label">Annual Payroll:</span> ${fmtMoney0(metrics.annualPayroll)}</p>
        <p><span class="label">Monthly Costs:</span> ${fmtMoney0(totalMonthlyOverhead(state))}</p>
        <p><span class="label">Productive Utilization:</span> ${fmtPct(state.productiveUtilizationPct)}</p>
        <p><span class="label">Target Utilization:</span> ${fmtPct(state.targetUtilizationPct)}</p>
      </div>
      
      <div class="section">
        <h2>Service Offerings</h2>
        <table>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Price and unit</th>
              <th>Sessions/Year</th>
              <th>Hours/Session</th>
              <th>Variable Cost</th>
              <th>Mix %</th>
              <th>Current Clients</th>
              <th>Labor % of Price</th>
            </tr>
          </thead>
          <tbody>
            ${offeringsHtml}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    // Track PDF export
    trackEvent('export', { format: 'pdf' });
  }, 500);
  showNotification('PDF print dialog opened!', 'success');
}

export function exportAsHTML() {
  if (!ensureValidInputs()) return;
  const state = window.state;
  const metrics = calculate(state);
  const fmtPct = (n: number) => n.toFixed(1) + '%';

  const offeringsHtml = state.offerings.map(o => `
    <tr>
      <td>${escapeHtml(o.name)}</td>
      <td>${reportPrice(o)}</td>
      <td>${o.sessionsPerYear}</td>
      <td>${o.hoursPerSession}</td>
      <td>${fmtMoney0(o.variableCostPerSession)}</td>
      <td>${fmtPct(o.mixPct)}</td>
      <td>${o.currentClients}</td>
      <td>${fmtPct(o.laborPctOfPrice || 0)}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ProfitPath Analysis Report${caseSuffix()}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #007bff; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .section { margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
    .label { font-weight: bold; color: #333; }
    .value { color: #007bff; }
  </style>
</head>
<body>
  <h1>ProfitPath Analysis Report${caseSuffix()}</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  ${reportConclusionHTML(state, metrics)}
  
  <div class="section">
    <h2>Business Overview</h2>
    <div class="metric"><span class="label">Employees:</span> <span class="value">${state.fullTimeEmployees + state.partTimeEmployees}</span></div>
    <div class="metric"><span class="label">Annual Payroll:</span> <span class="value">${fmtMoney0(metrics.annualPayroll)}</span></div>
    <div class="metric"><span class="label">Monthly Costs:</span> <span class="value">${fmtMoney0(totalMonthlyOverhead(state))}</span></div>
    <div class="metric"><span class="label">Productive Utilization:</span> <span class="value">${fmtPct(state.productiveUtilizationPct)}</span></div>
    <div class="metric"><span class="label">Target Utilization:</span> <span class="value">${fmtPct(state.targetUtilizationPct)}</span></div>
  </div>
  
  <div class="section">
    <h2>Service Offerings</h2>
    <table>
      <thead>
        <tr>
          <th>Service Name</th>
          <th>Price and unit</th>
          <th>Sessions/Year</th>
          <th>Hours/Session</th>
          <th>Variable Cost</th>
          <th>Mix %</th>
          <th>Current Clients</th>
          <th>Labor % of Price</th>
        </tr>
      </thead>
      <tbody>
        ${offeringsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  downloadOrShare(blob, 'profitpath-report-' + new Date().toISOString().split('T')[0] + '.html');
  showNotification('HTML report downloaded!', 'success');

  // Track HTML export
  trackEvent('export', { format: 'html' });
}

export function exportAsFinancialReport() {
  if (!ensureValidInputs()) return;
  const state = window.state;
  const metrics = window.lastMetrics || (window.calc ? window.calc(state) : null);

  const isCapacitor = window.location.origin === 'http://localhost' || window.location.origin === 'capacitor://localhost';
  if (isCapacitor) {
    showNotification('Financial report printing unavailable in the app — use HTML export instead', 'info');
    return;
  }

  if (!metrics) {
    showNotification('Run a calculation first before exporting the financial report', 'error');
    return;
  }

  const fmt = fmtMoney0;
  const basis = taxBasisNote(window.state?.currency);
  const taxNote = basis ? `<p class="tax-note"><strong>${basis}.</strong></p>` : '';
  const fmtPct = (n: number) => (typeof n === 'number' ? n.toFixed(1) : '0.0') + '%';
  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const year = today.getFullYear();

  const grossProfit = metrics.revenue - metrics.variableCosts;
  const grossMarginPct = metrics.revenue > 0 ? (grossProfit / metrics.revenue * 100) : 0;
  const netMarginPct = metrics.revenue > 0 ? (metrics.income / metrics.revenue * 100) : 0;
  const totalTax = (metrics.seTax || 0) + (metrics.federalTax || 0);
  const qRev = Math.round(metrics.revenue / 4);
  const qIncome = Math.round(metrics.income / 4);
  const qVariableCosts = Math.round((metrics.variableCosts || 0) / 4);
  const qFixedCosts = Math.round((metrics.totalFixedCosts || 0) / 4);

  const quarterRows = [1, 2, 3, 4].map(q => `
    <tr>
      <td>Q${q} ${year}</td>
      <td>${fmt(qRev)}</td>
      <td>${fmt(qVariableCosts)}</td>
      <td>${fmt(qFixedCosts)}</td>
      <td>${fmt(qIncome)}</td>
      <td>${fmt(metrics.quarterlyEst || 0)}</td>
    </tr>`).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showNotification('Please allow popups to print the financial report', 'error');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ProfitPath Financial Report${caseSuffix()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 22px; color: #1a1a2e; border-bottom: 3px solid #6366f1; padding-bottom: 8px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 28px; }
    h2 { font-size: 15px; color: #1a1a2e; background: #f0f0ff; padding: 6px 10px; border-left: 4px solid #6366f1; margin: 24px 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #6366f1; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafafa; }
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px; }
    .kpi { background: #f8f9ff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; }
    .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .05em; }
    .kpi-value { font-size: 20px; font-weight: bold; color: #1a1a2e; margin-top: 4px; }
    .kpi-sub { font-size: 11px; color: #888; margin-top: 2px; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .tax-note { font-size: 11px; color: #888; margin-top: 10px; font-style: italic; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #aaa; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>ProfitPath Financial Report${caseSuffix()}</h1>
  <p class="meta">Generated ${dateStr} &nbsp;|&nbsp; ${Math.round(metrics.clients || 0)} clients</p>
  ${reportContextHTML(state)}

  <h2>Business Performance Summary</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Annual Revenue</div>
      <div class="kpi-value">${fmt(metrics.revenue)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Net Profit (Pre-Tax)</div>
      <div class="kpi-value ${metrics.income >= 0 ? 'positive' : 'negative'}">${fmt(metrics.income)}</div>
      <div class="kpi-sub">${fmtPct(netMarginPct)} net margin</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Take-Home (After Tax)</div>
      <div class="kpi-value">${fmt(metrics.takeHome || 0)}</div>
      <div class="kpi-sub">${metrics.effectiveRate || 0}% effective tax rate</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Gross Profit</div>
      <div class="kpi-value">${fmt(grossProfit)}</div>
      <div class="kpi-sub">${fmtPct(grossMarginPct)} gross margin</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Fixed Costs</div>
      <div class="kpi-value">${fmt(metrics.totalFixedCosts)}</div>
      <div class="kpi-sub">Payroll + overhead</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Break-Even Clients</div>
      <div class="kpi-value">${metrics.breakEvenClients === Infinity ? 'N/A' : Math.ceil(metrics.breakEvenClients || 0)}</div>
      <div class="kpi-sub">at ${fmtPct(metrics.capacityPct || 0)} utilization</div>
    </div>
  </div>
  <table>
    <tr><th>Metric</th><th>Annual</th><th>Monthly Avg</th></tr>
    <tr><td>Revenue</td><td>${fmt(metrics.revenue)}</td><td>${fmt(metrics.revenue / 12)}</td></tr>
    <tr><td>Variable Costs</td><td>${fmt(metrics.variableCosts)}</td><td>${fmt(metrics.variableCosts / 12)}</td></tr>
    <tr><td>Gross Profit</td><td>${fmt(grossProfit)}</td><td>${fmt(grossProfit / 12)}</td></tr>
    <tr><td>Fixed Costs (Overhead)</td><td>${fmt(metrics.annualFixedCosts || 0)}</td><td>${fmt((metrics.annualFixedCosts || 0) / 12)}</td></tr>
    <tr><td>Payroll</td><td>${fmt(metrics.annualPayroll || 0)}</td><td>${fmt((metrics.annualPayroll || 0) / 12)}</td></tr>
    <tr><td>Net Profit (Pre-Tax)</td><td>${fmt(metrics.income)}</td><td>${fmt(metrics.income / 12)}</td></tr>
  </table>

  <h2>Quarterly Income Projections — ${year}</h2>
  <table>
    <tr><th>Quarter</th><th>Revenue</th><th>Variable Costs</th><th>Fixed Costs</th><th>Net Income</th><th>Est. Tax Payment</th></tr>
    ${quarterRows}
    <tr style="font-weight:bold;background:#f0f0ff">
      <td>Full Year</td>
      <td>${fmt(metrics.revenue)}</td>
      <td>${fmt(metrics.variableCosts)}</td>
      <td>${fmt(metrics.totalFixedCosts)}</td>
      <td>${fmt(metrics.income)}</td>
      <td>${fmt(totalTax)}</td>
    </tr>
  </table>
  <p class="tax-note">Note: Quarterly figures assume uniform distribution. Actual results may vary with seasonality.</p>

  <h2>Tax Liability Estimate — ${year}</h2>
  ${taxNote}
  <table>
    <tr><th>Tax Component</th><th>Amount</th><th>Notes</th></tr>
    <tr><td>Self-Employment Tax (SE)</td><td>${fmt(metrics.seTax || 0)}</td><td>15.3% on first $168,600; 2.9% above (on 92.35% of income)</td></tr>
    <tr><td>Federal Income Tax</td><td>${fmt(metrics.federalTax || 0)}</td><td>2024 brackets, single filer; deducts ½ SE tax + $14,600 standard deduction</td></tr>
    <tr style="font-weight:bold"><td>Total Estimated Tax</td><td>${fmt(totalTax)}</td><td>${metrics.effectiveRate || 0}% effective rate on gross income</td></tr>
    <tr><td>Quarterly Payment (Due)</td><td>${fmt(metrics.quarterlyEst || 0)}</td><td>Apr 15 · Jun 15 · Sep 15 · Jan 15</td></tr>
    <tr><td>Estimated Take-Home</td><td>${fmt(metrics.takeHome || 0)}</td><td>Annual net after all taxes</td></tr>
  </table>
  <p class="tax-note">Disclaimer: These are simplified estimates for planning purposes only. Consult a tax professional for filing.</p>

  <h2>Business Performance Summary — Loan Application</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Annual Gross Revenue</td><td>${fmt(metrics.revenue)}</td></tr>
    <tr><td>Gross Profit Margin</td><td>${fmtPct(grossMarginPct)}</td></tr>
    <tr><td>Net Profit Margin</td><td>${fmtPct(netMarginPct)}</td></tr>
    <tr><td>Break-Even Revenue</td><td>${metrics.breakEvenRevenue === Infinity ? 'N/A' : fmt(metrics.breakEvenRevenue)}</td></tr>
    <tr><td>Number of Service Clients</td><td>${Math.round(metrics.clients || 0)}</td></tr>
    <tr><td>Capacity Utilization</td><td>${fmtPct(metrics.capacityPct || 0)}</td></tr>
    <tr><td>Annual Payroll</td><td>${fmt(metrics.annualPayroll || 0)}</td></tr>
    <tr><td>Annual Overhead</td><td>${fmt(metrics.annualFixedCosts || 0)}</td></tr>
    <tr><td>Owner Pre-Tax Income</td><td>${fmt(metrics.income)}</td></tr>
    <tr><td>Year 1 Cash Flow (Before Tax)</td><td>${fmt(metrics.yearOneCashFlow)}</td></tr>
  </table>

  <div class="footer">Generated by ProfitPath &nbsp;|&nbsp; All figures are projections based on inputs provided. Not financial advice.</div>
</body>
</html>`);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    trackEvent('export', { format: 'financial-report' });
  }, 500);
  showNotification('Financial report print dialog opened!', 'success');
}

export function shareViaEmail() {
  if (!ensureValidInputs()) return;
  const state = window.state;
  const metrics = calculate(state);
  const fmtPct = (n: number) => n.toFixed(1) + '%';
  const basis = taxBasisNote(state.currency);

  const offeringsText = state.offerings.map(o =>
    `- ${o.name}: ${reportPrice(o)}, ${isOneTime(o) ? 'one-time sale' : `${o.sessionsPerYear} sessions/year`}, ` +
    (state.mode === 'current' ? `${o.currentClients} current clients` : `${fmtPct(o.mixPct)} mix`)
  ).join('\n');

  const subject = encodeURIComponent('ProfitPath Analysis Report' + caseSuffix() + ' — ' + reportScenarioName());
  const body = encodeURIComponent(
    `Check out my ProfitPath analysis:\n\n` +
    `Scenario: ${reportScenarioName()}\n` +
    `Annual Results — ${RANGE_CASE_LABELS[getRangeCase()]} case:\n` +
    `Mode: ${state.mode === 'forecast' ? 'Forecast (capacity-supported customers)' : 'Current (entered customers)'}\n` +
    `Currency: ${normalizeCurrency(state.currency)}\n` +
    reportResultRows(metrics).map(([label, value]) => `- ${label}: ${value}`).join('\n') + '\n\n' +
    (basis ? basis + '.\n\n' : '') +
    `Business Overview:\n` +
    `- Employees: ${state.fullTimeEmployees + state.partTimeEmployees}\n` +
    `- Annual Payroll: ${fmtMoney0(metrics.annualPayroll)}\n` +
    `- Monthly Costs: ${fmtMoney0(totalMonthlyOverhead(state))}\n` +
    `- Productive Utilization: ${fmtPct(state.productiveUtilizationPct)}\n` +
    `- Target Utilization: ${fmtPct(state.targetUtilizationPct)}\n\n` +
    `Service Offerings:\n${offeringsText}\n\n` +
    (state.notes?.trim() ? `Scenario notes:\n${state.notes}\n\n` : '') +
    `View full analysis at: ${encodeScenarioToURL(state) || getShareBase()}`
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  showNotification('Opening your email app…', 'info');

  // Track email export
  trackEvent('export', { format: 'email' });
}

export function showEmbedCode() {
  if (!ensureValidInputs()) return;
  const embedCode = `<iframe src="${encodeScenarioToURL(window.state) || getShareBase()}" width="100%" height="600" frameborder="0"></iframe>`;

  createModal({
    title: '📋 Embed Widget',
    content: `
      <p>Embed code for ProfitPath:</p>
      <textarea id="embedCodeText" readonly class="copy-on-click" style="width:100%;height:100px;padding:10px;margin:10px 0;font-family:monospace;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--panel);color:var(--text);box-sizing:border-box;">${embedCode}</textarea>
      <p class="copy-field-hint">Click the field to copy</p>
    `,
    size: 'medium'
  });
}

export function showScheduleDialog() {
  if (!ensureValidInputs()) return;
  createModal({
    title: 'Schedule Reports',
    content: `
      <p style="margin-top: 0; color: var(--muted);">Automated report scheduling requires a server-side component and is not yet available in this version.</p>
      <p style="color: var(--muted);">In the meantime, use <strong style="color: var(--text)">Export → Email</strong> to manually send your current report whenever you need it.</p>
    `,
    size: 'small'
  });
}

export function updateValidationDisplay() {
}

export function lazyLoadChart(metrics: CalcResult) {
  try {
    if (renderSimpleChart) {
      renderSimpleChart(metrics);
    }
  } catch (e) {
    console.warn('lazyLoadChart error:', e);
  }
}

export function updateRichVisualizations(metrics: CalcResult) {
  try {
    if (typeof vizUpdateRichVisualizations === 'function') {
      vizUpdateRichVisualizations(metrics);
    }
    if (typeof updateBreakEvenAnalysis === 'function') {
      updateBreakEvenAnalysis(metrics);
    }
  } catch (e) {
    console.warn('updateRichVisualizations error:', e);
  }
}

export function toggleMobileMenu() {
  const overlay = document.getElementById('mobileMenuOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  if (overlay) overlay.classList.toggle('active');
  if (hamburger) hamburger.classList.toggle('active');
}

// Export functions for settings and preferences

export function getSetting(key: string, defaultValue: unknown = null) {
  const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

export function resetSettings() {
  localStorage.removeItem('profitpath-settings');
}

// Export functions for analytics and feedback
export function trackEvent(_eventName: string, _properties = {}) {
}

export function sendFeedback(_rating: number, _comment = '') {
  return true;
}

// Export functions for performance monitoring
export function measurePerformance<T>(fn: () => T, label: string) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  console.warn(`${label} took ${duration.toFixed(2)}ms`);

  // Track performance metrics
  trackEvent('performance', {
    function: label,
    duration: duration,
  });

  return result;
}

export function getPerformanceMetrics() {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType('paint');

    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0,
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    };
  }
  return {};
}

// Export functions for accessibility
export function enhanceAccessibility() {
  // Add ARIA labels and roles
  document.querySelectorAll('input').forEach(input => {
    if (!input.getAttribute('aria-label')) {
      input.setAttribute('aria-label', input.placeholder || input.name || 'Input field');
    }
  });

  // Add keyboard navigation support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        document.body.removeChild(modal);
      });
    }
  });
}

// Export functions for internationalization
export function setLanguage(language: string) {
  updateSetting('language', language);
  // Reload page to apply language changes
  window.location.reload();
}

export function getLanguage() {
  return getSetting('language', 'en');
}

export function translate(key: string, language: string | null = null) {
  const lang = language || getLanguage();
  const translations: Record<string, Record<string, string>> = {
    en: {
      'save_scenario': 'Save Scenario',
      'load_scenario': 'Load Scenario',
      'delete_scenario': 'Delete Scenario',
      'export_csv': 'Export CSV',
      'share_scenario': 'Share Scenario',
      'settings': 'Settings',
      'help': 'Help',
    },
    es: {
      'save_scenario': 'Guardar Escenario',
      'load_scenario': 'Cargar Escenario',
      'delete_scenario': 'Eliminar Escenario',
      'export_csv': 'Exportar CSV',
      'share_scenario': 'Compartir Escenario',
      'settings': 'Configuración',
      'help': 'Ayuda',
    },
  };

  return translations[lang]?.[key] || key;
}

// Export functions for debugging
export function debugState() {
  console.warn('ProfitPath Debug State — Current State:', JSON.parse(JSON.stringify(state)));
  console.warn('ProfitPath Debug State — Settings:', JSON.parse(localStorage.getItem('profitpath-settings') || '{}'));
  console.warn('ProfitPath Debug State — Scenarios:', JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]'));
  console.warn('ProfitPath Debug State — Performance Metrics:', getPerformanceMetrics());
}

export function enableDebugMode() {
  updateSetting('debugMode', true);
  console.warn('Debug mode enabled');
}

export function disableDebugMode() {
  updateSetting('debugMode', false);
  console.warn('Debug mode disabled');
}

export function isDebugMode() {
  return getSetting('debugMode', false);
}

// Export utility functions
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function debounce<A extends unknown[]>(func: (...args: A) => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function executedFunction(...args: A) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<A extends unknown[]>(func: (this: unknown, ...args: A) => void, limit: number) {
  let inThrottle = false;
  return function (this: unknown, ...args: A) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// CSV Import/Export Functions
export function generateImportTemplate() {
  const template = `# Business Settings
# Edit values in the right column
employees,3
partTimeEmployees,0
employeePay,60000
partTimeEmployeePay,30000
monthlyCosts,500
productiveUtilizationPct,80
targetUtilizationPct,75

# Offerings
# Add or remove rows. Mix % values should sum to 100.
Name,Monthly Price ($),Sessions/Year,Hours/Session,Variable Cost/Session ($),Mix %,Current Clients,Labor % of Price,Type,Seats,Fill %
Consulting,1000,12,2,100,60,0,0,subscription,1,100
Support,500,24,1,50,40,0,0,subscription,1,100

# Fixed Expenses
# Category: one of the app's categories (unknown = Other). Frequency: weekly, monthly or annual.
Name,Category,Amount,Frequency
Studio rent,Rent/Lease,1200,monthly
Liability insurance,Insurance,900,annual`;

  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  downloadOrShare(blob, 'profitpath-template.csv');
}

// Quote-aware split of one CSV line; undoes the leading ' that csvCell adds to formula-like values
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  let wasQuoted = false;
  const push = () => {
    let v = wasQuoted ? cur : cur.trim();
    if (wasQuoted && /^'[=+\-@\t\r]/.test(v)) v = v.slice(1);
    out.push(v);
    cur = '';
    wasQuoted = false;
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') { quoted = true; wasQuoted = true; }
    else if (c === ',') push();
    else cur += c;
  }
  push();
  return out;
}

// Settings keys: the import template's names plus the labels exportAsCSV writes
const SETTINGS_KEYS: Record<string, string> = {
  employees: 'employees', 'full-time employees': 'employees',
  parttimeemployees: 'partTimeEmployees', 'part-time employees': 'partTimeEmployees',
  employeepay: 'employeePay', 'ft annual pay': 'employeePay',
  parttimeemployeepay: 'partTimeEmployeePay', 'pt annual pay': 'partTimeEmployeePay',
  monthlycosts: 'monthlyCosts', 'other overhead': 'monthlyCosts', 'monthly overhead': 'monthlyCosts',
  processingfeepct: 'processingFeePct', 'processing fee': 'processingFeePct',
  processingfeepertransaction: 'processingFeePerTransaction', 'flat processing fee': 'processingFeePerTransaction',
  transactionspermonth: 'transactionsPerMonth', 'transactions per month': 'transactionsPerMonth',
  productiveutilizationpct: 'productiveUtilizationPct', 'productive utilization': 'productiveUtilizationPct',
  targetutilizationpct: 'targetUtilizationPct', 'target utilization': 'targetUtilizationPct'
};

type CsvSection = 'settings' | 'offerings' | 'expenses' | 'resources' | 'plans' | 'profiles' | 'none';

function csvSectionOf(line: string): CsvSection | null {
  const isComment = line.startsWith('#');
  const text = line.replace(/^#\s*/, '').trim();
  if (text.includes(',')) return null;
  if (/^(fixed )?expenses$/i.test(text)) return 'expenses';
  if (/^resources$/i.test(text)) return 'resources';
  if (/^membership plans$/i.test(text)) return 'plans';
  if (/^member profiles$/i.test(text)) return 'profiles';
  if (/^(service )?offerings$/i.test(text)) return 'offerings';
  if (/^(business )?(settings|parameters)$/i.test(text)) return 'settings';
  return isComment ? null : 'none';
}

// Parses a JSON cell; undefined when it is blank, malformed or the wrong shape
function parseJsonCell(cell: string | undefined, isShape: (v: unknown) => boolean): unknown {
  try {
    const v = JSON.parse(cell || '');
    return isShape(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

export function importFromCSV(csvText: string) {
  const errors = [];
  const settings: Record<string, number> = {};
  const offerings: Offering[] = [];
  const rawExpenses: Array<Record<string, unknown>> = [];
  const rawResources: Array<Record<string, unknown>> = [];
  const resourceNames: string[] = []; // per imported offering, aligned with `offerings`
  const rawPlans: Array<{ row: Record<string, unknown>; names: string[]; included: VisitsByName }> = [];
  type VisitsByName = Record<string, number>;
  const rawProfiles: Array<{ name: string; visits: VisitsByName; low?: VisitsByName; high?: VisitsByName }> = [];

  try {
    const lines = csvText.split('\n').map((line) => line.trim()).filter((line) => line);

    let section: CsvSection = 'none';
    let headerSeen = false;
    let sawExpenses = false;
    let sawResources = false;
    let sawPlans = false;
    let sawProfiles = false;

    for (const line of lines) {
      const next = csvSectionOf(line);
      if (next) {
        if (next === 'expenses') sawExpenses = true;
        if (next === 'resources') sawResources = true;
        if (next === 'plans') sawPlans = true;
        if (next === 'profiles') sawProfiles = true;
        section = next;
        headerSeen = false;
        continue;
      }
      if (line.startsWith('#')) continue;

      if (section === 'settings') {
        const [rawKey, value] = splitCsvLine(line);
        const key = SETTINGS_KEYS[(rawKey || '').toLowerCase()];
        const numValue = parseFloat(String(value).replace(/[$,%\s]/g, ''));
        if (key && !isNaN(numValue)) {
          if (key === 'employees') settings.employees = Math.max(0, Math.floor(numValue));
          if (key === 'partTimeEmployees') settings.partTimeEmployees = Math.max(0, Math.floor(numValue));
          if (key === 'employeePay') settings.employeePay = Math.max(0, numValue);
          if (key === 'partTimeEmployeePay') settings.partTimeEmployeePay = Math.max(0, numValue);
          if (key === 'monthlyCosts') settings.monthlyCosts = Math.max(0, numValue);
          if (key === 'processingFeePct') settings.processingFeePct = Math.max(0, Math.min(20, numValue));
          if (key === 'processingFeePerTransaction') settings.processingFeePerTransaction = Math.max(0, Math.min(100, numValue));
          if (key === 'transactionsPerMonth') settings.transactionsPerMonth = Math.max(0, Math.min(1e7, numValue));
          if (key === 'productiveUtilizationPct') settings.productiveUtilizationPct = Math.max(0, Math.min(100, numValue));
          if (key === 'targetUtilizationPct') settings.targetUtilizationPct = Math.max(0, numValue);
        }
      }

      if (section === 'expenses') {
        if (!headerSeen) { headerSeen = true; continue; }
        const [name, category, amount, frequency, lifeYears, loanAprPct] = splitCsvLine(line);
        if (name) rawExpenses.push({ name, category, amount: parseFloat(amount), frequency: (frequency || '').toLowerCase(), lifeYears: parseFloat(lifeYears), ...(loanAprPct !== '' ? { loanAprPct: parseFloat(loanAprPct) } : {}) });
      }

      if (section === 'resources') {
        if (!headerSeen) { headerSeen = true; continue; }
        const [name, hoursPerWeek, weeksPerYear, staffFree] = splitCsvLine(line);
        if (name) rawResources.push({ name, hoursPerWeek: parseFloat(hoursPerWeek), weeksPerYear: parseFloat(weeksPerYear), staffFree: /^(yes|true)$/i.test((staffFree || '').trim()) });
      }

      if (section === 'plans') {
        if (!headerSeen) { headerSeen = true; continue; }
        const [name, monthlyFee, creditsPerMonth, memberDiscountPct, atMember, eligible, included] = splitCsvLine(line);
        if (name) {
          rawPlans.push({
            row: {
              name, monthlyFee: parseFloat(monthlyFee), creditsPerMonth: parseFloat(creditsPerMonth),
              memberDiscountPct: parseFloat(memberDiscountPct), creditsAtMemberPrice: /^(yes|true)$/i.test((atMember || '').trim())
            },
            names: parseJsonCell(eligible, Array.isArray) as string[] ?? [],
            included: parseJsonCell(included, (v) => !!v && typeof v === 'object' && !Array.isArray(v)) as VisitsByName ?? {}
          });
        }
      }

      if (section === 'profiles') {
        if (!headerSeen) { headerSeen = true; continue; }
        // Columns 3-4 (visit bounds) are optional so older files still import
        const [name, visits, low, high] = splitCsvLine(line);
        const asMap = (cell?: string) => parseJsonCell(cell, (v) => !!v && typeof v === 'object' && !Array.isArray(v)) as VisitsByName | undefined;
        if (name) rawProfiles.push({ name, visits: asMap(visits) ?? {}, low: asMap(low), high: asMap(high) });
      }

      if (section === 'offerings') {
        if (!headerSeen) {
          // First data row is the header
          headerSeen = true;
          continue;
        }

        // Parse offering row
        const values = splitCsvLine(line);
        if (values.length < 7) continue;

        const offering = {
          id: `offering-${uuid()}`,
          name: values[0] || 'New Offering',
          priceMonthly: parseFloat(values[1]) || 0,
          sessionsPerYear: Number.isFinite(parseFloat(values[2])) ? Math.max(0, parseFloat(values[2])) : 1,
          hoursPerSession: Number.isFinite(parseFloat(values[3])) ? Math.max(0, parseFloat(values[3])) : 1,
          variableCostPerSession: Math.max(0, parseFloat(values[4]) || 0),
          mixPct: Math.max(0, Math.min(100, parseFloat(values[5]) || 0)),
          currentClients: Math.max(0, Math.floor(parseFloat(values[6]) || 0)),
          // Column 8 is optional so CSVs exported before this field still import
          laborPctOfPrice: Math.max(0, Math.min(100, parseFloat(values[7]) || 0)),
          // Column 9 is optional too; unknown values fall back to subscription
          type: normalizeOfferingType(values[8]),
          // Columns 10-11 are optional: group seats and forecast fill
          seats: Math.max(1, Math.floor(parseFloat(values[9]) || 1)),
          fillPct: Math.max(1, Math.min(100, parseFloat(values[10]) || 100)),
          // Column 24 is optional: fixed cost of one group run
          costPerRun: sanitizeCostPerRun(values[23]),
          // Columns 12-15 and 25-26 are optional low/high bounds; blank means no range
          ...sanitizeOfferingRange({
            fillPctLow: values[11], fillPctHigh: values[12], currentClientsLow: values[13], currentClientsHigh: values[14],
            sessionsPerYearLow: values[24], sessionsPerYearHigh: values[25]
          }),
          // Columns 27-29 are optional sales-loss assumptions; older rows retain the zero/default behavior
          salesLossPct: sanitizeSalesLossPct(values[26]),
          ...sanitizeSalesLossBounds({ salesLossPctLow: values[27], salesLossPctHigh: values[28] }),
          // Column 16 is optional: best-case discount %
          discountPct: Math.max(0, Math.min(100, parseFloat(values[15]) || 0)),
          // Columns 17-18 are optional: confidence tag and note
          ...sanitizeOfferingMeta({ confidence: values[16], note: values[17] }),
          // Columns 19-22 are optional: market low, high, average and note
          ...sanitizeOfferingMarket({ marketLow: values[18], marketHigh: values[19], marketAvg: values[20], marketNote: values[21] })
        };

        // Validate offering
        if (!offering.name) {
          errors.push('Offering name cannot be empty');
          continue;
        }
        if (offering.priceMonthly <= 0) {
          errors.push(`Offering "${offering.name}": price must be > 0`);
          continue;
        }

        offerings.push(offering);
        // Column 23 is optional: the tagged resource's name, resolved to an id below
        resourceNames.push(values[22] || '');
      }
    }

    // undefined means the CSV had no expenses section (legacy file): callers keep existing expenses
    const expenses = sawExpenses ? sanitizeExpenses(rawExpenses, uuid) : undefined;

    // undefined means the CSV had no resources section: callers keep existing resources and tags
    const resources = sawResources ? sanitizeResources(rawResources, uuid) : undefined;
    if (resources) {
      offerings.forEach((o, i) => {
        const match = resources.find((r) => r.name === resourceNames[i]);
        if (match) o.resource = match.id;
      });
    }

    // Plans and profiles name their offerings; resolve to the imported ids. undefined means no such section
    const idByName = new Map<string, string>();
    offerings.forEach((o) => { if (o.name && o.id && !idByName.has(o.name)) idByName.set(o.name, o.id); });
    const membershipPlans = sawPlans
      ? sanitizePlans(rawPlans.map((p) => ({
        ...p.row,
        eligible: p.names.map((n) => idByName.get(n)).filter((id): id is string => !!id),
        includedVisits: Object.fromEntries(Object.entries(p.included).filter(([n]) => idByName.has(n)).map(([n, x]) => [idByName.get(n), x]))
      })), uuid)
      : undefined;
    const memberProfiles = sawProfiles
      ? sanitizeProfiles(rawProfiles.map((p) => {
        const byId = (v: VisitsByName = {}) => Object.fromEntries(Object.entries(v).filter(([n]) => idByName.has(n)).map(([n, x]) => [idByName.get(n), x]));
        return { name: p.name, visits: byId(p.visits), visitsLow: byId(p.low), visitsHigh: byId(p.high) };
      }), uuid)
      : undefined;

    // Validate offerings
    if (offerings.length === 0) {
      errors.push('CSV must contain at least 1 offering');
      return { success: false, errors };
    }

    // Success
    return { success: true, data: { settings, offerings, expenses, resources, membershipPlans, memberProfiles }, errors };
  } catch (e) {
    return { success: false, errors: [`Parse error: ${errMsg(e)}`] };
  }
}

// Export default object with all functions
export default {
  escapeHtml,
  exportAsCSV,
  shareScenario,
  renderChart,
  saveScenario,
  loadScenario,
  deleteScenario,
  listScenarios,
  updateSetting,
  getSetting,
  resetSettings,
  trackEvent,
  sendFeedback,
  measurePerformance,
  getPerformanceMetrics,
  enhanceAccessibility,
  setLanguage,
  getLanguage,
  translate,
  debugState,
  enableDebugMode,
  disableDebugMode,
  isDebugMode,
  uuid,
  debounce,
  throttle,
};
