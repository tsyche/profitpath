import React from "react";
import { loadScenario, deleteScenario } from "../services/scenarioService";
import { getAllScenarios, escapeHtml } from "../services/miscService";
import { showConfirmationModal, showToast } from "../services/modalService";
import { createModal } from "../components/Modal";

// UI Components and Helpers

export function showDeleteConfirmation(scenarioId, onConfirm) {
  // Create a custom confirmation that doesn't close scenarios modal
  const confirmModal = createModal({
    title: 'Confirm Delete',
    content: 'Are you sure you want to delete this scenario? This action cannot be undone.',
    buttons: [
      {
        text: 'Cancel', action: () => {
          // Clean up confirmation modal properly
          const confirmOverlay = document.querySelector('.modal-overlay');
          if (confirmOverlay) {
            confirmOverlay.remove();
          }
        }, primary: false
      },
      {
        text: 'Delete', action: () => {
          if (onConfirm) onConfirm();
          // Clean up confirmation modal properly
          const confirmOverlay = document.querySelector('.modal-overlay');
          if (confirmOverlay) {
            confirmOverlay.remove();
          }
        }, primary: true
      }
    ],
    size: 'small'
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.appendChild(confirmModal);
  document.body.appendChild(overlay);

  // Add close handlers
  const closeBtn = confirmModal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const confirmOverlay = document.querySelector('.modal-overlay');
      if (confirmOverlay) {
        confirmOverlay.remove();
      }
    });
  }

  confirmModal.querySelector('.modal-btn[data-index="0"]').addEventListener('click', () => {
    const confirmOverlay = document.querySelector('.modal-overlay');
    if (confirmOverlay) {
      confirmOverlay.remove();
    }
  });

  confirmModal.querySelector('.modal-btn[data-index="1"]').addEventListener('click', () => {
    const confirmOverlay = document.querySelector('.modal-overlay');
    if (confirmOverlay) {
      confirmOverlay.remove();
    }
  });
}

