import { calc } from '../src/calculations/index';
import { initGroupRunsPanel, renderGroupRunsTable } from './components/GroupRunsPanel';
import { initMembershipPanel, renderMembershipPanel } from './components/MembershipPanel';
import { errStack } from './utils/helpers';
import { openScenarioModal, renderScenariosList } from './components/UIHelpers';
import { bindCsvImport, initScenarioComparison, showScenarioComparisonDiff } from './components/ScenarioComparison';
import { initAppState, persistState, pushHistory, redo, state, undo } from './state/appState';
import { bindPanelToggle, initAdvancedChartsPanel, initAdvisorPanel, initAnalysisPanels, initCustomerAnalyticsPanel, initInsightsPanel, initMixOptimizerPanel, initReversePanel, initWhatIfWizard } from './components/AnalysisPanels';
import { bindControls, render, syncCurrencySelect, updateOutputs } from './components/AppRender';
import { initSettings } from './components/SettingsPanel';
import { bindMenus, bindScenariosAndGlobals } from './components/AppMenus';
import { initSensitivityPanel } from './components/SensitivityPanel';
import { initAnalysisTabs, refreshAnalysisTabs } from './components/AnalysisTabs';
import { initSetupGroups } from './components/SetupGroups';
import { initDebugPanel, initPerfPanel } from './components/DebugPanel';
import { enterReadOnlyMode, hideContextualHelp, initOnboarding } from './components/Onboarding';
import { initializeProgressiveDisclosure } from './utils/progressiveDisclosure';
import { initTooltips } from './utils/tooltipManager';
import * as businessLogic from './services/businessLogic';
import { updateValidationDisplay } from './services/businessLogic';
import { saveScenario, loadScenario, deleteScenario } from './services/scenarioService';
import { closeScenarioModal } from './components/Modal';
import { decodeScenarioFromURL, encodeScenarioToURL, getAllScenarios, isReadOnlyURL, loadScenarioFromURL, loadState, restoreScheduling, sanitizeScenarioState, exportAsExcel, loadIndustryTemplate, showEmbedCode } from './services/miscService';
import { $, $$ } from './utils/dom';
import { setHooks } from './state/hooks';
import { bindOfferingsTable } from './components/OfferingsTable';
import { bindExpenses } from './components/ExpensesPanel';
import { bindRangesMarket } from './components/RangesMarketPanel';
import { bindResources, refreshAfterResourceEdit } from './components/ResourcesPanel';
import { showToast } from './services/modalService';
import { INDUSTRY_TEMPLATES } from './services/industryTemplates';
import { promptScenarioBundleImport } from './services/scenarioBundle';

// Make $ and $$ globally available for other modules
if (typeof window !== 'undefined') {
  window.$ = $;
  window.$$ = $$;
}


// Make INDUSTRY_TEMPLATES globally available
if (typeof window !== 'undefined') {
  window.INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES;
}

// Use a function to avoid initialization issues
// Make utility functions globally available after they're defined
// Use a function to ensure assignment happens after module is loaded
const assignGlobalFunctions = () => {
  window.loadIndustryTemplate = loadIndustryTemplate;
  window.exportAsExcel = exportAsExcel;
  window.showEmbedCode = showEmbedCode;
  window.hideContextualHelp = hideContextualHelp;
};

// Assign immediately and also on window load
assignGlobalFunctions();
window.addEventListener('load', assignGlobalFunctions);

// Make calc and state globally available for export functions
if (typeof window !== 'undefined') {
  window.calc = calc;
  window.state = state;
  window.render = render;
  window.updateOutputs = updateOutputs;
  window.updateValidationDisplay = updateValidationDisplay;
  window.rebalanceMix = businessLogic.rebalanceMix;
  window.defaultOfferings = businessLogic.defaultOfferings;
  window.persistState = persistState;
}

bindControls();
bindRangesMarket();
bindResources();
bindExpenses();

initSettings();
bindMenus();

bindOfferingsTable();


bindScenariosAndGlobals();

// Load scenario from URL first (if present), then localStorage
const loadedFromURL = loadScenarioFromURL();

