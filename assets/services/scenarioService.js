import { persistState, loadState } from "../services/stateManager";
import { getAllScenarios, showNotification } from "./miscService";
import { uuid } from "../utils/helpers";
import { renderScenariosList } from "../components/UIHelpers";
import { showConfirmationModal, showToast } from "./modalService";

// Scenario Management

// Global flag to prevent re-entrant deletion calls
let isDeletingScenario = false;

export function saveScenario(name) {
  if (!name || !name.trim()) {
    showToast('Please enter a scenario name', 'error');
    return;
  }

  // Bypass confirmation in test mode
  if (globalThis.__TEST_MODE__ || window.__TEST_MODE__) {
    performSave(name.trim());
    return;
  }

  // Bypass confirmation and directly save
  performSave(name.trim());
}

function performSave(name) {
  try {
    const scenarios = getAllScenarios();
    const timestamp = new Date().toLocaleString();
    const createdAt = new Date().toISOString();
    const currentState = window.state;
    const scenario = {
      id: uuid(),
      name: name,
      timestamp,
      createdAt,
      state: JSON.parse(JSON.stringify(currentState)), // Deep copy
    };

    scenarios.push(scenario);
    localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));

    // Track scenario save
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackScenarioAction('create', {
        scenarioName: name,
        totalScenarios: scenarios.length
      });
    }

    // Clear input(s) and re-render list in any open modal
    document.querySelectorAll('#scenarioNameInput').forEach(i => i.value = '');
    renderScenariosList();

    // Update dropdowns immediately after localStorage is updated
    const modalOverlay = document.querySelector('.modal-overlay');
    import('./miscService.js').then(miscService => {
      miscService.populateComparisonDropdowns(modalOverlay);
    });

    // Show success notification
    showToast('Scenario saved successfully!', 'success');
  } catch (e) {
    console.error('Failed to save scenario:', e);
    showToast('Failed to save scenario', 'error');
  }
}

export function loadScenario(scenarioId) {
  try {
    const scenarios = getAllScenarios();
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    // Bypass confirmation in test mode
    if (globalThis.__TEST_MODE__ || window.__TEST_MODE__) {
      performLoad(scenario);
      return;
    }

    // Bypass confirmation and directly load
    performLoad(scenario);
    // Update the scenarios modal UI in real time
    setTimeout(() => {
      renderScenariosList();
      import('./miscService.js').then(miscService => {
        miscService.populateComparisonDropdowns();
      });
    }, 100);
  } catch (e) {
    console.error('Failed to load scenario:', e);
    showToast('Error loading scenario', 'error');
  }
}

export function performLoad(scenario) {
  try {
    // Handle both old format (scenario.state) and new format (scenario.data)
    const scenarioData = scenario.state || scenario.data;
    if (!scenarioData) {
      console.error('Scenario data not found in expected format');
      return;
    }

    const currentState = window.state;

    // Restore state from scenario
    window.state.mode = scenarioData.mode ?? window.state.mode;
    window.state.offerings = scenarioData.offerings ?? window.state.offerings;
    window.state.employees = scenarioData.employees ?? window.state.employees;
    window.state.employeePay = scenarioData.employeePay ?? window.state.employeePay;
    window.state.monthlyCosts = scenarioData.monthlyCosts ?? window.state.monthlyCosts;
    window.state.productiveUtilizationPct = scenarioData.productiveUtilizationPct ?? window.state.productiveUtilizationPct;
    window.state.targetUtilizationPct = scenarioData.targetUtilizationPct ?? window.state.targetUtilizationPct;
    window.state.lockMix = scenarioData.lockMix ?? window.state.lockMix;

    persistState(); // Save loaded scenario as current state
    window.render();
    // Don't close modal - let user continue working

    // Show success notification
    showToast('Scenario "' + (scenario.name || 'Unnamed') + '" loaded successfully!', 'success');

    // Track scenario load
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackScenarioAction('load', {
        scenarioName: scenario.name,
        scenarioId: scenario.id
      });
    }
  } catch (e) {
    console.error('Failed to load scenario:', e);
    alert('Error loading scenario');
  }
}

export function deleteScenario(scenarioId) {
  // Prevent re-entrant calls
  if (isDeletingScenario) return;
  isDeletingScenario = true;

  try {
    // Get scenarios once and filter
    let scenarios = getAllScenarios();
    const initialLength = scenarios.length;
    scenarios = scenarios.filter((s) => s.id !== scenarioId);

    // Only update if we actually removed something
    if (scenarios.length < initialLength) {
      localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));

      // Track scenario deletion
      if (window.profitPathAnalytics) {
        window.profitPathAnalytics.trackScenarioAction('delete', {
          scenarioId: scenarioId,
          remainingScenarios: scenarios.length
        });
      }

      // Defer rendering to next tick to avoid blocking
      setTimeout(() => {
        renderScenariosList();
        import('./miscService.js').then(miscService => {
          // Find the modal overlay to pass as context
          const modalOverlay = document.querySelector('.modal-overlay');
          miscService.populateComparisonDropdowns(modalOverlay);
        });
        // Don't close modal - let user continue working
      }, 0);

      // Show success notification
      showToast('Scenario deleted successfully!', 'success');
    }
  } catch (e) {
    console.error('Failed to delete scenario:', e);
    alert('Error deleting scenario');
  }
  isDeletingScenario = false;
}

export function initializeScenarios() {
  // Set up scenarios button
  const scenariosBtn = document.getElementById('scenariosBtn');
  if (scenariosBtn) {
    scenariosBtn.addEventListener('click', () => {
      // Open scenarios modal - this will be handled by the app.jsx
      const modal = document.getElementById('scenariosModal');
      if (modal) {
        modal.classList.remove('hidden');
      }
    });
  }

  // Set up modal close button
  const modalCloseBtn = document.querySelector('#scenariosModal .btn-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      const modal = document.getElementById('scenariosModal');
      if (modal) {
        modal.classList.add('hidden');
      }
    });
  }

  // Set up save button
  const saveBtn = document.getElementById('saveScenarioBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const input = document.getElementById('scenarioNameInput');
      if (input) {
        saveScenario(input.value);
      }
    });
  }

  // Set up input enter key
  const input = document.getElementById('scenarioNameInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveScenario(input.value);
      }
    });
  }

  // Delegate events for load buttons (delete handled by UIHelpers)
  const scenariosList = document.getElementById('scenariosList');
  if (scenariosList) {
    scenariosList.addEventListener('click', (e) => {
      const target = e.target;
      const scenarioId = target.dataset.scenarioId;

      // Load button handling removed - now handled by UIHelpers.js
      // Delete button handling removed - now handled by UIHelpers.js
    });
  }
}