export function openScenarioModal() {
  console.log('=== openScenarioModal called ===');

  // Add cleanup function to properly remove overlay
  const cleanupModal = () => {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      modalOverlay.remove();
    }
    // Also remove any lingering blur effects
    document.body.style.backdropFilter = '';
  };

  const scenarios = getAllScenarios();
  console.log('Available scenarios for dropdown:', scenarios);
  const scenariosList = scenarios.map(s => {
    const name = escapeHtml(s.name || s.description || 'Unnamed scenario');
    const ts = escapeHtml(s.timestamp || s.createdAt || '');
    return `
    <div class="scenario-item">
      <div>
        <div class="scenario-item-name">${name}</div>
        <div class="scenario-item-meta">${ts ? 'Saved ' + ts : ''}</div>
      </div>
      <div class="scenario-item-actions">
        <button class="btn small load-btn" data-scenario-id="${escapeHtml(s.id)}">Load</button>
        <button class="btn small danger delete-btn" data-scenario-id="${escapeHtml(s.id)}">Delete</button>
      </div>
    </div>
  `;
  }).join('');

  const content = `
    <div class="scenarios-section">
      <h4 style="color: black !important;">Save Current Configuration</h4>
      <div class="save-scenario-form">
        <input type="text" id="scenarioNameInput" placeholder="Enter scenario name..." />
        <button class="btn primary" id="saveScenarioBtn">Save Scenario</button>
      </div>
    </div>
    
    <div class="scenarios-section">
      <h4 style="color: black !important;">Load Saved Scenarios</h4>
      <div id="scenariosList" class="scenarios-list">
        ${scenarios.length === 0 ? '<div class="empty-state">No saved scenarios yet. Save one above!</div>' : scenariosList}
      </div>
    </div>

    <div class="scenarios-section">
      <h4 style="color: black !important;">Compare Scenarios</h4>
      <div class="comparison-controls">
        <select id="compareScenario1" class="scenario-select">
          <option value="">Select first scenario...</option>
        </select>
        <span class="vs-text">vs</span>
        <select id="compareScenario2" class="scenario-select">
          <option value="">Select second scenario...</option>
        </select>
        <button class="btn" id="compareBtn">Compare</button>
      </div>
      <div id="comparisonResults" class="comparison-results" style="display: none;">
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th class="scenario-col">Scenario 1</th>
                <th class="scenario-col">Scenario 2</th>
                <th class="difference-col">Difference</th>
              </tr>
            </thead>
            <tbody>
              <!-- Comparison data will be inserted here -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const modal = createModal({
    title: 'Scenarios',
    content: content,
    buttons: [
      { text: 'Close', action: cleanupModal, primary: false }
    ],
    size: 'large'
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Update close button action
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', cleanupModal);
  }

  // Update modal close button in footer
  const modalCloseBtn = modal.querySelector('.modal-btn[data-index="0"]');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', cleanupModal);
  }

  // Populate comparison dropdowns after modal is added to DOM
  console.log('Modal added to DOM, populating dropdowns immediately...');
  import('../services/miscService.js').then((miscService) => {
    miscService.populateComparisonDropdowns();
  });

  // Also try again after a longer delay to ensure modal is fully rendered
  setTimeout(() => {
    console.log('Retrying dropdown population after 500ms delay...');
    import('../services/miscService.js').then((miscService) => {
      miscService.populateComparisonDropdowns();
    });
  }, 500);

  // Set up event delegation for scenario buttons
  modal.addEventListener('click', (e) => {
    const btn = e.target.closest('.load-btn, .delete-btn');
    if (!btn) return;

    const scenarioId = btn.dataset.scenarioId;
    if (!scenarioId) return;

    if (btn.classList.contains('load-btn')) {
      loadScenario(scenarioId);
      // Refresh scenarios list and dropdowns after loading
      refreshScenariosList(modal);
    } else if (btn.classList.contains('delete-btn')) {
      // Ask for confirmation before deleting
      showDeleteConfirmation(scenarioId, () => {
        deleteScenario(scenarioId);
        // Refresh scenarios list and dropdowns after deleting
        refreshScenariosList(modal);
      });
      // Don't close modal after delete confirmation
      return;
    }
  });


  // Set up save button
  const saveBtn = modal.querySelector('#saveScenarioBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const input = modal.querySelector('#scenarioNameInput');
      if (input && input.value.trim()) {
        // Call the actual save function from scenarioService
        import('../services/scenarioService.js').then((scenarioService) => {
          scenarioService.saveScenario(input.value.trim());
          // Refresh modal content after saving
          refreshScenariosList(modal);
        });
      }
    });
  }

  // Set up input enter key
  const input = modal.querySelector('#scenarioNameInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const saveBtn = modal.querySelector('#saveScenarioBtn');
        if (saveBtn) saveBtn.click();
      }
    });
  }

  // Focus the input
  const scenarioInput = modal.querySelector('#scenarioNameInput');
  if (scenarioInput) {
    scenarioInput.focus();
  }

  // Populate comparison dropdowns
  console.log('Opening scenarios modal, populating dropdowns...');
  import('../services/miscService.js').then((miscService) => {
    miscService.populateComparisonDropdowns();
  });

  // Set up compare button functionality
  const compareBtn = modal.querySelector('#compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      const dropdown1 = modal.querySelector('#compareScenario1');
      const dropdown2 = modal.querySelector('#compareScenario2');

      if (dropdown1.value && dropdown2.value) {
        performComparison(dropdown1.value, dropdown2.value);
      } else {
        import('../services/miscService.js').then((miscService) => {
          miscService.showToast('Please select two scenarios to compare');
        });
      }
    });
  }
}

function performComparison(scenarioId1, scenarioId2) {
  const scenarios = getAllScenarios();
  const scenario1 = scenarios.find(s => s.id === scenarioId1);
  const scenario2 = scenarios.find(s => s.id === scenarioId2);

  if (!scenario1 || !scenario2) {
    import('../services/miscService.js').then((miscService) => {
      miscService.showToast('One or both scenarios not found');
    });
    return;
  }

  const resultsDiv = document.querySelector('#comparisonResults');
  if (!resultsDiv) return;

  const tbody = resultsDiv.querySelector('tbody');
  if (!tbody) return;

  // Generate comparison data
  const metrics = [
    { label: 'Employees', value1: scenario1.state.employees, value2: scenario2.state.employees, format: 'number' },
    { label: 'Employee Pay', value1: scenario1.state.employeePay, value2: scenario2.state.employeePay, format: 'currency' },
    { label: 'Monthly Costs', value1: scenario1.state.monthlyCosts, value2: scenario2.state.monthlyCosts, format: 'currency' },
    { label: 'Productive Utilization', value1: scenario1.state.productiveUtilizationPct, value2: scenario2.state.productiveUtilizationPct, format: 'percentage' },
    { label: 'Target Utilization', value1: scenario1.state.targetUtilizationPct, value2: scenario2.state.targetUtilizationPct, format: 'percentage' },
    { label: 'Total Offerings', value1: scenario1.state.offerings.length, value2: scenario2.state.offerings.length, format: 'number' }
  ];

  // Build table rows
  tbody.innerHTML = metrics.map(metric => {
    const diff = metric.value2 - metric.value1;
    const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
    const diffSymbol = diff > 0 ? '+' : '';

    let formattedValue1 = metric.value1;
    let formattedValue2 = metric.value2;
    let formattedDiff = `${diffSymbol}${diff}`;

    if (metric.format === 'currency') {
      formattedValue1 = `$${metric.value1.toLocaleString()}`;
      formattedValue2 = `$${metric.value2.toLocaleString()}`;
      formattedDiff = `${diffSymbol}$${Math.abs(diff).toLocaleString()}`;
    } else if (metric.format === 'percentage') {
      formattedValue1 = `${metric.value1}%`;
      formattedValue2 = `${metric.value2}%`;
      formattedDiff = `${diffSymbol}${diff}%`;
    }

    return `
      <tr>
        <td>${metric.label}</td>
        <td>${formattedValue1}</td>
        <td>${formattedValue2}</td>
        <td class="${diffClass}">${formattedDiff}</td>
      </tr>
    `;
  }).join('');

  // Show results
  resultsDiv.style.display = 'block';
}

// Function to refresh scenarios list and dropdowns
function refreshScenariosList(modal) {
  console.log('Refreshing scenarios list...');

  // Refresh scenarios list
  const scenarios = getAllScenarios();
  const scenariosList = scenarios.map(s => {
    const name = escapeHtml(s.name || s.description || 'Unnamed scenario');
    const ts = escapeHtml(s.timestamp || s.createdAt || '');
    return `
      <div class="scenario-item" data-scenario-id="${s.id}">
        <div>
          <div class="scenario-item-name">${name}</div>
          <div class="scenario-item-meta">${ts ? 'Saved ' + ts : ''}</div>
        </div>
        <div class="scenario-item-actions">
          <button class="btn small load-btn" data-scenario-id="${s.id}">Load</button>
          <button class="btn small danger delete-btn" data-scenario-id="${s.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  const scenariosListContainer = modal.querySelector('#scenariosList');
  if (scenariosListContainer) {
    scenariosListContainer.innerHTML = scenarios.length === 0 ?
      '<div class="empty-state">No saved scenarios yet. Save one above!</div>' :
      scenariosList;
  }

  // Refresh dropdowns
  import('../services/miscService.js').then((miscService) => {
    miscService.populateComparisonDropdowns();
  });
}

