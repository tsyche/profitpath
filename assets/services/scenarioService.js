import { persistState, loadState } from "../services/stateManager";
import { getAllScenarios, showNotification, closeScenarioModal } from "./miscService";
import { uuid } from "../utils/helpers";
import { renderScenariosList } from "../components/UIHelpers";
// Scenario Management

export function saveScenario(name) {
  if (!name || !name.trim()) {
    showNotification('Please enter a scenario name', 'error');
    return;
  }

  // Bypass confirmation in test mode
  if (globalThis.__TEST_MODE__ || window.__TEST_MODE__) {
    performSave(name.trim());
    return;
  }

  // Show confirmation dialog
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Confirm Save</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Save scenario as "<strong>${name.trim()}</strong>"?</p>
        <p style="font-size: 12px; color: #666; margin-top: 8px;">This will save your current calculations and settings.</p>
      </div>
      <div class="modal-footer">
        <button class="btn secondary">Cancel</button>
        <button class="btn primary">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.btn.secondary');
  const saveBtn = modal.querySelector('.btn.primary');

  const closeModal = () => modal.remove();

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', () => {
    closeModal();
    performSave(name.trim());
  });

  // Auto-close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

function performSave(name) {
  try {
    const scenarios = getAllScenarios();
    const timestamp = new Date().toLocaleString();
    const currentState = globalThis.state || window.state;
    const scenario = {
      id: uuid(),
      name: name,
      timestamp,
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

    // Clear input and re-render list
    $('#scenarioNameInput').value = '';
    renderScenariosList();

    // Show success notification
    showNotification('Scenario saved successfully!', 'success');
  } catch (e) {
    console.error('Failed to save scenario:', e);
    showNotification('Failed to save scenario', 'error');
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

    // Show confirmation dialog
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Confirm Load</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Load scenario "<strong>${scenario.name || 'Unnamed'}</strong>"?</p>
          <p style="font-size: 12px; color: #666; margin-top: 8px;">This will replace your current calculations and settings.</p>
        </div>
        <div class="modal-footer">
          <button class="btn secondary">Cancel</button>
          <button class="btn primary">Load</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.btn.secondary');
    const loadBtn = modal.querySelector('.btn.primary');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    loadBtn.addEventListener('click', () => {
      closeModal();
      performLoad(scenario);
    });

    // Auto-close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  } catch (e) {
    console.error('Failed to load scenario:', e);
    alert('Error loading scenario');
  }
}

function performLoad(scenario) {
  try {
    // Handle both old format (scenario.state) and new format (scenario.data)
    const scenarioData = scenario.state || scenario.data;
    if (!scenarioData) {
      console.error('Scenario data not found in expected format');
      return;
    }

    // Get global state
    const currentState = globalThis.state || window.state;
    const renderFn = globalThis.render || window.render;

    // Restore state from scenario
    currentState.mode = scenarioData.mode ?? currentState.mode;
    currentState.offerings = scenarioData.offerings ?? currentState.offerings;
    currentState.employees = scenarioData.employees ?? currentState.employees;
    currentState.employeePay = scenarioData.employeePay ?? currentState.employeePay;
    currentState.monthlyCosts = scenarioData.monthlyCosts ?? currentState.monthlyCosts;
    currentState.productiveUtilizationPct = scenarioData.productiveUtilizationPct ?? currentState.productiveUtilizationPct;
    currentState.targetUtilizationPct = scenarioData.targetUtilizationPct ?? currentState.targetUtilizationPct;
    currentState.lockMix = scenarioData.lockMix ?? currentState.lockMix;

    persistState(); // Save loaded scenario as current state
    if (renderFn) renderFn();
    closeScenarioModal();

    // Show success notification
    showNotification('Scenario "' + (scenario.name || 'Unnamed') + '" loaded successfully!', 'success');

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

  // Create custom confirmation dialog to avoid native confirm issues
  const modal = document.createElement('div');
  modal.innerHTML = '<div id="confirmModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;"><div style="background:white;padding:20px;border-radius:8px;max-width:400px;width:90%;text-align:center;"><p style="margin:0 0 20px 0;color:#374151;">Delete this scenario?</p><div style="display:flex;gap:10px;justify-content:center;"><button id="confirmYes" style="padding:8px 16px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;">Delete</button><button id="confirmNo" style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:4px;cursor:pointer;">Cancel</button></div></div></div>';

  document.body.appendChild(modal);

  function cleanup() {
    if (modal.parentNode) {
      document.body.removeChild(modal);
    }
    isDeletingScenario = false;
  }

  document.getElementById('confirmYes').onclick = () => {
    cleanup();

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
        setTimeout(() => renderScenariosList(), 0);
      }
    } catch (e) {
      console.error('Failed to delete scenario:', e);
      alert('Error deleting scenario');
    }
  };

  document.getElementById('confirmNo').onclick = () => {
    cleanup();
  };
}

export function initializeScenarios() {
  // Set up scenarios button
  const scenariosBtn = document.getElementById('scenariosBtn');
  if (scenariosBtn) {
    scenariosBtn.addEventListener('click', openScenarioModal);
  }

  // Set up modal close button
  const modalCloseBtn = document.querySelector('#scenariosModal .btn-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeScenarioModal);
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

  // Delegate events for load and delete buttons
  const scenariosList = document.getElementById('scenariosList');
  if (scenariosList) {
    scenariosList.addEventListener('click', (e) => {
      const target = e.target;
      const scenarioId = target.dataset.scenarioId;

      if (target.classList.contains('load-btn') && scenarioId) {
        loadScenario(scenarioId);
      } else if (target.classList.contains('delete-btn') && scenarioId) {
        // Use custom confirmation modal instead of native confirm
        showDeleteConfirmation(scenarioId, () => {
          deleteScenario(scenarioId);
          renderScenariosList();
        });
      }
    });
  }
}
