// Accessibility enhancements: keyboard navigation, focus management, ARIA support

/**
 * Initialize keyboard navigation for dropdowns and menus
 */
function initKeyboardNavigation() {
  // Dropdown menu keyboard navigation
  document.addEventListener('keydown', (e) => {
    // Close menus on Escape
    if (e.key === 'Escape') {
      closeAllDropdowns();
    }

    // Arrow key navigation in dropdowns
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      const focusedElement = document.activeElement;
      const dropdown = findParentDropdown(focusedElement);

      if (dropdown) {
        e.preventDefault();
        navigateDropdown(dropdown, e.key === 'ArrowDown' ? 'next' : 'prev');
      }
    }

    // Enter/Space to activate buttons
    if ((e.key === 'Enter' || e.key === ' ') && e.target.tagName !== 'TEXTAREA') {
      if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn')) {
        e.preventDefault();
        e.target.click();
      }
    }
  });
}

/**
 * Find the parent dropdown/menu of an element
 */
function findParentDropdown(element) {
  return element.closest(
    '.templates-dropdown, .export-dropdown, .mobile-templates-options, [role="menu"]'
  );
}

/**
 * Navigate through dropdown items with arrow keys
 */
function navigateDropdown(dropdown, direction) {
  const buttons = dropdown.querySelectorAll(
    'button:not([disabled]), [role="menuitem"]:not([disabled])'
  );

  if (buttons.length === 0) return;

  const currentIndex = Array.from(buttons).indexOf(document.activeElement);
  let nextIndex;

  if (direction === 'next') {
    nextIndex = currentIndex === buttons.length - 1 ? 0 : currentIndex + 1;
  } else {
    nextIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
  }

  buttons[nextIndex].focus();
}

/**
 * Close all open dropdowns
 */
function closeAllDropdowns() {
  document.querySelectorAll('.templates-menu, .export-menu').forEach((menu) => {
    menu.style.display = 'none';
  });

  // Close mobile menus
  document.querySelectorAll('[aria-expanded="true"]').forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'false');
    const target = trigger.getAttribute('aria-controls');
    if (target) {
      const element = document.getElementById(target);
      if (element) element.setAttribute('aria-hidden', 'true');
    }
  });
}

/**
 * Set up focus trap for modals
 */
function setupModalFocusTrap(modal) {
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });

  // Set focus to first element when modal opens
  firstElement.focus();
}

/**
 * Announce messages to screen readers
 */
function _announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is read
  setTimeout(() => announcement.remove(), 1000);
}

/**
 * Update button ARIA labels dynamically
 */
function updateAriaLabels() {
  // Update mode toggle button
  const modeButtons = document.querySelectorAll('[data-mode]');
  modeButtons.forEach((btn) => {
    const mode = btn.getAttribute('data-mode');
    btn.setAttribute('aria-label', `Switch to ${mode} mode`);
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
  });

  // Update help button
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) {
    helpBtn.setAttribute('aria-label', 'Open help and guided tour');
  }

  // Update scenario buttons
  const scenariosBtn = document.getElementById('scenariosBtn') || document.getElementById('desktopScenariosBtn');
  if (scenariosBtn) {
    scenariosBtn.setAttribute('aria-label', 'Manage saved scenarios');
    scenariosBtn.setAttribute('aria-haspopup', 'menu');
  }
}

/**
 * Initialize all accessibility features
 */
export function initializeAccessibility() {
  initKeyboardNavigation();
  updateAriaLabels();

  // Watch for modal opening to set up focus traps
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.classList && node.classList.contains('modal')) {
          setupModalFocusTrap(node);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true });
}