export function renderScenariosList() {
  // Update all scenario lists on the page or within open modals
  const lists = Array.from(document.querySelectorAll('.scenarios-list'));
  const scenarios = getAllScenarios();

  if (lists.length === 0) return;

  lists.forEach((list) => {
    if (scenarios.length === 0) {
      list.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
      return;
    }

    // Use document fragment for better performance with many scenarios
    const fragment = document.createDocumentFragment();

    scenarios.forEach((s) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'scenario-item';

      itemDiv.innerHTML = '<div><div class="scenario-item-name" style="color: black !important;">' + escapeHtml(s.name) + '</div><div class="scenario-item-meta" style="color: #666 !important;">Saved ' + s.timestamp + '</div></div><div class="scenario-item-actions"><button class="btn small load-btn" data-scenario-id="' + escapeHtml(s.id) + '">Load</button><button class="btn small danger delete-btn" data-scenario-id="' + escapeHtml(s.id) + '">Delete</button></div>';

      fragment.appendChild(itemDiv);
    });

    list.innerHTML = '';
    list.appendChild(fragment);
  });
}

// Legacy tooltip functions - keeping for backward compatibility
// These functions are not used in the new modal system but are kept for potential future use

export function updatePinnedIndicator(/* rectEl */) {
  // no-op: visual pinned indicators (outline/overlay) removed per UX preference
  // ensure any leftover data attributes are cleared
  // Note: This function references undefined variables and is kept for compatibility only
}

export function showTooltipForRect(/* rectEl, _clientX = null, _clientY = null, pinnedNow = false */) {
  // Legacy tooltip function - not used in new modal system
  // This function references undefined variables and is kept for compatibility only
}
