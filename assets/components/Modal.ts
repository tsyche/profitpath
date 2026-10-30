// Consistent Modal Component for ProfitPath
export interface ModalButton {
  text: string;
  primary?: boolean;
  danger?: boolean;
  action?: () => void | Promise<void>;
}
let nextModalTitle = 0;

export function createModal({
  title,
  content,
  buttons = [],
  size = 'medium',
  id = '',
  onClose = null,
  headingLevel = 3,
}: {
  title: string;
  content: string | HTMLElement;
  buttons?: ModalButton[];
  size?: string;
  id?: string;
  onClose?: (() => void) | null;
  headingLevel?: 2 | 3;
}) {

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(11,18,32,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  // Create modal content
  const modal = document.createElement('div');
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const titleId = `modal-title-${++nextModalTitle}`;
  modal.className = 'modal-content modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', titleId);
  modal.tabIndex = -1;
  if (id) modal.id = id;

  modal.style.cssText = `
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 16px;
    padding: 24px;
    width: 90%;
    box-shadow: var(--elev-4, 0 8px 32px rgba(0, 0, 0, 0.2));
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  `;

  // Ensure text inside modal matches theme
  modal.style.color = 'var(--text)';

  // Set maxWidth based on size
  const sizeWidths: Record<string, string> = {
    small: '400px',
    medium: '500px',
    large: '700px',
    full: '90%'
  };
  if (sizeWidths[size]) {
    modal.style.maxWidth = sizeWidths[size];
  }

  // Modal HTML structure (colors come from theme tokens so it matches dark/light)
  modal.innerHTML = `
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h${headingLevel} id="${titleId}" style="margin: 0; color: var(--text); font-size: 20px;">${title}</h${headingLevel}>
      <button class="modal-close" aria-label="Close dialog" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted); padding: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>
    <div class="modal-body" style="color: var(--text); line-height: 1.5;">
      ${typeof content === 'string' ? content : ''}
    </div>
    ${buttons.length > 0 ? `
      <div class="modal-footer" style="margin-top: 24px; display: flex; gap: 8px; justify-content: flex-end;">
        ${buttons.map((btn, index) => `
              <button class="modal-btn ${btn.primary ? 'primary' : btn.danger ? 'danger' : 'secondary'}" data-index="${index}">${btn.text}</button>
            `).join('')}
      </div>
    ` : ''}
  `;
  if (content instanceof HTMLElement) modal.querySelector('.modal-body')!.appendChild(content);

  // Add to overlay
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  modal.focus({ preventScroll: true });

  // Lock background scroll while modal is open
  window.acquireScrollLock?.();

  // Event listeners
  const closeModal = () => {
    overlay.remove();
    window.releaseScrollLock?.();
    document.removeEventListener('keydown', handleEsc);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    if (typeof onClose === 'function') onClose();
  };

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Close button
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Footer buttons
  modal.querySelectorAll('.modal-btn').forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      const action = buttons[index]?.action;
      closeModal();
      if (action && typeof action === 'function') {
        await action();
      }
    });
  });

  // ESC key to close — only respond when this is the topmost overlay
  const handleEsc = (e: KeyboardEvent) => {
    const overlays = document.querySelectorAll('.modal-overlay');
    if (overlays[overlays.length - 1] !== overlay) return;
    if (e.key === 'Tab') {
      const controls = [...modal.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === modal)) {
        e.preventDefault(); first?.focus();
      }
    }
    if (e.key === 'Escape') {
      if (overlays[overlays.length - 1] === overlay) {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    }
  };
  document.addEventListener('keydown', handleEsc);

  return overlay;
}

// Legacy modal functions for backward compatibility
export function openScenarioModal() {
  const modal = document.getElementById('scenariosModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

export function closeScenarioModal() {
  const modal = document.getElementById('scenariosModal');
  if (!modal) return;
  // If the modal is inside a createModal overlay, remove the whole overlay and
  // release the scroll lock so it isn't stranded.
  const overlay = modal.closest('.modal-overlay');
  if (overlay) {
    overlay.remove();
    window.releaseScrollLock?.();
  } else {
    modal.classList.add('hidden');
  }
}

// Global helper to close any overlay modal
export function closeCurrentModal() {
  const overlays = document.querySelectorAll('.modal-overlay');
  overlays.forEach(o => {
    o.remove();
    window.releaseScrollLock?.();
  });
  // Handle any modal not already caught by the overlay sweep
  closeScenarioModal();
}
