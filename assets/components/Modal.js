// Consistent Modal Component for ProfitPath
export function createModal({ title, content, buttons = [], size = 'medium' }) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'modal-content';
  
  // Size variations
  const sizeStyles = {
    small: 'max-width: 400px;',
    medium: 'max-width: 500px;',
    large: 'max-width: 700px;',
    full: 'max-width: 90%;'
  };

  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    ${sizeStyles[size]}
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    max-height: 80vh;
    overflow-y: auto;
  `;

  // Modal HTML structure
  modal.innerHTML = `
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="margin: 0; color: #333; font-size: 20px;">${title}</h3>
      <button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>
    <div class="modal-body" style="color: #666; line-height: 1.5;">
      ${content}
    </div>
    ${buttons.length > 0 ? `
      <div class="modal-footer" style="margin-top: 24px; display: flex; gap: 8px; justify-content: flex-end;">
        ${buttons.map((btn, index) => `
          <button class="modal-btn" data-index="${index}" style="
            padding: 8px 16px;
            border: ${btn.primary ? 'none' : '1px solid #ddd'};
            border-radius: 6px;
            background: ${btn.primary ? '#007bff' : 'white'};
            color: ${btn.primary ? 'white' : '#333'};
            cursor: pointer;
            font-weight: ${btn.primary ? 'bold' : 'normal'};
          ">${btn.text}</button>
        `).join('')}
      </div>
    ` : ''}
  `;

  // Add to overlay
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Event listeners
  const closeModal = () => overlay.remove();

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
    btn.addEventListener('click', () => {
      const action = buttons[index]?.action;
      closeModal();
      if (action && typeof action === 'function') {
        action();
      }
    });
  });

  // ESC key to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  return overlay;
}