// Restore last session's state from localStorage (auto-save read-back)
if (!loadedFromURL) {
  const persisted = loadState();
  const sanitizedPersisted = persisted ? sanitizeScenarioState(persisted) : null;
  if (sanitizedPersisted) Object.assign(state, sanitizedPersisted);
}

// Check for shared comparison link
const compareStatesParam = new URLSearchParams(window.location.search).get('compareStates');
if (compareStatesParam) {
  try {
    if (compareStatesParam.length > 20000) throw new Error('Comparison link too large');
    const payload: unknown = JSON.parse(decodeURIComponent(atob(compareStatesParam).replace(/[^A-Za-z0-9@*_+\-.\/]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))));
    if (payload && typeof payload === 'object' && 's1' in payload && 's2' in payload) {
      const pair = payload as { s1: { name?: unknown; state?: unknown }; s2: { name?: unknown; state?: unknown } };
      const first = sanitizeScenarioState(pair.s1?.state as Record<string, unknown>);
      const second = sanitizeScenarioState(pair.s2?.state as Record<string, unknown>);
      if (!first || !second) throw new Error('Invalid comparison states');
      // Names come from an untrusted share link — coerce to a bounded string.
      // (They are also escaped at render time; this just caps storage size.)
      const safeName = (n: unknown) => (typeof n === 'string' ? n : 'Shared scenario').slice(0, 120);
      // Create temporary comparison scenarios in localStorage
      const tempScenarios = [
        { id: 'temp-s1', name: safeName(pair.s1.name), timestamp: new Date().toLocaleString(), state: first },
        { id: 'temp-s2', name: safeName(pair.s2.name), timestamp: new Date().toLocaleString(), state: second }
      ];
      localStorage.setItem('profitpath-temp-compare', JSON.stringify(tempScenarios));
    }
  } catch (e) {
    console.warn('Failed to decode comparison link:', e);
  }
}

wire();

// Read-only mode: lock all inputs when ?readonly=1 is present in the URL
if (loadedFromURL && isReadOnlyURL()) enterReadOnlyMode(state);

// Restore any scheduled report generation
restoreScheduling();

// Run initial render in a safe guard so any runtime errors are reported to the debug panel
try {
  render();
} catch (e) {
  console.error('Render failed:', e);
  const dbg = $('#debugPanel');
  if (dbg) dbg.textContent = 'Render error: ' + errStack(e);
}
promptScenarioBundleImport();

// Auto-open comparison if shared link was used
const tempCompareData = localStorage.getItem('profitpath-temp-compare');
if (tempCompareData && compareStatesParam) {
  try {
    const tempScenarios = JSON.parse(tempCompareData);
    if (tempScenarios.length === 2) {
      // Delay to ensure modal is ready
      setTimeout(() => {
        window.showScenarioComparisonDiff('temp-s1', 'temp-s2');
        // Clean up the temp data from localStorage
        localStorage.removeItem('profitpath-temp-compare');
        // Remove the compareStates param from the URL
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }, 100);
    }
  } catch (e) {
    console.warn('Failed to auto-open shared comparison:', e);
  }
}

function wire() {
  // Fill notes now that URL/localStorage state has been applied
  const notesInput = $('#scenarioNotes');
  if (notesInput) notesInput.value = state.notes || '';
  syncCurrencySelect();

  // Call render in test environment to ensure calculations run
  if (typeof render === 'function') {
    render();
  }

  // Wire up undo/redo buttons
  const undoBtn = $('#undoBtn');
  const redoBtn = $('#redoBtn');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);

  // Keyboard shortcuts for undo/redo
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      redo();
    }
  });

  bindCsvImport();
}

function initGroupRunsSection() {
  initGroupRunsPanel({ getState: () => state, pushHistory, refresh: refreshAfterResourceEdit });
  renderGroupRunsTable();
}

