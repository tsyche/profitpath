import { loadScenario, deleteScenario } from "../services/scenarioService";
import { getAllScenarios, escapeHtml, populateComparisonDropdowns } from "../services/miscService";
import { showConfirmationModal, showToast } from "../services/modalService";
import { createModal } from "../components/Modal";

// UI Components and Helpers

export function showDeleteConfirmation(scenarioId, onConfirm) {
  // Create a simple confirmation without blur effect
  const confirmModal = createModal({
    title: '🗑️ Confirm Delete',
    content: 'Are you sure you want to delete this scenario? This action cannot be undone.',
    buttons: [
      {
        text: '❌ Cancel', action: () => {
          // Only remove the confirmation modal's overlay (highest z-index)
          const overlays = document.querySelectorAll('.modal-overlay');
          overlays.forEach(overlay => {
            if (overlay.style.zIndex === '15000') {
              overlay.remove();
            }
          });
          // Clear blur from document.body
          document.body.style.backdropFilter = '';
        }, primary: false
      },
      {
        text: '🗑️ Delete', action: () => {
          if (onConfirm) onConfirm();
          // Only remove the confirmation modal's overlay (highest z-index)
          const overlays = document.querySelectorAll('.modal-overlay');
          overlays.forEach(overlay => {
            if (overlay.style.zIndex === '15000') {
              overlay.remove();
            }
          });
          // Clear blur from document.body
          document.body.style.backdropFilter = '';
        }, primary: true
      }
    ],
    size: 'small'
  });

  // Create overlay without blur effect
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); z-index: 15000; display: flex; align-items: center; justify-content: center;';
  overlay.appendChild(confirmModal);
  document.body.appendChild(overlay);

  // Add close handler for X button
  const closeBtn = confirmModal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Remove blur effect from document.body
      document.body.style.backdropFilter = '';
      overlay.remove();
    });
  }

  confirmModal.querySelector('.modal-btn[data-index="0"]').addEventListener('click', () => {
    // Remove blur effect from document.body
    document.body.style.backdropFilter = '';
    const confirmationModal = document.querySelector('.modal-header h3')?.parentElement?.parentElement?.parentElement;
    if (confirmationModal?.parentElement?.classList.contains('modal-overlay')) {
      confirmationModal.parentElement.remove();
    }
  });

  confirmModal.querySelector('.modal-btn[data-index="1"]').addEventListener('click', () => {
    if (onConfirm) onConfirm();
    // Remove blur effect from document.body
    document.body.style.backdropFilter = '';
    const confirmationModal = document.querySelector('.modal-header h3')?.parentElement?.parentElement?.parentElement;
    if (confirmationModal?.parentElement?.classList.contains('modal-overlay')) {
      confirmationModal.parentElement.remove();
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
        <button class="btn small load-btn" data-scenario-id="${s.id}">📂 Load</button>
        <button class="btn small danger delete-btn" data-scenario-id="${s.id}">🗑️ Delete</button>
      </div>
    </div>
  `;
  }).join('');

  const content = `
    <div class="scenarios-container">
      <div class="save-scenario-section" style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border);">
        <h4 style="margin: 0 0 12px; color: var(--text); font-size: 16px;">💾 Save Current Configuration</h4>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="scenarioNameInput" placeholder="Enter scenario name..." style="flex: 1; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--panel); color: var(--text); font-size: 14px;">
          <button class="btn primary" id="saveScenarioBtn">💾 Save</button>
        </div>
      </div>
      
      <div class="scenarios-list-section" style="margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px; color: var(--text); font-size: 16px;">📂 Load Saved Scenarios</h4>
        <div id="scenariosList" class="scenarios-list" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); background: rgba(0,0,0,0.1);">
          ${scenarios.length === 0 ? '<div style="padding: 20px; text-align: center; color: var(--muted);">No saved scenarios yet.</div>' : scenariosList}
        </div>
      </div>

      <div class="comparison-section">
        <h4 style="margin: 0 0 12px; color: var(--text); font-size: 16px;">⚖️ Compare Scenarios</h4>
        <div class="comparison-controls" style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
          <select id="compareScenario1" class="scenario-select" style="flex: 1; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--panel); color: var(--text);">
            <option value="">Select first...</option>
          </select>
          <span style="color: var(--muted); font-weight: 600;">VS</span>
          <select id="compareScenario2" class="scenario-select" style="flex: 1; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--panel); color: var(--text);">
            <option value="">Select second...</option>
          </select>
          <button class="btn" id="compareBtn">⚖️ Compare</button>
        </div>
        <div id="comparisonResults" class="comparison-results" style="display: none;"></div>
      </div>
    </div>
  `;

  const modal = createModal({
    id: 'scenariosModal',
    title: '💾 Scenarios',
    content: content,
    buttons: [
      { text: 'Close', primary: false }
    ],
    size: 'large'
  });

  // Populate comparison dropdowns after modal is added to DOM
  console.log('Modal added to DOM, populating dropdowns immediately...');

  // Try multiple approaches to populate dropdowns
  const populateDropdowns = () => {
    const scenarios = getAllScenarios();
    console.log('Populating with scenarios:', scenarios.length);

    // Find dropdowns in the modal
    const dropdown1 = modal.querySelector('#compareScenario1');
    const dropdown2 = modal.querySelector('#compareScenario2');

    console.log('Found dropdowns in modal:', { dropdown1: !!dropdown1, dropdown2: !!dropdown2 });

    if (dropdown1 && dropdown2) {
      // Clear and populate
      dropdown1.innerHTML = '<option value="">Select first scenario...</option>';
      dropdown2.innerHTML = '<option value="">Select second scenario...</option>';

      scenarios.forEach(scenario => {
        const option1 = document.createElement('option');
        option1.value = scenario.id;
        option1.textContent = scenario.name;
        dropdown1.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = scenario.id;
        option2.textContent = scenario.name;
        dropdown2.appendChild(option2);
      });

      console.log('Dropdowns populated successfully!');
    } else {
      console.log('Dropdowns not found in modal, trying global search...');
      import('../services/miscService.js').then((miscService) => {
        miscService.populateComparisonDropdowns();
      });
    }
  };

  // Try immediately
  populateDropdowns();

  // And try again after delay
  setTimeout(populateDropdowns, 100);
  setTimeout(populateDropdowns, 500);

  // Set up event delegation for scenario buttons
  modal.addEventListener('click', (e) => {
    const btn = e.target.closest('.load-btn, .delete-btn');
    if (!btn) return;

    const scenarioId = btn.dataset.scenarioId;
    if (!scenarioId) return;

    if (btn.classList.contains('load-btn')) {
      // Show load confirmation modal
      const scenario = scenarios.find(s => s.id === scenarioId);
      const scenarioName = scenario?.name || scenario?.description || 'Unknown scenario';

      const confirmModal = createModal({
        title: '📂 Confirm Load',
        content: `Are you sure you want to load "${scenarioName}"? This will replace your current configuration with the saved scenario.`,
        buttons: [
          {
            text: '❌ Cancel', action: () => {
              // Only remove the confirmation modal's overlay (highest z-index)
              const overlays = document.querySelectorAll('.modal-overlay');
              overlays.forEach(overlay => {
                if (overlay.style.zIndex === '15000') {
                  overlay.remove();
                }
              });
              // Clear blur from document.body
              document.body.style.backdropFilter = '';
            }, primary: false
          },
          {
            text: '📂 Load', action: async () => {
              // Call the scenario service directly (it will bypass confirmation now)
              const scenarioService = await import('../services/scenarioService.js');
              await scenarioService.loadScenario(scenarioId);
              // Refresh scenarios list and dropdowns after loading
              refreshScenariosList(modal);
              // Only remove the confirmation modal's overlay (highest z-index)
              const overlays = document.querySelectorAll('.modal-overlay');
              overlays.forEach(overlay => {
                if (overlay.style.zIndex === '15000') {
                  overlay.remove();
                }
              });
              // Clear blur from document.body
              document.body.style.backdropFilter = '';
            }, primary: true
          }
        ]
      });
      confirmModal.style.zIndex = '15000';
      document.body.appendChild(confirmModal);
      // Add blur effect
      document.body.style.backdropFilter = 'blur(4px)';
    } else if (btn.classList.contains('delete-btn')) {
      // Ask for confirmation before deleting
      showDeleteConfirmation(scenarioId, async () => {
        await deleteScenario(scenarioId);
        // Refresh scenarios list and dropdowns after deleting
        setTimeout(() => {
          refreshScenariosList(modal);
        }, 50);
      });
      // Don't close modal after delete confirmation
      return;
    }
  });


  // Set up save button
  const saveBtn = modal.querySelector('#saveScenarioBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const input = modal.querySelector('#scenarioNameInput');
      if (input && input.value.trim()) {
        const scenarioName = input.value.trim();

        // Show save confirmation modal
        const confirmModal = createModal({
          title: '💾 Confirm Save',
          content: `Save current configuration as "${scenarioName}"? This will save your current calculations and settings.`,
          buttons: [
            {
              text: '❌ Cancel', action: () => {
                // Only remove the confirmation modal's overlay (highest z-index)
                const overlays = document.querySelectorAll('.modal-overlay');
                overlays.forEach(overlay => {
                  if (overlay.style.zIndex === '15000') {
                    overlay.remove();
                  }
                });
                // Clear blur from document.body
                document.body.style.backdropFilter = '';
              }, primary: false
            },
            {
              text: '💾 Save', action: async () => {
                // Call the scenario service directly (it will bypass confirmation now)
                const scenarioService = await import('../services/scenarioService.js');
                await scenarioService.saveScenario(scenarioName);
                // Clear input
                input.value = '';
                // Refresh modal content after saving (now with updated data)
                refreshScenariosList(modal);
                // Only remove the confirmation modal's overlay (highest z-index)
                const overlays = document.querySelectorAll('.modal-overlay');
                overlays.forEach(overlay => {
                  if (overlay.style.zIndex === '15000') {
                    overlay.remove();
                  }
                });
                // Clear blur from document.body
                document.body.style.backdropFilter = '';
              }, primary: true
            }
          ]
        });
        confirmModal.style.zIndex = '15000';
        document.body.appendChild(confirmModal);
        // Add blur effect
        document.body.style.backdropFilter = 'blur(4px)';
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

  // Set up compare button functionality
  const compareBtn = modal.querySelector('#compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      const dropdown1 = modal.querySelector('#compareScenario1');
      const dropdown2 = modal.querySelector('#compareScenario2');

      if (dropdown1?.value && dropdown2?.value) {
        performComparisonInModal(dropdown1.value, dropdown2.value, modal);
      } else {
        import('../services/modalService.js').then((modalService) => {
          modalService.showToast('Please select two scenarios to compare');
        });
      }
    });
  }

  // Populate comparison dropdowns
  console.log('Opening scenarios modal, populating dropdowns...');
  import('../services/miscService.js').then((miscService) => {
    miscService.populateComparisonDropdowns();
  });
}

// Function to perform comparison within modal context
export function performComparisonInModal(scenarioId1, scenarioId2, modal) {
  // Delegate to the new full-width diff modal
  if (typeof window.showScenarioComparisonDiff === 'function') {
    window.showScenarioComparisonDiff(scenarioId1, scenarioId2);
    // Close the current modal
    if (modal && modal.parentNode) {
      modal.parentNode.remove();
    }
  } else {
    console.error('showScenarioComparisonDiff is not available');
  }
}

export function performComparison(scenarioId1, scenarioId2, modal = null) {
  console.log('performComparison called with:', scenarioId1, scenarioId2);

  const scenarios = getAllScenarios();

  // Find scenarios by ID
  const scenario1 = scenarios.find(s => s.id === scenarioId1);
  const scenario2 = scenarios.find(s => s.id === scenarioId2);

  if (!scenario1 || !scenario2) {
    import('../services/modalService.js').then((modalService) => {
      modalService.showToast('Scenario not found');
    });
    return;
  }

  // Find results div within the modal if provided, or globally (for tests)
  const resultsDiv = modal ? (modal.querySelector('#comparisonResults') || modal.parentElement?.querySelector('#comparisonResults')) : 
                     document.querySelector('#comparisonResults');
  
  if (!resultsDiv) {
    console.error('Comparison results div not found in modal context');
    return;
  }

  // Show results
  resultsDiv.style.display = 'block';

  // Look for tbody
  const tbody = resultsDiv.querySelector('tbody');

  if (!tbody) {
    console.error('Comparison table tbody not found');
    return;
  }

  console.log('Performing comparison between scenarios:', scenario1.name, scenario2.name);

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

export function renderScenariosList() {
  // Update all scenario lists on the page or within open modals
  const listElements = Array.from(document.querySelectorAll('.scenarios-list'));
  const scenarios = getAllScenarios().sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

  if (listElements.length === 0) return;

  listElements.forEach((listElement) => {
    if (scenarios.length === 0) {
      listElement.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
      return;
    }

    listElement.innerHTML = scenarios.map(s => {
      const name = escapeHtml(s.name || s.description || 'Unnamed scenario');
      const ts = escapeHtml(s.timestamp || s.createdAt || '');
      return `
        <div class="scenario-item" data-scenario-id="${s.id}">
          <div>
            <div class="scenario-item-name">${name}</div>
            <div class="scenario-item-meta">${ts ? 'Saved ' + ts : ''}</div>
          </div>
          <div class="scenario-item-actions">
            <button class="btn small load-btn" data-scenario-id="${s.id}">📂 Load</button>
            <button class="btn small danger delete-btn" data-scenario-id="${s.id}">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');
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
