/**
 * Modal Service - Centralized modal management for ProfitPath
 * Provides consistent modal behavior across the application
 */

import { createModal } from '../components/Modal.js';

// Modal configuration constants
const MODAL_SIZES = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
    FULL: 'full'
};

const MODAL_TYPES = {
    CONFIRMATION: 'confirmation',
    INFORMATION: 'information',
    FORM: 'form',
    LIST: 'list'
};

// Modal state management
const modalState = {
    currentModal: null,
    modalStack: [],
    isModalOpen: false
};

/**
 * Create and display a modal with standardized behavior
 * @param {Object} config - Modal configuration
 * @param {string} config.title - Modal title
 * @param {string|HTMLElement} config.content - Modal content
 * @param {Array} config.buttons - Array of button configurations
 * @param {string} config.size - Modal size (small, medium, large, full)
 * @param {string} config.type - Modal type for styling
 * @param {Function} config.onClose - Callback when modal closes
 * @returns {HTMLElement} The created modal element
 */
export function showModal(config) {
    const {
        title,
        content,
        buttons = [],
        size = MODAL_SIZES.MEDIUM,
        type = MODAL_TYPES.INFORMATION,
        onClose
    } = config;

    // Create modal using the Modal component
    const modal = createModal({
        title,
        content,
        buttons,
        size,
        type
    });

    // Add event listeners for modal lifecycle
    modal.addEventListener('modal:close', () => {
        modalState.isModalOpen = false;
        modalState.currentModal = null;

        if (onClose) {
            onClose();
        }
    });

    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape' && modalState.currentModal === modal) {
            closeModal(modal);
        }
    };

    // Handle click outside modal content
    modal.addEventListener('click', (e) => {
        if (e.target === modal && !modal.classList.contains('no-overlay-close')) {
            closeModal(modal);
        }
    });

    // Add keyboard event listener
    document.addEventListener('keydown', handleEscape);

    // Store modal reference and cleanup function
    modal._cleanup = () => {
        document.removeEventListener('keydown', handleEscape);
    };

    // Add to modal stack
    modalState.modalStack.push(modal);
    modalState.currentModal = modal;
    modalState.isModalOpen = true;

    // Add to DOM
    document.body.appendChild(modal);

    return modal;
}

/**
 * Close a specific modal
 * @param {HTMLElement} modal - The modal element to close
 */
export function closeModal(modal) {
    if (!modal || !modalState.modalStack.includes(modal)) {
        return;
    }

    // Remove from stack
    const index = modalState.modalStack.indexOf(modal);
    modalState.modalStack.splice(index, 1);

    // Update current modal reference
    if (modalState.currentModal === modal) {
        modalState.currentModal = modalState.modalStack[modalState.modalStack.length - 1] || null;
        modalState.isModalOpen = modalState.modalStack.length > 0;
    }

    // Trigger close event
    modal.dispatchEvent(new CustomEvent('modal:close'));

    // Remove from DOM
    if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }

    // Run cleanup
    if (modal._cleanup) {
        modal._cleanup();
    }
}

/**
 * Close all open modals
 */
export function closeAllModals() {
    while (modalState.modalStack.length > 0) {
        const modal = modalState.modalStack[modalState.modalStack.length - 1];
        closeModal(modal);
    }
}

/**
 * Create a confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Function} onCancel - Callback when cancelled
 * @param {string} confirmText - Text for confirm button
 * @param {string} cancelText - Text for cancel button
 * @returns {HTMLElement} The created modal element
 */
export function showConfirmationModal(title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel') {
    return showModal({
        title,
        content: `<p>${message}</p>`,
        buttons: [
            {
                text: cancelText,
                action: () => {
                    if (onCancel) onCancel();
                    closeModal(modalState.currentModal);
                },
                primary: false
            },
            {
                text: confirmText,
                action: () => {
                    if (onConfirm) onConfirm();
                    closeModal(modalState.currentModal);
                },
                primary: true
            }
        ],
        size: MODAL_SIZES.SMALL,
        type: MODAL_TYPES.CONFIRMATION
    });
}

/**
 * Create an information modal
 * @param {string} title - Modal title
 * @param {string} content - Information content
 * @param {Function} onClose - Callback when closed
 * @param {string} buttonText - Text for the close button
 * @returns {HTMLElement} The created modal element
 */
