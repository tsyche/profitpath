import { getAllScenarios, escapeHtml } from '../services/miscService';
import { formatMoney0 } from '../../src/calculations/currency';
import { calc } from '../../src/calculations/index';
import { getRangeCase, RANGE_CASE_LABELS } from '../../src/calculations/rangeCase';
import { ensureValidInputs } from '../state/pendingInputs';
import { state } from '../state/appState';
import { createModal } from './Modal';

export function showWorkspaceShareReview(name: string, pair?: { first: string; second: string }) {
  if (!ensureValidInputs()) return;
  const saved = getAllScenarios();
  const selected = pair ? [saved.find(scenario => scenario.id === pair.first), saved.find(scenario => scenario.id === pair.second)] : [];
  const included = pair && selected.every(Boolean) ? selected.map(scenario => ({ name: scenario!.name, state: scenario!.state || scenario!.data || {} })) : [{ name, state }];
  const comparison = included.length === 2 && pair;
  const formats = comparison ? [['comparison-link', 'Share comparison'], ['comparison-csv', 'Comparison CSV'], ['comparison-pdf', 'Comparison PDF'], ['comparison-embed', 'Embed comparison']] :
    [['link', 'Share snapshot link'], ['csv', 'CSV spreadsheet'], ['excel', 'Excel workbook'], ['pdf', 'PDF report'], ['html', 'HTML page'], ['financial-report', 'Financial report'], ['email', 'Email report'], ['embed', 'Embed widget'], ['schedule', 'Scheduling information']];
  const content = document.createElement('div');
  content.innerHTML = `<p class="workspace-eyebrow">${RANGE_CASE_LABELS[getRangeCase()]} case · annual results</p>
    ${included.map(option => `<section class="workspace-share-option"><h4>${escapeHtml(option.name)}</h4><p>${escapeHtml(option.state.currency || 'USD')} · ${escapeHtml(option.state.mode)} · ${formatMoney0(calc(option.state).income, option.state.currency)} net income/year before tax</p><p>${escapeHtml(option.state.notes || 'No notes added.')}</p></section>`).join('')}
    <p>Links are snapshots. Later edits do not update a link already sent. Reports identify the selected case and include source assumptions.</p>
    <p class="smallprint">CSV reimport restores the report's labeled case in this workspace. PDF uses the print dialog. Email opens your mail app. Recurring report delivery requires a server and remains unavailable.</p>
    <div class="workspace-actions">${formats.map(([format, label]) => `<button type="button" class="btn" data-snapshot-format="${format}">${label}</button>`).join('')}</div>
    <p id="workspaceShareError" role="status"></p>`;
  const overlay = createModal({ title: 'Review your conclusion', content, size: 'large' });
  content.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-snapshot-format]');
    if (!button) return;
    const format = button.dataset.snapshotFormat;
    overlay.querySelector<HTMLButtonElement>('.modal-close')!.click();
    if (format === 'link') document.getElementById('shareBtn')?.click();
    else if (comparison && format === 'comparison-link') window.shareComparison(pair.first, pair.second);
    else if (comparison && format === 'comparison-csv') window.exportComparisonAsCSV(pair.first, pair.second);
    else if (comparison && format === 'comparison-pdf') window.exportComparisonAsPDF(pair.first, pair.second);
    else if (comparison && format === 'comparison-embed') window.getComparisonEmbedCode(pair.first, pair.second);
    else document.querySelector<HTMLButtonElement>(`.export-option[data-format="${format}"]`)?.click();
  });
}
