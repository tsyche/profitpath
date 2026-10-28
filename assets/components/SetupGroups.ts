const STORAGE_KEY = 'profitpath-setup-groups';

function loadState(): Record<string, boolean> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

function saveState(groups: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups)); } catch { /* storage is optional */ }
}

export function initSetupGroups() {
  const groups = [...document.querySelectorAll<HTMLDetailsElement>('[data-setup-group]')];
  const saved = loadState();
  groups.forEach((group) => {
    const key = group.dataset.setupGroup!;
    if (key in saved) group.open = saved[key];
    group.addEventListener('toggle', () => {
      saved[key] = group.open;
      saveState(saved);
    });
  });

  document.addEventListener('invalid', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLElement)) return;
    const group = field.closest<HTMLDetailsElement>('[data-setup-group]');
    if (group) group.open = true;
  }, true);
}