export function showInformationModal(title, content, onClose, buttonText = 'OK') {
    return showModal({
        title,
        content,
        buttons: [
            {
                text: buttonText,
                action: () => {
                    if (onClose) onClose();
                    closeModal(modalState.currentModal);
                },
                primary: true
            }
        ],
        size: MODAL_SIZES.MEDIUM,
        type: MODAL_TYPES.INFORMATION
    });
}

/**
 * Create a form modal
 * @param {string} title - Modal title
 * @param {string} formContent - Form HTML content
 * @param {Function} onSubmit - Callback when form is submitted
 * @param {Function} onCancel - Callback when cancelled
 * @param {string} submitText - Text for submit button
 * @param {string} cancelText - Text for cancel button
 * @returns {HTMLElement} The created modal element
 */
export function showFormModal(title, formContent, onSubmit, onCancel, submitText = 'Submit', cancelText = 'Cancel') {
    return showModal({
        title,
        content: formContent,
        buttons: [
            {
                text: cancelText,
                action: () => {
                    if (onCancel) onCancel();
                    closeModal(modalState.currentModal);
                },
                primary: false
            },
            {
                text: submitText,
                action: () => {
                    if (onSubmit) onSubmit();
                    // Don't close automatically - let the submit handler decide
                },
                primary: true
            }
        ],
        size: MODAL_SIZES.LARGE,
        type: MODAL_TYPES.FORM
    });
}

/**
 * Create a list selection modal
 * @param {string} title - Modal title
 * @param {Array} items - Array of items to display
 * @param {Function} onSelect - Callback when item is selected
 * @param {Function} onCancel - Callback when cancelled
 * @param {string} selectText - Text for select button
 * @param {string} cancelText - Text for cancel button
 * @returns {HTMLElement} The created modal element
 */
export function showListModal(title, items, onSelect, onCancel, selectText = 'Select', cancelText = 'Cancel') {
    const listContent = `
    <div class="modal-list">
      ${items.map(item => `
        <div class="list-item" data-value="${item.value}">
          <span class="list-item-text">${item.label}</span>
          <span class="list-item-desc">${item.description || ''}</span>
        </div>
      `).join('')}
    </div>
  `;

    return showModal({
        title,
        content: listContent,
        buttons: [
            {
                text: cancelText,
                action: () => {
                    if (onCancel) onCancel();
                    closeModal(modalState.currentModal);
                },
                primary: false
            },
            {
                text: selectText,
                action: () => {
                    // Get selected item
                    const selectedItem = document.querySelector('.list-item.selected');
                    if (selectedItem && onSelect) {
                        onSelect(selectedItem.dataset.value);
                    }
                    closeModal(modalState.currentModal);
                },
                primary: true
            }
        ],
        size: MODAL_SIZES.LARGE,
        type: MODAL_TYPES.LIST
    });
}

/**
 * Check if any modal is currently open
 * @returns {boolean} True if a modal is open
 */
export function isModalOpen() {
    return modalState.isModalOpen;
}

/**
 * Get the currently active modal
 * @returns {HTMLElement|null} The current modal element
 */
export function getCurrentModal() {
    return modalState.currentModal;
}

/**
 * Get the number of open modals
 * @returns {number} Number of open modals
 */
export function getModalCount() {
    return modalState.modalStack.length;
}

/**
 * Add toast notification functionality
 */
// Toast queue system
const toastQueue = [];
let currentToast = null;
let toastTimeout = null;

function showNextToast() {
    // If a toast is currently displayed, don't show another
    if (currentToast) return;

    // Get the next toast from the queue
    const nextToastData = toastQueue.shift();
    if (!nextToastData) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${nextToastData.type}`;
    currentToast = toast;

    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = nextToastData.message;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeToast(toast);
    });

    // Add message and close button to toast
    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);

    // Add to DOM
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove after duration
    toastTimeout = setTimeout(() => {
        removeToast(toast);
    }, nextToastData.duration);
}

function removeToast(toast) {
    // Clear any pending timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }

    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        currentToast = null;
        // Show next toast in queue if any
        showNextToast();
    }, 300);
}

export function showToast(message, type = 'info', duration = 3000) {
    // Add toast to queue
    toastQueue.push({ message, type, duration });

    // Try to show it if nothing is currently displayed
    showNextToast();

    // Return false to prevent async response issues
    return false;
}

// Export constants for external use
export { MODAL_SIZES, MODAL_TYPES };