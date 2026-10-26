import { exportAsCSV, exportAsExcel, exportAsFinancialReport, exportAsHTML, exportAsPDF, loadIndustryTemplate, shareScenario, shareViaEmail, showEmbedCode, showScheduleDialog } from '../services/miscService';
import { deleteScenario, loadScenario } from '../services/scenarioService';
import { showToast } from '../services/modalService';
import { closeScenarioModal, createModal } from './Modal';
import { openScenarioModal } from './UIHelpers';
import { handleComparison, populateComparisonDropdowns } from './ScenarioComparison';
import { render } from '../state/hooks';
import { $ } from '../utils/dom';

/** Header menus (templates, export), scenarios modal wiring and delegated global click handlers. */

// Helper function to close all dropdowns
function closeAllDropdowns(): void {
  // Close all types of dropdowns
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
  // Also close templates and export menus
  const templatesMenu = $('#templatesMenu');
  if (templatesMenu) {
    templatesMenu.style.display = 'none';
  }
  const exportMenu = $('#exportMenu');
  if (exportMenu) {
    exportMenu.style.display = 'none';
  }
}


// Contextual help content for KPI "?" buttons
const KPI_HELP: Record<string, { title: string; content: string }> = {
  'utilization': {
    title: 'Capacity Utilization',
    content: '<p>Utilization measures what percentage of your team\'s available billable hours are actually being used for client work.</p>' +
      '<p><strong>Formula:</strong> Service hours required ÷ (Employees × 2,080 hrs/yr × Productive utilization %)</p>' +
      '<ul style="margin:8px 0 0 16px;line-height:1.8">' +
      '<li><strong style="color:var(--good)">0–75%</strong> — Healthy, room to grow</li>' +
      '<li><strong style="color:var(--warn)">75–100%</strong> — Strong but approaching capacity</li>' +
      '<li><strong style="color:var(--bad)">&gt;100%</strong> — Over-committed; add staff or reduce clients</li>' +
      '</ul>' +
      '<p style="margin-top:8px;color:var(--muted);font-size:13px;">Tip: aim for 80–90% as your steady-state target — enough buffer to handle growth without burning out your team.</p>'
  },
  'contribution-margin': {
    title: 'Contribution Margin',
    content: '<p>Contribution margin is how much revenue each client contributes toward covering your fixed costs (rent, payroll, insurance) <em>after</em> paying the direct costs to serve them.</p>' +
      '<p><strong>Formula:</strong> (Client revenue per year) − (Variable costs per year for that client)</p>' +
      '<p>Once your total contribution margin across all clients exceeds your fixed costs, you\'re profitable.</p>' +
      '<p style="margin-top:8px;color:var(--muted);font-size:13px;">Tip: a negative contribution margin means you\'re losing money on each client — no amount of volume will fix that. Fix pricing or variable costs first.</p>'
  },
  'break-even': {
    title: 'Break-even Clients',
    content: '<p>Break-even clients is the minimum number of clients you need to cover <em>all</em> your costs — payroll, fixed overhead, and variable delivery costs.</p>' +
      '<p><strong>Formula:</strong> Total fixed costs ÷ Contribution margin per client</p>' +
      '<p>Below break-even = operating at a loss. Above it = every additional client is pure profit (until you hit capacity).</p>' +
      '<p style="margin-top:8px;color:var(--muted);font-size:13px;">Tip: the progress bar below the number shows how close your current client count is to break-even. Green = you\'ve crossed it.</p>'
  }
};


