import type { Scenario } from '../../src/types';
import { getAllScenarios, populateComparisonDropdowns, sanitizeScenarioState } from "./miscService";
import { uuid } from "../utils/helpers";
import { renderScenariosList } from "../components/UIHelpers";
import { showToast } from "./modalService";

// Scenario Management

// Global flag to prevent re-entrant deletion calls
let isDeletingScenario = false;

export function saveScenario(name: string) {
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

function performSave(name: string) {
  try {
    const scenarios = getAllScenarios();
    const timestamp = new Date().toLocaleString();
    const createdAt = new Date().toISOString();
    const currentState = window.state;
    const scenarioState = JSON.parse(JSON.stringify(currentState)); // Deep copy

    // Clear template info when saving as custom scenario
    scenarioState.loadedTemplate = null;

    const scenario = {
      id: uuid(),
      name: name,
      timestamp,
      createdAt,
      state: scenarioState,
    };

    // Same name (ignoring case) updates that scenario in place instead of adding a twin
    const existingIdx = scenarios.findIndex((s) => String(s.name).trim().toLowerCase() === name.toLowerCase());
    if (existingIdx >= 0) {
      const existing = scenarios[existingIdx];
      scenarios[existingIdx] = { ...existing, ...scenario, id: existing.id, createdAt: existing.createdAt ?? createdAt };
    } else {
      scenarios.push(scenario);
    }
    localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));

    // Track scenario save
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackScenarioAction('create', {
        scenarioName: name,
        totalScenarios: scenarios.length
      });
    }

    // Clear input(s) and re-render list in any open modal
    document.querySelectorAll<HTMLInputElement>('#scenarioNameInput').forEach(i => i.value = '');
    renderScenariosList();

    // Clear template badge when saving custom scenario
    if (window.state) {
      window.state.loadedTemplate = null;
    }

    // Update dropdowns immediately after localStorage is updated
    const modalOverlay = document.querySelector('.modal-overlay');
    populateComparisonDropdowns(modalOverlay);

    // Update UI to remove template badge
    if (window.render) {
      window.render();
    }

    // Show success notification
    showToast(existingIdx >= 0 ? 'Scenario updated' : 'Scenario saved successfully!', 'success');
  } catch (e) {
    console.error('Failed to save scenario:', e);
    showToast('Failed to save scenario', 'error');
  }
}

// "X copy", then "X copy 2", ... so a duplicate never collides with an existing name
export function uniqueCopyName(name: string, existing: string[]) {
  const taken = new Set(existing.map(n => String(n).trim().toLowerCase()));
  let candidate = `${name} copy`;
  for (let i = 2; taken.has(candidate.toLowerCase()); i++) candidate = `${name} copy ${i}`;
  return candidate;
}

export function duplicateScenario(scenarioId: string) {
  try {
    const scenarios = getAllScenarios();
    const source = scenarios.find((s) => s.id === scenarioId);
    if (!source) return;
    const copy = {
      ...JSON.parse(JSON.stringify(source)),
      id: uuid(),
      name: uniqueCopyName(String(source.name || 'Unnamed scenario'), scenarios.map((s) => s.name)),
      timestamp: new Date().toLocaleString(),
      createdAt: new Date().toISOString(),
    };
    scenarios.push(copy);
    localStorage.setItem('profitpath-scenarios', JSON.stringify(scenarios));
    renderScenariosList();
    populateComparisonDropdowns(document.querySelector('.modal-overlay'));
    showToast(`Duplicated as "${copy.name}"`, 'success');
  } catch (e) {
    console.error('Failed to duplicate scenario:', e);
    showToast('Failed to duplicate scenario', 'error');
  }
}

export function loadScenario(scenarioId: string) {
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
      populateComparisonDropdowns();
    }, 100);
  } catch (e) {
    console.error('Failed to load scenario:', e);
    showToast('Error loading scenario', 'error');
  }
}

export function performLoad(scenario: Scenario) {
  try {
    // Handle both old format (scenario.state) and new format (scenario.data)
    const scenarioData = scenario.state || scenario.data;
    if (!scenarioData) {
      console.error('Scenario data not found in expected format');
      return;
    }

    // Sanitize and restore state from scenario. Handles both the current
    // fullTime/partTime employee fields and the legacy employees/employeePay
    // format saved by older versions.
    const sanitized = sanitizeScenarioState(scenarioData as unknown as Record<string, unknown>);
    if (!sanitized) {
      console.error('Scenario data failed validation');
      showToast('Scenario data is invalid', 'error');
      return;
    }
    Object.assign(window.state, sanitized);
    window.state.loadedTemplate = null; // Clear template badge when loading scenarios

    // Save loaded scenario as current state (appState's zero-arg persistState)
    if (typeof window.persistState === 'function') window.persistState();
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

export function deleteScenario(scenarioId: string) {
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
        // Find the modal overlay to pass as context
        const modalOverlay = document.querySelector('.modal-overlay');
        populateComparisonDropdowns(modalOverlay);
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
      // Open scenarios modal - this will be handled by app.ts
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
      const input = document.getElementById('scenarioNameInput') as HTMLInputElement | null;
      if (input) {
        saveScenario(input.value);
      }
    });
  }

  // Set up input enter key
  const input = document.getElementById('scenarioNameInput') as HTMLInputElement | null;
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
    // Click handling delegated to UIHelpers.js
  }
}