function initMembershipSection() {
  initMembershipPanel({
    getState: () => state,
    getStaffTargetHours: () => { try { return calc(state).targetServiceHours; } catch { return 0; } },
    getPoolUsageHours: () => {
      try {
        const metrics = calc(state);
        const poolPct = new Map(metrics.poolUtilization.map((p) => [p.id, p.pct]));
        return {
          staff: metrics.serviceHours,
          ...Object.fromEntries((state.resources || []).map((r) => [r.id, ((poolPct.get(r.id) || 0) / 100) * r.hoursPerWeek * r.weeksPerYear]))
        };
      } catch { return {}; }
    },
    persist: persistState,
    pushHistory
  });
  bindPanelToggle('#membershipToggle', '#membershipBody', renderMembershipPanel);
}

// Initialize debug, performance, and sensitivity panels after DOM is ready
try {
  initDebugPanel(() => state);
  initPerfPanel();
  initAnalysisPanels({ getState: () => state, pushHistory, persistState, render });
  initAdvisorPanel();
  initSensitivityPanel(() => state);
  initCustomerAnalyticsPanel();
  initMixOptimizerPanel();
  initInsightsPanel();
  initMembershipSection();
  initGroupRunsSection();
  initReversePanel();
  initAdvancedChartsPanel();
  initWhatIfWizard();
  initAnalysisTabs();
  initSetupGroups();
} catch {
  try {
    persistState();
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

// Persist chosen logo so future loads remember the finalized variant
try {
  localStorage.setItem('profitpath-logo', 'final');
  document.documentElement.setAttribute('data-logo', 'final');
} catch {
  // non-fatal
}

// Register service worker for PWA functionality
// TEMPORARILY DISABLED-forcing network CSS loading
/*
if ('serviceWorker' in navigator) {
        window.addEventListener('load', () =>{
          navigator.serviceWorker.register('/sw.js')
            .then((registration) =>{
              // Service Worker registered successfully
 
              // Handle service worker updates
              registration.addEventListener('updatefound', () =>{
                const newWorker=registration.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () =>{
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      // New version available
                      if (confirm('A new version of ProfitPath is available. Reload to update?')) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                      }
                    }
                  });
                }
              });
            })
            .catch((_error) =>{
              // Service Worker registration failed
            });
        });
}
      */

// Migrate legacy unprefixed localStorage keys to profitpath- namespace (one-time, silent)
(function _migrateLegacyKeys() {
  const migrations = [
    ['onboardingCompleted', 'profitpath-onboarding-completed'],
    ['selectedIndustry',    'profitpath-selected-industry'],
  ];
  for (const [oldKey, newKey] of migrations) {
    const val = localStorage.getItem(oldKey);
    if (val !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, val);
    }
    if (val !== null) localStorage.removeItem(oldKey);
  }
})();

initAppState({ render, showToast });
setHooks({ render: () => render(), updateOutputs: (m) => updateOutputs(m), updateValidationDisplay: () => updateValidationDisplay() });
initScenarioComparison({ getState: () => state, render, persistState });
initOnboarding({ getState: () => state, render, persistState });

// Make functions global
if (typeof getAllScenarios === 'function') window.getAllScenarios = getAllScenarios;
if (typeof saveScenario === 'function') window.saveScenario = saveScenario;
if (typeof renderScenariosList === 'function') window.renderScenariosList = renderScenariosList;
if (typeof loadScenario === 'function') window.loadScenario = loadScenario;
if (typeof deleteScenario === 'function') window.deleteScenario = deleteScenario;
if (typeof openScenarioModal === 'function') window.openScenarioModal = openScenarioModal;
if (typeof closeScenarioModal === 'function') window.closeScenarioModal = closeScenarioModal;
if (typeof encodeScenarioToURL === 'function') window.encodeScenarioToURL = encodeScenarioToURL;
if (typeof decodeScenarioFromURL === 'function') window.decodeScenarioFromURL = decodeScenarioFromURL;
if (typeof loadScenarioFromURL === 'function') window.loadScenarioFromURL = loadScenarioFromURL;
if (typeof showScenarioComparisonDiff === 'function') window.showScenarioComparisonDiff = showScenarioComparisonDiff;
// Scenarios initialization removed - handled by main wiring

// Initialize scenarios when DOM is ready - REMOVED to prevent conflicts with new modal system
// initializeScenarios();

initializeProgressiveDisclosure();
refreshAnalysisTabs();
initTooltips();
