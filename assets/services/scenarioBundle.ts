import { encodeScenarioBundle as encodeBundle, decodeScenarioBundle, type BundleEntry } from '../../src/sharing/scenarioBundle';
export { decodeScenarioBundle } from '../../src/sharing/scenarioBundle';
import type { Scenario } from '../../src/types';
import { createModal } from '../components/Modal';
import { uuid } from '../utils/helpers';
import { escapeHtml, getAllScenarios, getShareBase } from './miscService';
import { showToast } from './modalService';

export function encodeScenarioBundle(scenarios: Scenario[]): string | null {
  return encodeBundle(scenarios, getShareBase());
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

const baseName = (name: string) => name.replace(/ \(imported \d+\)$/, '').toLowerCase();

export function importScenarioBundle(entries: BundleEntry[]): { imported: number; skipped: number } {
  const existing = getAllScenarios();
  const names = new Set(existing.map(s => s.name.toLowerCase()));
  const saved = new Set(existing.map(s => baseName(s.name) + '\n' + JSON.stringify(s.state)));
  const fresh = entries.filter(item => !saved.has(baseName(item.name) + '\n' + JSON.stringify(item.state)));
  const now = new Date();
  const imported: Scenario[] = fresh.map(item => ({
    id: uuid(),
    name: uniqueName(item.name, names),
    timestamp: now.toLocaleString(),
    createdAt: now.toISOString(),
    state: item.state
  }));
  localStorage.setItem('profitpath-scenarios', JSON.stringify([...existing, ...imported]));
  return { imported: imported.length, skipped: entries.length - imported.length };
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
  if (url.searchParams.get('decision') === '1') return;
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
      '<p>Your current work and saved scenarios remain available. Identical copies already saved are skipped; other name conflicts get an imported suffix.</p>',
    buttons: [
      { text: 'Cancel', action: clearParam },
      { text: 'Import', primary: true, action: () => {
        try {
          const { imported, skipped } = importScenarioBundle(entries);
          showToast('Imported ' + imported + ' saved scenario' + (imported === 1 ? '' : 's') +
            (skipped ? ' (' + skipped + ' already saved, skipped)' : ''), 'success');
          clearParam();
        } catch {
          showToast('Unable to save the imported scenarios', 'error');
        }
      } }
    ],
    onClose: clearParam
  });
}
