// Progressive disclosure functionality
export function initializeProgressiveDisclosure() {
  const userLevel = localStorage.getItem('userExperienceLevel') || 'beginner';

  // Hide advanced features based on user level
  const advancedElements = document.querySelectorAll('.advanced-feature:not(.export-option)');
  const expertElements = document.querySelectorAll('.expert-feature:not(.export-option)');

  if (userLevel === 'beginner') {
    advancedElements.forEach(el => el.style.display = 'none');
    expertElements.forEach(el => el.style.display = 'none');
  } else if (userLevel === 'intermediate') {
    expertElements.forEach(el => el.style.display = 'none');
  }

  // Always show all export options regardless of user level
  document.querySelectorAll('.export-option.advanced-feature, .export-option.expert-feature, .mobile-submenu-btn.expert-feature').forEach(el => {
    el.style.display = 'block';
  });

  // Special handling for debug panel - show if user has enabled it regardless of level
  const showDebugPanel = localStorage.getItem('showDebugPanel') === 'true';
  if (showDebugPanel) {
    document.querySelectorAll('.debug-wrapper.expert-feature').forEach(el => {
      el.style.display = 'block';
    });
  }
}
