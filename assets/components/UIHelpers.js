import React from "react";
import { loadScenario, deleteScenario } from "../services/scenarioService";
import { getAllScenarios, escapeHtml } from "../services/miscService";
// UI Components and Helpers

export function showDeleteConfirmation(scenarioId, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Confirm Delete</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete this scenario? This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button class="btn secondary">Cancel</button>
        <button class="btn danger">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.btn.secondary');
  const deleteBtn = modal.querySelector('.btn.danger');

  const closeModal = () => modal.remove();

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  deleteBtn.addEventListener('click', () => {
    closeModal();
    setTimeout(() => onConfirm(), 100);
  });

  // Auto-close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

export function openScenarioModal() {
  const modal = $('#scenariosModal');
  modal.style.display = 'flex';

  // Set up event delegation for scenario buttons if not already done
  if (!modal._scenarioDelegationSet) {
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('.load-btn, .delete-btn');
      if (!btn) return;

      const scenarioId = btn.dataset.scenarioId;
      if (!scenarioId) return;

      if (btn.classList.contains('load-btn')) {
        loadScenario(scenarioId);
      } else if (btn.classList.contains('delete-btn')) {
        deleteScenario(scenarioId);
      }
    });
    modal._scenarioDelegationSet = true;
  }

  $('#scenarioNameInput').focus();
  renderScenariosList();
}

export function renderScenariosList() {
  const list = $('#scenariosList');
  const scenarios = getAllScenarios();

  if (scenarios.length === 0) {
    list.innerHTML = '<div class="empty-state">No saved scenarios yet. Save one above!</div>';
    return;
  }

  // Use document fragment for better performance with many scenarios
  const fragment = document.createDocumentFragment();

  scenarios.forEach((s) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'scenario-item';

    itemDiv.innerHTML = '<div><div class="scenario-item-name">' + escapeHtml(s.name) + '</div><div class="scenario-item-meta">Saved ' + s.timestamp + '</div></div><div class="scenario-item-actions"><button class="btn small load-btn" data-scenario-id="' + escapeHtml(s.id) + '">Load</button><button class="btn small danger delete-btn" data-scenario-id="' + escapeHtml(s.id) + '">Delete</button></div>';

    fragment.appendChild(itemDiv);
  });

  list.innerHTML = '';
  list.appendChild(fragment);

  // Event listeners are attached via delegation in openScenarioModal
}

export function updatePinnedIndicator(/* rectEl */) {
  // no-op: visual pinned indicators (outline/overlay) removed per UX preference
  // ensure any leftover data attributes are cleared
  el.querySelectorAll('rect[data-pinned]').forEach((r) => r.removeAttribute('data-pinned'));
}

export function showTooltipForRect(rectEl, _clientX = null, _clientY = null, pinnedNow = false) {
  if (!rectEl) return;
  const offering = rectEl.getAttribute('data-offering') || '';
  const varVal = rectEl.getAttribute('data-var') || '';
  const contribVal = rectEl.getAttribute('data-contrib') || '';
  const pct = rectEl.getAttribute('data-pct') || '';
  const hours = rectEl.getAttribute('data-hours') || '';

  let html = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="font-weight:700">' + (offering) + '</div><div style="display:flex;gap:6px;align-items:center"><button class="tooltip-pin" aria-label="Pin tooltip">📌</button><button class="tooltip-close" aria-label="Close tooltip">×</button></div></div>';
  if (CHART_TOOLTIP_OPTIONS.showPercent) {
    html += '<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:6px">' + (pct) + '</div>';
  }
  html += '<div style="font-family:var(--mono);font-size:12px">Variable: ' + (varVal) + '</div>';
  html += '<div style="font-family:var(--mono);color:var(--accent);font-size:12px">Contribution: ' + (contribVal) + '</div>';
  if (CHART_TOOLTIP_OPTIONS.showServiceHoursPerClient) {
    html += '<div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:4px">Service hours / client: ' + (hours) + '</div>';
  }

  const tooltip = el.querySelector('.chart-tooltip');
  if (!tooltip) return;

  tooltip.innerHTML = html;
  tooltip._currentRect = rectEl; // Store reference to current rectangle
  tooltip.classList.add('visible');
  tooltip.style.display = 'block';
  tooltip.style.visibility = 'visible';

  // Update pin button state based on current pinned status
  const pinBtn = tooltip.querySelector('.tooltip-pin');
  if (pinBtn) {
    pinBtn.textContent = pinnedNow || pinned ? '📍' : '📌';
  }

  // Set up button event listeners
  setupTooltipButtons();

  // Positioning: if pinned, anchor to rect center; otherwise follow mouse if provided
  const containerBox = el.getBoundingClientRect();
  const rectBox = rectEl.getBoundingClientRect();
  const centerX = rectBox.left + rectBox.width / 2 - containerBox.left;

  // if hovering (not pinnedNow and not pinned), place tooltip at a static distance above the rect
  // otherwise (pinned or pinnedNow), allow centering near rect/mouse
  const tipRect = tooltip.getBoundingClientRect();
  const halfW = tipRect.width / 2;
  const leftMin = 8 + halfW;
  const leftMax = containerBox.width - 8 - halfW;

  // prefer anchoring to rect center horizontally
  const xAnchor = centerX;
  const leftClamped = Math.min(Math.max(xAnchor, leftMin), leftMax);

  if (!pinnedNow && !pinned) {
    // hovering behavior: always above at fixed offset
    const offset = HOVER_OFFSET; // px gap between bar and tooltip
    const topPos = Math.max(8, rectBox.top - containerBox.top - tipRect.height - offset);
    tooltip.classList.remove('below');

    // Position above the bar
    tooltip.style.left = (leftClamped) + 'px';
    tooltip.style.top = (topPos) + 'px';
  } else {
    // pinned behavior: same as hover-always position above the bar
    const tipRect2 = tooltip.getBoundingClientRect();
    const topPos = Math.max(8, rectBox.top - containerBox.top - tipRect2.height - HOVER_OFFSET);

    tooltip.style.left = (leftClamped) + 'px';
    tooltip.style.top = (topPos) + 'px';
  }

  if (pinnedNow) {
    pinned = true;
    pinnedRect = rectEl;
    tooltip.classList.add('pinned');
    updatePinnedIndicator(rectEl);
  }
}
