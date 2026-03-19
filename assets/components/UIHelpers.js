import React from "react";
import { loadScenario, deleteScenario } from "../services/scenarioService";
import { getAllScenarios, escapeHtml } from "../services/miscService";
import { showConfirmationModal, showToast } from "../services/modalService";
import { createModal } from "../components/Modal";

// UI Components and Helpers

export function showDeleteConfirmation(scenarioId, onConfirm) {
  showConfirmationModal(
    'Confirm Delete',
    'Are you sure you want to delete this scenario? This action cannot be undone.',
    onConfirm,
    () => { }
  );
}

export function openScenarioModal() {
  const scenarios = getAllScenarios();
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
      { text: 'Close', action: () => { }, primary: false }
    ],
    size: 'large'
  });

  document.body.appendChild(modal);

  // Set up event delegation for scenario buttons
  modal.addEventListener('click', (e) => {
    const btn = e.target.closest('.load-btn, .delete-btn');
    if (!btn) return;

    const scenarioId = btn.dataset.scenarioId;
    if (!scenarioId) return;

    if (btn.classList.contains('load-btn')) {
      loadScenario(scenarioId);
      modal.remove();
    } else if (btn.classList.contains('delete-btn')) {
      // Ask for confirmation before deleting
      showDeleteConfirmation(scenarioId, () => {
        deleteScenario(scenarioId);
        modal.remove();
      });
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
