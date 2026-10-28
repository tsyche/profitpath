import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { CalcState, Scenario } from '../../src/types';
import { createModal } from '../components/Modal';
import { uuid } from '../utils/helpers';
import { escapeHtml, getAllScenarios, getShareBase, sanitizeScenarioState } from './miscService';
import { showToast } from './modalService';

const PREFIX = 'v1.';
const MAX_LINK_CHARS = 20000;
const MAX_JSON_BYTES = 500000;
const MAX_BUNDLE_SCENARIOS = 4;

type BundleEntry = { name: string; state: CalcState };

function toBase64Url(bytes: Uint8Array): string {
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export function encodeScenarioBundle(scenarios: Scenario[]): string | null {
  if (!scenarios.length || scenarios.length > MAX_BUNDLE_SCENARIOS) return null;
  const entries: BundleEntry[] = [];
  for (const scenario of scenarios) {
    const safe = sanitizeScenarioState((scenario.state ?? scenario.data) as Record<string, unknown>);
    if (!safe) return null;
    entries.push({ name: String(scenario.name || 'Shared scenario').trim().slice(0, 120), state: safe });
  }
  const json = strToU8(JSON.stringify({ version: 1, scenarios: entries }));
  if (json.length > MAX_JSON_BYTES) return null;
  const payload = PREFIX + toBase64Url(deflateSync(json, { level: 9 }));
  return payload.length <= MAX_LINK_CHARS ? getShareBase() + '?bundle=' + payload : null;
}

export function decodeScenarioBundle(payload: string): BundleEntry[] | null {
  if (!payload.startsWith(PREFIX) || payload.length > MAX_LINK_CHARS) return null;
  try {
    const raw = inflateSync(fromBase64Url(payload.slice(PREFIX.length)));
    if (raw.length > MAX_JSON_BYTES) return null;
    const data: unknown = JSON.parse(strFromU8(raw));
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('scenarios' in data) || !Array.isArray(data.scenarios)) return null;
    if (!data.scenarios.length || data.scenarios.length > MAX_BUNDLE_SCENARIOS) return null;
    const entries: BundleEntry[] = [];
    for (const item of data.scenarios) {
      if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim()) return null;
      const safe = sanitizeScenarioState(item.state as Record<string, unknown>);
      if (!safe) return null;
      entries.push({ name: item.name.trim().slice(0, 120), state: safe });
    }
    return entries;
  } catch {
    return null;
  }
}

function uniqueName(name: string, used: Set<string>): string {
  let result = name;
  let suffix = 2;
  while (used.has(result.toLowerCase())) {
    const tag = ` (imported ${suffix++})`;
    result = name.slice(0, 120 - tag.length) + tag;
  }
  used.add(result.toLowerCase());
  return result;
}

export function importScenarioBundle(entries: BundleEntry[]): number {
  const existing = getAllScenarios();
  const names = new Set(existing.map(s => s.name.toLowerCase()));
  const now = new Date();
  const imported: Scenario[] = entries.map(item => ({
    id: uuid(),
    name: uniqueName(item.name, names),
    timestamp: now.toLocaleString(),
    createdAt: now.toISOString(),
    state: item.state
  }));
  localStorage.setItem('profitpath-scenarios', JSON.stringify([...existing, ...imported]));
  return imported.length;
}

export function showScenarioBundleLink(scenarios: Scenario[]): void {
  const url = encodeScenarioBundle(scenarios);
  if (!url) {
    showToast('These scenarios make a link too long to share. Select fewer scenarios.', 'error');
    return;
  }
  const modal = createModal({
    title: 'Share saved scenarios',
    content: '<p>Recipients can import these saved snapshots. Later edits require a new link.</p>' +
      '<input id="bundleShareUrl" class="copy-on-click share-url-input" type="text" readonly aria-label="Scenario bundle link" value="' + escapeHtml(url) + '" style="width:100%">' +
      '<button id="copyBundleUrl" class="btn small" type="button">Copy link</button>'
  });
  const input = modal.querySelector<HTMLInputElement>('#bundleShareUrl');
  input?.addEventListener('click', () => input.select());
  modal.querySelector('#copyBundleUrl')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Bundle link copied', 'success');
    } catch {
      input?.select();
      showToast('Link selected for copying', 'info');
    }
  });
}

export function promptScenarioBundleImport(): void {
  const url = new URL(window.location.href);
  const payload = url.searchParams.get('bundle');
  if (!payload) return;
  const clearParam = () => {
    url.searchParams.delete('bundle');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  };
  const entries = decodeScenarioBundle(payload);
  if (!entries) {
    clearParam();
    showToast('This scenario bundle link is invalid or too large', 'error');
    return;
  }
  createModal({
    title: 'Import saved scenarios',
    content: '<p>Import ' + entries.length + ' saved snapshot' + (entries.length === 1 ? '' : 's') + ' to this device?</p><ul>' +
      entries.map(item => '<li>' + escapeHtml(item.name) + '</li>').join('') + '</ul>' +
      '<p>Your current work and saved scenarios remain available. Name conflicts get an imported suffix.</p>',
    buttons: [
      { text: 'Cancel', action: clearParam },
      { text: 'Import', primary: true, action: () => {
        try {
          const count = importScenarioBundle(entries);
          showToast('Imported ' + count + ' saved scenarios', 'success');
          clearParam();
        } catch {
          showToast('Unable to save the imported scenarios', 'error');
        }
      } }
    ],
    onClose: clearParam
  });
}
