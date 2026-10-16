/**
 * Modal Service - Centralized modal management for ProfitPath
 * Provides consistent modal behavior across the application
 */

import { createModal } from '../components/Modal';

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
    currentModal: null as any,
    modalStack: [] as any[],
    isModalOpen: false
};

/**
 * Create and display a modal with standardized behavior
 * @param config - Modal configuration
 * @returns The created modal element
 */
export function showModal(config: Record<string, any>): HTMLElement {
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
    const handleEscape = (e: any) => {
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
 * @param modal - The modal element to close
 */
export function closeModal(modal: HTMLElement) {
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
 * @param title - Modal title
 * @param message - Confirmation message
 * @param onConfirm - Callback when confirmed
 * @param onCancel - Callback when cancelled
 * @param confirmText - Text for confirm button
 * @param cancelText - Text for cancel button
 * @returns The created modal element
 */
export function showConfirmationModal(title: string, message: string, onConfirm: (...args: any[]) => any, onCancel: (...args: any[]) => any, confirmText: string = 'Confirm', cancelText: string = 'Cancel'): HTMLElement {
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
 * @param title - Modal title
 * @param content - Information content
 * @param onClose - Callback when closed
 * @param buttonText - Text for the close button
 * @returns The created modal element
 */
export function showInformationModal(title: string, content: string, onClose: (...args: any[]) => any, buttonText: string = 'OK'): HTMLElement {
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
 * @param title - Modal title
 * @param formContent - Form HTML content
 * @param onSubmit - Callback when form is submitted
 * @param onCancel - Callback when cancelled
 * @param submitText - Text for submit button
 * @param cancelText - Text for cancel button
 * @returns The created modal element
 */
export function showFormModal(title: string, formContent: string, onSubmit: (...args: any[]) => any, onCancel: (...args: any[]) => any, submitText: string = 'Submit', cancelText: string = 'Cancel'): HTMLElement {
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
 * @param title - Modal title
 * @param items - Array of items to display
 * @param onSelect - Callback when item is selected
 * @param onCancel - Callback when cancelled
 * @param selectText - Text for select button
 * @param cancelText - Text for cancel button
 * @returns The created modal element
 */
export function showListModal(title: string, items: any[], onSelect: (...args: any[]) => any, onCancel: (...args: any[]) => any, selectText: string = 'Select', cancelText: string = 'Cancel'): HTMLElement {
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
 * @returns True if a modal is open
 */
export function isModalOpen(): boolean {
    return modalState.isModalOpen;
}

/**
 * Get the currently active modal
 * @returns The current modal element
 */
export function getCurrentModal(): HTMLElement|null {
    return modalState.currentModal;
}

/**
 * Get the number of open modals
 * @returns Number of open modals
 */
export function getModalCount(): number {
    return modalState.modalStack.length;
}

/**
 * Add toast notification functionality
 */
// Toast queue system
const toastQueue: any[] = [];
let currentToast: any = null;
let toastTimeout: any = null;

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

function removeToast(toast: any) {
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

// Cap how many toasts can wait in line. In verbose mode a burst of actions can
// flood the queue; keep only the most recent ones and drop the oldest.
const MAX_TOAST_QUEUE = 5;

export function showToast(message: any, type = 'info', duration = 3000) {
    // Add toast to queue
    toastQueue.push({ message, type, duration });

    // Enforce the queue cap, dropping the oldest pending toast(s) first.
    while (toastQueue.length > MAX_TOAST_QUEUE) {
        toastQueue.shift();
    }

    // Try to show it if nothing is currently displayed
    showNextToast();

    // Return false to prevent async response issues
    return false;
}

// Export constants for external use
export { MODAL_SIZES, MODAL_TYPES };