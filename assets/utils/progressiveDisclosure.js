// Progressive disclosure functionality
export function initializeProgressiveDisclosure() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;

  // Read experience level from profitpath-settings (correct storage key)
  let userLevel = 'beginner';
  try {
    const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
    userLevel = settings.experienceLevel || 'beginner';
  } catch {
    // Default to beginner if settings can't be read
  }

  // Hide advanced features based on user level
  const advancedElements = document.querySelectorAll('.advanced-feature:not(.export-option)');
  const expertElements = document.querySelectorAll('.expert-feature:not(.export-option)');

  if (userLevel === 'beginner') {
    advancedElements.forEach(el => {
      if (el && el.style) el.style.display = 'none';
    });
    expertElements.forEach(el => {
      if (el && el.style) el.style.display = 'none';
    });
  } else if (userLevel === 'intermediate') {
    expertElements.forEach(el => {
      if (el && el.style) el.style.display = 'none';
    });
  }

  // Always show all export options regardless of user level
  document.querySelectorAll('.export-option.advanced-feature, .export-option.expert-feature, .mobile-submenu-btn.expert-feature').forEach(el => {
    if (el && el.style) el.style.display = 'block';
  });

  // Special handling for debug panel - show if user has enabled it regardless of level.
  // The flag lives inside profitpath-settings (same store as experienceLevel above),
  // not as a standalone localStorage key.
  let showDebugPanel = false;
  try {
    const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
    showDebugPanel = settings.showDebugPanel === true;
  } catch {
    // Default to hidden if settings can't be read
  }
  if (showDebugPanel) {
    document.querySelectorAll('.debug-wrapper.expert-feature').forEach(el => {
      if (el && el.style) el.style.display = 'block';
    });
  }
}
