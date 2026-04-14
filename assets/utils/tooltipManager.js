/**
 * Smart tooltip system that positions tooltips intelligently to stay within viewport
 */

let currentTooltip = null;
let tooltipsEnabled = true;

export function initTooltips() {
  // Delay initialization to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTooltips);
  } else {
    setupTooltips();
  }
}

export function setTooltipsEnabled(enabled) {
  tooltipsEnabled = enabled;
  if (!enabled) {
    hideTooltip();
  }
}

function setupTooltips() {
  // Read initial tooltip setting from localStorage (from profitpath-settings JSON)
  try {
    const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
    tooltipsEnabled = settings.showTooltips !== false;
  } catch (e) {
    // Default to enabled if settings can't be read
    tooltipsEnabled = true;
  }

  // Convert title attributes to data-tooltip for consistent handling
  document.querySelectorAll('[title]').forEach(el => {
    if (!el.dataset.tooltip) {
      el.dataset.tooltip = el.getAttribute('title');
      el.removeAttribute('title'); // Remove native tooltip
    }
  });

  // Add hover listeners to all tooltip elements with event delegation
  document.addEventListener('mouseenter', (e) => {
    const target = e.target;
    if (target && target.dataset && target.dataset.tooltip && tooltipsEnabled) {
      showTooltip(target);
    }
  }, true);

  document.addEventListener('mouseleave', (e) => {
    const target = e.target;
    if (target && target.dataset && target.dataset.tooltip) {
      hideTooltip();
    }
  }, true);

  // Listen for setting changes
  listenForSettingChanges();
}

function listenForSettingChanges() {
  // Watch for storage changes (when settings are updated)
  window.addEventListener('storage', (e) => {
    if (e.key === 'profitpath-settings') {
      try {
        const settings = JSON.parse(e.newValue || '{}');
        tooltipsEnabled = settings.showTooltips !== false;
        if (!tooltipsEnabled) {
          hideTooltip();
        }
      } catch (err) {
        // Ignore parse errors
      }
    }
  });

  // Also watch for manual calls to setTooltipsEnabled
  // (for same-tab changes that don't trigger storage event)
}

function showTooltip(element) {
  // Don't show if tooltips are disabled
  if (!tooltipsEnabled) {
    hideTooltip();
    return;
  }

  // Remove any existing tooltip
  hideTooltip();

  const tooltipText = element.dataset.tooltip;
  if (!tooltipText) return;

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'smart-tooltip';
  tooltip.textContent = tooltipText;
  tooltip.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.95);
    color: #fff;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    max-width: 200px;
    white-space: normal;
    word-wrap: break-word;
    z-index: 10001;
    border: 1px solid rgba(94, 234, 212, 0.3);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    line-height: 1.3;
    font-weight: normal;
  `;

  document.body.appendChild(tooltip);

  // Get positions
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  let top = rect.top - tooltipRect.height - 10;

  // Adjust horizontal position
  if (left < 8) {
    left = 8;
  } else if (left + tooltipRect.width > window.innerWidth - 8) {
    left = window.innerWidth - tooltipRect.width - 8;
  }

  // Check vertical position - prefer top, fallback to bottom
  if (top < 8) {
    top = rect.bottom + 10;
  }

  // Final check for bottom overflow
  if (top + tooltipRect.height > window.innerHeight - 8) {
    top = window.innerHeight - tooltipRect.height - 8;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  // Store reference for hiding
  currentTooltip = tooltip;
}

function hideTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}