// Desktop menu buttons wiring - defer until scripts are loaded
function setupDesktopMenuButtons() {
  const analyticsBtn = $('#analyticsBtn');
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
      // More robust check for analytics UI
      const checkAnalyticsUI = () => {
        if (window.profitPathAnalyticsUI) {
          // Check if method exists on instance or prototype
          if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
            // Debug: Desktop calling showAnalyticsDashboard
            window.profitPathAnalyticsUI.showAnalyticsDashboard();
          } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
            // Call via prototype if instance method not available
            window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
          } else {
            // Debug: Analytics UI method not available, retrying
            setTimeout(checkAnalyticsUI, 100);
          }
        } else {
          // Debug: Analytics UI not loaded yet
          setTimeout(checkAnalyticsUI, 100);
        }
      };
      checkAnalyticsUI();
    });
  }

  const desktopFeedbackBtn = $('#desktopFeedbackBtn');
  if (desktopFeedbackBtn) {
    desktopFeedbackBtn.addEventListener('click', () => {
      // More robust check for feedback UI
      const checkFeedbackUI = () => {
        if (window.feedbackUI) {
          // Check if method exists on instance or prototype
          if (typeof window.feedbackUI.openFeedbackModal === 'function') {
            window.feedbackUI.openFeedbackModal();
          } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
            // Call via prototype if instance method not available
            window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
          } else {
            console.warn('Feedback UI method not available, retrying...');
            setTimeout(checkFeedbackUI, 100);
          }
        } else {
          console.warn('Feedback UI not loaded yet');
          setTimeout(checkFeedbackUI, 100);
        }
      };
      checkFeedbackUI();
    });
  }
}


export function bindMenus(): void {
  // Template selection handlers
  document.querySelectorAll('.template-option').forEach(option => {
    option.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const template = (e.target as HTMLElement).dataset.template;
      if (!template) return;
      const menu = $('#templatesMenu');
      if (menu) menu.style.display = 'none';

      // Track template usage
      if (window.profitPathAnalytics) {
        window.profitPathAnalytics.trackTemplateUsage(template, (e.target as HTMLElement).textContent!.trim());
      }

      loadIndustryTemplate(template);
    });
  });

  // Export dropdown functionality
  const exportBtn = $('#exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const dropdown = exportBtn.closest('.export-dropdown');
      const menu = $('#exportMenu');
      if (!dropdown || !menu) return;

      // If this menu is already active, just close it
      if (menu.style.display === 'block') {
        menu.style.display = 'none';
      } else {
        // Close other dropdowns and open this one
        closeAllDropdowns();
        menu.style.display = 'block';
      }
    });
  }

  // Close menus when clicking outside
  document.addEventListener('click', (e: MouseEvent) => {
    // Close templates dropdown and menu
    if (!(e.target as HTMLElement).closest('.templates-dropdown')) {
      document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
      const templatesMenu = $('#templatesMenu');
      if (templatesMenu) {
        templatesMenu.style.display = 'none';
      }
    }

    // Close export dropdown and menu
    if (!(e.target as HTMLElement).closest('.export-dropdown')) {
      document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
      const exportMenu = $('#exportMenu');
      if (exportMenu) {
        exportMenu.style.display = 'none';
      }
    }

    // Close settings dropdown
    if (!(e.target as HTMLElement).closest('.settings-dropdown') && !(e.target as HTMLElement).closest('#settingsCogBtn')) {
      document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
    }
  });

  // Export format handlers are now implemented in miscService.js

  document.querySelectorAll('.export-option').forEach(option => {
    option.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const format = (e.target as HTMLElement).dataset.format;
      const menu = $('#exportMenu');
      if (menu) menu.style.display = 'none';

      switch (format) {
        case 'csv':
          exportAsCSV();
          break;
        case 'excel':
          exportAsExcel();
          break;
        case 'pdf':
          exportAsPDF();
          break;
        case 'html':
          exportAsHTML();
          break;
        case 'email':
          shareViaEmail();
          break;
        case 'embed':
          showEmbedCode();
          break;
        case 'schedule':
          showScheduleDialog();
          break;
        case 'financial-report':
          exportAsFinancialReport();
          break;
      }
    });
  });
  {
    const btn = $('#shareBtn');
    if (btn) btn.addEventListener('click', shareScenario);
  }
}

