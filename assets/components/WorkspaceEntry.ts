import { INDUSTRY_TEMPLATES } from '../services/industryTemplates';
import { loadIndustryTemplate, escapeHtml } from '../services/miscService';
import { formatMoney0 } from '../../src/calculations/currency';
import { displayPrice } from '../../src/calculations/offeringPrice';
import { clearPendingInputs, ensureValidInputs } from '../state/pendingInputs';
import { persistState, pushHistory, state } from '../state/appState';
import { render } from '../state/hooks';
import { uuid } from '../utils/helpers';
import { createModal } from './Modal';

function completed() {
  try { localStorage.setItem('profitpath-onboarding-completed', 'true'); } catch { /* guidance is optional */ }
}

export function showWorkspaceExamples(applied: (name: string) => void) {
  if (!ensureValidInputs()) return;
  const keys = Object.keys(INDUSTRY_TEMPLATES) as (keyof typeof INDUSTRY_TEMPLATES)[];
  const content = document.createElement('div');
  content.innerHTML = `<p>Preview an example before using it. This replaces the working draft; named saved scenarios stay unchanged.</p>
    <label for="workspaceTemplate">Business example</label><select id="workspaceTemplate">${keys.map(key => `<option value="${key}">${escapeHtml(INDUSTRY_TEMPLATES[key].name)}</option>`).join('')}</select>
    <div id="workspaceTemplatePreview"></div>`;
  const picker = content.querySelector<HTMLSelectElement>('#workspaceTemplate')!;
  const preview = content.querySelector('#workspaceTemplatePreview')!;
  const updatePreview = () => {
    const template = INDUSTRY_TEMPLATES[picker.value as keyof typeof INDUSTRY_TEMPLATES];
    preview.innerHTML = `<h3>${escapeHtml(template.description)}</h3><p>${template.config.fullTimeEmployees} full-time people · ${formatMoney0(template.config.monthlyCosts, state.currency)} other overhead/month</p>
      <ul>${template.config.offerings.map(offering => {
        const type = 'type' in offering ? offering.type : 'subscription';
        return `<li>${escapeHtml(offering.name)} · ${formatMoney0(displayPrice(offering), state.currency)}${type === 'one-time' ? '/sale' : type === 'per-session' ? '/session' : '/month'}</li>`;
      }).join('')}</ul>
      <p class="smallprint">Example assumptions, not recommended prices or expected demand. Forecast models capacity-supported customers.</p>`;
  };
  picker.addEventListener('change', updatePreview);
  updatePreview();
  createModal({
    title: 'Start from an example', content,
    buttons: [{ text: 'Cancel' }, { text: 'Use this example', primary: true, action: () => {
      pushHistory(); clearPendingInputs();
      Object.assign(state, { mode: 'forecast', processingFeePct: 0, processingFeePerTransaction: 0, transactionsPerMonth: 0, lockMix: false, notes: 'Example assumptions. Customize the inputs before relying on these results.' });
      const id = picker.value as keyof typeof INDUSTRY_TEMPLATES;
      applied(`${INDUSTRY_TEMPLATES[id].name} example`);
      loadIndustryTemplate(id);
      completed();
    } }]
  });
}

export function startBlankWorkspace(applied: (name: string) => void) {
  if (!ensureValidInputs()) return;
  createModal({
    title: 'Start a blank model?',
    content: 'Replace the working draft with one empty offering and basic capacity defaults? Named saved scenarios stay unchanged. Undo can restore this draft.',
    buttons: [{ text: 'Cancel' }, { text: 'Start blank', primary: true, action: () => {
      pushHistory(); clearPendingInputs();
      Object.assign(state, {
        mode: 'forecast', currency: state.currency, notes: '', loadedTemplate: null, lockMix: false,
        fullTimeEmployees: 1, partTimeEmployees: 0, fullTimeEmployeePay: 0, partTimeEmployeePay: 0,
        monthlyCosts: 0, processingFeePct: 0, processingFeePerTransaction: 0, transactionsPerMonth: 0,
        productiveUtilizationPct: 80, targetUtilizationPct: 75,
        offerings: [{ id: uuid(), name: 'Your first offering', type: 'subscription', priceMonthly: 0, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 0 }],
        expenses: [], resources: [], membershipPlans: [], memberProfiles: []
      });
      applied('');
      persistState(); render(); completed();
    } }]
  });
}