export function bindScenariosAndGlobals(): void {
  // Setup desktop buttons after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDesktopMenuButtons);
  } else {
    setupDesktopMenuButtons();
  }

  // Scenarios button wiring - uses new dynamic modal in UIHelpers
  // Wire up desktop scenarios button (mobile button is wired at line 1410)
  const desktopScenariosBtn = $('#desktopScenariosBtn');
  if (desktopScenariosBtn) {
    desktopScenariosBtn.addEventListener('click', () => {
      openScenarioModal();
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    const modal = $('#scenariosModal');
    if (modal && !modal.classList.contains('hidden')) {
      closeScenarioModal();
    }
  });

  // Update scenarios list and comparison dropdowns when modal opens
  const scenariosModal = $('#scenariosModal');
  if (scenariosModal) {
    // Original scenario modal close and button handlers (delegated)
    scenariosModal.addEventListener('click', (e: Event) => {
      // Only close modal if clicking on close button, overlay, or outside modal content
      if ((e.target as HTMLElement).closest('.modal-header .btn-close') ||
        (e.target as HTMLElement).closest('#scenariosOverlay')) {
        closeScenarioModal();
      } else if ((e.target as HTMLElement).closest('.load-btn, .delete-btn')) {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('.load-btn, .delete-btn')!;
        const scenarioId = btn.dataset.scenarioId;
        if (!scenarioId) return;

        if (btn.classList.contains('load-btn')) {
          loadScenario(scenarioId);
          closeScenarioModal();
        } else if (btn.classList.contains('delete-btn')) {
          deleteScenario(scenarioId);
          closeScenarioModal();
        }
      }
      // Handle comparison dropdowns to prevent default behavior from closing modal
      else if ((e.target as HTMLElement).closest('.scenario-select')) {
        e.stopPropagation();
      }
    });

    // Populate comparison dropdowns when the modal becomes visible
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (!scenariosModal.classList.contains('hidden')) {
            populateComparisonDropdowns();
          } else {
            // Hide comparison results when modal is closed
            $('#comparisonResults').style.display = 'none';
          }
        }
      }

      // Ensure the app renders once the DOM is ready so KPIs are populated
      if (typeof window !== 'undefined') {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          // Defer to next tick to ensure all elements are present
          setTimeout(() => { try { render(); } catch (e) { console.warn('Initial render failed:', e); } }, 0);
        } else {
          window.addEventListener('DOMContentLoaded', () => { try { render(); } catch (e) { console.warn('Initial render failed:', e); } });
        }
      }
    });
    observer.observe(scenariosModal, { attributes: true, attributeFilter: ['class'] });

    // Initial population when app loads
    populateComparisonDropdowns();
  }

  // Event listener for compare button (dropdown changes no longer auto-trigger)
  const compareBtn = $('#compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', handleComparison);
  }

  // Delegated handler: KPI help "?" buttons
  document.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.kpi-help-btn');
    if (!btn) return;
    e.stopPropagation();
    const topic = btn.dataset.topic;
    if (!topic) return;
    const help = KPI_HELP[topic];
    if (!help) return;
    createModal({ title: help.title, content: `<div style="line-height:1.7;color:var(--text)">${help.content}</div>`, size: 'sm' });
  });

  // Delegated handler: any .copy-on-click input or textarea selects-all and copies on click
  document.addEventListener('click', (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLInputElement>('.copy-on-click');
    if (!el) return;
    el.select();
    el.classList.add('copy-on-click--copied');
    setTimeout(() => el.classList.remove('copy-on-click--copied'), 1500);

    const val = el.value;
    // Guard: optional-chaining alone is not safe to chain .then() on — check explicitly
    if (typeof navigator.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(val).then(() => {
        showToast('Copied to clipboard!');
      }).catch(() => {
        // Permission denied or API unavailable — fall back to selection + execCommand
        try { document.execCommand('copy'); } catch { /* */ }
        showToast('Copied to clipboard!');
      });
    } else {
      // No async Clipboard API — execCommand works because text is already selected
      try { document.execCommand('copy'); } catch { /* */ }
      showToast('Copied to clipboard!');
    }
  });
}
